import uuid
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models import Incident, Worker, Assignment, AuditLog
from app.schemas import (
    DashboardStats, IncidentResponse, WorkerResponse, WorkerCreate,
    AssignWorkerRequest, MergeDuplicateRequest
)
from app.services.spatial_service import find_duplicate_candidates, merge_incidents

router = APIRouter(prefix="/api/authority", tags=["authority"])

@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db)):
    total = db.query(Incident).count()
    unverified = db.query(Incident).filter(Incident.status == "AI_DETECTED").count()
    under_review = db.query(Incident).filter(Incident.status == "UNDER_REVIEW").count()
    verified = db.query(Incident).filter(Incident.status == "VERIFIED").count()
    in_progress = db.query(Incident).filter(Incident.status.in_(["ASSIGNED", "IN_PROGRESS"])).count()
    resolved = db.query(Incident).filter(Incident.status.in_(["REPAIR_SUBMITTED", "VERIFIED_CLOSED"])).count()
    
    high_priority = db.query(Incident).filter(
        Incident.priority_level.in_(["CRITICAL", "HIGH"]),
        Incident.status != "VERIFIED_CLOSED"
    ).count()

    potholes = db.query(Incident).filter(Incident.canonical_damage_type.ilike("%pothole%")).count()
    cracks = db.query(Incident).filter(Incident.canonical_damage_type.ilike("%crack%")).count()
    water = db.query(Incident).filter(Incident.canonical_damage_type.ilike("%water%")).count()

    # Calculate empirical Road Health Index (100 - penalty for open issues)
    open_count = total - resolved
    rhi = max(20, min(100, int(100 - (open_count * 4.5) - (high_priority * 5.0))))

    return DashboardStats(
        total_incidents=total,
        unverified=unverified,
        under_review=under_review,
        verified=verified,
        in_progress=in_progress,
        resolved=resolved,
        high_priority_count=high_priority,
        road_health_index=rhi,
        potholes_count=potholes,
        cracks_count=cracks,
        waterlogging_count=water
    )

@router.post("/verify/{incident_id}")
def verify_incident(
    incident_id: str,
    action: str = "VERIFY", # VERIFY, REJECT, UNDER_REVIEW
    reviewer_name: str = "Municipal Officer",
    db: Session = Depends(get_db)
):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    old_status = incident.status
    if action == "VERIFY":
        incident.status = "VERIFIED"
    elif action == "UNDER_REVIEW":
        incident.status = "UNDER_REVIEW"
    elif action == "REJECT":
        incident.status = "VERIFIED_CLOSED"
        incident.closed_at = datetime.datetime.utcnow()

    incident.updated_at = datetime.datetime.utcnow()

    # Audit log
    audit = AuditLog(
        incident_id=incident.id,
        action=f"AUTHORITY_{action}",
        previous_status=old_status,
        new_status=incident.status,
        actor_role="ADMIN",
        actor_name=reviewer_name,
        details=f"Municipal Authority conducted review. Action: {action}."
    )
    db.add(audit)
    db.commit()
    db.refresh(incident)

    return {"success": True, "incident": IncidentResponse.from_orm(incident)}

@router.get("/duplicates")
def get_duplicate_clusters(threshold_meters: float = 35.0, db: Session = Depends(get_db)):
    """
    Finds and groups all active incidents that are close enough to be duplicates.
    """
    active_incidents = db.query(Incident).filter(Incident.status != "VERIFIED_CLOSED").all()
    clusters = []
    visited = set()

    for inc in active_incidents:
        if inc.id in visited:
            continue
        neighbors = find_duplicate_candidates(db, inc.latitude, inc.longitude, threshold_meters=threshold_meters)
        # Filter neighbors to only active ones different from current
        matching_neighbors = [n for n in neighbors if n[0].id != inc.id and n[0].id not in visited]
        if matching_neighbors:
            cluster_group = {
                "master_incident": IncidentResponse.from_orm(inc),
                "candidates": [
                    {
                        "incident": IncidentResponse.from_orm(n[0]),
                        "distance_meters": n[1]
                    } for n in matching_neighbors
                ]
            }
            clusters.append(cluster_group)
            visited.add(inc.id)
            for n in matching_neighbors:
                visited.add(n[0].id)

    return clusters

@router.post("/merge")
def merge_duplicate_incidents(
    payload: MergeDuplicateRequest, 
    reviewer_name: str = "Admin Reviewer", 
    db: Session = Depends(get_db)
):
    try:
        updated_incident = merge_incidents(
            db=db,
            source_incident_ids=payload.source_incident_ids,
            target_incident_id=payload.target_incident_id,
            actor_name=reviewer_name
        )
        return {
            "success": True,
            "message": f"Successfully merged {len(payload.source_incident_ids)} duplicate incident(s) into #{updated_incident.id}",
            "incident": IncidentResponse.from_orm(updated_incident)
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/workers", response_model=List[WorkerResponse])
def get_workers(db: Session = Depends(get_db)):
    return db.query(Worker).all()

@router.post("/workers", response_model=WorkerResponse)
def create_worker(payload: WorkerCreate, db: Session = Depends(get_db)):
    worker_id = f"WKR-{uuid.uuid4().hex[:6].upper()}"
    new_worker = Worker(
        id=worker_id,
        name=payload.name,
        phone=payload.phone,
        department=payload.department or "Public Works Dept (PWD)",
        status="AVAILABLE",
        active_jobs_count=0
    )
    db.add(new_worker)
    db.commit()
    db.refresh(new_worker)
    return new_worker

@router.post("/assign/{incident_id}")
def assign_work_order(
    incident_id: str,
    payload: AssignWorkerRequest,
    admin_name: str = "Municipal Dispatcher",
    db: Session = Depends(get_db)
):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    worker = db.query(Worker).filter(Worker.id == payload.worker_id).first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")

    # Create assignment
    assign_id = f"WO-{uuid.uuid4().hex[:8].upper()}"
    assignment = Assignment(
        id=assign_id,
        incident_id=incident.id,
        worker_id=worker.id,
        worker_notes=payload.notes,
        status="ASSIGNED"
    )
    db.add(assignment)

    # Update worker and incident
    worker.active_jobs_count += 1
    worker.status = "BUSY" if worker.active_jobs_count >= 2 else "AVAILABLE"

    old_status = incident.status
    incident.status = "ASSIGNED"
    incident.updated_at = datetime.datetime.utcnow()

    # Audit log
    audit = AuditLog(
        incident_id=incident.id,
        action="WORK_ORDER_DISPATCHED",
        previous_status=old_status,
        new_status="ASSIGNED",
        actor_role="ADMIN",
        actor_name=admin_name,
        details=f"Dispatched repair order #{assign_id} to field technician {worker.name} ({worker.department})."
    )
    db.add(audit)
    db.commit()
    db.refresh(incident)

    return {"success": True, "message": f"Assigned to {worker.name}", "assignment_id": assign_id}
