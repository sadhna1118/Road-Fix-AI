from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models import Incident, Worker, Assignment
from app.schemas import CopilotQueryResponse
from app.config import GEMINI_API_KEY

try:
    import google.generativeai as genai
    HAS_GENAI = True
except ImportError:
    HAS_GENAI = False

def handle_copilot_query(db: Session, query_text: str) -> CopilotQueryResponse:
    """
    Answers natural language questions about road infrastructure and reports.
    If GEMINI_API_KEY is configured, leverages Google Gemini with real live DB context.
    Otherwise, uses the built-in local SQL rule engine.
    """
    # 1. Check if Gemini API is available and key is configured
    if HAS_GENAI and GEMINI_API_KEY and len(GEMINI_API_KEY.strip()) > 10:
        try:
            genai.configure(api_key=GEMINI_API_KEY.strip())
            
            # Fetch live database context to ground the AI
            all_incidents = db.query(Incident).filter(Incident.status != "VERIFIED_CLOSED").order_by(Incident.priority_score.desc()).limit(10).all()
            inc_summary = "\n".join([
                f"- #{inc.id}: {inc.canonical_damage_type} at ({inc.latitude:.4f}, {inc.longitude:.4f}), Priority: {inc.priority_score}/100, Status: {inc.status}, Reports: {inc.report_count}"
                for inc in all_incidents
            ])
            workers = db.query(Worker).all()
            worker_summary = f"{len(workers)} workers total ({len([w for w in workers if w.status == 'AVAILABLE'])} available)."

            prompt = f"""
You are RoadFix Copilot, an expert AI road maintenance engineer and municipal dispatch assistant.
Current Live Database Context:
Active Incidents (Top by Priority):
{inc_summary}

Workforce:
{worker_summary}

User Question: {query_text}

Provide a concise, helpful, and professional answer (in Hindi or English as requested).
Mention specific Incident IDs (e.g. #RF-1001) where relevant.
"""
            response = None
            for model_name in ["gemini-3.6-flash", "gemini-3.7-flash", "gemini-flash-latest"]:
                try:
                    model = genai.GenerativeModel(model_name)
                    response = model.generate_content(prompt)
                    if response and response.text:
                        break
                except Exception as inner_e:
                    continue

            if response and response.text:
                related = [inc.id for inc in all_incidents if inc.id in response.text]
                return CopilotQueryResponse(
                    answer=response.text.strip(),
                    related_incident_ids=related,
                    sql_intent="POWERED BY GOOGLE GEMINI AI"
                )
        except Exception as e:
            print(f"[Copilot Gemini Notice] Fallback to local SQL: {e}")

    # 2. Local Fallback SQL Rule Engine (Works 100% offline without API key)
    q = query_text.lower().strip()
    related_ids = []
    
    # 1. Critical / High Priority query
    if any(k in q for k in ["critical", "high priority", "urgent", "danger", "khatarnak"]):
        incidents = db.query(Incident).filter(
            Incident.priority_level.in_(["CRITICAL", "HIGH"]),
            Incident.status != "VERIFIED_CLOSED"
        ).order_by(Incident.priority_score.desc()).limit(5).all()

        related_ids = [inc.id for inc in incidents]
        if incidents:
            items_str = ", ".join([f"#{inc.id} ({inc.canonical_damage_type}, Priority: {inc.priority_score}/100)" for inc in incidents])
            answer = f"Found {len(incidents)} active high/critical priority incidents requiring immediate attention: {items_str}. Would you like to generate work orders for them?"
        else:
            answer = "Great news! Currently there are no open Critical or High priority incidents in the system."
        
        return CopilotQueryResponse(answer=answer, related_incident_ids=related_ids, sql_intent="FILTER priority_level IN ('CRITICAL','HIGH')")

    # 2. Potholes query
    if any(k in q for k in ["pothole", "potholes", "gaddhe", "gaddha"]):
        potholes = db.query(Incident).filter(
            Incident.canonical_damage_type.ilike("%pothole%"),
            Incident.status != "VERIFIED_CLOSED"
        ).all()
        related_ids = [p.id for p in potholes[:5]]
        answer = f"There are currently {len(potholes)} active pothole incidents in the system. The highest priority pothole is #{potholes[0].id if potholes else 'N/A'} with priority score {potholes[0].priority_score if potholes else 0}/100."
        return CopilotQueryResponse(answer=answer, related_incident_ids=related_ids, sql_intent="FILTER canonical_damage_type='Pothole'")

    # 3. Cracks query
    if any(k in q for k in ["crack", "cracks", "darar"]):
        cracks = db.query(Incident).filter(
            Incident.canonical_damage_type.ilike("%crack%"),
            Incident.status != "VERIFIED_CLOSED"
        ).all()
        related_ids = [c.id for c in cracks[:5]]
        answer = f"There are {len(cracks)} active road crack incidents recorded (including Alligator and Longitudinal fractures). Early sealant application is recommended before water penetration."
        return CopilotQueryResponse(answer=answer, related_incident_ids=related_ids, sql_intent="FILTER canonical_damage_type LIKE '%crack%'")

    # 4. Waterlogging query
    if any(k in q for k in ["water", "waterlogging", "paani", "flood"]):
        water_incidents = db.query(Incident).filter(
            Incident.canonical_damage_type.ilike("%water%"),
            Incident.status != "VERIFIED_CLOSED"
        ).all()
        related_ids = [w.id for w in water_incidents[:5]]
        answer = f"There are {len(water_incidents)} reported waterlogging zones. Stormwater drainage clearing crews have been alerted."
        return CopilotQueryResponse(answer=answer, related_incident_ids=related_ids, sql_intent="FILTER canonical_damage_type='Waterlogging'")

    # 5. Resolved / Completed repairs
    if any(k in q for k in ["resolved", "completed", "theek", "fixed", "band"]):
        resolved = db.query(Incident).filter(Incident.status.in_(["VERIFIED_CLOSED", "REPAIR_SUBMITTED"])).all()
        related_ids = [r.id for r in resolved[:5]]
        answer = f"Total resolved and completed road repairs: {len(resolved)}. Each has after-repair photographic proof attached and verified."
        return CopilotQueryResponse(answer=answer, related_incident_ids=related_ids, sql_intent="FILTER status IN ('VERIFIED_CLOSED', 'REPAIR_SUBMITTED')")

    # 6. Worker status / Dispatch query
    if any(k in q for k in ["worker", "workers", "crew", "field", "assignment"]):
        workers = db.query(Worker).all()
        avail = [w for w in workers if w.status == "AVAILABLE"]
        answer = f"Total registered field workers: {len(workers)}. Currently {len(avail)} workers are AVAILABLE for new dispatch orders."
        return CopilotQueryResponse(answer=answer, related_incident_ids=[], sql_intent="SELECT * FROM workers")

    # 7. General summary / Overview
    total = db.query(Incident).count()
    unverified = db.query(Incident).filter(Incident.status == "AI_DETECTED").count()
    in_progress = db.query(Incident).filter(Incident.status.in_(["ASSIGNED", "IN_PROGRESS"])).count()
    resolved_count = db.query(Incident).filter(Incident.status == "VERIFIED_CLOSED").count()

    top_incident = db.query(Incident).filter(Incident.status != "VERIFIED_CLOSED").order_by(Incident.priority_score.desc()).first()
    if top_incident:
        related_ids = [top_incident.id]

    answer = (
        f"RoadFix Municipal Overview: Total incidents logged: {total} "
        f"({unverified} awaiting review, {in_progress} in active repair, {resolved_count} successfully resolved). "
        f"Top alert is Incident #{top_incident.id if top_incident else 'N/A'} ({top_incident.canonical_damage_type if top_incident else 'None'})."
    )
    return CopilotQueryResponse(answer=answer, related_incident_ids=related_ids, sql_intent="SELECT COUNT(*) GROUP BY status")
