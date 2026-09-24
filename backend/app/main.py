import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.config import UPLOADS_DIR, GENERATED_REPORTS_DIR
from app.database import engine, Base
from app.routes import incidents, authority, workers, analytics, reports_export

# Initialize Database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="RoadFix AI Platform API",
    description="Real-world civic infrastructure monitoring and road damage intelligence system powered by Computer Vision & Geolocation.",
    version="1.0.0"
)

# Enable CORS for local development & cross-device testing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static directories for image evidence and PDF downloads
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")
app.mount("/generated_reports", StaticFiles(directory=str(GENERATED_REPORTS_DIR)), name="generated_reports")

# Include Routers
app.include_router(incidents.router)
app.include_router(authority.router)
app.include_router(workers.router)
app.include_router(analytics.router)
app.include_router(reports_export.router)

@app.get("/")
def root():
    return {
        "platform": "RoadFix AI",
        "status": "Operational",
        "version": "1.0.0",
        "docs_url": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
