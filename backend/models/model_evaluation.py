
import os
import joblib
import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

from random_forest import load_dataset, extract_features as rf_extract_features
from xgboost_model import extract_features as xgb_extract_features


def evaluate_model(name, model_path, X, y):

    print(f"\nEvaluating {name}...")

    saved_data = joblib.load(model_path)
    model = saved_data["model"]

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.20,
        random_state=42
    )

    predictions = model.predict(X_test)

    r2 = r2_score(y_test, predictions)
    mae = mean_absolute_error(y_test, predictions)
    rmse = mean_squared_error(y_test, predictions) ** 0.5

    return {
        "Model": name,
        "R2 Score": round(r2, 4),
        "MAE": round(mae, 4),
        "RMSE": round(rmse, 4)
    }


if __name__ == "__main__":

    print("===================================")
    print("TATVALAB MODEL EVALUATION")
    print("===================================")

    print("\n1. Loading dataset...")

    df = load_dataset()

    print("\n2. Extracting molecular features...")

    X, y = rf_extract_features(df)

    print("\n3. Evaluating trained models...")

    results = []

    results.append(
        evaluate_model(
            "Random Forest",
            "trained_models/random_forest.pkl",
            X,
            y
        )
    )

    results.append(
        evaluate_model(
            "XGBoost",
            "trained_models/xgboost_model.pkl",
            X,
            y
        )
    )

    results_df = pd.DataFrame(results)

    print("\n========== MODEL COMPARISON ==========")
    print(results_df.to_string(index=False))
    print("======================================")

    os.makedirs("trained_models", exist_ok=True)

    output_path = "trained_models/model_comparison.xlsx"

    results_df.to_excel(output_path, index=False)

    print("\nEvaluation report saved successfully.")
    print("Location:", output_path)

    best_model = results_df.sort_values(
        by="R2 Score",
        ascending=False
    ).iloc[0]

    print("\nBest Model:", best_model["Model"])
    print("R2 Score:", best_model["R2 Score"])

    print("\nMODEL EVALUATION COMPLETED")
