"""Run once:  python train_models.py
Does Steps 1-6: clean, EDA plots, features, 3 models, metrics, SHAP, LIME."""
import os, joblib
import numpy as np, pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import shap
from lime.lime_tabular import LimeTabularExplainer
from sklearn.model_selection import train_test_split, RandomizedSearchCV
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.metrics import (accuracy_score, precision_score, recall_score,
    f1_score, roc_auc_score, confusion_matrix, ConfusionMatrixDisplay,
    classification_report)
from xgboost import XGBClassifier
from common import *

os.makedirs("outputs", exist_ok=True)
os.makedirs("models", exist_ok=True)

# ---------- STEP 1-3: load, clean, engineer ----------
df = add_features(load_clean())
print("Shape:", df.shape, "| missing values:", int(df.isnull().sum().sum()))

# ---------- STEP 2: EDA plots (screenshots for your report) ----------
df.loan_status.value_counts().plot(kind="bar", title="Approved vs Rejected")
plt.tight_layout(); plt.savefig("outputs/eda_target.png"); plt.close()

for s, g in df.groupby("loan_status"):
    plt.hist(g.cibil_score, bins=30, alpha=.6, label=s)
plt.legend(); plt.title("CIBIL score by loan status"); plt.xlabel("CIBIL")
plt.savefig("outputs/eda_cibil.png"); plt.close()

num = df.select_dtypes("number")
plt.figure(figsize=(10, 8)); plt.imshow(num.corr(), cmap="coolwarm")
plt.xticks(range(len(num.columns)), num.columns, rotation=90)
plt.yticks(range(len(num.columns)), num.columns); plt.colorbar()
plt.title("Correlation heatmap"); plt.tight_layout()
plt.savefig("outputs/eda_corr.png"); plt.close()

# ---------- STEP 4: encode + split ----------
data = encode(df)
X = data[MODEL_FEATURES]
y = (data.loan_status == "Approved").astype(int)
X_tr, X_te, y_tr, y_te = train_test_split(
    X, y, test_size=0.2, stratify=y, random_state=42)

# ---------- STEP 5a: XGBoost (approval) ----------
search = RandomizedSearchCV(
    XGBClassifier(eval_metric="logloss", random_state=42),
    {"n_estimators": [100, 200, 300], "max_depth": [3, 4, 5, 6],
     "learning_rate": [0.03, 0.05, 0.1], "subsample": [0.8, 1.0],
     "colsample_bytree": [0.8, 1.0]},
    n_iter=10, scoring="roc_auc", cv=3, random_state=42, n_jobs=-1)
search.fit(X_tr, y_tr)
xgb = search.best_estimator_
print("Best XGB params:", search.best_params_)

pred = xgb.predict(X_te); proba = xgb.predict_proba(X_te)[:, 1]
xgb_metrics = {
    "Accuracy": accuracy_score(y_te, pred), "Precision": precision_score(y_te, pred),
    "Recall": recall_score(y_te, pred), "F1": f1_score(y_te, pred),
    "ROC-AUC": roc_auc_score(y_te, proba)}
print("\n== XGBoost (Approval) ==")
for k, v in xgb_metrics.items(): print(f"{k:10s}: {v:.4f}")
ConfusionMatrixDisplay(confusion_matrix(y_te, pred),
                       display_labels=["Rejected", "Approved"]).plot()
plt.title("XGBoost confusion matrix"); plt.savefig("outputs/xgb_confusion.png"); plt.close()

# ---------- STEP 5b: Random Forest (risk) ----------
risk = make_risk_label(data)
print("\nRisk label counts:", pd.Series(risk).map(RISK_NAMES).value_counts().to_dict())
Xr_tr, Xr_te, yr_tr, yr_te = train_test_split(
    X, risk, test_size=0.2, stratify=risk, random_state=42)
rf = RandomForestClassifier(n_estimators=200, random_state=42, n_jobs=-1)
rf.fit(Xr_tr, yr_tr)
rp = rf.predict(Xr_te)
rf_metrics = {
    "Accuracy": accuracy_score(yr_te, rp),
    "Precision (macro)": precision_score(yr_te, rp, average="macro"),
    "Recall (macro)": recall_score(yr_te, rp, average="macro"),
    "F1 (macro)": f1_score(yr_te, rp, average="macro")}
print("\n== Random Forest (Risk) ==")
for k, v in rf_metrics.items(): print(f"{k:18s}: {v:.4f}")
print(classification_report(yr_te, rp, target_names=["Low", "Medium", "High"]))

# ---------- STEP 5c: Isolation Forest (anomaly) ----------
iso = IsolationForest(n_estimators=200, contamination=0.05, random_state=42)
iso.fit(X)
scores = iso.decision_function(X)          # lower = more unusual
flags = iso.predict(X)                     # -1 = anomaly
print(f"\n== Isolation Forest ==\nAnomaly rate: {(flags == -1).mean():.2%}")
plt.hist(scores, bins=40); plt.title("Anomaly score distribution")
plt.xlabel("score (lower = more unusual)")
plt.savefig("outputs/anomaly_scores.png"); plt.close()
df.assign(anomaly_score=scores)[flags == -1].head(20).to_csv(
    "outputs/anomalies_for_manual_check.csv", index=False)

# ---------- STEP 6: SHAP + LIME ----------
sv = shap.TreeExplainer(xgb)
X_sample = X_te.iloc[:300]
shap_vals = sv(X_sample)
shap.plots.beeswarm(shap_vals, show=False)
plt.tight_layout(); plt.savefig("outputs/shap_summary.png"); plt.close()
shap.plots.waterfall(shap_vals[0], show=False)
plt.tight_layout(); plt.savefig("outputs/shap_waterfall_example.png"); plt.close()

lime_exp = LimeTabularExplainer(
    X_tr.values, feature_names=MODEL_FEATURES,
    class_names=["Rejected", "Approved"], mode="classification",
    categorical_features=[MODEL_FEATURES.index("education"),
                          MODEL_FEATURES.index("self_employed")],
    random_state=42)
lime_out = lime_exp.explain_instance(X_te.iloc[0].values, xgb.predict_proba,
                                     num_features=8)
lime_out.as_pyplot_figure(); plt.tight_layout()
plt.savefig("outputs/lime_example.png"); plt.close()

# Consistency check (your "feature-contribution consistency" metric):
# do SHAP's and LIME's top-5 features overlap for the same applicant?
shap_top = pd.Series(np.abs(shap_vals[0].values), index=MODEL_FEATURES).nlargest(5).index
lime_top = [f for f, _ in lime_out.as_list()][:8]
overlap = sum(any(s in l for l in lime_top) for s in shap_top)
print(f"\nSHAP vs LIME: {overlap}/5 of SHAP's top features also appear in LIME's top 8")

# ---------- Save everything for the app ----------
joblib.dump(xgb, "models/xgb_approval.joblib")
joblib.dump(rf, "models/rf_risk.joblib")
joblib.dump(iso, "models/iso_anomaly.joblib")
joblib.dump({"X_train": X_tr, "score_min": float(scores.min()),
             "score_max": float(scores.max())}, "models/background.joblib")
pd.DataFrame({"XGBoost": xgb_metrics}).to_csv("outputs/xgb_metrics.csv")
pd.DataFrame({"RandomForest": rf_metrics}).to_csv("outputs/rf_metrics.csv")
print("\nDone. Models in /models, plots in /outputs")
