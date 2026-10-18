"""
MongoDB database module using PyMongo.

Reads `MONGODB_URI` (or `DATABASE_URL`) from .env.
Supports MongoDB Atlas (cloud) or local MongoDB instance.
Stores assessments, predictions, and explanations, and serves admin aggregations.
"""
import datetime
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from pymongo import DESCENDING, MongoClient
from pymongo.errors import ConnectionFailure, PyMongoError

# Load environment variables
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")
load_dotenv(BASE_DIR.parent / ".env")

# Accept MONGODB_URI, MONGO_URI, or DATABASE_URL
MONGODB_URI = (
    os.getenv("MONGODB_URI")
    or os.getenv("MONGO_URI")
    or os.getenv("DATABASE_URL")
    or ""
).strip()

DB_NAME = os.getenv("MONGODB_DB_NAME", "loan_prediction_db")
COLLECTION_NAME = "applications"

client: Optional[MongoClient] = None
db = None
applications_col = None
_db_active = False


def init_db() -> bool:
    """Connect to MongoDB and set up indexes."""
    global client, db, applications_col, _db_active
    if not MONGODB_URI:
        print("[Database Notice] No MONGODB_URI found in .env. Waiting for MongoDB connection string.")
        _db_active = False
        return False

    try:
        # 3 second timeout for ping so it doesn't block startup if unreachable
        client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=3000)
        # Test connection
        client.admin.command("ping")
        db = client[DB_NAME]
        applications_col = db[COLLECTION_NAME]

        # Ensure performance indexes
        applications_col.create_index([("created_at", DESCENDING)])
        applications_col.create_index([("predicted_status", 1)])
        applications_col.create_index([("risk", 1)])

        _db_active = True
        print(f"[Database] Successfully connected to MongoDB ('{DB_NAME}.{COLLECTION_NAME}').")
        return True
    except (ConnectionFailure, PyMongoError) as exc:
        print(f"[Database Notice] MongoDB is not reachable ({exc}). Operating in fallback mode until connected.")
        _db_active = False
        return False
    except Exception as exc:
        print(f"[Database Notice] MongoDB setup note: {exc}")
        _db_active = False
        return False


def is_db_connected() -> bool:
    return _db_active and applications_col is not None


def save_application_record(data: Any, result: Dict[str, Any]) -> Optional[str]:
    """Persist an application and its assessment to MongoDB."""
    if not is_db_connected():
        return None
    try:
        doc = {
            "created_at": datetime.datetime.utcnow(),
            "time": datetime.datetime.now().isoformat(timespec="seconds"),
            "applicant": {
                "dependents": int(data.dependents),
                "education": str(data.education),
                "self_employed": str(data.self_employed),
                "income": float(data.income),
                "loan_amount": float(data.loan_amount),
                "term": int(data.term),
                "cibil": int(data.cibil),
                "residential_assets": float(data.residential_assets),
                "commercial_assets": float(data.commercial_assets),
                "luxury_assets": float(data.luxury_assets),
                "bank_assets": float(data.bank_assets),
            },
            "predicted_status": str(result.get("predicted_status", "Approved" if result.get("approval_probability", 0) >= 0.5 else "Rejected")),
            "approval_probability": float(result.get("approval_probability", 0)),
            "risk": str(result.get("risk", "Low")),
            "anomaly": bool(result.get("anomaly", False)),
            "emi": float(result.get("emi", 0)),
            "emi_to_income_ratio": float(result.get("emi_to_income_ratio", 0)),
            "affordability": str(result.get("affordability", "High")),
            "recommendation": str(result.get("recommendation", "")),
            "explanations": result.get("explanations", {}),
        }
        res = applications_col.insert_one(doc)
        return str(res.inserted_id)
    except Exception as exc:
        print(f"[Database Error] Failed to insert application into MongoDB: {exc}")
        return None


def get_admin_metrics_from_db(offline_metrics: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Query admin dashboard summary metrics using MongoDB aggregations."""
    if not is_db_connected():
        return None
    try:
        total = applications_col.count_documents({})
        if total == 0:
            return {
                "total_applications": 0,
                "average_approval_probability": 0.0,
                "approvals": 0,
                "approval_status_unknown": 0,
                "risk_distribution": {"Low": 0, "Medium": 0, "High": 0},
                "offline_model_metrics": offline_metrics,
            }

        # Average approval probability
        pipeline_avg = [
            {"$group": {"_id": None, "avg_prob": {"$avg": "$approval_probability"}}}
        ]
        avg_res = list(applications_col.aggregate(pipeline_avg))
        avg_prob = float(avg_res[0]["avg_prob"]) if avg_res else 0.0

        # Approvals count
        approvals = applications_col.count_documents({"predicted_status": "Approved"})

        # Risk distribution aggregation
        pipeline_risk = [
            {"$group": {"_id": "$risk", "count": {"$sum": 1}}}
        ]
        risk_res = list(applications_col.aggregate(pipeline_risk))
        risk_distribution = {"Low": 0, "Medium": 0, "High": 0}
        for item in risk_res:
            label = str(item.get("_id", ""))
            if label in risk_distribution:
                risk_distribution[label] = int(item.get("count", 0))

        return {
            "total_applications": int(total),
            "average_approval_probability": float(avg_prob),
            "approvals": int(approvals),
            "approval_status_unknown": 0,
            "risk_distribution": risk_distribution,
            "offline_model_metrics": offline_metrics,
        }
    except Exception as exc:
        print(f"[Database Error] Failed to aggregate admin metrics from MongoDB: {exc}")
        return None


def get_recent_applications_from_db(limit: int = 50) -> Optional[List[Dict[str, Any]]]:
    """Retrieve recent applications from MongoDB sorted by newest first."""
    if not is_db_connected():
        return None
    try:
        cursor = applications_col.find({}).sort("created_at", DESCENDING).limit(limit)
        results = []
        for doc in cursor:
            # Handle ISO string or datetime for time
            created = doc.get("time") or (doc.get("created_at").isoformat(timespec="seconds") if doc.get("created_at") else "")
            results.append({
                "time": str(created),
                "approval_probability": float(doc.get("approval_probability", 0)),
                "risk": str(doc.get("risk", "Low")),
                "anomaly": bool(doc.get("anomaly", False)),
                "emi": float(doc.get("emi", 0)),
                "predicted_status": str(doc.get("predicted_status", "Approved")),
            })
        return results
    except Exception as exc:
        print(f"[Database Error] Failed to fetch application list from MongoDB: {exc}")
        return None
