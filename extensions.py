# Extensions are initialised here and bound to the app in create_app().
# This avoids circular imports between blueprints and models.

# Phase 2: Uncomment when database and auth are needed
# from flask_sqlalchemy import SQLAlchemy
# from flask_login import LoginManager
# from flask_migrate import Migrate

# db = SQLAlchemy()
# login_manager = LoginManager()
# migrate = Migrate()
# login_manager.login_view = "auth.login"


# ----------------------------------------------------------------------------
# Firestore (World Cup Fan Zone leaderboard)
#
# Firestore authenticates via Application Default Credentials — on Cloud Run
# that's the service account, so no API key is needed. Locally (and in tests)
# there are usually no credentials, so we never build the client at import time
# and we fail soft: get_db() returns None when Firestore can't be reached. The
# worldcup blueprint then falls back to an in-memory store so the app and all
# its endpoints keep working without a live database.
# ----------------------------------------------------------------------------
import os

_db = None
_db_tried = False


def get_db():
    """Return a cached Firestore client, or None if it can't be initialised."""
    global _db, _db_tried
    if _db is not None:
        return _db
    if _db_tried:
        return None
    _db_tried = True
    try:
        from google.cloud import firestore
        project = os.getenv("GOOGLE_CLOUD_PROJECT") or os.getenv("FIRESTORE_PROJECT")
        _db = firestore.Client(project=project) if project else firestore.Client()
    except Exception as e:  # missing package, no credentials, network, etc.
        print(f"[firestore] unavailable — using in-memory fallback: {e}")
        _db = None
    return _db
