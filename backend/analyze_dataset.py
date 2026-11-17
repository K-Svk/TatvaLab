
import pandas as pd
from rdkit import Chem
from rdkit.Chem import Descriptors

file_path = "dataset/TatvaLab_ChEMBL_EGFR_IC50_Post2020.xlsx"

df = pd.read_excel(file_path)

print("\n===== DATASET QUALITY ANALYSIS =====")

# Unique compounds
print("Total records:", len(df))
print("Unique compound IDs:", df["molecule_chembl_id"].nunique())
print("Unique SMILES:", df["canonical_smiles"].nunique())

# Duplicate SMILES
print("\nDuplicate SMILES records:")
print(df["canonical_smiles"].duplicated().sum())

# Validate SMILES
df["mol"] = df["canonical_smiles"].apply(
    lambda x: Chem.MolFromSmiles(str(x))
)

valid_count = df["mol"].notna().sum()
invalid_count = df["mol"].isna().sum()

print("\nValid SMILES:", valid_count)
print("Invalid SMILES:", invalid_count)

# Compare molecular weights
df["calculated_mw"] = df["mol"].apply(
    lambda mol: Descriptors.MolWt(mol) if mol else None
)

df["mw_difference"] = (
    df["calculated_mw"] - df["molecular_weight"]
).abs()

print("\nMolecular weight comparison:")
print(df[
    ["molecule_chembl_id", "molecular_weight",
     "calculated_mw", "mw_difference"]
].head(10).to_string(index=False))

print("\n===== ACTIVITY INFORMATION =====")
print("pChEMBL minimum:", df["pchembl_value"].min())
print("pChEMBL maximum:", df["pchembl_value"].max())
print("pChEMBL average:", df["pchembl_value"].mean())

print("\nActivity relations:")
print(df["standard_relation"].value_counts())

print("\nActivity types:")
print(df["standard_type"].value_counts())

print("\n===== TARGET INFORMATION =====")
print(df["target_chembl_id"].value_counts())
