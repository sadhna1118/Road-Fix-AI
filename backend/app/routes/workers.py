import os
import uuid
import datetime
from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.config import UPLOADS_DIR
from app.models import Incident, Worker, Assignment, AuditLog
from app.schemas import AssignmentResponse

router = APIRouter(prefix="/api/workers", tags=["workers"])

@router.get("/{worker_id}/assignments")
def get_worker_assignments(worker_id: str, db: Session = Depends(get_db)):
    assignments = db.query(Assignment).filter(
        Assignment.worker_id == worker_id,
        Assignment.status.in_(["ASSIGNED", "IN_PROGRESS"])
    ).all()

    result = []
    for a in assignments:
        inc = a.incident
        result.append({
            "assignment_id": a.id,
            "incident_id": inc.id,
            "title": inc.title,
            "damage_type": inc.canonical_damage_type,
            "priority_level": inc.priority_level,
            "priority_score": inc.priority_score,
            "latitude": inc.latitude,
            "longitude": inc.longitude,
            "address_text": inc.address_text,
            "before_image_url": inc.before_image_url,
            "status": a.status,
            "assigned_at": a.assigned_at,
            "started_at": a.started_at
        })
    return result

@router.post("/assignments/{assignment_id}/start")
def start_repair_work(
    assignment_id: str,
    worker_lat: Optional[float] = Form(None),
    worker_lon: Optional[float] = Form(None),
    db: Session = Depends(get_db)
):
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    assignment.started_at = datetime.datetime.utcnow()
    assignment.status = "IN_PROGRESS"

    incident = assignment.incident
    incident.status = "IN_PROGRESS"
    incident.updated_at = datetime.datetime.utcnow()

    audit = AuditLog(
        incident_id=incident.id,
        action="REPAIR_STARTED",
        previous_status="ASSIGNED",
        new_status="IN_PROGRESS",
        actor_role="FIELD_WORKER",
        actor_name=assignment.worker.name if assignment.worker else "Field Tech",
        details=f"Crew checked in on site. Coordinates: {worker_lat or incident.latitude:.4f}, {worker_lon or incident.longitude:.4f}"
    )
    db.add(audit)
    db.commit()

    return {"success": True, "message": "Work started. On-site status updated to IN_PROGRESS."}

@router.post("/assignments/{assignment_id}/complete")
async def complete_repair_work(
    assignment_id: str,
    after_file: UploadFile = File(...),
    materials_used: str = Form("Cold Mix Bitumen & Aggregate Sealant"),
    worker_notes: Optional[str] = Form("Road repaired and compacted to specification."),
    db: Session = Depends(get_db)
):
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    # Save after repair photo
    file_ext = os.path.splitext(after_file.filename)[1] or ".jpg"
    unique_filename = f"repair_{uuid.uuid4().hex[:10]}{file_ext}"
    saved_file_path = UPLOADS_DIR / unique_filename

    contents = await after_file.read()
    with open(saved_file_path, "wb") as f:
        f.write(contents)

    relative_after_url = f"/uploads/{unique_filename}"

    # Update assignment
    assignment.completed_at = datetime.datetime.utcnow()
    assignment.status = "COMPLETED"
    assignment.repair_materials_used = materials_used
    assignment.worker_notes = worker_notes

    # Update worker capacity
    worker = assignment.worker
    if worker:
        worker.active_jobs_count = max(0, worker.active_jobs_count - 1)
        worker.status = "AVAILABLE"

    # Update incident status
    incident = assignment.incident
    incident.after_image_url = relative_after_url
    incident.status = "REPAIR_SUBMITTED"
    incident.updated_at = datetime.datetime.utcnow()

    # Log audit
    audit = AuditLog(
        incident_id=incident.id,
        action="REPAIR_EVIDENCE_SUBMITTED",
        previous_status="IN_PROGRESS",
        new_status="REPAIR_SUBMITTED",
        actor_role="FIELD_WORKER",
        actor_name=worker.name if worker else "Field Tech",
        details=f"Uploaded repair completion evidence. Materials: {materials_used}."
    )
    db.add(audit)
    db.commit()

    return {
        "success": True,
        "message": "Repair completion submitted with photo evidence. Ready for final authority audit.",
        "after_image_url": relative_after_url
    }

@router.post("/verify-closure/{incident_id}")
def verify_and_close_incident(
    incident_id: str,
    approved: bool = True,
    reviewer_name: str = "Chief Municipal Inspector",
    notes: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    old_status = incident.status
    if approved:
        incident.status = "VERIFIED_CLOSED"
        incident.closed_at = datetime.datetime.utcnow()
        details_text = f"Approved repair quality and photographic evidence. Closure verified by {reviewer_name}."
    else:
        incident.status = "IN_PROGRESS"
        details_text = f"Repair rejected by inspector ({notes or 'Needs further compaction'}). Work returned to IN_PROGRESS."

    incident.updated_at = datetime.datetime.utcnow()

    audit = AuditLog(
        incident_id=incident.id,
        action="FINAL_CLOSURE_VERIFIED" if approved else "REPAIR_REJECTED",
        previous_status=old_status,
        new_status=incident.status,
        actor_role="ADMIN",
        actor_name=reviewer_name,
        details=details_text
    )
    db.add(audit)
    db.commit()

    return {
        "success": True,
        "message": f"Incident #{incident.id} marked as {incident.status}."
    }
