import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from rdkit import Chem, DataStructs
from rdkit.Chem import Descriptors, rdFingerprintGenerator, rdMolDescriptors

import database

# Paths
BASE_DIR = Path(__file__).resolve().parent
TRAINED_MODELS_DIR = BASE_DIR / "trained_models"
RF_MODEL_PATH = TRAINED_MODELS_DIR / "random_forest.pkl"
XGB_MODEL_PATH = TRAINED_MODELS_DIR / "xgboost_model.pkl"
COMPARISON_PATH = TRAINED_MODELS_DIR / "model_comparison.xlsx"

FP_SIZE = 2048
RADIUS = 2

DESCRIPTOR_COLUMNS = [
    "molecular_weight",
    "alogp",
    "hbd",
    "hba",
    "rotatable_bonds",
    "tpsa",
]

# In-memory model cache
_rf_model_bundle = None
_xgb_model_bundle = None


def get_rf_model():
    """Load or return cached Random Forest model."""
    global _rf_model_bundle
    if _rf_model_bundle is None:
        if not RF_MODEL_PATH.exists():
            raise HTTPException(
                status_code=500,
                detail=f"Random Forest model file not found at {RF_MODEL_PATH}",
            )
        _rf_model_bundle = joblib.load(RF_MODEL_PATH)
    return _rf_model_bundle["model"]


def get_xgb_model():
    """Load or return cached XGBoost model."""
    global _xgb_model_bundle
    if _xgb_model_bundle is None:
        if XGB_MODEL_PATH.exists():
            _xgb_model_bundle = joblib.load(XGB_MODEL_PATH)
    return _xgb_model_bundle["model"] if _xgb_model_bundle else None


# Lifespan event handler for MongoDB connection on startup
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Try connecting to MongoDB on startup
    print("TatvaLab backend starting up... Connecting to MongoDB Atlas...")
    database.connect_to_mongodb()
    yield
    print("TatvaLab backend shutting down.")


app = FastAPI(
    title="TatvaLab Drug Discovery API",
    description="Machine Learning Based Drug Discovery System with EGFR Target Prediction and MongoDB Atlas",
    version="1.1.0",
    lifespan=lifespan,
)

# CORS Middleware for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request & Response Schemas
class SMILESRequest(BaseModel):
    smiles: str = Field(..., description="Chemical SMILES string", example="CCO")


class PredictionRequest(BaseModel):
    compound_name: str = Field(..., description="Name or identifier of the compound", example="Erlotinib")
    smiles: str = Field(..., description="Chemical SMILES string", example="C#Cc1cccc(Nc2ncnc3cc(OCCOC)c(OCCOC)cc23)c1")
    target_protein: Optional[str] = Field("EGFR", description="Target protein name")
    target_chembl_id: Optional[str] = Field("CHEMBL203", description="Target ChEMBL identifier")
    save_to_database: Optional[bool] = Field(True, description="Whether to save the result in MongoDB")


class DirectSaveRequest(BaseModel):
    compound_name: str
    original_smiles: str
    canonical_smiles: Optional[str] = None
    predicted_pchembl_value: float
    target_protein: Optional[str] = "EGFR"
    target_chembl_id: Optional[str] = "CHEMBL203"
    model_name: Optional[str] = "Random Forest"
    created_at: Optional[str] = None
    molecular_descriptors: Optional[dict] = None


class ScreeningCompound(BaseModel):
    name: str
    smiles: str
    target: Optional[str] = "EGFR"


class ScreeningRequest(BaseModel):
    compounds: List[ScreeningCompound]
    save_to_database: Optional[bool] = False


# Molecular Feature Extraction
def extract_molecular_features(smiles: str):
    """Generate Morgan fingerprint (2048-bit, radius 2) and 6 molecular descriptors.
    Matches the exact training feature representation.
    """
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        raise ValueError("Invalid SMILES string")

    generator = rdFingerprintGenerator.GetMorganGenerator(
        radius=RADIUS,
        fpSize=FP_SIZE,
    )
    fingerprint = generator.GetFingerprint(mol)

    fingerprint_array = np.zeros((FP_SIZE,), dtype=np.float32)
    DataStructs.ConvertToNumpyArray(fingerprint, fingerprint_array)

    descriptors = np.array(
        [
            Descriptors.MolWt(mol),
            Descriptors.MolLogP(mol),
            rdMolDescriptors.CalcNumHBD(mol),
            rdMolDescriptors.CalcNumHBA(mol),
            rdMolDescriptors.CalcNumRotatableBonds(mol),
            Descriptors.TPSA(mol),
        ],
        dtype=np.float32,
    )

    features = np.concatenate([fingerprint_array, descriptors])
    return features.reshape(1, -1), mol


