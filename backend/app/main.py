import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
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

# Include API Routers
app.include_router(incidents.router)
app.include_router(authority.router)
app.include_router(workers.router)
app.include_router(analytics.router)
app.include_router(reports_export.router)

# Check for built frontend dist directory (in backend/dist or frontend/dist)
BASE_DIR = Path(__file__).resolve().parent.parent
DIST_DIRS = [
    BASE_DIR / "dist",
    BASE_DIR.parent / "frontend" / "dist"
]

frontend_dist = next((d for d in DIST_DIRS if d.exists() and (d / "index.html").exists()), None)

if frontend_dist:
    assets_dir = frontend_dist / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/")
    async def serve_spa_root():
        return FileResponse(frontend_dist / "index.html")

    @app.get("/favicon.svg")
    async def serve_favicon():
        fav = frontend_dist / "favicon.svg"
        if fav.exists():
            return FileResponse(fav)
        return JSONResponse({"error": "not found"}, status_code=404)

    @app.get("/icons.svg")
    async def serve_icons():
        ico = frontend_dist / "icons.svg"
        if ico.exists():
            return FileResponse(ico)
        return JSONResponse({"error": "not found"}, status_code=404)

    # SPA catch-all fallback (for paths that are not /api or /docs)
    @app.get("/{full_path:path}")
    async def serve_spa_fallback(full_path: str):
        if full_path.startswith("api/") or full_path.startswith("docs") or full_path.startswith("openapi.json"):
            return JSONResponse({"detail": "Not Found"}, status_code=404)
        file_path = frontend_dist / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(frontend_dist / "index.html")
else:
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
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
