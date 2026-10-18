"""Shared helpers: used by BOTH train_models.py and app.py so the
feature engineering is identical in training and in the live app."""
import numpy as np
import pandas as pd

INTEREST_RATE = 0.10  # ASSUMPTION: dataset has no interest rate (10% p.a.)

RAW_FEATURES = [
    "no_of_dependents", "education", "self_employed", "income_annum",
    "loan_amount", "loan_term", "cibil_score", "residential_assets_value",
    "commercial_assets_value", "luxury_assets_value", "bank_asset_value",
]

MODEL_FEATURES = [
    "no_of_dependents", "education", "self_employed", "income_annum",
    "loan_amount", "loan_term", "cibil_score", "residential_assets_value",
    "commercial_assets_value", "luxury_assets_value", "bank_asset_value",
    "total_assets", "loan_to_income_ratio", "emi_to_income_ratio",
]

RISK_MAP = {"Low": 0, "Medium": 1, "High": 2}
RISK_NAMES = {v: k for k, v in RISK_MAP.items()}


def load_clean(path="loan_approval_dataset.csv"):
    """Step 1: load + clean (the CSV has hidden spaces in names and values)."""
    df = pd.read_csv(path)
    df.columns = df.columns.str.strip()
    for c in ["education", "self_employed", "loan_status"]:
        df[c] = df[c].str.strip()
    return df.drop(columns=["loan_id"])


def calc_emi(loan_amount, loan_term_years, rate=INTEREST_RATE):
    """Standard EMI formula: P*r*(1+r)^n / ((1+r)^n - 1)."""
    r = rate / 12
    n = np.asarray(loan_term_years) * 12
    return loan_amount * r * (1 + r) ** n / ((1 + r) ** n - 1)


def add_features(df):
    """Step 3: derived features from your Dataset slide."""
    df = df.copy()
    df["total_assets"] = (df.residential_assets_value + df.commercial_assets_value
                          + df.luxury_assets_value + df.bank_asset_value)
    df["monthly_income"] = df.income_annum / 12
    df["loan_to_income_ratio"] = df.loan_amount / df.income_annum
    df["emi"] = calc_emi(df.loan_amount, df.loan_term)
    df["emi_to_income_ratio"] = df.emi / df.monthly_income
    df["affordability_status"] = pd.cut(
        df.emi_to_income_ratio, [-np.inf, 0.5, 1.0, np.inf],
        labels=["High", "Medium", "Low"]).astype(str)
    return df


def encode(df):
    """Text -> numbers (models only understand numbers)."""
    df = df.copy()
    df["education"] = (df["education"].str.strip() == "Graduate").astype(int)
    df["self_employed"] = (df["self_employed"].str.strip() == "Yes").astype(int)
    return df


def make_risk_label(df):
    """Rule-based risk label (dataset has none). Returns 0/1/2 = Low/Med/High.
    LIMITATION to mention in viva: label comes from rules, so the Random
    Forest partly learns these rules."""
    pts = np.zeros(len(df), dtype=int)
    pts += np.where(df.cibil_score < 550, 2, np.where(df.cibil_score < 700, 1, 0))
    pts += np.where(df.emi_to_income_ratio > 1.0, 2,
                    np.where(df.emi_to_income_ratio > 0.5, 1, 0))
    pts += np.where(df.loan_to_income_ratio > 3.5, 1, 0)
    return np.where(pts <= 1, 0, np.where(pts <= 3, 1, 2))


def build_row(dependents, education, self_employed, income, loan_amount,
              term, cibil, resid, comm, lux, bank):
    """Turn form inputs into a one-row model-ready DataFrame."""
    raw = pd.DataFrame([{
        "no_of_dependents": dependents, "education": education,
        "self_employed": self_employed, "income_annum": income,
        "loan_amount": loan_amount, "loan_term": term, "cibil_score": cibil,
        "residential_assets_value": resid, "commercial_assets_value": comm,
        "luxury_assets_value": lux, "bank_asset_value": bank}])
    full = add_features(raw)
    return full, encode(full)[MODEL_FEATURES]