def calculate_descriptors_dict(mol):
    """Return dictionary of physicochemical properties calculated by RDKit."""
    return {
        "molecular_weight": round(float(Descriptors.MolWt(mol)), 3),
        "alogp": round(float(Descriptors.MolLogP(mol)), 3),
        "tpsa": round(float(Descriptors.TPSA(mol)), 3),
        "hbd": int(rdMolDescriptors.CalcNumHBD(mol)),
        "hba": int(rdMolDescriptors.CalcNumHBA(mol)),
        "rotatable_bonds": int(rdMolDescriptors.CalcNumRotatableBonds(mol)),
        "heavy_atoms": int(mol.GetNumHeavyAtoms()),
    }


# Endpoints
@app.get("/")
def home():
    status = database.get_connection_status()
    return {
        "message": "Welcome to TatvaLab Drug Discovery API",
        "status": "Backend is running",
        "target": "EGFR (CHEMBL203)",
        "best_model": "Random Forest",
        "mongodb_connected": status["connected"],
    }


@app.get("/health")
def health():
    status = database.get_connection_status()
    return {
        "status": "healthy",
        "application": "TatvaLab",
        "mongodb": "connected" if status["connected"] else "disconnected",
        "models_loaded": RF_MODEL_PATH.exists(),
    }


@app.get("/mongodb-status")
@app.get("/api/mongodb-status")
def mongodb_status():
    """Check MongoDB Atlas connection status and configuration."""
    status = database.get_connection_status()
    db_stats = database.get_database_stats() if status["connected"] else {"total_saved_predictions": 0}
    return {
        **status,
        **db_stats,
    }


@app.post("/validate-smiles")
@app.post("/api/validate-smiles")
def validate_smiles(request: SMILESRequest):
    """Validate SMILES string and return computed molecular descriptors."""
    smiles = request.smiles.strip()
    if not smiles:
        return {
            "valid": False,
            "message": "Please enter a SMILES string",
        }

    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return {
            "valid": False,
            "message": "Invalid chemical SMILES string. RDKit could not parse the structure.",
        }

    canonical = Chem.MolToSmiles(mol)
    desc = calculate_descriptors_dict(mol)

    return {
        "valid": True,
        "message": "SMILES processed successfully",
        "data": {
            "valid": True,
            "canonical_smiles": canonical,
            **desc,
        },
    }


@app.post("/predict-activity")
@app.post("/api/predict-activity")
def predict_activity(request: PredictionRequest):
    """Validate SMILES, compute Morgan fingerprints + descriptors,

    predict pChEMBL value using trained Random Forest model,
    and save prediction in MongoDB.
    """
    compound_name = request.compound_name.strip()
    raw_smiles = request.smiles.strip()

    if not compound_name:
        raise HTTPException(status_code=400, detail="Please enter a compound name")

    if not raw_smiles:
        raise HTTPException(status_code=400, detail="Please enter a SMILES string")

    mol = Chem.MolFromSmiles(raw_smiles)
    if mol is None:
        raise HTTPException(
            status_code=400,
            detail="Invalid SMILES string. RDKit could not parse the chemical structure.",
        )

    canonical_smiles = Chem.MolToSmiles(mol)

    try:
        # Extract features
        features, mol_obj = extract_molecular_features(canonical_smiles)
        descriptors = calculate_descriptors_dict(mol_obj)

        # Run Random Forest prediction
        model = get_rf_model()
        prediction = float(model.predict(features)[0])
        pchembl_val = round(prediction, 4)

        target_protein = request.target_protein or "EGFR"
        target_chembl_id = request.target_chembl_id or "CHEMBL203"
        model_name = "Random Forest"
        created_at = datetime.now(timezone.utc).isoformat()

        # Document to save
        prediction_doc = {
            "compound_name": compound_name,
            "original_smiles": raw_smiles,
            "canonical_smiles": canonical_smiles,
            "predicted_pchembl_value": pchembl_val,
            "target_protein": target_protein,
            "target_chembl_id": target_chembl_id,
            "model_name": model_name,
            "created_at": created_at,
            "molecular_descriptors": descriptors,
        }

        saved_to_db = False
        db_id = None
        db_error = None

        if request.save_to_database:
            try:
                saved_record = database.save_prediction(prediction_doc)
                saved_to_db = True
                db_id = saved_record.get("_id")
            except Exception as e:
                saved_to_db = False
                db_error = str(e)
                print(f"Notice: Prediction generated but could not be saved to MongoDB: {e}")

        # Classification / interpretation
        # In pharmacology, pChEMBL = -log10(IC50 in M).
        # pChEMBL >= 7.0 means IC50 <= 100 nM (high potency)
        # pChEMBL >= 6.0 means IC50 <= 1 uM (moderate potency)
        # pChEMBL < 6.0 means IC50 > 1 uM (low potency)
        if pchembl_val >= 7.0:
            activity_level = "High potency (pChEMBL >= 7.0)"
            potency_category = "high"
        elif pchembl_val >= 6.0:
            activity_level = "Moderate potency (6.0 <= pChEMBL < 7.0)"
            potency_category = "moderate"
        else:
            activity_level = "Low potency (pChEMBL < 6.0)"
            potency_category = "low"

        return {
            "success": True,
            "compound_name": compound_name,
            "original_smiles": raw_smiles,
            "canonical_smiles": canonical_smiles,
            "predicted_pchembl_value": pchembl_val,
            "target_protein": target_protein,
            "target_chembl_id": target_chembl_id,
            "model_name": model_name,
            "model": model_name,
            "target": f"{target_protein} ({target_chembl_id})",
            "activity_classification": activity_level,
            "potency_category": potency_category,
            "created_at": created_at,
            "saved_to_database": saved_to_db,
            "database_id": db_id,
            "database_error": db_error,
            "molecular_properties": descriptors,
            "message": (
                f"Prediction completed ({model_name}: {pchembl_val})"
                + (" and saved to MongoDB Atlas." if saved_to_db else ". (MongoDB not saved)")
            ),
        }

    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {str(error)}",
        )


