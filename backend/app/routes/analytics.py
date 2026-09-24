from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Incident
from app.schemas import CopilotQueryRequest, CopilotQueryResponse
from app.services.copilot_service import handle_copilot_query

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

@router.get("/heatmap")
def get_heatmap_points(db: Session = Depends(get_db)):
    """
    Returns coordinate points with intensity weight (0.0 to 1.0) for Leaflet Heatmap layer.
    """
    incidents = db.query(Incident).filter(Incident.status != "VERIFIED_CLOSED").all()
    points = []
    for inc in incidents:
        # Intensity scaled by priority score
        intensity = round(inc.priority_score / 100.0, 2)
        points.append({
            "lat": inc.latitude,
            "lng": inc.longitude,
            "count": inc.report_count,
            "intensity": intensity,
            "damage_type": inc.canonical_damage_type,
            "id": inc.id
        })
    return points

@router.post("/copilot", response_model=CopilotQueryResponse)
def query_copilot(payload: CopilotQueryRequest, db: Session = Depends(get_db)):
    """
    Natural Language Q&A grounded in live municipal road damage database.
    """
    return handle_copilot_query(db, payload.query)
