
import os
import joblib
import numpy as np
import pandas as pd

from rdkit import Chem, DataStructs
from rdkit.Chem import rdFingerprintGenerator

from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score


# ==========================================
# TATVALAB - RANDOM FOREST MODEL
# ==========================================

DATASET_PATH = "dataset/TatvaLab_EGFR_IC50_Post2020.xlsx"
MODEL_PATH = "trained_models/random_forest.pkl"

FP_SIZE = 2048
RADIUS = 2

DESCRIPTOR_COLUMNS = [
    "molecular_weight",
    "alogp",
    "hbd",
    "hba",
    "rotatable_bonds",
    "tpsa"
]

TARGET_COLUMN = "pchembl_value"


# ==========================================
# STEP 1: LOAD DATASET
# ==========================================

def load_dataset():

    print("\n1. Loading EGFR dataset...")

    df = pd.read_excel(DATASET_PATH)

    df = df.dropna(
        subset=[
            "canonical_smiles",
            TARGET_COLUMN
        ] + DESCRIPTOR_COLUMNS
    ).copy()

    print("Dataset records:", len(df))

    return df


# ==========================================
# STEP 2: EXTRACT MORGAN FINGERPRINTS
# ==========================================

def extract_features(df):

    print("\n2. Extracting molecular features...")

    generator = rdFingerprintGenerator.GetMorganGenerator(
        radius=RADIUS,
        fpSize=FP_SIZE
    )

    features = []

    valid_indices = []

    for index, smiles in enumerate(
        df["canonical_smiles"]
    ):

        mol = Chem.MolFromSmiles(str(smiles))

        if mol is None:
            continue

        fingerprint = generator.GetFingerprint(mol)

        fingerprint_array = np.zeros(
            (FP_SIZE,),
            dtype=np.int8
        )

        DataStructs.ConvertToNumpyArray(
            fingerprint,
            fingerprint_array
        )

        descriptors = df.iloc[index][
            DESCRIPTOR_COLUMNS
        ].to_numpy(dtype=float)

        combined_features = np.concatenate([
            fingerprint_array,
            descriptors
        ])

        features.append(combined_features)

        valid_indices.append(index)

    X = np.array(features, dtype=float)

    y = df.iloc[valid_indices][
        TARGET_COLUMN
    ].to_numpy(dtype=float)

    print("Feature shape:", X.shape)

    print("Valid compounds:", len(y))

    return X, y


# ==========================================
# STEP 3: SPLIT DATASET
# ==========================================

def split_dataset(X, y):

    print("\n3. Splitting dataset...")

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.20,
        random_state=42
    )

    print("Training samples:", len(X_train))

    print("Testing samples:", len(X_test))

    return X_train, X_test, y_train, y_test


# ==========================================
# STEP 4: TRAIN RANDOM FOREST
# ==========================================

def train_model(X_train, y_train):

    print("\n4. Training Random Forest model...")

    model = RandomForestRegressor(
        n_estimators=300,
        max_depth=None,
        min_samples_split=2,
        min_samples_leaf=1,
        random_state=42,
        n_jobs=-1
    )

    model.fit(X_train, y_train)

    print("Random Forest training completed.")

    return model


# ==========================================
# STEP 5: EVALUATE MODEL
# ==========================================

def evaluate_model(model, X_test, y_test):

    print("\n5. Evaluating model...")

    predictions = model.predict(X_test)

    mae = mean_absolute_error(
        y_test,
        predictions
    )

    mse = mean_squared_error(
        y_test,
        predictions
    )

    rmse = np.sqrt(mse)

    r2 = r2_score(
        y_test,
        predictions
    )

    print("\n========== MODEL RESULTS ==========")

    print("R2 Score:", round(r2, 4))

    print("MAE:", round(mae, 4))

    print("RMSE:", round(rmse, 4))

    print("===================================")

    return {
        "r2": float(r2),
        "mae": float(mae),
        "rmse": float(rmse)
    }


# ==========================================
# STEP 6: SAVE MODEL
# ==========================================

def save_model(model, metrics):

    os.makedirs(
        "trained_models",
        exist_ok=True
    )

    model_data = {
        "model": model,
        "metrics": metrics,
        "fp_size": FP_SIZE,
        "radius": RADIUS,
        "descriptor_columns": DESCRIPTOR_COLUMNS
    }

    joblib.dump(
        model_data,
        MODEL_PATH
    )

    print("\nModel saved successfully.")

    print("Location:", MODEL_PATH)


# ==========================================
# MAIN FUNCTION
# ==========================================

def main():

    print("\n===================================")

    print("TATVALAB RANDOM FOREST TRAINING")

    print("===================================")

    df = load_dataset()

    X, y = extract_features(df)

    X_train, X_test, y_train, y_test = split_dataset(
        X,
        y
    )

    model = train_model(
        X_train,
        y_train
    )

    metrics = evaluate_model(
        model,
        X_test,
        y_test
    )

    save_model(
        model,
        metrics
    )

    print("\nRANDOM FOREST PIPELINE COMPLETED")


if __name__ == "__main__":

    main()
