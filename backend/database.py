import os
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote_plus, unquote_plus

import certifi
from bson import ObjectId
from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.errors import (
    ConfigurationError,
    ConnectionFailure,
    InvalidURI,
    OperationFailure,
    PyMongoError,
    ServerSelectionTimeoutError,
)

# Locate and load .env file from backend directory
BASE_DIR = Path(__file__).resolve().parent
ENV_PATH = BASE_DIR / ".env"
load_dotenv(ENV_PATH)

MONGODB_URI = os.getenv("MONGODB_URI", "")
DATABASE_NAME = os.getenv("MONGODB_DATABASE", "TatvaLab")
COLLECTION_NAME = os.getenv("MONGODB_COLLECTION", "predictions")

# Global connection state
_client = None
_database = None
_predictions_collection = None
_connection_status = {
    "connected": False,
    "cluster": "cluster0.tk2vc1m.mongodb.net",
    "database": DATABASE_NAME,
    "collection": COLLECTION_NAME,
    "error": None,
    "error_type": None,
}


def safe_encode(value: str) -> str:
    """Escapes username or password according to RFC 3986 using urllib.parse.quote_plus.

    To avoid double encoding, unquote_plus is applied first.
    If already encoded (e.g. 'p%40ss'), unquote_plus returns 'p@ss', and quote_plus
    re-encodes to 'p%40ss' without turning '%' into '%25'.
    If raw unencoded (e.g. 'p@ss'), it cleanly encodes to 'p%40ss'.
    """
    if not value:
        return ""
    raw_val = unquote_plus(value)
    return quote_plus(raw_val)


def sanitize_uri(raw_uri: str) -> str:
    """Safely encodes ONLY the username and password in the MongoDB connection string.

    Preserves scheme, cluster hostname, database, and query options.
    Handles special characters (e.g. '@', ':', '#', '%') in passwords correctly.
    """
    if not raw_uri or "://" not in raw_uri:
        return raw_uri

    scheme, rest = raw_uri.split("://", 1)

    # If there is no '@', there are no credentials to encode
    if "@" not in rest:
        return raw_uri

    # In MongoDB connection URIs, the LAST '@' before the cluster hostname
    # separates user credentials from the host and query parameters.
    credentials_part, host_options_part = rest.rsplit("@", 1)

    if ":" in credentials_part:
        # Username and password present: split by first ':'
        username, password = credentials_part.split(":", 1)
        encoded_user = safe_encode(username)
        encoded_pass = safe_encode(password)
        sanitized_credentials = f"{encoded_user}:{encoded_pass}"
    else:
        # Only username present
        sanitized_credentials = safe_encode(credentials_part)

    return f"{scheme}://{sanitized_credentials}@{host_options_part}"


def extract_cluster_host(raw_uri: str) -> str:
    """Safely extracts the cluster hostname from URI for diagnostic display

    without revealing any credentials or query parameters.
    """
    if not raw_uri:
        return "cluster0.tk2vc1m.mongodb.net"
    try:
        if "@" in raw_uri:
            after_at = raw_uri.rsplit("@", 1)[1]
            host = after_at.split("/")[0].split("?")[0]
            return host or "cluster0.tk2vc1m.mongodb.net"
    except Exception:
        pass
    return "cluster0.tk2vc1m.mongodb.net"


