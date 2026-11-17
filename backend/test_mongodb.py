import sys
from database import connect_to_mongodb, get_connection_status, get_database_stats

print("=" * 65)
print("TATVALAB - MONGODB ATLAS CONNECTION TEST")
print("=" * 65)

print("\n1. Testing MongoDB connection with RFC 3986 URI escaping...")
success = connect_to_mongodb()
status = get_connection_status()

print("\n2. Connection Configuration & Status:")
print(f"   Connected:         {status.get('connected')}")
print(f"   Cluster Hostname:  {status.get('cluster')}")
print(f"   Database Name:     {status.get('database')}")
print(f"   Collection Name:   {status.get('collection')}")

if success:
    print("\nSUCCESS: TatvaLab is fully connected to MongoDB Atlas!")
    stats = get_database_stats()
    print(f"Total saved predictions in '{status.get('collection')}': {stats.get('total_saved_predictions')}")
    print("CRUD functions and FastAPI endpoints are ready for database operations.")
else:
    print("\nFAILED: Could not establish a connection to MongoDB Atlas.")
    print(f"Error Type: {status.get('error_type')}")
    print(f"Details:    {status.get('error')}")

    err_type = status.get("error_type")
    if err_type == "IPAccessRestricted":
        print("\n" + "-" * 65)
        print("ACTION REQUIRED (MongoDB Atlas Network Access):")
        print("The URI syntax is valid, but MongoDB Atlas closed the TLS connection.")
        print("This occurs when your client IP address is not whitelisted.")
        print("Fix in MongoDB Atlas:")
        print("  1. Go to https://cloud.mongodb.com")
        print("  2. In the left sidebar, click 'Network Access' under Security.")
        print("  3. Click 'Add IP Address'.")
        print("  4. Select 'Allow Access from Anywhere' (0.0.0.0/0) or 'Add Current IP'.")
        print("  5. Click 'Confirm' and wait 1 minute for Atlas to apply.")
        print("-" * 65)
    elif err_type == "AuthenticationError":
        print("\n" + "-" * 65)
        print("ACTION REQUIRED (MongoDB Atlas Database Access):")
        print("MongoDB Atlas rejected the database credentials (bad auth).")
        print("Fix in MongoDB Atlas:")
        print("  1. Go to https://cloud.mongodb.com")
        print("  2. Click 'Database Access' under Security.")
        print("  3. Locate 'manasamanasa1063_db_user' -> Click 'Edit' -> 'Edit Password'.")
        print("  4. Update backend/.env with your new password in MONGODB_URI.")
        print("-" * 65)

sys.exit(0 if success else 1)
