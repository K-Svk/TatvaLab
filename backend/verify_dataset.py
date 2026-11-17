
import pandas as pd
from rdkit import Chem

FILE_PATH = "dataset/TatvaLab_EGFR_IC50_Post2020.xlsx"

print("TATVALAB DATASET VERIFICATION")
print("=" * 40)

df = pd.read_excel(FILE_PATH)

# Total records
print("\nTotal records:", len(df))

# Unique compounds
print(
    "Unique compounds:",
    df["molecule_chembl_id"].nunique()
)

# Check duplicate compounds
print(
    "Duplicate compounds:",
    df["molecule_chembl_id"].duplicated().sum()
)

# Check missing SMILES
print(
    "Missing SMILES:",
    df["canonical_smiles"].isna().sum()
)

# Validate SMILES
valid_count = 0
invalid_count = 0

for smiles in df["canonical_smiles"].dropna():

    mol = Chem.MolFromSmiles(str(smiles))

    if mol is not None:
        valid_count += 1
    else:
        invalid_count += 1

print("\nSMILES VALIDATION")
print("-" * 30)

print("Valid SMILES:", valid_count)
print("Invalid SMILES:", invalid_count)

# Check pChEMBL
print("\nACTIVITY DATA")
print("-" * 30)

print(
    "Missing pChEMBL values:",
    df["pchembl_value"].isna().sum()
)

print(
    "pChEMBL minimum:",
    df["pchembl_value"].min()
)

print(
    "pChEMBL maximum:",
    df["pchembl_value"].max()
)

# Check target
print("\nTARGET:", df["target_chembl_id"].unique())

# Final report
print("\n" + "=" * 40)

if (
    len(df) <= 2000
    and df["molecule_chembl_id"].nunique() == len(df)
    and valid_count == len(df)
    and df["pchembl_value"].notna().all()
):
    print("DATASET VERIFICATION PASSED")

else:
    print("DATASET NEEDS FURTHER CHECKING")

print("=" * 40)
