# RoadFix AI — Real-World Civic Road Distress Intelligence Platform (PRO Edition)

> **100% Real Working Implementation**: Autonomous Computer Vision Road Damage Detection, Continuous Dashcam Patrol AI, Crowdsourced Civic Reporting, Spatial Duplicate Clustering, Dynamic Priority Scoring, Turn-by-Turn Crew Route Optimization, Municipal Budget & Materials Analytics, and Public Lifecycle Audit Tracking.

---

## 🌟 Architecture & Workflow

```
   CITIZEN PORTAL                   PATROL DASHCAM AI                 MUNICIPAL AUTHORITY                 FIELD REPAIR CREW
┌──────────────────────┐         ┌──────────────────────┐         ┌──────────────────────┐         ┌──────────────────────┐
│  • Photo & GPS Lock  │         │  • Continuous Video  │         │  • Spatial Heatmap   │         │  • TSP Route Optimizer│
│  • Map Pin Fine-Tune │         │  • Live Bounding Box │         │  • Duplicate Merge   │         │  • Turn-by-Turn GPS  │
│  • Live AI Detection │         │  • Speedometer HUD   │         │  • Budget & Materials│         │  • Material Inventory│
│  • 5-Stage Tracker   │         │  • Auto-Incident Log │         │  • CSV / GIS Export  │         │  • Before/After Slide│
│  • Public PDF Audit  │         │  • Audio Beeper Alert│         │  • Official PDF      │         │  • Photo Verification│
└──────────┬───────────┘         └──────────┬───────────┘         └──────────┬───────────┘         └──────────┬───────────┘
           │                                │                                │                                │
           └────────────────────────────────┴───────────────┬────────────────┴────────────────────────────────┘
                                                            │
                                                            ▼
                                              FastAPI Core Backend Engine (Port 8000)
                                              ├── Ultralytics YOLOv8 / OpenCV Damage Detector
                                              ├── Haversine Spatial Duplicate Clustering (R ≤ 18m Auto, 35m Suggest)
                                              ├── Dynamic Priority Scoring Engine (0 - 100)
                                              ├── CPWD / IRC Unit Pricing & Material Projection Matrix
                                              ├── ReportLab Official Municipal PDF Generator
                                              ├── CSV & GeoJSON GIS Spatial Exporters
                                              └── Voice-Enabled Grounded Copilot (Google Gemini / Local NLP)
```

---

## 🚀 Pro-Level Live Working Features

### 1. 🚨 Autonomous Patrol & Dashcam AI Hub
- **Continuous Real-Time Computer Vision Scan**: Processes live camera stream or simulated highway patrol footage.
- **Dynamic Bounding Boxes**: Renders real-time bounding boxes, damage classification tags, and confidence percentages.
- **Speedometer & Telemetry HUD**: Live vehicle speed (km/h), high-precision GPS coordinates, and FPS telemetry.
- **Synthesized Web Audio Hazard Beeps**: Instant acoustic warnings on detecting critical impact potholes or road ruptures.
- **Automated Incident Registration**: Automatically logs high-severity road defects into the municipal database with zero manual clicks.

### 2. 🔍 Public 5-Stage Live Incident Lifecycle Tracker
- Public tracking by Ticket ID (e.g. `#RF-1001`, `#RF-1002`) with quick recent chips.
- Interactive **5-Stage Graphical Animated Timeline**:
  1. *Incident Logged & Geo-Tagged*
  2. *AI Computer Vision Diagnosis*
  3. *Authority Verification & Dispatch*
  4. *On-Site Field Repair Operations*
  5. *Photographic Audit & Verification Closure*
- **Before / After Split Comparison Slider** for quality audit.
- 1-Click Official Municipal PDF Download.

### 3. 📱 Citizen Reporting Portal & Interactive Map Location Adjuster
- **Real Photo Upload & Mobile Shutter**: Captures road distress photos directly from camera.
- **Interactive Map Pin Fine-Tuner**: Drag and drop marker on OpenStreetMap to fine-tune exact pothole coordinates.
- **Instant AI Cost & Material Estimation**: Real-time forecast of required asphalt bags (kg) and estimated repair budget upon upload.
- **Crowdsource Upvoting**: Nearby commuters can confirm if the distress is still active.

### 4. ⚡ Spatial Duplicate Detection & Auto-Clustering
- Employs the **Haversine Great-Circle Formula** to calculate physical distance between reports.
- If $R \le 18\text{m}$, automatically merges into master incident, boosting priority score without duplicate tickets.
- If $18\text{m} - 35\text{m}$, flags as **Duplicate Candidate** in Admin Portal with 1-click merge.

### 5. 💰 Municipal Budget, Materials & GIS Intelligence
- **IRC / CPWD Unit Pricing Engine**: Computes total municipal expenditure (₹ INR), pending vs completed allocations.
- **Materials Inventory Breakdown**: Metric Tons of Cold Mix Bitumen Asphalt, Liters of Tack Coat Emulsion, and Labor Man-Hours.
- **AI Clustering Savings Metric**: Calculates total municipal funds saved by consolidating duplicate citizen reports.
- **1-Click CSV Audit Sheet** and **GeoJSON GIS Dataset Export** for ArcGIS / QGIS integration.

### 6. 👷 Field Crew Operations & Smart TSP Route Optimizer
- **Shortest Driving Path Sequence**: Uses Traveling Salesperson (TSP) nearest-neighbor algorithm to sequence dispatched repair jobs.
- **Truck Material Inventory Calculator**: Pre-calculates exact bags of asphalt mix and sealant required for today's dispatched route.
- **Turn-by-Turn GPS Navigation**: 1-click launch into Google Maps / OpenStreetMap turn-by-turn routing.
- **Mandatory After-Repair Verification**: Photographic proof upload before ticket closure.

### 7. 🎙️ Voice-Enabled Grounded RoadFix Copilot
- **Voice Input (Speech-to-Text)** via Web Speech API in English & Hindi.
- **Audio Readout (Text-to-Speech)** to speak out database findings hands-free.
- **One-Tap Prompt Chips**: *"Show critical road issues"*, *"Required asphalt & budget"*, *"Available field crews"*, *"Waterlogging zones"*.
- **Direct Interactive Ticket Links**: Clickable `#RF-1001` badges inside chat that open the ticket dossier instantly.

---

## 🛠️ Tech Stack

- **Backend**: Python 3.12, FastAPI, Uvicorn, SQLAlchemy, Pydantic v2, SQLite / PostgreSQL.
- **AI / Computer Vision**: Ultralytics YOLOv8, PyTorch, OpenCV (`cv2`), Pillow.
- **PDF Dossier Engine**: ReportLab.
- **Sound Engine**: Web Audio API Synthesizer (Zero external dependencies).
- **Voice Engine**: Web Speech API (SpeechRecognition & SpeechSynthesis).
- **Frontend**: Vite 8, React 19, Leaflet.js, OpenStreetMap (CartoDB tiles), Lucide Icons, Vanilla CSS Civic Design System.

---

## 💻 How to Run Locally

### 1. Backend Server
```bash
cd "backend"
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
API Documentation: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### 2. Frontend Web Portal
```bash
cd "frontend"
npm run dev
```
Open in browser: [http://localhost:5173/](http://localhost:5173/)

### 3. Reset / Seed Test Data
```bash
python backend/seed_data.py
```
