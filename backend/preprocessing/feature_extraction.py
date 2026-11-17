
import numpy as np
from rdkit import Chem
from rdkit.Chem import Descriptors, rdMolDescriptors
from rdkit.Chem import AllChem


def extract_features(smiles):

    mol = Chem.MolFromSmiles(smiles)

    if mol is None:
        raise ValueError("Invalid SMILES string")

    descriptors = [
        Descriptors.MolWt(mol),
        Descriptors.MolLogP(mol),
        Descriptors.TPSA(mol),
        rdMolDescriptors.CalcNumHBD(mol),
        rdMolDescriptors.CalcNumHBA(mol),
        rdMolDescriptors.CalcNumRotatableBonds(mol),
        mol.GetNumHeavyAtoms()
    ]

    fingerprint = AllChem.GetMorganFingerprintAsBitVect(
        mol,
        radius=2,
        nBits=2048
    )

    fingerprint_array = np.array(
        fingerprint,
        dtype=np.float32
    )

    return np.concatenate([
        np.array(descriptors, dtype=np.float32),
        fingerprint_array
    ])