def connect_to_mongodb() -> bool:
    """Connect to MongoDB Atlas using PyMongo and verify connectivity via admin ping.

    Never prints or exposes the password or complete connection URI.
    """
    global _client, _database, _predictions_collection, _connection_status

    if not MONGODB_URI:
        _connection_status = {
            "connected": False,
            "cluster": "cluster0.tk2vc1m.mongodb.net",
            "database": DATABASE_NAME,
            "collection": COLLECTION_NAME,
            "error": "MONGODB_URI is missing in .env file",
            "error_type": "ConfigurationError",
        }
        print("MongoDB error: MONGODB_URI is missing in .env file")
        return False

    cluster_host = extract_cluster_host(MONGODB_URI)

    try:
        # Sanitize URI by safely encoding only username and password
        clean_uri = sanitize_uri(MONGODB_URI)

        # Establish connection using certifi CA bundle and timeout limits
        _client = MongoClient(
            clean_uri,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000,
            tlsCAFile=certifi.where(),
        )

        # Ping the admin database to verify credentials and connectivity
        _client.admin.command("ping")

        _database = _client[DATABASE_NAME]
        _predictions_collection = _database[COLLECTION_NAME]

        _connection_status = {
            "connected": True,
            "cluster": cluster_host,
            "database": DATABASE_NAME,
            "collection": COLLECTION_NAME,
            "error": None,
            "error_type": None,
        }
        print(f"MongoDB Atlas connected successfully! Cluster: {cluster_host}")
        return True

    except InvalidURI as uri_err:
        _connection_status = {
            "connected": False,
            "cluster": cluster_host,
            "database": DATABASE_NAME,
            "collection": COLLECTION_NAME,
            "error": f"Invalid URI format: {str(uri_err)}",
            "error_type": "InvalidURI",
        }
        print(f"MongoDB connection failed: {_connection_status['error']}")
        _client = None
        _database = None
        _predictions_collection = None
        return False

    except OperationFailure as op_err:
        err_msg = str(op_err)
        is_auth_error = "bad auth" in err_msg.lower() or "auth failed" in err_msg.lower()
        readable_msg = (
            "Authentication failed: Invalid MongoDB Atlas username or password. "
            "Please verify your database user password in MongoDB Atlas Console "
            "(Database Access -> Edit User -> Edit Password) and update .env."
            if is_auth_error
            else f"Database operation failed: {err_msg}"
        )
        _connection_status = {
            "connected": False,
            "cluster": cluster_host,
            "database": DATABASE_NAME,
            "collection": COLLECTION_NAME,
            "error": readable_msg,
            "error_type": "AuthenticationError" if is_auth_error else "OperationFailure",
        }
        print(f"MongoDB connection failed: {_connection_status['error']}")
        _client = None
        _database = None
        _predictions_collection = None
        return False

    except ServerSelectionTimeoutError as timeout_err:
        err_str = str(timeout_err)
        is_ssl_alert = "TLSV1_ALERT_INTERNAL_ERROR" in err_str or "SSL handshake failed" in err_str
        if is_ssl_alert:
            details = (
                "SSL Handshake failed (TLSV1_ALERT_INTERNAL_ERROR). "
                "In MongoDB Atlas, this occurs when your current IP address is not whitelisted. "
                "Go to MongoDB Atlas -> Network Access -> Add IP Address -> Allow Access from Anywhere (0.0.0.0/0)."
            )
            err_type = "IPAccessRestricted"
        else:
            details = f"Connection timed out (5000ms): Could not reach cluster {cluster_host}."
            err_type = "ServerSelectionTimeout"

        _connection_status = {
            "connected": False,
            "cluster": cluster_host,
            "database": DATABASE_NAME,
            "collection": COLLECTION_NAME,
            "error": details,
            "error_type": err_type,
        }
        print(f"MongoDB connection failed: {_connection_status['error']}")
        _client = None
        _database = None
        _predictions_collection = None
        return False

    except ConnectionFailure as conn_err:
        _connection_status = {
            "connected": False,
            "cluster": cluster_host,
            "database": DATABASE_NAME,
            "collection": COLLECTION_NAME,
            "error": f"Network / connection failed: {str(conn_err)}",
            "error_type": "ConnectionFailure",
        }
        print(f"MongoDB connection failed: {_connection_status['error']}")
        _client = None
        _database = None
        _predictions_collection = None
        return False

    except Exception as general_err:
        _connection_status = {
            "connected": False,
            "cluster": cluster_host,
            "database": DATABASE_NAME,
            "collection": COLLECTION_NAME,
            "error": f"Connection error: {str(general_err)}",
            "error_type": type(general_err).__name__,
        }
        print(f"MongoDB connection failed: {_connection_status['error']}")
        _client = None
        _database = None
        _predictions_collection = None
        return False


def get_connection_status() -> dict:
    """Return safe connection status information without leaking sensitive credentials."""
    return dict(_connection_status)


def get_predictions_collection():
    """Return predictions collection if connected, else None."""
    global _predictions_collection
    if _predictions_collection is None and MONGODB_URI:
        connect_to_mongodb()
    return _predictions_collection


def save_prediction(document: dict) -> dict:
    """Save prediction document into MongoDB collection.

    Required fields:
    - compound_name
    - original_smiles
    - canonical_smiles
    - predicted_pchembl_value
    - target_protein
    - target_chembl_id
    - model_name
    - created_at
    """
    collection = get_predictions_collection()
    if collection is None:
        raise RuntimeError(
            "MongoDB is not currently connected. Cannot save prediction to database."
        )

    payload = {
        "compound_name": document.get("compound_name", "Unknown Compound"),
        "original_smiles": document.get("original_smiles", ""),
        "canonical_smiles": document.get("canonical_smiles", ""),
        "predicted_pchembl_value": float(document.get("predicted_pchembl_value", 0.0)),
        "target_protein": document.get("target_protein", "EGFR"),
        "target_chembl_id": document.get("target_chembl_id", "CHEMBL203"),
        "model_name": document.get("model_name", "Random Forest"),
        "created_at": document.get("created_at") or datetime.now(timezone.utc).isoformat(),
    }

    if "molecular_descriptors" in document:
        payload["molecular_descriptors"] = document["molecular_descriptors"]

    result = collection.insert_one(payload)
    payload["_id"] = str(result.inserted_id)
    payload["id"] = str(result.inserted_id)
    return payload


def get_predictions(limit: int = 50, skip: int = 0) -> list:
    """Retrieve prediction history sorted by most recent first."""
    collection = get_predictions_collection()
    if collection is None:
        return []

    cursor = collection.find().sort("created_at", -1).skip(skip).limit(limit)
    records = []
    for doc in cursor:
        doc["_id"] = str(doc["_id"])
        doc["id"] = doc["_id"]
        records.append(doc)
    return records


def get_prediction_by_id(prediction_id: str):
    """Retrieve a single prediction by its MongoDB ObjectId string."""
    collection = get_predictions_collection()
    if collection is None:
        return None

    try:
        obj_id = ObjectId(prediction_id)
    except Exception:
        return None

    doc = collection.find_one({"_id": obj_id})
    if doc:
        doc["_id"] = str(doc["_id"])
        doc["id"] = doc["_id"]
    return doc


def get_database_stats() -> dict:
    """Return count of records in predictions collection."""
    collection = get_predictions_collection()
    if collection is None:
        return {
            "connected": False,
            "total_saved_predictions": 0,
        }

    try:
        count = collection.count_documents({})
        return {
            "connected": True,
            "total_saved_predictions": count,
        }
    except Exception as e:
        return {
            "connected": False,
            "total_saved_predictions": 0,
            "error": str(e),
        }
