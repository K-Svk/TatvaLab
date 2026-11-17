import json
import main
from main import (
    app,
    home,
    health,
    mongodb_status,
    validate_smiles,
    predict_activity,
    get_predictions_history,
    get_model_performance,
    get_dashboard_stats,
    run_virtual_screening,
    SMILESRequest,
    PredictionRequest,
    ScreeningRequest,
    ScreeningCompound,
)

print("=" * 65)
print("TATVALAB BACKEND API ENDPOINT UNIT TESTS")
print("=" * 65)

# Test 1: Home
res1 = home()
print("\n[TEST 1] GET /")
print(f"Response: {res1}")
assert res1["status"] == "Backend is running"
assert res1["best_model"] == "Random Forest"

# Test 2: Health
res2 = health()
print("\n[TEST 2] GET /health")
print(f"Response: {res2}")
assert res2["status"] == "healthy"

# Test 3: MongoDB Status
res3 = mongodb_status()
print("\n[TEST 3] GET /mongodb-status")
print(f"Response: {res3}")
assert "connected" in res3
assert "cluster" in res3

# Test 4: Validate SMILES (Valid)
res4 = validate_smiles(SMILESRequest(smiles="CCO"))
print("\n[TEST 4] POST /validate-smiles (Valid: CCO)")
print(f"Response: {res4}")
assert res4["valid"] is True
assert res4["data"]["canonical_smiles"] == "CCO"
assert "molecular_weight" in res4["data"]

# Test 4b: Validate SMILES (Invalid)
res4b = validate_smiles(SMILESRequest(smiles="InvalidSmilesXYZ!!!"))
print("\n[TEST 4b] POST /validate-smiles (Invalid)")
print(f"Response: {res4b}")
assert res4b["valid"] is False

# Test 5: Model Performance
res5 = get_model_performance()
print("\n[TEST 5] GET /model-performance")
print(f"Best model: {res5['best_model']}")
for m in res5["models"]:
    print(f" - {m['name']}: R²={m['r2_score']}, MAE={m['mae']}, RMSE={m['rmse']}")
rf_entry = next(m for m in res5["models"] if m["name"] == "Random Forest")
xgb_entry = next(m for m in res5["models"] if m["name"] == "XGBoost")
assert rf_entry["r2_score"] == 0.5468
assert rf_entry["mae"] == 0.5720
assert rf_entry["rmse"] == 0.7847
assert xgb_entry["r2_score"] == 0.5206
assert xgb_entry["mae"] == 0.6072
assert xgb_entry["rmse"] == 0.8071

# Test 6: Predict Activity (EGFR kinase inhibitor: Gefitinib)
gefitinib_smiles = "COc1cc2ncnc(Nc3ccc(F)c(Cl)c3)c2cc1OCCCN1CCOCC1"
res6 = predict_activity(
    PredictionRequest(
        compound_name="Gefitinib",
        smiles=gefitinib_smiles,
        target_protein="EGFR",
        target_chembl_id="CHEMBL203",
    )
)
print("\n[TEST 6] POST /predict-activity (Gefitinib)")
print(f"Compound: {res6['compound_name']}")
print(f"Canonical SMILES: {res6['canonical_smiles']}")
print(f"Predicted pChEMBL value: {res6['predicted_pchembl_value']}")
print(f"Model name: {res6['model_name']}")
print(f"Target: {res6['target']}")
print(f"Activity class: {res6['activity_classification']}")
print(f"Molecular weight: {res6['molecular_properties']['molecular_weight']}")
print(f"Saved to DB: {res6['saved_to_database']}")
assert res6["success"] is True
assert res6["compound_name"] == "Gefitinib"
assert res6["predicted_pchembl_value"] > 0
assert res6["model_name"] == "Random Forest"

# Test 7: Dashboard Stats
res7 = get_dashboard_stats()
print("\n[TEST 7] GET /dashboard-stats")
print(f"Response: {res7}")
assert res7["target_protein"] == "EGFR"
assert res7["dataset_compounds"] == 2000
assert res7["best_model_r2"] == 0.5468

# Test 8: Virtual Screening
res8 = run_virtual_screening(
    ScreeningRequest(
        compounds=[
            ScreeningCompound(name="Gefitinib", smiles=gefitinib_smiles),
            ScreeningCompound(name="Erlotinib", smiles="C#Cc1cccc(Nc2ncnc3cc(OCCOC)c(OCCOC)cc23)c1"),
            ScreeningCompound(name="Aspirin", smiles="CC(=O)Oc1ccccc1C(=O)O"),
            ScreeningCompound(name="Ethanol", smiles="CCO"),
        ]
    )
)
print("\n[TEST 8] POST /virtual-screening")
print(f"Total screened: {res8['total_screened']}")
for r in res8["results"]:
    print(f" - {r['name']}: pChEMBL={r['predicted_pchembl_value']}, score={r['score']}")
assert res8["success"] is True
assert res8["total_screened"] == 4
assert len(res8["results"]) == 4

print("\n" + "=" * 65)
print("ALL BACKEND ENDPOINT TESTS PASSED SUCCESSFULLY!")
print("=" * 65)
