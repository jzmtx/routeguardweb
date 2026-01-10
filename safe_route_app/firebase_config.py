import firebase_admin
from firebase_admin import credentials, auth, storage
import os
from pathlib import Path

# Initialize Firebase Admin SDK
# We look for serviceAccountKey.json in the project root
BASE_DIR = Path(__file__).resolve().parent.parent
cred_path = BASE_DIR / 'serviceAccountKey.json'

def initialize_firebase():
    """Initialize Firebase Admin SDK if not already initialized"""
    if not firebase_admin._apps:
        if cred_path.exists():
            cred = credentials.Certificate(str(cred_path))
            firebase_admin.initialize_app(cred, {
                'storageBucket': os.getenv('FIREBASE_STORAGE_BUCKET', 'routeguard.appspot.com')
            })
            print("Firebase Admin SDK initialized successfully.")
        else:
            print(f"Warning: Firebase service account key not found at {cred_path}")
            print("Firebase features will not work until serviceAccountKey.json is added.")

def verify_firebase_token(id_token):
    """Verify Firebase ID token and return user info"""
    try:
        initialize_firebase()
        # Add 60 seconds clock skew tolerance to handle time sync issues
        decoded_token = auth.verify_id_token(id_token, clock_skew_seconds=60)
        return decoded_token
    except Exception as e:
        print(f"Token verification error: {e}")
        return None

def get_storage_bucket():
    """Get Firebase Storage bucket"""
    try:
        initialize_firebase()
        return storage.bucket()
    except Exception as e:
        print(f"Storage access error: {e}")
        return None
