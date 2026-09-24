import math
from typing import List, Tuple
from sqlalchemy.orm import Session
from app.models import Incident, IncidentReport, AuditLog
from app.config import DUPLICATE_RADIUS_METERS

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great circle distance between two points 
    on the earth (specified in decimal degrees).
    Returns distance in meters.
    """
    R = 6371000  # Radius of Earth in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2))
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c

def find_duplicate_candidates(
    db: Session, 
    latitude: float, 
    longitude: float, 
    threshold_meters: float = DUPLICATE_RADIUS_METERS
) -> List[Tuple[Incident, float]]:
    """
    Find existing active incidents within threshold distance.
    Returns list of tuples: (Incident, distance_in_meters) sorted by distance.
    """
    # Rough bounding box search for efficiency (+/- ~0.005 degrees is ~500m)
    degree_delta = threshold_meters / 111000.0 * 2.0
    candidates = db.query(Incident).filter(
        Incident.status.notin_(["VERIFIED_CLOSED"]),
        Incident.latitude.between(latitude - degree_delta, latitude + degree_delta),
        Incident.longitude.between(longitude - degree_delta, longitude + degree_delta)
    ).all()

    matches = []
    for inc in candidates:
        dist = haversine_distance(latitude, longitude, inc.latitude, inc.longitude)
        if dist <= threshold_meters:
            matches.append((inc, round(dist, 1)))

    matches.sort(key=lambda x: x[1])
    return matches

def merge_incidents(
    db: Session, 
    source_incident_ids: List[str], 
    target_incident_id: str, 
    actor_name: str = "Admin"
) -> Incident:
    """
    Consolidate duplicate incidents into a single master incident:
    - Re-links all reports, detections, and votes to target incident
    - Increments report count
    - Recalculates priority
    - Archives source incidents
    - Logs audit trail
    """
    target = db.query(Incident).filter(Incident.id == target_incident_id).first()
    if not target:
        raise ValueError(f"Target incident {target_incident_id} not found")

    for src_id in source_incident_ids:
        if src_id == target_incident_id:
            continue
        source = db.query(Incident).filter(Incident.id == src_id).first()
        if not source:
            continue

        # Re-parent reports
        for rep in source.reports:
            rep.incident_id = target.id

        # Re-parent detections
        for det in source.detections:
            det.incident_id = target.id

        # Re-parent community votes
        for vote in source.community_votes:
            vote.incident_id = target.id

        target.report_count += source.report_count

        # Log audit in source before deletion
        log_source = AuditLog(
            incident_id=target.id,
            action="MERGED_DUPLICATE",
            previous_status=source.status,
            new_status=target.status,
            actor_role="ADMIN",
            actor_name=actor_name,
            details=f"Merged duplicate incident {src_id} into {target.id}."
        )
        db.add(log_source)
        db.delete(source)

    db.commit()
    db.refresh(target)
    return target
