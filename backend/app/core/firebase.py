"""Initialize Firebase Admin SDK once and expose Firestore client."""
import firebase_admin
from firebase_admin import credentials, firestore
from app.core.config import FIREBASE_CREDENTIALS_PATH, FIREBASE_PROJECT_ID

if not firebase_admin._apps:
    cred = credentials.Certificate(FIREBASE_CREDENTIALS_PATH)
    firebase_admin.initialize_app(cred, {"projectId": FIREBASE_PROJECT_ID})

db = firestore.client()
