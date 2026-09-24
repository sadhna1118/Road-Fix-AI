import os
from pathlib import Path

from dotenv import load_dotenv

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

UPLOADS_DIR = BASE_DIR / "uploads"
GENERATED_REPORTS_DIR = BASE_DIR / "generated_reports"

# Ensure runtime directories exist
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
GENERATED_REPORTS_DIR.mkdir(parents=True, exist_ok=True)

# API Keys (Optional)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")

# Database
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'roadfix.db'}")

# Proximity and clustering thresholds
DUPLICATE_RADIUS_METERS = 30.0  # Within 30 meters is considered duplicate candidate
AUTO_MERGE_RADIUS_METERS = 18.0 # Within 18 meters auto-associates to master incident

# Priority Scoring weights
PRIORITY_DAMAGE_WEIGHTS = {
    "Road Collapse": 45,
    "Open Manhole": 40,
    "Pothole": 35,
    "Broken Road": 30,
    "Alligator Crack": 25,
    "Waterlogging": 22,
    "Longitudinal Crack": 15,
    "Transverse Crack": 15,
    "Minor Crack": 10,
    "Other": 10
}
