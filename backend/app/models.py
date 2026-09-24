import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(String(50), primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    canonical_damage_type = Column(String(50), default="Pothole")
    status = Column(String(30), default="AI_DETECTED") 
    # Statuses: UNVERIFIED, AI_DETECTED, UNDER_REVIEW, VERIFIED, ASSIGNED, IN_PROGRESS, REPAIR_SUBMITTED, VERIFIED_CLOSED

    priority_score = Column(Integer, default=50) # 0 to 100
    priority_level = Column(String(20), default="MEDIUM") # LOW, MEDIUM, HIGH, CRITICAL

    latitude = Column(Float, nullable=False, index=True)
    longitude = Column(Float, nullable=False, index=True)
    address_text = Column(String(300), nullable=True)

    report_count = Column(Integer, default=1)
    confidence = Column(Float, default=0.85)

    before_image_url = Column(String(500), nullable=True)
    after_image_url = Column(String(500), nullable=True)

    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    closed_at = Column(DateTime, nullable=True)

    # Relationships
    reports = relationship("IncidentReport", back_populates="incident", cascade="all, delete-orphan")
    detections = relationship("AIDetection", back_populates="incident", cascade="all, delete-orphan")
    assignments = relationship("Assignment", back_populates="incident", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="incident", cascade="all, delete-orphan")
    community_votes = relationship("CommunityVote", back_populates="incident", cascade="all, delete-orphan")


class IncidentReport(Base):
    __tablename__ = "incident_reports"

    id = Column(String(50), primary_key=True, index=True)
    incident_id = Column(String(50), ForeignKey("incidents.id"), nullable=False)
    citizen_name = Column(String(100), default="Anonymous Citizen")
    citizen_contact = Column(String(100), nullable=True)
    image_url = Column(String(500), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    accuracy_meters = Column(Float, default=5.0)
    user_notes = Column(Text, nullable=True)
    reported_at = Column(DateTime, default=datetime.datetime.utcnow)

    incident = relationship("Incident", back_populates="reports")


class AIDetection(Base):
    __tablename__ = "ai_detections"

    id = Column(Integer, primary_key=True, autoincrement=True)
    incident_id = Column(String(50), ForeignKey("incidents.id"), nullable=False)
    damage_type = Column(String(50), nullable=False)
    confidence = Column(Float, nullable=False)
    bbox_x1 = Column(Float, nullable=False) # Normalized 0 to 1
    bbox_y1 = Column(Float, nullable=False)
    bbox_x2 = Column(Float, nullable=False)
    bbox_y2 = Column(Float, nullable=False)
    inference_time_ms = Column(Float, default=45.0)
    model_version = Column(String(50), default="YOLOv8-Road-v1.2")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    incident = relationship("Incident", back_populates="detections")


class Worker(Base):
    __tablename__ = "workers"

    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    phone = Column(String(30), nullable=False)
    department = Column(String(100), default="Public Works Dept (PWD)")
    active_jobs_count = Column(Integer, default=0)
    status = Column(String(30), default="AVAILABLE") # AVAILABLE, BUSY, OFFLINE

    assignments = relationship("Assignment", back_populates="worker")


class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(String(50), primary_key=True, index=True)
    incident_id = Column(String(50), ForeignKey("incidents.id"), nullable=False)
    worker_id = Column(String(50), ForeignKey("workers.id"), nullable=False)
    
    assigned_at = Column(DateTime, default=datetime.datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    worker_notes = Column(Text, nullable=True)
    repair_materials_used = Column(String(300), nullable=True)
    status = Column(String(30), default="ASSIGNED") # ASSIGNED, IN_PROGRESS, COMPLETED

    incident = relationship("Incident", back_populates="assignments")
    worker = relationship("Worker", back_populates="assignments")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    incident_id = Column(String(50), ForeignKey("incidents.id"), nullable=False)
    action = Column(String(100), nullable=False)
    previous_status = Column(String(50), nullable=True)
    new_status = Column(String(50), nullable=True)
    actor_role = Column(String(50), default="SYSTEM") # CITIZEN, AI, ADMIN, WORKER, SYSTEM
    actor_name = Column(String(100), default="System")
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    details = Column(Text, nullable=True)

    incident = relationship("Incident", back_populates="audit_logs")


class CommunityVote(Base):
    __tablename__ = "community_votes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    incident_id = Column(String(50), ForeignKey("incidents.id"), nullable=False)
    vote_type = Column(String(30), nullable=False) # STILL_EXISTS, RESOLVED, FALSE_ALARM
    voter_ip = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    incident = relationship("Incident", back_populates="community_votes")
