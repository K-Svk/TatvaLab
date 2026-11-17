
import os
import time
import requests
import pandas as pd

from rdkit import Chem
from rdkit.Chem import Descriptors, Lipinski, Crippen


# ==========================================
# TATVALAB - DRUG DISCOVERY SYSTEM
# ==========================================

BASE_URL = "https://www.ebi.ac.uk/chembl/api/data"

TARGET_ID = "CHEMBL203"
START_YEAR = 2020
MAX_COMPOUNDS = 2000

OUTPUT_FILE = os.path.join(
    "dataset",
    "TatvaLab_EGFR_IC50_Post2020.xlsx"
)

ACTIVITY_BATCH_SIZE = 500
STRUCTURE_BATCH_SIZE = 100
MAX_RETRIES = 5

session = requests.Session()

session.headers.update({
    "User-Agent": "TatvaLab-DrugDiscovery/1.0"
})


# ==========================================
# COMMON API REQUEST FUNCTION
# ==========================================

def get_api_data(url, params):

    for attempt in range(1, MAX_RETRIES + 1):

        try:

            response = session.get(
                url,
                params=params,
                timeout=120
            )

            response.raise_for_status()

            return response.json()

        except requests.RequestException as error:

            print(
                f"API error: Attempt "
                f"{attempt}/{MAX_RETRIES}"
            )

            print(error)

            if attempt == MAX_RETRIES:

                raise

            wait_time = attempt * 5

            print(
                f"Retrying after {wait_time} seconds..."
            )

            time.sleep(wait_time)

    raise RuntimeError("API request failed.")


# ==========================================
# STEP 1: DOWNLOAD ACTIVITY DATA
# ==========================================

def download_activity_data():

    print("\n1. Downloading EGFR activity data...")

    activities = []

    offset = 0
    limit = ACTIVITY_BATCH_SIZE

    while True:

        params = {

            "target_chembl_id": TARGET_ID,

            "standard_type": "IC50",

            "standard_relation": "=",

            "standard_units": "nM",

            "pchembl_value__isnull": "false",

            "document_year__gte": START_YEAR,

            "limit": limit,

            "offset": offset

        }

        data = get_api_data(
            f"{BASE_URL}/activity.json",
            params
        )

        page = data.get("activities", [])

        if not page:

            break

        activities.extend(page)

        print(
            "Activity records downloaded:",
            len(activities)
        )

        if len(page) < limit:

            break

        offset += limit

        time.sleep(1)

    print("\nActivity download completed.")

    return pd.DataFrame(activities)


# ==========================================
# STEP 2: DOWNLOAD COMPOUND STRUCTURES
# ==========================================

def download_compound_structures(compound_ids):

    print("\n2. Downloading compound structures...")

    molecule_data = {}

    total_batches = (
        len(compound_ids) + STRUCTURE_BATCH_SIZE - 1
    ) // STRUCTURE_BATCH_SIZE

    for batch_number, start in enumerate(
        range(0, len(compound_ids), STRUCTURE_BATCH_SIZE),
        start=1
    ):

        batch = compound_ids[
            start:start + STRUCTURE_BATCH_SIZE
        ]

        params = {

            "molecule_chembl_id__in": ",".join(batch),

            "limit": STRUCTURE_BATCH_SIZE

        }

        data = get_api_data(
            f"{BASE_URL}/molecule.json",
            params
        )

        molecules = data.get("molecules", [])

        for molecule in molecules:

            molecule_id = molecule.get(
                "molecule_chembl_id"
            )

            structures = (
                molecule.get("molecule_structures") or {}
            )

            smiles = structures.get(
                "canonical_smiles"
            )

            if molecule_id and smiles:

                molecule_data[molecule_id] = smiles

        print(
            f"Structure batch {batch_number}/{total_batches}:",
            len(molecule_data),
            "compounds found"
        )

        time.sleep(1)

    return molecule_data


# ==========================================
# STEP 3: CLEAN ACTIVITY DATA
# ==========================================

def clean_activity_data(activity_df):

    print("\n3. Cleaning activity records...")

    activity_df["document_year"] = pd.to_numeric(
        activity_df["document_year"],
        errors="coerce"
    )

    activity_df["pchembl_value"] = pd.to_numeric(
        activity_df["pchembl_value"],
        errors="coerce"
    )

    activity_df["standard_value"] = pd.to_numeric(
        activity_df["standard_value"],
        errors="coerce"
    )

    activity_df = activity_df[
        activity_df["document_year"] >= START_YEAR
    ].copy()

    activity_df = activity_df.dropna(
        subset=[
            "molecule_chembl_id",
            "pchembl_value",
            "standard_value"
        ]
    )

    # Exclude records with data validity warnings.
    # Retain records with no warning or manually validated.

    if "data_validity_comment" in activity_df.columns:

        activity_df = activity_df[
            activity_df["data_validity_comment"].isna()
            |
            (
                activity_df["data_validity_comment"]
                == "Manually validated"
            )
        ].copy()

    print(
        "Clean activity records:",
        len(activity_df)
    )

    return activity_df


# ==========================================
# STEP 4: VALIDATE SMILES AND CALCULATE
# MOLECULAR PROPERTIES
# ==========================================

