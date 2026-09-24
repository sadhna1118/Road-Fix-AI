import React, { useState, useEffect } from "react";
import {
  Search,
  CheckCircle2,
  Clock,
  HardHat,
  ShieldCheck,
  MapPin,
  Download,
  AlertCircle,
  FileText,
  Activity,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { api } from "../services/api";
import BeforeAfterSlider from "./BeforeAfterSlider";

export default function IncidentTracker({ initialIncidentId = null }) {
  const [searchId, setSearchId] = useState(initialIncidentId || "");
  const [loading, setLoading] = useState(false);
  const [trackData, setTrackData] = useState(null);
  const [error, setError] = useState(null);
  const [recentIncidents, setRecentIncidents] = useState([]);

  useEffect(() => {
    loadRecentIncidents();
    if (initialIncidentId) {
      handleSearch(initialIncidentId);
    }
  }, [initialIncidentId]);

  const loadRecentIncidents = async () => {
    try {
      const data = await api.getIncidents({ limit: 6 });
      setRecentIncidents(data);
      if (!initialIncidentId && data.length > 0) {
        handleSearch(data[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSearch = async (idToSearch) => {
    const targetId = (idToSearch || searchId || "").trim().toUpperCase();
    if (!targetId) return;

    setLoading(true);
    setError(null);
    try {
      const formatted = targetId.startsWith("RF-") ? targetId : `RF-${targetId}`;
      const res = await api.trackIncident(formatted);
      setTrackData(res);
      setSearchId(formatted);
    } catch (err) {
      setError(`Incident #${targetId} not found. Please verify the ticket ID.`);
      setTrackData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "880px", margin: "0 auto" }}>
      {/* Title & Search Bar */}
      <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
        <h2 style={{ fontSize: "1.75rem", fontWeight: "800", color: "#FFFFFF" }}>
          Public Road Repair Lifecycle Tracker
        </h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", maxWidth: "600px", margin: "0.25rem auto 1.25rem" }}>
          Track the transparent 5-stage progress of any reported road distress from AI classification to field crew asphalt compaction.
        </p>

        {/* Search Input Box */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch(searchId);
          }}
          style={{ maxWidth: "520px", margin: "0 auto", display: "flex", gap: "8px" }}
        >
          <div style={{ position: "relative", flex: 1 }}>
            <Search
              size={18}
              style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)" }}
            />
            <input
              type="text"
              id="tracker-search-input"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder="Enter Ticket ID (e.g. RF-1001, RF-1002)..."
              style={{
                width: "100%",
                background: "var(--bg-input)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-full)",
                padding: "12px 18px 12px 42px",
                color: "var(--text-main)",
                fontSize: "0.95rem",
                outline: "none",
              }}
            />
          </div>
          <button
            type="submit"
            id="tracker-search-btn"
            className="btn btn-primary"
            disabled={loading}
            style={{ borderRadius: "var(--radius-full)", padding: "0 22px" }}
          >
            {loading ? "Searching..." : "Track"}
          </button>
        </form>

        {/* Quick Recent Chips */}
        {recentIncidents.length > 0 && (
          <div style={{ display: "flex", justifyContent: "center", gap: "6px", flexWrap: "wrap", marginTop: "12px" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", alignSelf: "center" }}>Recent Tickets:</span>
            {recentIncidents.map((inc) => (
              <button
                key={inc.id}
                type="button"
                onClick={() => handleSearch(inc.id)}
                style={{
                  background: searchId === inc.id ? "rgba(59, 130, 246, 0.25)" : "rgba(30, 41, 59, 0.6)",
                  border: searchId === inc.id ? "1px solid #3B82F6" : "1px solid var(--border-subtle)",
                  color: searchId === inc.id ? "#93C5FD" : "var(--text-muted)",
                  padding: "3px 10px",
                  borderRadius: "var(--radius-full)",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                }}
              >
                #{inc.id} ({inc.canonical_damage_type})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div
          className="glass-panel"
          style={{
            padding: "1.25rem",
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "var(--radius-md)",
            textAlign: "center",
            color: "#F87171",
            marginBottom: "1.5rem",
          }}
        >
          <AlertCircle size={22} style={{ margin: "0 auto 6px" }} />
          <div>{error}</div>
        </div>
      )}

      {/* Loaded Incident Details */}
      {trackData && (
        <div>
          {/* Top Summary Card */}
          <div className="glass-panel" style={{ padding: "1.75rem", marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "1rem" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <h3 style={{ fontSize: "1.4rem", fontWeight: "800", color: "#F8FAFC" }}>
                    Ticket #{trackData.incident.id}
                  </h3>
                  <span
                    className={`badge badge-${
                      trackData.incident.priority_level === "CRITICAL"
                        ? "critical"
                        : trackData.incident.priority_level === "HIGH"
                        ? "high"
                        : trackData.incident.priority_level === "LOW"
                        ? "low"
                        : "medium"
                    }`}
                  >
                    {trackData.incident.priority_level} PRIORITY
                  </span>
                </div>
                <p style={{ fontSize: "0.85rem", color: "var(--text-dim)", display: "flex", alignItems: "center", gap: "6px" }}>
                  <MapPin size={14} style={{ color: "#3B82F6" }} />
                  {trackData.incident.address_text || `${trackData.incident.latitude.toFixed(4)}, ${trackData.incident.longitude.toFixed(4)}`}
                </p>
              </div>

              {/* Status & PDF Export Button */}
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <span className="badge badge-status" style={{ fontSize: "0.85rem", padding: "6px 12px" }}>
                  {trackData.incident.status}
                </span>
                <a
                  href={api.getPdfUrl(trackData.incident.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary btn-sm"
                  title="Download Official Municipal PDF Dossier"
                >
                  <Download size={14} /> Official PDF
                </a>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: "10px",
                background: "#111827",
                padding: "12px 16px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div>
                <span style={{ fontSize: "0.7rem", color: "var(--text-dim)", textTransform: "uppercase" }}>DISTRESS TYPE</span>
                <div style={{ fontWeight: "700", color: "#F8FAFC" }}>{trackData.incident.canonical_damage_type}</div>
              </div>
              <div>
                <span style={{ fontSize: "0.7rem", color: "var(--text-dim)", textTransform: "uppercase" }}>AI CONFIDENCE</span>
                <div style={{ fontWeight: "700", color: "#60A5FA" }}>
                  {Math.round((trackData.incident.confidence || 0.85) * 100)}%
                </div>
              </div>
              <div>
                <span style={{ fontSize: "0.7rem", color: "var(--text-dim)", textTransform: "uppercase" }}>PRIORITY SCORE</span>
                <div style={{ fontWeight: "700", color: "#FBBF24" }}>{trackData.incident.priority_score} / 100</div>
              </div>
              <div>
                <span style={{ fontSize: "0.7rem", color: "var(--text-dim)", textTransform: "uppercase" }}>CROWD CONFIRMATIONS</span>
                <div style={{ fontWeight: "700", color: "#34D399" }}>{trackData.incident.report_count} Verified Reports</div>
              </div>
            </div>
          </div>

          {/* 5-Stage Progressive Animated Timeline */}
          <div className="glass-panel" style={{ padding: "1.75rem", marginBottom: "1.5rem" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: "700", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "8px" }}>
              <Activity size={18} style={{ color: "#3B82F6" }} />
              5-Stage Municipal Lifecycle Progress
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", position: "relative" }}>
              {trackData.timeline.map((step, idx) => {
                const isCompleted = step.status === "COMPLETED";
                const isInProg = step.status === "IN_PROGRESS";
                const isPending = step.status === "PENDING";

                return (
                  <div
                    key={step.step}
                    style={{
                      display: "flex",
                      gap: "1rem",
                      alignItems: "flex-start",
                      position: "relative",
                    }}
                  >
                    {/* Connecting line */}
                    {idx < trackData.timeline.length - 1 && (
                      <div
                        style={{
                          position: "absolute",
                          left: "17px",
                          top: "36px",
                          bottom: "-18px",
                          width: "2px",
                          background: isCompleted ? "#3B82F6" : "rgba(255, 255, 255, 0.1)",
                          zIndex: 1,
                        }}
                      />
                    )}

                    {/* Step Icon Badge */}
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        background: isCompleted
                          ? "linear-gradient(135deg, #10B981, #059669)"
                          : isInProg
                          ? "linear-gradient(135deg, #3B82F6, #2563EB)"
                          : "rgba(30, 41, 59, 0.8)",
                        border: isCompleted
                          ? "2px solid #34D399"
                          : isInProg
                          ? "2px solid #60A5FA"
                          : "2px solid rgba(255, 255, 255, 0.15)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        fontWeight: "700",
                        fontSize: "0.85rem",
                        zIndex: 2,
                        flexShrink: 0,
                        boxShadow: isCompleted ? "0 0 12px rgba(16, 185, 129, 0.4)" : isInProg ? "0 0 12px rgba(59, 130, 246, 0.4)" : "none",
                      }}
                    >
                      {isCompleted ? <CheckCircle2 size={18} /> : isInProg ? <Clock size={18} className="spin" /> : step.step}
                    </div>

                    {/* Step Text Info */}
                    <div
                      style={{
                        flex: 1,
                        background: isInProg ? "rgba(59, 130, 246, 0.08)" : "rgba(15, 23, 42, 0.4)",
                        border: isInProg ? "1px solid rgba(59, 130, 246, 0.3)" : "1px solid var(--border-subtle)",
                        borderRadius: "var(--radius-sm)",
                        padding: "12px 16px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px", flexWrap: "wrap" }}>
                        <strong style={{ fontSize: "0.95rem", color: isCompleted || isInProg ? "#F8FAFC" : "var(--text-muted)" }}>
                          {step.title}
                        </strong>
                        {step.timestamp && (
                          <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>{step.timestamp}</span>
                        )}
                      </div>
                      <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: 0 }}>
                        {step.details}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Photographic Verification & Before/After Proof */}
          <div className="glass-panel" style={{ padding: "1.75rem" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: "700", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "8px" }}>
              <ShieldCheck size={18} style={{ color: "#10B981" }} />
              Photographic Quality Audit
            </h3>

            {trackData.incident.after_image_url ? (
              <BeforeAfterSlider
                beforeUrl={api.getImageUrl(trackData.incident.before_image_url)}
                afterUrl={api.getImageUrl(trackData.incident.after_image_url)}
                title="Interactive Before vs After Repair Split Slider"
              />
            ) : trackData.incident.before_image_url ? (
              <div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-dim)", marginBottom: "6px" }}>
                  AI Initial Damage Classification Snapshot:
                </div>
                <img
                  src={api.getImageUrl(trackData.incident.before_image_url)}
                  alt="Initial road damage"
                  style={{ width: "100%", height: "280px", objectFit: "cover", borderRadius: "8px" }}
                />
                <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "8px", textAlign: "center" }}>
                  * After-repair photo proof will be uploaded once field crew completes asphalt resurfacing.
                </div>
              </div>
            ) : (
              <p style={{ fontSize: "0.85rem", color: "var(--text-dim)" }}>No photo evidence uploaded.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
