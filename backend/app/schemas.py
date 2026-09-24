from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field

class AIDetectionSchema(BaseModel):
    id: Optional[int] = None
    damage_type: str
    confidence: float
    bbox_x1: float
    bbox_y1: float
    bbox_x2: float
    bbox_y2: float
    inference_time_ms: Optional[float] = 45.0
    model_version: Optional[str] = "YOLOv8-Road-v1.2"

    class Config:
        from_attributes = True

class IncidentReportBase(BaseModel):
    citizen_name: Optional[str] = "Anonymous Citizen"
    citizen_contact: Optional[str] = None
    latitude: float
    longitude: float
    accuracy_meters: Optional[float] = 5.0
    user_notes: Optional[str] = None

class IncidentReportCreate(IncidentReportBase):
    pass

class IncidentReportResponse(IncidentReportBase):
    id: str
    incident_id: str
    image_url: str
    reported_at: datetime

    class Config:
        from_attributes = True

class WorkerBase(BaseModel):
    name: str
    phone: str
    department: Optional[str] = "Public Works Dept (PWD)"

class WorkerCreate(WorkerBase):
    pass

class WorkerResponse(WorkerBase):
    id: str
    active_jobs_count: int
    status: str

    class Config:
        from_attributes = True

class AssignmentResponse(BaseModel):
    id: str
    incident_id: str
    worker_id: str
    worker: Optional[WorkerResponse] = None
    assigned_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    worker_notes: Optional[str] = None
    repair_materials_used: Optional[str] = None
    status: str

    class Config:
        from_attributes = True

class AuditLogResponse(BaseModel):
    id: int
    incident_id: str
    action: str
    previous_status: Optional[str] = None
    new_status: Optional[str] = None
    actor_role: str
    actor_name: str
    timestamp: datetime
    details: Optional[str] = None

    class Config:
        from_attributes = True

class CommunityVoteCreate(BaseModel):
    vote_type: str = Field(..., description="STILL_EXISTS, RESOLVED, FALSE_ALARM")

class IncidentResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    canonical_damage_type: str
    status: str
    priority_score: int
    priority_level: str
    latitude: float
    longitude: float
    address_text: Optional[str] = None
    report_count: int
    confidence: float
    before_image_url: Optional[str] = None
    after_image_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    closed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class IncidentDetailResponse(IncidentResponse):
    reports: List[IncidentReportResponse] = []
    detections: List[AIDetectionSchema] = []
    assignments: List[AssignmentResponse] = []
    audit_logs: List[AuditLogResponse] = []

    class Config:
        from_attributes = True

class MergeDuplicateRequest(BaseModel):
    source_incident_ids: List[str]
    target_incident_id: str

class AssignWorkerRequest(BaseModel):
    worker_id: str
    notes: Optional[str] = None

class WorkerCompleteJobRequest(BaseModel):
    worker_notes: Optional[str] = None
    repair_materials_used: Optional[str] = None

class CopilotQueryRequest(BaseModel):
    query: str

class CopilotQueryResponse(BaseModel):
    answer: str
    related_incident_ids: List[str] = []
    sql_intent: Optional[str] = None

class DashboardStats(BaseModel):
    total_incidents: int
    unverified: int
    under_review: int
    verified: int
    in_progress: int
    resolved: int
    high_priority_count: int
    road_health_index: int
    potholes_count: int
    cracks_count: int
    waterlogging_count: int