@app.post("/predictions")
@app.post("/api/predictions")
def save_prediction_endpoint(request: DirectSaveRequest):
    """Directly save a prediction record to MongoDB."""
    status = database.get_connection_status()
    if not status["connected"]:
        # Attempt connection
        connected = database.connect_to_mongodb()
        if not connected:
            raise HTTPException(
                status_code=503,
                detail=f"MongoDB Atlas is not connected: {status.get('error')}",
            )

    try:
        saved = database.save_prediction(request.model_dump())
        return {
            "success": True,
            "message": "Prediction saved successfully to MongoDB Atlas",
            "data": saved,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save prediction: {str(e)}")


@app.get("/predictions")
@app.get("/api/predictions")
def get_predictions_history(
    limit: int = Query(50, ge=1, le=500, description="Max records to retrieve"),
    skip: int = Query(0, ge=0, description="Offset for pagination"),
):
    """Retrieve prediction history saved in MongoDB Atlas."""
    records = database.get_predictions(limit=limit, skip=skip)
    status = database.get_connection_status()

    return {
        "success": True,
        "mongodb_connected": status["connected"],
        "count": len(records),
        "data": records,
    }


@app.get("/predictions/{prediction_id}")
@app.get("/api/predictions/{prediction_id}")
def get_single_prediction(prediction_id: str):
    """Retrieve a single prediction by its MongoDB ObjectId string."""
    doc = database.get_prediction_by_id(prediction_id)
    if doc is None:
        raise HTTPException(
            status_code=404,
            detail=f"Prediction with ID '{prediction_id}' not found in MongoDB",
        )
    return {
        "success": True,
        "data": doc,
    }


@app.get("/model-performance")
@app.get("/api/model-performance")
def get_model_performance():
    """Retrieve actual evaluation results for Random Forest and XGBoost models."""
    rf_metrics = None
    xgb_metrics = None

    # Load from joblib files if available
    try:
        if RF_MODEL_PATH.exists():
            rf_data = joblib.load(RF_MODEL_PATH)
            rf_metrics = rf_data.get("metrics")
    except Exception as e:
        print(f"Error loading RF metrics: {e}")

    try:
        if XGB_MODEL_PATH.exists():
            xgb_data = joblib.load(XGB_MODEL_PATH)
            xgb_metrics = xgb_data.get("metrics")
    except Exception as e:
        print(f"Error loading XGB metrics: {e}")

    # Fallback to model_comparison.xlsx if available
    comparison_data = []
    if COMPARISON_PATH.exists():
        try:
            df = pd.read_excel(COMPARISON_PATH)
            comparison_data = df.to_dict(orient="records")
        except Exception as e:
            print(f"Error reading model_comparison.xlsx: {e}")

    return {
        "target": "EGFR (CHEMBL203)",
        "dataset_size": 2000,
        "test_split": "20%",
        "best_model": "Random Forest",
        "models": [
            {
                "name": "Random Forest",
                "r2_score": round(rf_metrics.get("r2", 0.5468), 4) if rf_metrics else 0.5468,
                "mae": round(rf_metrics.get("mae", 0.5720), 4) if rf_metrics else 0.5720,
                "rmse": round(rf_metrics.get("rmse", 0.7847), 4) if rf_metrics else 0.7847,
                "is_best": True,
                "parameters": {
                    "n_estimators": 300,
                    "max_depth": "None",
                    "min_samples_split": 2,
                    "min_samples_leaf": 1,
                    "features": "Morgan Fingerprint (2048-bit, r=2) + 6 Physicochemical Descriptors",
                },
            },
            {
                "name": "XGBoost",
                "r2_score": round(xgb_metrics.get("r2_score", 0.5206), 4) if xgb_metrics else 0.5206,
                "mae": round(xgb_metrics.get("mae", 0.6072), 4) if xgb_metrics else 0.6072,
                "rmse": round(xgb_metrics.get("rmse", 0.8071), 4) if xgb_metrics else 0.8071,
                "is_best": False,
                "parameters": {
                    "n_estimators": 500,
                    "max_depth": 5,
                    "learning_rate": 0.03,
                    "subsample": 0.8,
                    "features": "Morgan Fingerprint (2048-bit, r=2) + 6 Physicochemical Descriptors",
                },
            },
        ],
        "comparison_table": comparison_data,
        "evaluation_summary": (
            "Random Forest achieved the best overall predictive performance with an R² of 0.5468, "
            "lower MAE (0.5720), and lower RMSE (0.7847) compared to XGBoost (R²: 0.5206, MAE: 0.6072, RMSE: 0.8071)."
        ),
    }


@app.get("/dashboard-stats")
@app.get("/api/dashboard-stats")
def get_dashboard_stats():
    """Retrieve real project statistics for the frontend Dashboard."""
    db_status = database.get_connection_status()
    db_stats = database.get_database_stats() if db_status["connected"] else {"total_saved_predictions": 0}
    recent_history = database.get_predictions(limit=5) if db_status["connected"] else []

    return {
        "target_protein": "EGFR",
        "target_chembl_id": "CHEMBL203",
        "dataset_compounds": 2000,
        "saved_predictions": db_stats.get("total_saved_predictions", 0),
        "best_model": "Random Forest",
        "best_model_r2": 0.5468,
        "best_model_mae": 0.5720,
        "best_model_rmse": 0.7847,
        "recent_predictions": recent_history,
        "mongodb_connected": db_status["connected"],
        "mongodb_cluster": db_status["cluster"],
    }


@app.post("/virtual-screening")
@app.post("/api/virtual-screening")
def run_virtual_screening(request: ScreeningRequest):
    """Run model inference on multiple candidate compounds and return ranked results."""
    model = get_rf_model()
    results = []

    for item in request.compounds:
        smiles = item.smiles.strip()
        mol = Chem.MolFromSmiles(smiles)
        if mol is None:
            results.append({
                "name": item.name,
                "smiles": smiles,
                "valid": False,
                "error": "Invalid SMILES",
                "predicted_pchembl_value": None,
                "score": 0.0,
            })
            continue

        canonical = Chem.MolToSmiles(mol)
        try:
            features, _ = extract_molecular_features(canonical)
            pred = float(model.predict(features)[0])
            pchembl_val = round(pred, 4)

            # Normalized illustrative score between 0 and 1 for UI bar
            # (typical pChEMBL ranges from 4 to 10 in EGFR assays)
            normalized_score = max(0.0, min(1.0, (pchembl_val - 4.0) / 6.0))

            res_entry = {
                "name": item.name,
                "compound_name": item.name,
                "smiles": canonical,
                "original_smiles": smiles,
                "valid": True,
                "predicted_pchembl_value": pchembl_val,
                "score": round(normalized_score, 2),
                "target": item.target or "EGFR",
                "model_name": "Random Forest",
                "created_at": datetime.now(timezone.utc).isoformat(),
            }

            if request.save_to_database:
                try:
                    database.save_prediction(res_entry)
                    res_entry["saved"] = True
                except Exception:
                    res_entry["saved"] = False

            results.append(res_entry)
        except Exception as e:
            results.append({
                "name": item.name,
                "smiles": smiles,
                "valid": False,
                "error": str(e),
                "predicted_pchembl_value": None,
                "score": 0.0,
            })

    # Sort valid compounds by predicted pChEMBL descending
    results.sort(
        key=lambda x: (x.get("predicted_pchembl_value") or 0.0),
        reverse=True,
    )

    return {
        "success": True,
        "total_screened": len(request.compounds),
        "valid_count": sum(1 for r in results if r.get("valid")),
        "results": results,
    }
