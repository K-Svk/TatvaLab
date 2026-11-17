
import pandas as pd

file_path = "dataset/TatvaLab_ChEMBL_EGFR_IC50_Post2020.xlsx"

# Read Excel dataset
df = pd.read_excel(file_path)

print("\n===== DATASET INFORMATION =====")
print("Total Rows:", df.shape[0])
print("Total Columns:", df.shape[1])

print("\n===== COLUMN NAMES =====")
for column in df.columns:
    print(column)

print("\n===== FIRST 5 RECORDS =====")
print(df.head().to_string())

print("\n===== DATA TYPES =====")
print(df.dtypes)

print("\n===== MISSING VALUES =====")
print(df.isnull().sum())
