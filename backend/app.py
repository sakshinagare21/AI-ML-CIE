"""
FastAPI backend for AI-Based Explainable Loan Approval & Risk Assessment.

Supports both direct and `/api` prefixed routes to work seamlessly
with Vite proxy and standalone requests.
"""
import datetime
import os
from pathlib import Path
from typing import Any, Dict, Literal, Optional

import joblib
import numpy as np
import pandas as pd
import shap
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from lime.lime_tabular import LimeTabularExplainer
from pydantic import BaseModel, Field, model_validator

from common import MODEL_FEATURES, RISK_NAMES, build_row
import database
import pdf_generator

BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "models"
OUTPUTS_DIR = BASE_DIR / "outputs"
LOG_PATH = BASE_DIR / "applications_log.csv"

app = FastAPI(
    title="AI Loan Assessment API",
    description="Loan approval probability, risk, affordability, anomaly, explainability, and what-if assessment.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ApplicantInput(BaseModel):
    dependents: int = Field(default=2, ge=0, le=5)
    education: Literal["Graduate", "Not Graduate"] = "Graduate"
    self_employed: Literal["No", "Yes"] = "No"
    income: float = Field(default=5000000, ge=200000, le=9900000, description="Annual income in INR")
    loan_amount: float = Field(default=15000000, ge=300000, le=39500000)
    term: int = Field(default=10, ge=2, le=20, description="Loan term in years")
    cibil: int = Field(default=650, ge=300, le=900)
    residential_assets: float = Field(default=7000000, ge=0, le=29100000)
    commercial_assets: float = Field(default=5000000, ge=0, le=19400000)
    luxury_assets: float = Field(default=15000000, ge=0, le=39200000)
    bank_assets: float = Field(default=5000000, ge=0, le=14700000)

    @model_validator(mode="before")
    @classmethod
    def remap_fields(cls, data: Any):
        """Map frontend property names to schema field names if present."""
        if isinstance(data, dict):
            mapping = {
                "no_of_dependents": "dependents",
                "income_annum": "income",
                "loan_term": "term",
                "cibil_score": "cibil",
                "residential_assets_value": "residential_assets",
                "commercial_assets_value": "commercial_assets",
                "luxury_assets_value": "luxury_assets",
                "bank_asset_value": "bank_assets",
            }
            res = dict(data)
            for old_key, new_key in mapping.items():
                if old_key in res and (new_key not in res or res[new_key] is None):
                    res[new_key] = res[old_key]
            return res
        return data


class WhatIfRequest(BaseModel):
    applicant: Optional[ApplicantInput] = None
    changes: Optional[Dict[str, Any]] = None

    # Alternative flat format
    dependents: Optional[int] = None
    education: Optional[str] = None
    self_employed: Optional[str] = None
    income: Optional[float] = None
    loan_amount: Optional[float] = None
    term: Optional[int] = None
    cibil: Optional[int] = None
    residential_assets: Optional[float] = None
    commercial_assets: Optional[float] = None
    luxury_assets: Optional[float] = None
    bank_assets: Optional[float] = None

    loan_change_percent: Optional[float] = 0
    income_change_percent: Optional[float] = 0
    cibil_change_points: Optional[int] = 0

    @model_validator(mode="before")
    @classmethod
    def remap_fields(cls, data: Any):
        if isinstance(data, dict):
            mapping = {
                "no_of_dependents": "dependents",
                "income_annum": "income",
                "loan_term": "term",
                "cibil_score": "cibil",
                "residential_assets_value": "residential_assets",
                "commercial_assets_value": "commercial_assets",
                "luxury_assets_value": "luxury_assets",
                "bank_asset_value": "bank_assets",
            }
            res = dict(data)
            for old_key, new_key in mapping.items():
                if old_key in res and (new_key not in res or res[new_key] is None):
                    res[new_key] = res[old_key]
            return res
        return data


_models = {}


def load_models():
    """Load trained artifacts once when the API starts."""
    required = {
        "xgb": MODEL_DIR / "xgb_approval.joblib",
        "rf": MODEL_DIR / "rf_risk.joblib",
        "iso": MODEL_DIR / "iso_anomaly.joblib",
        "background": MODEL_DIR / "background.joblib",
    }
    missing = [str(path) for path in required.values() if not path.exists()]
    if missing:
        raise RuntimeError(
            "Missing trained model file(s): "
            + ", ".join(missing)
            + ". Run `python train_models.py` from the backend directory first."
        )

    xgb = joblib.load(required["xgb"])
    rf = joblib.load(required["rf"])
    iso = joblib.load(required["iso"])
    background = joblib.load(required["background"])

    lime_exp = LimeTabularExplainer(
        background["X_train"].values,
        feature_names=MODEL_FEATURES,
        class_names=["Rejected", "Approved"],
        mode="classification",
        categorical_features=[
            MODEL_FEATURES.index("education"),
            MODEL_FEATURES.index("self_employed"),
        ],
        random_state=42,
    )
    return {
        "xgb": xgb,
        "rf": rf,
        "iso": iso,
        "shap": shap.TreeExplainer(xgb),
        "lime": lime_exp,
    }


@app.on_event("startup")
def startup_load_models():
    global _models
    database.init_db()
    try:
        _models = load_models()
    except Exception as exc:
        app.state.model_load_error = str(exc)
        _models = {}
    else:
        app.state.model_load_error = None


def applicant_tuple(data: ApplicantInput):
    return (
        data.dependents,
        data.education,
        data.self_employed,
        data.income,
        data.loan_amount,
        data.term,
        data.cibil,
        data.residential_assets,
        data.commercial_assets,
        data.luxury_assets,
        data.bank_assets,
    )


def require_models():
    if not _models:
        detail = getattr(app.state, "model_load_error", None)
        raise HTTPException(
            status_code=503,
            detail=detail or "Models are not loaded. Check model files in backend/models.",
        )


def assess(full, X):
    prob = float(_models["xgb"].predict_proba(X)[0, 1])
    pred_class = int(_models["xgb"].predict(X)[0])
    status = "Approved" if pred_class == 1 else "Rejected"
    risk = RISK_NAMES[int(_models["rf"].predict(X)[0])]
    anomaly = bool(_models["iso"].predict(X)[0] == -1)
    return {
        "predicted_status": status,
        "approval_probability": prob,
        "risk": risk,
        "anomaly": anomaly,
        "emi": float(full["emi"].iloc[0]),
        "emi_to_income_ratio": float(full["emi_to_income_ratio"].iloc[0]),
        "affordability": str(full["affordability_status"].iloc[0]),
    }


def recommendation(result):
    if result["anomaly"]:
        return "Flag for manual review: unusual application pattern."
    if result["approval_probability"] >= 0.75 and result["risk"] != "High":
        return "Likely approve."
    if result["approval_probability"] >= 0.4:
        return "Borderline: consider a lower loan amount or longer term."
    return "Likely reject: improve CIBIL score or reduce loan amount."


def compute_explanations(X):
    try:
        shap_values = _models["shap"](X)
        values = np.asarray(shap_values.values[0])
        if values.ndim == 2:
            values = values[:, 1] if values.shape[1] > 1 else values[:, 0]
        shap_features = [
            {"feature": name, "contribution": float(value), "value": float(X.iloc[0][name])}
            for name, value in zip(MODEL_FEATURES, values)
        ]
        shap_features.sort(key=lambda item: abs(item["contribution"]), reverse=True)

        lime_result = _models["lime"].explain_instance(
            X.iloc[0].values,
            _models["xgb"].predict_proba,
            num_features=8,
        )
        lime_features = [
            {"feature": feature, "contribution": float(weight), "value": None}
            for feature, weight in lime_result.as_list()
        ]
        return {"shap": shap_features, "lime": lime_features}
    except Exception:
        return {"shap": [], "lime": []}


def log_assessment(data: ApplicantInput, result: dict):
    # Save to MongoDB
    database.save_application_record(data, result)

    # Local CSV backup
    row = {
        "time": datetime.datetime.now().isoformat(timespec="seconds"),
        "approval_prob": round(result["approval_probability"], 3),
        "risk": result["risk"],
        "anomaly": result["anomaly"],
        "emi": round(result["emi"]),
        "affordability": result["affordability"],
        "cibil": data.cibil,
        "income": data.income,
        "loan_amount": data.loan_amount,
        "predicted_status": result.get("predicted_status", "Approved" if result["approval_probability"] >= 0.5 else "Rejected"),
    }
    pd.DataFrame([row]).to_csv(
        LOG_PATH,
        mode="a",
        index=False,
        header=not LOG_PATH.exists(),
    )


def load_offline_metrics():
    metrics = {}
    try:
        xgb_csv = OUTPUTS_DIR / "xgb_metrics.csv"
        if xgb_csv.exists():
            df = pd.read_csv(xgb_csv, index_col=0)
            metrics["xgboost"] = {str(k): float(v.iloc[0]) for k, v in df.iterrows()}
        rf_csv = OUTPUTS_DIR / "rf_metrics.csv"
        if rf_csv.exists():
            df = pd.read_csv(rf_csv, index_col=0)
            metrics["random_forest"] = {str(k): float(v.iloc[0]) for k, v in df.iterrows()}
    except Exception:
        pass
    return metrics


# ================= ROUTES =================

@app.get("/")
def root():
    return {
        "message": "AI Loan Assessment API is running",
        "docs": "/docs",
        "health": "/health",
        "api_health": "/api/health",
        "database": "mongodb" if database.is_db_connected() else "fallback_csv",
    }


@app.get("/api/health")
@app.get("/health")
def health():
    return {
        "status": "ok" if _models else "model_not_ready",
        "models_loaded": bool(_models),
        "mongodb_connected": database.is_db_connected(),
        "error": getattr(app.state, "model_load_error", None),
    }


@app.post("/api/assess")
@app.post("/assess")
@app.post("/predict")
def assess_applicant(data: ApplicantInput):
    """Assess an applicant and return results, recommendation, and local explanations."""
    require_models()
    try:
        full, X = build_row(*applicant_tuple(data))
        result = assess(full, X)
        result["recommendation"] = recommendation(result)
        result["cibil_score"] = data.cibil
        result["explanations"] = compute_explanations(X)
        log_assessment(data, result)
        return result
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Assessment failed: {exc}")


@app.post("/api/what-if")
@app.post("/what-if")
def what_if(req: WhatIfRequest):
    """Compare baseline assessment with scenario adjustments."""
    require_models()
    try:
        if req.applicant is not None:
            base_data = req.applicant
            changes = req.changes or {}
            d_income = float(changes.get("income_percent", 0))
            d_loan = float(changes.get("loan_amount_percent", 0))
            d_cibil = int(changes.get("cibil_points", 0))
        else:
            base_data = ApplicantInput(
                dependents=req.dependents or 2,
                education=req.education or "Graduate",
                self_employed=req.self_employed or "No",
                income=req.income or 5000000,
                loan_amount=req.loan_amount or 15000000,
                term=req.term or 10,
                cibil=req.cibil or 650,
                residential_assets=req.residential_assets or 7000000,
                commercial_assets=req.commercial_assets or 5000000,
                luxury_assets=req.luxury_assets or 15000000,
                bank_assets=req.bank_assets or 5000000,
            )
            d_income = float(req.income_change_percent or 0)
            d_loan = float(req.loan_change_percent or 0)
            d_cibil = int(req.cibil_change_points or 0)

        base_full, base_X = build_row(*applicant_tuple(base_data))
        base = assess(base_full, base_X)

        changed_income = float(np.clip(base_data.income * (1 + d_income / 100), 200000, 9900000))
        changed_loan = float(np.clip(base_data.loan_amount * (1 + d_loan / 100), 300000, 39500000))
        changed_cibil = int(np.clip(base_data.cibil + d_cibil, 300, 900))

        changed_full, changed_X = build_row(
            base_data.dependents,
            base_data.education,
            base_data.self_employed,
            changed_income,
            changed_loan,
            base_data.term,
            changed_cibil,
            base_data.residential_assets,
            base_data.commercial_assets,
            base_data.luxury_assets,
            base_data.bank_assets,
        )
        changed = assess(changed_full, changed_X)

        sweep = []
        for score in range(400, 851, 50):
            sw_full, sw_X = build_row(
                base_data.dependents,
                base_data.education,
                base_data.self_employed,
                changed_income,
                changed_loan,
                base_data.term,
                score,
                base_data.residential_assets,
                base_data.commercial_assets,
                base_data.luxury_assets,
                base_data.bank_assets,
            )
            sw_res = assess(sw_full, sw_X)
            sweep.append({
                "cibil": score,
                "approval_probability": sw_res["approval_probability"],
                "risk": sw_res["risk"],
                "emi": sw_res["emi"],
                "affordability": sw_res["affordability"],
            })

        return {
            "baseline": base,
            "scenario": changed,
            "approval_probability_change": changed["approval_probability"] - base["approval_probability"],
            "emi_change": changed["emi"] - base["emi"],
            "changed_inputs": {
                "income": changed_income,
                "loan_amount": changed_loan,
                "cibil": changed_cibil,
            },
            "cibil_sweep": sweep,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"What-if analysis failed: {exc}")


@app.post("/api/explain")
@app.post("/explain")
def explain(data: ApplicantInput):
    """Return feature contributions from SHAP and LIME in JSON form."""
    require_models()
    try:
        _, X = build_row(*applicant_tuple(data))
        return compute_explanations(X)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Explanation failed: {exc}")


@app.get("/api/admin/metrics")
@app.get("/admin/metrics")
def get_admin_metrics():
    """Return dashboard summary metrics and offline model evaluation."""
    offline_metrics = load_offline_metrics()

    # 1. Query MongoDB if connected
    if database.is_db_connected():
        db_metrics = database.get_admin_metrics_from_db(offline_metrics)
        if db_metrics is not None:
            return db_metrics

    # 2. Fallback to CSV log
    if not LOG_PATH.exists():
        return {
            "total_applications": 0,
            "average_approval_probability": 0.0,
            "approvals": 0,
            "approval_status_unknown": 0,
            "risk_distribution": {"Low": 0, "Medium": 0, "High": 0},
            "offline_model_metrics": offline_metrics,
        }
    try:
        log = pd.read_csv(LOG_PATH).fillna("")
        total = int(len(log))
        avg_prob = float(log["approval_prob"].mean()) if total > 0 else 0.0

        if "predicted_status" in log.columns:
            approvals = int((log["predicted_status"] == "Approved").sum())
            unknown = int((log["predicted_status"] == "").sum())
        else:
            approvals = int((log["approval_prob"] >= 0.5).sum()) if total > 0 else 0
            unknown = 0

        risk_counts = {"Low": 0, "Medium": 0, "High": 0}
        if "risk" in log.columns:
            for k, v in log["risk"].value_counts().items():
                if str(k) in risk_counts:
                    risk_counts[str(k)] = int(v)

        return {
            "total_applications": total,
            "average_approval_probability": avg_prob,
            "approvals": approvals,
            "approval_status_unknown": unknown,
            "risk_distribution": risk_counts,
            "offline_model_metrics": offline_metrics,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to load metrics: {exc}")


@app.get("/api/admin/applications")
@app.get("/admin/applications")
def get_admin_applications():
    """Return list of historical assessments from MongoDB or log."""
    # 1. Query MongoDB if connected
    if database.is_db_connected():
        db_apps = database.get_recent_applications_from_db()
        if db_apps is not None:
            return db_apps

    # 2. Fallback to CSV log
    if not LOG_PATH.exists():
        return []
    try:
        log = pd.read_csv(LOG_PATH).fillna("")
        apps = []
        for _, row in log.sort_values("time", ascending=False).iterrows():
            status = row.get("predicted_status", "")
            if not status:
                status = "Approved" if float(row.get("approval_prob", 0)) >= 0.5 else "Rejected"
            apps.append({
                "time": str(row.get("time", "")),
                "approval_probability": float(row.get("approval_prob", 0)),
                "risk": str(row.get("risk", "Low")),
                "anomaly": bool(str(row.get("anomaly", "")).lower() in ["true", "1"]),
                "emi": float(row.get("emi", 0)),
                "predicted_status": status,
            })
        return apps
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to load applications: {exc}")


@app.get("/admin/dashboard")
def admin_dashboard():
    """Combined dashboard data endpoint."""
    metrics = get_admin_metrics()
    applications = get_admin_applications()
    return {"metrics": metrics, "applications": applications}


class SanctionPdfRequest(BaseModel):
    applicant: Dict[str, Any]
    result: Dict[str, Any]


@app.post("/api/download-sanction-letter")
@app.post("/download-sanction-letter")
def download_sanction_letter(req: SanctionPdfRequest):
    """Generate and return an official loan assessment / sanction PDF letter."""
    try:
        pdf_bytes = pdf_generator.generate_sanction_pdf(req.applicant, req.result)
        filename = f"Loan_Sanction_Letter_{datetime.datetime.now().strftime('%Y%m%d_%H%M')}.pdf"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Access-Control-Expose-Headers": "Content-Disposition",
            },
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {exc}")