def process_compounds(activity_df, molecule_data):

    print("\n4. Validating SMILES...")

    activity_df["canonical_smiles"] = (
        activity_df["molecule_chembl_id"].map(
            molecule_data
        )
    )

    activity_df = activity_df.dropna(
        subset=["canonical_smiles"]
    ).copy()

    clean_records = []

    invalid_count = 0

    for _, row in activity_df.iterrows():

        smiles = str(row["canonical_smiles"])

        mol = Chem.MolFromSmiles(smiles)

        if mol is None:

            invalid_count += 1

            continue

        canonical_smiles = Chem.MolToSmiles(mol)

        record = {

            "molecule_chembl_id":
                row["molecule_chembl_id"],

            "target_chembl_id":
                TARGET_ID,

            "target_pref_name":
                row.get("target_pref_name"),

            "target_organism":
                row.get("target_organism"),

            "assay_chembl_id":
                row.get("assay_chembl_id"),

            "assay_type":
                row.get("assay_type"),

            "document_year":
                row.get("document_year"),

            "standard_type":
                "IC50",

            "standard_relation":
                "=",

            "standard_value":
                row.get("standard_value"),

            "standard_units":
                "nM",

            "pchembl_value":
                row["pchembl_value"],

            "canonical_smiles":
                canonical_smiles,

            "molecular_weight":
                round(Descriptors.MolWt(mol), 3),

            "alogp":
                round(Crippen.MolLogP(mol), 3),

            "hbd":
                Lipinski.NumHDonors(mol),

            "hba":
                Lipinski.NumHAcceptors(mol),

            "rotatable_bonds":
                Lipinski.NumRotatableBonds(mol),

            "tpsa":
                round(Descriptors.TPSA(mol), 3)

        }

        clean_records.append(record)

    clean_df = pd.DataFrame(clean_records)

    print(
        "Valid activity records:",
        len(clean_df)
    )

    print(
        "Invalid SMILES records:",
        invalid_count
    )

    return clean_df


# ==========================================
# STEP 5: REMOVE DUPLICATES AND GROUP
# BY UNIQUE COMPOUND
# ==========================================

def create_final_dataset(clean_df):

    print("\n5. Removing duplicate records...")

    if clean_df.empty:

        return pd.DataFrame()

    clean_df = clean_df.drop_duplicates(
        subset=[
            "molecule_chembl_id",
            "assay_chembl_id",
            "standard_value",
            "document_year"
        ]
    )

    final_df = (
        clean_df.groupby(
            "molecule_chembl_id",
            as_index=False
        )
        .agg({

            "target_chembl_id": "first",

            "target_pref_name": "first",

            "target_organism": "first",

            "assay_chembl_id": "first",

            "assay_type": "first",

            "canonical_smiles": "first",

            "molecular_weight": "first",

            "alogp": "first",

            "hbd": "first",

            "hba": "first",

            "rotatable_bonds": "first",

            "tpsa": "first",

            "standard_type": "first",

            "standard_relation": "first",

            "standard_units": "first",

            "standard_value": "median",

            "pchembl_value": "median",

            "document_year": "max"

        })
    )

    # Select maximum 2000 unique compounds

    final_df = final_df.head(
        MAX_COMPOUNDS
    ).copy()

    return final_df


# ==========================================
# STEP 6: SAVE EXCEL FILE
# ==========================================

def save_dataset(final_df):

    os.makedirs(
        "dataset",
        exist_ok=True
    )

    final_df.to_excel(
        OUTPUT_FILE,
        index=False
    )

    print("\nExcel file saved successfully.")


# ==========================================
# STEP 7: DISPLAY FINAL REPORT
# ==========================================

def display_report(final_df):

    print("\n======================================")

    print("TATVALAB DATASET DOWNLOAD COMPLETED")

    print("======================================")

    print("Target:", TARGET_ID)

    print("Publication year:", START_YEAR, "onwards")

    print("Maximum compounds:", MAX_COMPOUNDS)

    print(
        "Final unique compounds:",
        len(final_df)
    )

    print(
        "Valid SMILES:",
        final_df["canonical_smiles"].notna().sum()
    )

    print(
        "Unique compound IDs:",
        final_df["molecule_chembl_id"].nunique()
    )

    print(
        "Publication year range:",
        final_df["document_year"].min(),
        "-",
        final_df["document_year"].max()
    )

    print(
        "pChEMBL range:",
        final_df["pchembl_value"].min(),
        "-",
        final_df["pchembl_value"].max()
    )

    print("\nSaved file:")

    print(OUTPUT_FILE)

    print("\nFirst five records:")

    print(
        final_df.head().to_string(index=False)
    )


# ==========================================
# MAIN FUNCTION
# ==========================================

def main():

    print("======================================")

    print("TATVALAB - EGFR DRUG DISCOVERY")

    print("======================================")

    # Step 1

    activity_df = download_activity_data()

    if activity_df.empty:

        print("No EGFR activity records found.")

        return

    # Step 2

    activity_df = clean_activity_data(
        activity_df
    )

    if activity_df.empty:

        print("No usable activity records found.")

        return

    # Step 3

    compound_ids = (
        activity_df["molecule_chembl_id"]
        .dropna()
        .unique()
        .tolist()
    )

    print(
        "\nUnique compound IDs:",
        len(compound_ids)
    )

    # Step 4

    molecule_data = download_compound_structures(
        compound_ids
    )

    if not molecule_data:

        print("No compound structures downloaded.")

        return

    # Step 5

    clean_df = process_compounds(
        activity_df,
        molecule_data
    )

    if clean_df.empty:

        print("No valid compounds found.")

        return

    # Step 6

    final_df = create_final_dataset(
        clean_df
    )

    if final_df.empty:

        print("Final dataset is empty.")

        return

    # Step 7

    save_dataset(final_df)

    # Step 8

    display_report(final_df)


# ==========================================
# PROGRAM ENTRY POINT
# ==========================================

if __name__ == "__main__":

    main()
