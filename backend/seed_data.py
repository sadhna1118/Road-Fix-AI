import os
import sys
import datetime
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

# Add backend directory to path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.database import engine, SessionLocal, Base
from app.config import UPLOADS_DIR
from app.models import Incident, IncidentReport, AIDetection, Worker, Assignment, AuditLog
from app.services.priority_service import calculate_priority_score

def create_sample_road_image(filename: str, damage_type: str) -> str:
    """Creates a realistic synthetic asphalt road image with damage texture."""
    filepath = UPLOADS_DIR / filename
    if filepath.exists():
        return f"/uploads/{filename}"

    # Base asphalt color
    w, h = 640, 480
    img = Image.new("RGB", (w, h), color=(55, 58, 62))
    draw = ImageDraw.Draw(img)

    # Road grain & texture
    import random
    for _ in range(3000):
        rx = random.randint(0, w - 1)
        ry = random.randint(0, h - 1)
        shade = random.randint(35, 75)
        draw.point((rx, ry), fill=(shade, shade, shade))

    # Road lane markings
    draw.line([(w // 2, 0), (w // 2, h)], fill=(200, 180, 50), width=6)

    # Draw specific damage
    if damage_type == "Pothole":
        # Dark depression with irregular edges
        bbox = [w // 3, h // 2, int(w * 0.65), int(h * 0.8)]
        draw.ellipse(bbox, fill=(20, 20, 22), outline=(30, 30, 32), width=4)
        for _ in range(800):
            px = random.randint(bbox[0], bbox[2])
            py = random.randint(bbox[1], bbox[3])
            draw.point((px, py), fill=(12, 12, 14))
    elif damage_type == "Alligator Crack":
        # Web of cracks
        for _ in range(18):
            x1 = random.randint(int(w * 0.2), int(w * 0.8))
            y1 = random.randint(int(h * 0.4), int(h * 0.85))
            x2 = x1 + random.randint(-40, 40)
            y2 = y1 + random.randint(-40, 40)
            draw.line([(x1, y1), (x2, y2)], fill=(22, 22, 24), width=3)
    elif damage_type == "Repaired":
        # Fresh black bitumen patch
        draw.rectangle([w // 3 - 10, h // 2 - 10, int(w * 0.65) + 10, int(h * 0.8) + 10], fill=(28, 30, 32), outline=(45, 48, 52), width=3)

    img = img.filter(ImageFilter.SMOOTH_MORE)
    img.save(filepath, "JPEG", quality=90)
    return f"/uploads/{filename}"


def seed_database():
    print("[Seed] Initializing database tables...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    # 1. Seed Field Workers
    workers = [
        Worker(
            id="WKR-01",
            name="Ramesh Kumar",
            phone="+91 98110 23456",
            department="PWD Zone 4 - Asphalt Rapid Response",
            active_jobs_count=1,
            status="BUSY"
        ),
        Worker(
            id="WKR-02",
            name="Anil Sharma",
            phone="+91 98765 43210",
            department="Municipal Highway Maintenance",
            active_jobs_count=0,
            status="AVAILABLE"
        ),
        Worker(
            id="WKR-03",
            name="Suresh Patel",
            phone="+91 99234 56789",
            department="Road Safety & Drainage Division",
            active_jobs_count=0,
            status="AVAILABLE"
        )
    ]
    for w in workers:
        db.add(w)
    db.commit()

    # Create images
    img_pothole_1 = create_sample_road_image("pothole_connaught.jpg", "Pothole")
    img_pothole_2 = create_sample_road_image("pothole_ringroad.jpg", "Pothole")
    img_crack_1 = create_sample_road_image("alligator_crack_moti_bagh.jpg", "Alligator Crack")
    img_repaired_1 = create_sample_road_image("repaired_ringroad_patch.jpg", "Repaired")

    # 2. Seed Master Incidents with realistic coordinates (Delhi-NCR sample roads)
    # Incident 1: Critical Pothole (In Progress, multiple reports)
    score1, lvl1 = calculate_priority_score("Pothole", 0.94, report_count=3)
    inc1 = Incident(
        id="RF-1001",
        title="Deep Pothole on Ring Road Outer Lane",
        description="Hazardous crater near AIIMS flyover causing vehicle deceleration and two-wheeler instability.",
        canonical_damage_type="Pothole",
        status="IN_PROGRESS",
        priority_score=score1,
        priority_level=lvl1,
        latitude=28.5684,
        longitude=77.2091,
        address_text="Ring Road, near AIIMS Flyover, South Delhi",
        report_count=3,
        confidence=0.94,
        before_image_url=img_pothole_1,
        created_at=datetime.datetime.utcnow() - datetime.timedelta(days=2)
    )
    db.add(inc1)

    # Incident 2: Nearby Pothole (Within 22m -> duplicate candidate scenario)
    score2, lvl2 = calculate_priority_score("Pothole", 0.91, report_count=1)
    inc2 = Incident(
        id="RF-1002",
        title="Pothole near AIIMS Service Road",
        description="Road surface depression next to curb.",
        canonical_damage_type="Pothole",
        status="AI_DETECTED",
        priority_score=score2,
        priority_level=lvl2,
        latitude=28.56855,
        longitude=77.20925,
        address_text="Ring Road Service Lane, South Delhi",
        report_count=1,
        confidence=0.91,
        before_image_url=img_pothole_1,
        created_at=datetime.datetime.utcnow() - datetime.timedelta(hours=5)
    )
    db.add(inc2)

    # Incident 3: Alligator Cracking (Verified)
    score3, lvl3 = calculate_priority_score("Alligator Crack", 0.86, report_count=2)
    inc3 = Incident(
        id="RF-1003",
        title="Severe Alligator Cracking on Moti Bagh Crossing",
        description="Extensive structural pavement fatigue and alligator cracks. Requires bitumen sealant.",
        canonical_damage_type="Alligator Crack",
        status="VERIFIED",
        priority_score=score3,
        priority_level=lvl3,
        latitude=28.5882,
        longitude=77.1685,
        address_text="Shanti Path & Ring Road Junction, Moti Bagh",
        report_count=2,
        confidence=0.86,
        before_image_url=img_crack_1,
        created_at=datetime.datetime.utcnow() - datetime.timedelta(days=1)
    )
    db.add(inc3)

    # Incident 4: Resolved Incident with Before and After photo
    score4, lvl4 = calculate_priority_score("Pothole", 0.92, report_count=4)
    inc4 = Incident(
        id="RF-1004",
        title="Repaired Road Crater at Connaught Circus",
        description="Repaired and bitumen sealed under Work Order #WO-4029.",
        canonical_damage_type="Pothole",
        status="VERIFIED_CLOSED",
        priority_score=score4,
        priority_level=lvl4,
        latitude=28.6315,
        longitude=77.2167,
        address_text="Radial Road 4, Connaught Place, Central Delhi",
        report_count=4,
        confidence=0.92,
        before_image_url=img_pothole_2,
        after_image_url=img_repaired_1,
        created_at=datetime.datetime.utcnow() - datetime.timedelta(days=4),
        closed_at=datetime.datetime.utcnow() - datetime.timedelta(hours=6)
    )
    db.add(inc4)
    db.commit()

    # 3. Add Reports, AI detections, and Audit logs
    # Reports for Inc 1
    rep1 = IncidentReport(
        id="REP-A1",
        incident_id="RF-1001",
        citizen_name="Amit Sharma",
        image_url=img_pothole_1,
        latitude=28.5684,
        longitude=77.2091,
        accuracy_meters=4.2,
        user_notes="Pothole hit my car wheel this morning. Very deep."
    )
    rep2 = IncidentReport(
        id="REP-A2",
        incident_id="RF-1001",
        citizen_name="Pooja Verma",
        image_url=img_pothole_1,
        latitude=28.56842,
        longitude=77.20914,
        accuracy_meters=5.1,
        user_notes="Bikes are swerving to avoid this, dangerous!"
    )
    db.add(rep1)
    db.add(rep2)

    # AI Detection for Inc 1
    det1 = AIDetection(
        incident_id="RF-1001",
        damage_type="Pothole",
        confidence=0.94,
        bbox_x1=0.28,
        bbox_y1=0.45,
        bbox_x2=0.72,
        bbox_y2=0.78,
        inference_time_ms=38.2
    )
    db.add(det1)

    # Assignment for Inc 1
    assign1 = Assignment(
        id="WO-101",
        incident_id="RF-1001",
        worker_id="WKR-01",
        status="IN_PROGRESS",
        assigned_at=datetime.datetime.utcnow() - datetime.timedelta(hours=2),
        started_at=datetime.datetime.utcnow() - datetime.timedelta(minutes=45),
        worker_notes="Arrived on site with bitumen truck and cold compaction roller."
    )
    db.add(assign1)

    # Audit Logs
    audit1 = AuditLog(
        incident_id="RF-1001",
        action="INCIDENT_CREATED",
        previous_status=None,
        new_status="AI_DETECTED",
        actor_role="CITIZEN",
        actor_name="Amit Sharma",
        details="Report submitted with photo. AI detected Pothole (94% confidence)."
    )
    audit2 = AuditLog(
        incident_id="RF-1001",
        action="DUPLICATE_REPORT_LINKED",
        previous_status="AI_DETECTED",
        new_status="AI_DETECTED",
        actor_role="CITIZEN",
        actor_name="Pooja Verma",
        details="Nearby report within 8m merged into master incident. Priority updated."
    )
    audit3 = AuditLog(
        incident_id="RF-1001",
        action="AUTHORITY_VERIFIED",
        previous_status="AI_DETECTED",
        new_status="VERIFIED",
        actor_role="ADMIN",
        actor_name="Municipal Inspector K. S. Rao",
        details="Incident verified and queued for emergency asphalt patching."
    )
    audit4 = AuditLog(
        incident_id="RF-1001",
        action="WORK_ORDER_DISPATCHED",
        previous_status="VERIFIED",
        new_status="ASSIGNED",
        actor_role="ADMIN",
        actor_name="Municipal Dispatcher",
        details="Dispatched Work Order #WO-101 to Ramesh Kumar (PWD Zone 4)."
    )
    audit5 = AuditLog(
        incident_id="RF-1001",
        action="REPAIR_STARTED",
        previous_status="ASSIGNED",
        new_status="IN_PROGRESS",
        actor_role="FIELD_WORKER",
        actor_name="Ramesh Kumar",
        details="Crew arrived on site. Setting up safety cones and leveling roadbed."
    )
    for a in [audit1, audit2, audit3, audit4, audit5]:
        db.add(a)

    # Inc 4 Assignment & Audits (Resolved)
    assign4 = Assignment(
        id="WO-4029",
        incident_id="RF-1004",
        worker_id="WKR-02",
        status="COMPLETED",
        assigned_at=datetime.datetime.utcnow() - datetime.timedelta(days=3),
        started_at=datetime.datetime.utcnow() - datetime.timedelta(days=2),
        completed_at=datetime.datetime.utcnow() - datetime.timedelta(hours=8),
        repair_materials_used="Cold Asphalt Mix Grade 2, Rapid Curing Bitumen Emulsion",
        worker_notes="Cavity filled, compacted and flush with surrounding road."
    )
    db.add(assign4)

    audit_c1 = AuditLog(
        incident_id="RF-1004",
        action="FINAL_CLOSURE_VERIFIED",
        previous_status="REPAIR_SUBMITTED",
        new_status="VERIFIED_CLOSED",
        actor_role="ADMIN",
        actor_name="Executive Engineer Verma",
        details="Inspected before/after photographic audit. Repair verified and officially closed."
    )
    db.add(audit_c1)

    db.commit()
    db.close()
    print("[Seed] Successfully seeded realistic initial road infrastructure data!")

if __name__ == "__main__":
    seed_database()
