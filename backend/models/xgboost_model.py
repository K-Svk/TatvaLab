
import os
import joblib
import numpy as np
import pandas as pd

from rdkit import Chem, DataStructs
from rdkit.Chem import rdFingerprintGenerator

from xgboost import XGBRegressor

from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score


DATASET_PATH = "dataset/TatvaLab_EGFR_IC50_Post2020.xlsx"
MODEL_PATH = "trained_models/xgboost_model.pkl"

DESCRIPTOR_COLUMNS = [
    "molecular_weight",
    "alogp",
    "hbd",
    "hba",
    "rotatable_bonds",
    "tpsa"
]

TARGET_COLUMN = "pchembl_value"

FP_SIZE = 2048
RADIUS = 2


def load_dataset():
    print("\n1. Loading EGFR dataset...")

    df = pd.read_excel(DATASET_PATH)

    print("Dataset records:", len(df))

    required_columns = [
        "canonical_smiles",
        TARGET_COLUMN
    ] + DESCRIPTOR_COLUMNS

    missing = [col for col in required_columns if col not in df.columns]

    if missing:
        raise ValueError(f"Missing dataset columns: {missing}")

    df = df.dropna(subset=["canonical_smiles", TARGET_COLUMN]).copy()

    return df


def extract_features(df):
    print("\n2. Extracting molecular features...")

    generator = rdFingerprintGenerator.GetMorganGenerator(
        radius=RADIUS,
        fpSize=FP_SIZE
    )

    features = []
    targets = []

    descriptor_data = df[DESCRIPTOR_COLUMNS].copy()
    descriptor_data = descriptor_data.fillna(descriptor_data.median())

    for position, (_, row) in enumerate(df.iterrows()):

        smiles = row["canonical_smiles"]
        molecule = Chem.MolFromSmiles(str(smiles))

        if molecule is None:
            continue

        fingerprint = generator.GetFingerprint(molecule)

        fingerprint_array = np.zeros((FP_SIZE,), dtype=np.float32)
        DataStructs.ConvertToNumpyArray(
            fingerprint,
            fingerprint_array
        )

        descriptors = descriptor_data.iloc[position].to_numpy(
            dtype=np.float32
        )

        combined_features = np.concatenate(
            [fingerprint_array, descriptors]
        )

        features.append(combined_features)
        targets.append(float(row[TARGET_COLUMN]))

    X = np.array(features, dtype=np.float32)
    y = np.array(targets, dtype=np.float32)

    print("Feature shape:", X.shape)
    print("Valid compounds:", len(X))

    return X, y


def train_model(X, y):
    print("\n3. Splitting dataset...")

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.20,
        random_state=42
    )

    print("Training samples:", len(X_train))
    print("Testing samples:", len(X_test))

    print("\n4. Training XGBoost model...")

    model = XGBRegressor(
        n_estimators=500,
        max_depth=5,
        learning_rate=0.03,
        subsample=0.8,
        colsample_bytree=0.8,
        objective="reg:squarederror",
        eval_metric="rmse",
        random_state=42,
        n_jobs=-1
    )

    model.fit(X_train, y_train)

    print("XGBoost training completed.")

    print("\n5. Evaluating model...")

    predictions = model.predict(X_test)

    r2 = r2_score(y_test, predictions)
    mae = mean_absolute_error(y_test, predictions)
    rmse = np.sqrt(mean_squared_error(y_test, predictions))

    metrics = {
        "r2_score": float(r2),
        "mae": float(mae),
        "rmse": float(rmse)
    }

    print("\n========== MODEL RESULTS ==========")
    print(f"R2 Score: {r2:.4f}")
    print(f"MAE: {mae:.4f}")
    print(f"RMSE: {rmse:.4f}")
    print("===================================")

    os.makedirs("trained_models", exist_ok=True)

    joblib.dump(
        {
            "model": model,
            "metrics": metrics,
            "fp_size": FP_SIZE,
            "radius": RADIUS,
            "descriptor_columns": DESCRIPTOR_COLUMNS
        },
        MODEL_PATH
    )

    print("\nModel saved successfully.")
    print("Location:", MODEL_PATH)

    return metrics


if __name__ == "__main__":

    df = load_dataset()

    X, y = extract_features(df)

    metrics = train_model(X, y)

    print("\nXGBOOST PIPELINE COMPLETED")
