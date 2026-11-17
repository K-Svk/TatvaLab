
from rdkit import Chem
from rdkit.Chem import Descriptors, rdMolDescriptors


def process_smiles(smiles):

    if not smiles or not smiles.strip():
        return {
            "valid": False,
            "message": "SMILES cannot be empty"
        }

    mol = Chem.MolFromSmiles(smiles.strip())

    if mol is None:
        return {
            "valid": False,
            "message": "Invalid SMILES string"
        }

    return {
        "valid": True,
        "canonical_smiles": Chem.MolToSmiles(mol),
        "molecular_weight": round(Descriptors.MolWt(mol), 3),
        "logp": round(Descriptors.MolLogP(mol), 3),
        "tpsa": round(Descriptors.TPSA(mol), 3),
        "h_bond_donors": rdMolDescriptors.CalcNumHBD(mol),
        "h_bond_acceptors": rdMolDescriptors.CalcNumHBA(mol),
        "rotatable_bonds": rdMolDescriptors.CalcNumRotatableBonds(mol),
        "heavy_atoms": mol.GetNumHeavyAtoms()
    }
