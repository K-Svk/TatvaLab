from preprocessing.smiles_processing import process_smiles
from preprocessing.feature_extraction import extract_features

smiles = "CCO"

result = process_smiles(smiles)

print("SMILES RESULT:")
print(result)

features = extract_features(smiles)

print("\nFEATURE EXTRACTION:")
print("Total features:", len(features))
print("Features extracted successfully!")