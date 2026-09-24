import os
import csv
import io
import json
from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Incident
from app.services.pdf_service import generate_incident_pdf

router = APIRouter(prefix="/api/reports", tags=["reports"])

# Material and cost matrix for Indian Municipal PWD standards (Approx INR ₹)
REPAIR_COST_MATRIX = {
    "Pothole": {
        "avg_material_tons": 0.45,       # Cold Mix Bitumen (Tons)
        "emulsion_liters": 12.0,          # Tack Coat Emulsion (L)
        "labor_hours": 3.5,
        "avg_cost_inr": 4800,
        "urgency_factor": 1.2
    },
    "Road Collapse": {
        "avg_material_tons": 3.80,
        "emulsion_liters": 85.0,
        "labor_hours": 24.0,
        "avg_cost_inr": 42000,
        "urgency_factor": 2.0
    },
    "Open Manhole": {
        "avg_material_tons": 0.15,
        "emulsion_liters": 0.0,
        "labor_hours": 4.0,
        "avg_cost_inr": 6500,
        "urgency_factor": 2.2
    },
    "Alligator Crack": {
        "avg_material_tons": 1.20,
        "emulsion_liters": 35.0,
        "labor_hours": 8.0,
        "avg_cost_inr": 16500,
        "urgency_factor": 1.1
    },
    "Longitudinal Crack": {
        "avg_material_tons": 0.30,
        "emulsion_liters": 15.0,
        "labor_hours": 3.0,
        "avg_cost_inr": 3800,
        "urgency_factor": 1.0
    },
    "Broken Road": {
        "avg_material_tons": 2.50,
        "emulsion_liters": 60.0,
        "labor_hours": 16.0,
        "avg_cost_inr": 28000,
        "urgency_factor": 1.4
    },
    "Waterlogging": {
        "avg_material_tons": 0.0,
        "emulsion_liters": 0.0,
        "labor_hours": 6.0,
        "avg_cost_inr": 5200,
        "urgency_factor": 1.3
    }
}

@router.get("/pdf/{incident_id}")
def export_incident_pdf(incident_id: str, db: Session = Depends(get_db)):
    """
    Generates and returns an official Municipal Road Damage Audit Dossier (PDF).
    """
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    pdf_path = generate_incident_pdf(incident)

    return FileResponse(
        path=pdf_path,
        media_type="application/pdf",
        filename=os.path.basename(pdf_path)
    )

@router.get("/budget-estimate")
def get_municipal_budget_estimate(db: Session = Depends(get_db)):
    """
    Calculates detailed municipal material requirements and repair budget projections.
    """
    incidents = db.query(Incident).all()
    
    total_cost = 0
    total_asphalt_tons = 0.0
    total_emulsion_liters = 0.0
    total_labor_hours = 0.0
    
    pending_cost = 0
    completed_cost = 0
    breakdown_by_type = {}

    for inc in incidents:
        dtype = inc.canonical_damage_type
        cost_meta = REPAIR_COST_MATRIX.get(dtype, REPAIR_COST_MATRIX["Pothole"])
        
        item_cost = cost_meta["avg_cost_inr"]
        item_asphalt = cost_meta["avg_material_tons"]
        item_emulsion = cost_meta["emulsion_liters"]
        item_labor = cost_meta["labor_hours"]
        
        total_cost += item_cost
        total_asphalt_tons += item_asphalt
        total_emulsion_liters += item_emulsion
        total_labor_hours += item_labor

        if inc.status == "VERIFIED_CLOSED":
            completed_cost += item_cost
        else:
            pending_cost += item_cost

        if dtype not in breakdown_by_type:
            breakdown_by_type[dtype] = {
                "count": 0,
                "cost_inr": 0,
                "asphalt_tons": 0.0
            }
        breakdown_by_type[dtype]["count"] += 1
        breakdown_by_type[dtype]["cost_inr"] += item_cost
        breakdown_by_type[dtype]["asphalt_tons"] += round(item_asphalt, 2)

    # Estimate savings from duplicate clustering (avg ₹2,500 saved per merged inspection)
    merged_reports_count = sum(max(0, inc.report_count - 1) for inc in incidents)
    estimated_savings_inr = merged_reports_count * 2500

    return {
        "total_incidents": len(incidents),
        "total_estimated_budget_inr": total_cost,
        "completed_repair_expenditure_inr": completed_cost,
        "pending_repair_budget_inr": pending_cost,
        "materials_needed": {
            "cold_mix_asphalt_tons": round(total_asphalt_tons, 2),
            "bitumen_emulsion_liters": round(total_emulsion_liters, 1),
            "estimated_man_hours": round(total_labor_hours, 1)
        },
        "duplicate_clustering_savings_inr": estimated_savings_inr,
        "damage_breakdown": breakdown_by_type
    }

@router.get("/export/csv")
def export_incidents_csv(db: Session = Depends(get_db)):
    """
    Exports full incident database as a downloadable CSV audit sheet.
    """
    incidents = db.query(Incident).order_by(Incident.priority_score.desc()).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Incident ID", "Title", "Damage Type", "Status", "Priority Score",
        "Priority Level", "Latitude", "Longitude", "Reports Count",
        "Confidence", "Estimated Cost (INR)", "Created Date", "Assigned Worker"
    ])

    for inc in incidents:
        cost = REPAIR_COST_MATRIX.get(inc.canonical_damage_type, REPAIR_COST_MATRIX["Pothole"])["avg_cost_inr"]
        worker_name = (
            inc.assignments[-1].worker.name
            if inc.assignments and len(inc.assignments) > 0 and inc.assignments[-1].worker
            else "Unassigned"
        )
        writer.writerow([
            inc.id,
            inc.title,
            inc.canonical_damage_type,
            inc.status,
            inc.priority_score,
            inc.priority_level,
            inc.latitude,
            inc.longitude,
            inc.report_count,
            f"{int((inc.confidence or 0.85)*100)}%",
            cost,
            inc.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            worker_name
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=RoadFix_Municipal_Report.csv"}
    )

@router.get("/export/geojson")
def export_incidents_geojson(db: Session = Depends(get_db)):
    """
    Exports spatial dataset in GeoJSON format for GIS software (ArcGIS, QGIS, Google Earth).
    """
    incidents = db.query(Incident).all()
    features = []

    for inc in incidents:
        cost = REPAIR_COST_MATRIX.get(inc.canonical_damage_type, REPAIR_COST_MATRIX["Pothole"])["avg_cost_inr"]
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [inc.longitude, inc.latitude]
            },
            "properties": {
                "id": inc.id,
                "title": inc.title,
                "damage_type": inc.canonical_damage_type,
                "status": inc.status,
                "priority_score": inc.priority_score,
                "priority_level": inc.priority_level,
                "report_count": inc.report_count,
                "estimated_cost_inr": cost,
                "created_at": inc.created_at.isoformat()
            }
        })

    geojson_data = {
        "type": "FeatureCollection",
        "name": "RoadFix_AI_Municipal_Distress_GIS",
        "crs": {
            "type": "name",
            "properties": {
                "name": "urn:ogc:def:crs:OGC:1.3:CRS84"
            }
        },
        "features": features
    }

    return Response(
        content=json.dumps(geojson_data, indent=2),
        media_type="application/geo+json",
        headers={"Content-Disposition": "attachment; filename=RoadFix_Hazards_GIS.geojson"}
    )
