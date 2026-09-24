import React, { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import CitizenReport from "./components/CitizenReport";
import AdminDashboard from "./components/AdminDashboard";
import WorkerPortal from "./components/WorkerPortal";
import DashcamPatrol from "./components/DashcamPatrol";
import IncidentTracker from "./components/IncidentTracker";
import MapView from "./components/MapView";
import CopilotModal from "./components/CopilotModal";
import { api } from "./services/api";
import {
  MapPin,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  ShieldAlert,
  Search,
  Radio,
  Building2,
  HardHat,
  Activity,
} from "lucide-react";

export default function App() {
  const [currentRole, setCurrentRole] = useState("citizen"); // citizen, patrol, authority, worker
  const [incidents, setIncidents] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [citizenTab, setCitizenTab] = useState("report"); // report, map, track
  const [trackedIncidentId, setTrackedIncidentId] = useState(null);

  useEffect(() => {
    loadIncidents();
  }, []);

  const loadIncidents = async () => {
    try {
      const data = await api.getIncidents();
      setIncidents(data);
    } catch (err) {
      console.error("Failed to load incidents:", err);
    }
  };

  const handleReportSubmitted = (newIncident) => {
    loadIncidents();
    setSelectedIncident(newIncident);
  };

  const handleSelectIncidentForTracking = (inc) => {
    setSelectedIncident(inc);
    if (inc) {
      setTrackedIncidentId(inc.id);
      setCurrentRole("citizen");
      setCitizenTab("track");
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Top Navigation */}
      <Navbar
        currentRole={currentRole}
        setCurrentRole={setCurrentRole}
        onOpenCopilot={() => setCopilotOpen(true)}
      />

      {/* Main Container */}
      <main className="app-container" style={{ flex: 1, paddingBottom: "3rem" }}>
        {/* CITIZEN PORTAL VIEW */}
        {currentRole === "citizen" && (
          <div>
            {/* View Switcher Tabs (Report vs Map vs Track) */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem" }}>
              <div
                style={{
                  display: "flex",
                  background: "#111827",
                  padding: "4px",
                  borderRadius: "var(--radius-full)",
                  border: "1px solid var(--border-subtle)",
                  flexWrap: "wrap",
                  gap: "4px",
                }}
              >
                <button
                  id="tab-report-btn"
                  className={`btn btn-sm ${citizenTab === "report" ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setCitizenTab("report")}
                  style={{ borderRadius: "var(--radius-full)" }}
                >
                  <ShieldAlert size={14} /> Report Distress
                </button>

                <button
                  id="tab-map-btn"
                  className={`btn btn-sm ${citizenTab === "map" ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setCitizenTab("map")}
                  style={{ borderRadius: "var(--radius-full)" }}
                >
                  <MapPin size={14} /> Live Hazard Map ({incidents.length})
                </button>

                <button
                  id="tab-track-btn"
                  className={`btn btn-sm ${citizenTab === "track" ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setCitizenTab("track")}
                  style={{ borderRadius: "var(--radius-full)" }}
                >
                  <Search size={14} /> Track Ticket Lifecycle
                </button>
              </div>
            </div>

            {citizenTab === "report" && (
              <CitizenReport onReportSubmitted={handleReportSubmitted} />
            )}

            {citizenTab === "map" && (
              <div>
                <div style={{ textAlign: "center", marginBottom: "1rem" }}>
                  <h3 style={{ fontSize: "1.4rem", fontWeight: "700" }}>
                    Live Road Hazards & Verified Potholes
                  </h3>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                    Real-time community map. Click on any pin to view evidence, severity, or confirm if the damage still exists.
                  </p>
                </div>
                <MapView
                  incidents={incidents}
                  selectedIncident={selectedIncident}
                  onSelectIncident={(inc) => handleSelectIncidentForTracking(inc)}
                  height="600px"
                />
              </div>
            )}

            {citizenTab === "track" && (
              <IncidentTracker initialIncidentId={trackedIncidentId} />
            )}
          </div>
        )}

        {/* AUTONOMOUS PATROL & DASHCAM AI VIEW */}
        {currentRole === "patrol" && (
          <DashcamPatrol
            onIncidentCreated={(newInc) => {
              loadIncidents();
              setSelectedIncident(newInc);
            }}
          />
        )}

        {/* AUTHORITY DASHBOARD VIEW */}
        {currentRole === "authority" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Split Map View on Admin */}
            <div className="glass-panel" style={{ padding: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <div>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: "700" }}>
                    Municipal Infrastructure Command Map
                  </h3>
                  <p style={{ fontSize: "0.78rem", color: "var(--text-dim)" }}>
                    Spatial view with dynamic distress heatmaps and priority marker clusters.
                  </p>
                </div>
              </div>
              <MapView
                incidents={incidents}
                selectedIncident={selectedIncident}
                onSelectIncident={(inc) => setSelectedIncident(inc)}
                height="380px"
              />
            </div>

            <AdminDashboard
              incidents={incidents}
              onRefresh={loadIncidents}
              onSelectIncident={(inc) => setSelectedIncident(inc)}
            />
          </div>
        )}

        {/* FIELD WORKER PORTAL */}
        {currentRole === "worker" && (
          <WorkerPortal onJobCompleted={loadIncidents} />
        )}
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid var(--border-subtle)",
          padding: "1rem 2rem",
          background: "#080C14",
          fontSize: "0.8rem",
          color: "var(--text-dim)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <div>
          <strong>RoadFix AI</strong> • Autonomous Road Distress Detection & Dispatch Platform
        </div>
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
          <span>100% Real Computer Vision</span>
          <span>•</span>
          <span>Spatial Clustering</span>
          <span>•</span>
          <span>Patrol Dashcam AI</span>
          <span>•</span>
          <span>Municipal Audit Trail</span>
        </div>
      </footer>

      {/* Grounded Copilot Chat Assistant */}
      <CopilotModal
        isOpen={copilotOpen}
        onClose={() => setCopilotOpen(false)}
        onSelectIncident={(inc) => {
          setSelectedIncident(inc);
          if (currentRole === "citizen") setCitizenTab("track");
          else handleSelectIncidentForTracking(inc);
        }}
      />
    </div>
  );
}
