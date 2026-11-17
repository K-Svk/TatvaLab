
import pandas as pd
from rdkit import Chem

file_path = "dataset/TatvaLab_ChEMBL_EGFR_IC50_Post2020.xlsx"
df = pd.read_excel(file_path)

print("\n===== SMILES INSPECTION =====")

for index, row in df.head(10).iterrows():
    smiles = row["canonical_smiles"]

    print("\nRecord:", index + 1)
    print("Compound ID:", row["molecule_chembl_id"])
    print("SMILES:", repr(smiles))
    print("Data type:", type(smiles).__name__)

    mol = Chem.MolFromSmiles(str(smiles))

    if mol is None:
        print("Status: INVALID")
    else:
        print("Status: VALID")

print("\n===== SMILES SUMMARY =====")
print("Total records:", len(df))
print("Unique SMILES:", df["canonical_smiles"].nunique())
print("Missing SMILES:", df["canonical_smiles"].isna().sum())

print("\n===== OTHER AVAILABLE DATA =====")
print(df[["molecule_chembl_id", "canonical_smiles",
          "standard_inchi"]].head(5).to_string(index=False))
