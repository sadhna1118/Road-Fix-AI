import React, { useState, useEffect, useRef } from "react";
import {
  HardHat,
  MapPin,
  Navigation,
  Play,
  CheckCircle,
  Camera,
  AlertTriangle,
  Clock,
  Wrench,
  ExternalLink,
  Route,
  Package,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { api } from "../services/api";
import { soundFX } from "../services/soundEffects";
import BeforeAfterSlider from "./BeforeAfterSlider";

// Haversine distance calculator for route optimization
function calcDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function WorkerPortal({ onJobCompleted = () => {} }) {
  const [workers, setWorkers] = useState([]);
  const [currentWorkerId, setCurrentWorkerId] = useState("WKR-01");
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [optimizedRoute, setOptimizedRoute] = useState([]);
  const [optimizeEnabled, setOptimizeEnabled] = useState(true);

  // Completion modal state
  const [completingAssignment, setCompletingAssignment] = useState(null);
  const [afterFile, setAfterFile] = useState(null);
  const [afterPreview, setAfterPreview] = useState(null);
  const [materialsUsed, setMaterialsUsed] = useState("Cold Mix Bitumen (Grade 2) & Polymer Sealant");
  const [workerNotes, setWorkerNotes] = useState("Pothole excavated, primed with tack coat, filled, and compacted to road grade.");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tools checklist state
  const [checklist, setChecklist] = useState({
    asphaltBags: true,
    tackCoat: true,
    safetyCones: true,
    compactor: true,
  });

  const fileInputRef = useRef(null);

  useEffect(() => {
    loadWorkers();
  }, []);

  useEffect(() => {
    if (currentWorkerId) {
      loadAssignments(currentWorkerId);
    }
  }, [currentWorkerId]);

  const loadWorkers = async () => {
    try {
      const data = await api.getWorkers();
      setWorkers(data);
      if (data.length > 0 && !currentWorkerId) {
        setCurrentWorkerId(data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadAssignments = async (workerId) => {
    setLoading(true);
    try {
      const data = await api.getWorkerAssignments(workerId);
      setAssignments(data);
      computeOptimizedRoute(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Compute Traveling Salesperson Shortest Path Sequence
  const computeOptimizedRoute = (items) => {
    if (!items || items.length <= 1) {
      setOptimizedRoute(items);
      return;
    }

    // Greedy Nearest Neighbor ordering
    let unvisited = [...items];
    let route = [];
    let current = unvisited.shift();
    route.push(current);

    while (unvisited.length > 0) {
      let nearestIdx = 0;
      let minDistance = Infinity;
      for (let i = 0; i < unvisited.length; i++) {
        const dist = calcDistanceMeters(
          current.latitude,
          current.longitude,
          unvisited[i].latitude,
          unvisited[i].longitude
        );
        if (dist < minDistance) {
          minDistance = dist;
          nearestIdx = i;
        }
      }
      current = unvisited.splice(nearestIdx, 1)[0];
      route.push(current);
    }
    setOptimizedRoute(route);
  };

  const handleStartWork = async (assignmentId) => {
    try {
      await api.startRepairWork(assignmentId);
      soundFX.playSuccessChime();
      alert("Work order marked as IN_PROGRESS. Timestamp and field crew location logged.");
      loadAssignments(currentWorkerId);
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleAfterFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      soundFX.playShutterSound();
      setAfterFile(file);
      setAfterPreview(URL.createObjectURL(file));
    }
  };

  const handleCompleteSubmit = async (e) => {
    e.preventDefault();
    if (!afterFile) {
      alert("Mandatory: Please upload an After-Repair photographic proof.");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("after_file", afterFile);
      formData.append("materials_used", materialsUsed);
      formData.append("worker_notes", workerNotes);

      await api.completeRepairWork(completingAssignment.assignment_id, formData);
      soundFX.playSuccessChime();
      alert("Repair submitted successfully! Photo proof forwarded to Municipal Inspector.");
      setCompletingAssignment(null);
      setAfterFile(null);
      setAfterPreview(null);
      loadAssignments(currentWorkerId);
      onJobCompleted();
    } catch (err) {
      alert(`Error submitting repair: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentWorker = workers.find((w) => w.id === currentWorkerId);
  const activeJobs = optimizeEnabled ? optimizedRoute : assignments;

  // Inventory calculation: 9 bags per pothole, 25 bags per broken road
  const totalBagsNeeded = assignments.reduce((acc, job) => {
    return acc + (job.damage_type.includes("Broken") ? 25 : 9);
  }, 0);

  return (
    <div style={{ maxWidth: "980px", margin: "0 auto" }}>
      {/* Worker Header & Profile Switcher */}
      <div
        className="glass-panel"
        style={{
          padding: "1.25rem 1.5rem",
          marginBottom: "1.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "var(--radius-sm)",
              background: "linear-gradient(135deg, #F59E0B, #D97706)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
            }}
          >
            <HardHat size={26} />
          </div>
          <div>
            <h3 style={{ fontSize: "1.15rem", fontWeight: "700" }}>
              Field Operations & Dispatch Portal
            </h3>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              {currentWorker ? `${currentWorker.name} • ${currentWorker.department}` : "Select Crew Profile"}
            </p>
          </div>
        </div>

        {/* Worker Switcher Dropdown */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>Crew:</span>
          <select
            id="worker-select"
            value={currentWorkerId}
            onChange={(e) => setCurrentWorkerId(e.target.value)}
            style={{
              background: "var(--bg-input)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-sm)",
              padding: "8px 12px",
              color: "var(--text-main)",
              fontSize: "0.85rem",
              fontWeight: "600",
            }}
          >
            {workers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.active_jobs_count} Jobs) [{w.status}]
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Dispatched Logistics & Inventory Bar */}
      {assignments.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 1fr",
            gap: "1.25rem",
            marginBottom: "1.5rem",
          }}
        >
          {/* Smart Route Optimizer Banner */}
          <div
            className="glass-panel"
            style={{
              padding: "1.25rem",
              background: "linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(99, 102, 241, 0.05))",
              border: "1px solid rgba(59, 130, 246, 0.3)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Route size={18} style={{ color: "#60A5FA" }} />
                <strong style={{ fontSize: "0.95rem", color: "#93C5FD" }}>
                  AI Turn-by-Turn Route Optimization
                </strong>
              </div>
              <button
                id="toggle-route-opt-btn"
                className="btn btn-secondary btn-sm"
                onClick={() => setOptimizeEnabled(!optimizeEnabled)}
                style={{ fontSize: "0.72rem", padding: "3px 8px" }}
              >
                {optimizeEnabled ? "Shortest Route (Active)" : "FIFO Order"}
              </button>
            </div>
            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "8px" }}>
              {optimizeEnabled
                ? `Sequenced ${assignments.length} dispatched jobs using Haversine TSP ordering to minimize fuel and transit time.`
                : "Showing jobs in default chronological assignment order."}
            </p>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {activeJobs.map((job, idx) => (
                <span
                  key={job.assignment_id}
                  style={{
                    background: "rgba(15, 23, 42, 0.8)",
                    border: "1px solid rgba(59, 130, 246, 0.4)",
                    borderRadius: "var(--radius-full)",
                    padding: "2px 8px",
                    fontSize: "0.7rem",
                    color: "#E2E8F0",
                  }}
                >
                  Stop #{idx + 1}: #{job.incident_id}
                </span>
              ))}
            </div>
          </div>

          {/* Truck Material Checklist */}
          <div className="glass-panel" style={{ padding: "1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <Package size={18} style={{ color: "#F59E0B" }} />
              <strong style={{ fontSize: "0.95rem" }}>Required Truck Inventory</strong>
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "8px" }}>
              Estimated for {assignments.length} assigned jobs:
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "4px" }}>
              <span>Cold Mix Asphalt:</span>
              <strong style={{ color: "#34D399" }}>~{totalBagsNeeded} Bags (50kg)</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
              <span>Bitumen Tack Emulsion:</span>
              <strong style={{ color: "#FBBF24" }}>~{assignments.length * 15} Liters</strong>
            </div>
          </div>
        </div>
      )}

      {/* Dispatched Work Orders List */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: "700" }}>
            Assigned Work Orders ({assignments.length})
          </h3>
          <button className="btn btn-secondary btn-sm" onClick={() => loadAssignments(currentWorkerId)}>
            <RefreshCw size={13} className={loading ? "spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-dim)" }}>
            <RefreshCw size={28} className="spin" style={{ margin: "0 auto 8px" }} />
            <div>Loading dispatched work orders...</div>
          </div>
        ) : assignments.length === 0 ? (
          <div className="glass-panel" style={{ padding: "3rem 1rem", textAlign: "center", color: "var(--text-dim)" }}>
            <CheckCircle size={40} style={{ color: "#10B981", margin: "0 auto 12px", opacity: 0.8 }} />
            <h4 style={{ fontSize: "1.1rem", fontWeight: "700", color: "#F8FAFC", marginBottom: "4px" }}>
              No Pending Work Orders!
            </h4>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              All assigned road repairs for this field crew have been completed and verified.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {activeJobs.map((job, idx) => (
              <div
                key={job.assignment_id}
                className="glass-panel"
                style={{
                  padding: "1.5rem",
                  borderLeft: job.status === "IN_PROGRESS" ? "4px solid #3B82F6" : "4px solid #F59E0B",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "1rem" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <span
                        style={{
                          background: "#1E293B",
                          color: "#93C5FD",
                          fontSize: "0.72rem",
                          fontWeight: "700",
                          padding: "2px 8px",
                          borderRadius: "var(--radius-full)",
                          border: "1px solid rgba(59, 130, 246, 0.4)",
                        }}
                      >
                        Stop #{idx + 1}
                      </span>
                      <h4 style={{ fontSize: "1.15rem", fontWeight: "700", color: "#F8FAFC" }}>
                        #{job.incident_id} — {job.damage_type}
                      </h4>
                      <span className={`badge badge-${job.priority_level === "CRITICAL" ? "critical" : job.priority_level === "HIGH" ? "high" : "medium"}`}>
                        {job.priority_level} ({job.priority_score}/100)
                      </span>
                    </div>

                    <p style={{ fontSize: "0.82rem", color: "var(--text-dim)", display: "flex", alignItems: "center", gap: "6px" }}>
                      <MapPin size={14} style={{ color: "#3B82F6" }} />
                      {job.address_text || `${job.latitude.toFixed(4)}°N, ${job.longitude.toFixed(4)}°E`}
                    </p>
                  </div>

                  <span className="badge badge-status" style={{ fontSize: "0.8rem", padding: "6px 12px" }}>
                    {job.status}
                  </span>
                </div>

                {/* Evidence Thumbnail + Instructions */}
                <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
                  {job.before_image_url ? (
                    <img
                      src={api.getImageUrl(job.before_image_url)}
                      alt="Damage preview"
                      style={{ width: "100%", height: "120px", objectFit: "cover", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}
                    />
                  ) : (
                    <div style={{ width: "100%", height: "120px", background: "#111827", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-dim)", fontSize: "0.75rem" }}>
                      No Photo Evidence
                    </div>
                  )}

                  <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                      <div><strong>Dispatched:</strong> {job.assigned_at ? new Date(job.assigned_at).toLocaleString() : "Recently"}</div>
                      <div><strong>Recommended Materials:</strong> Bituminous Cold Mix + Tack Coat Emulsion</div>
                      <div><strong>GPS Pin:</strong> {job.latitude.toFixed(5)}, {job.longitude.toFixed(5)}</div>
                    </div>

                    {/* Action Bar */}
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "10px" }}>
                      {/* Turn-by-Turn Navigation External Link */}
                      <a
                        id={`nav-link-${job.assignment_id}`}
                        href={`https://www.google.com/maps/dir/?api=1&destination=${job.latitude},${job.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary btn-sm"
                        style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem" }}
                      >
                        <Navigation size={14} style={{ color: "#3B82F6" }} />
                        <span>Navigate (GPS)</span>
                      </a>

                      {job.status === "ASSIGNED" && (
                        <button
                          id={`start-work-btn-${job.assignment_id}`}
                          className="btn btn-primary btn-sm"
                          onClick={() => handleStartWork(job.assignment_id)}
                          style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem" }}
                        >
                          <Play size={14} />
                          <span>Check-in On Site</span>
                        </button>
                      )}

                      {job.status === "IN_PROGRESS" && (
                        <button
                          id={`complete-work-btn-${job.assignment_id}`}
                          className="btn btn-accent btn-sm"
                          onClick={() => setCompletingAssignment(job)}
                          style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", background: "linear-gradient(135deg, #10B981, #059669)", border: "none" }}
                        >
                          <Camera size={14} />
                          <span>Submit Repair Photo Proof</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Complete Repair Modal with Mandatory Photographic Proof */}
      {completingAssignment && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: "600px", padding: "1.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "700" }}>
                Submit Repair Completion Proof
              </h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setCompletingAssignment(null)}>
                ✕
              </button>
            </div>

            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>
              Incident <strong>#{completingAssignment.incident_id}</strong> ({completingAssignment.damage_type}). Mandatory on-site compacted surface photo required for municipal sign-off.
            </p>

            <form onSubmit={handleCompleteSubmit}>
              {/* After Photo Upload */}
              <div style={{ marginBottom: "1.25rem" }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "6px" }}>
                  AFTER-REPAIR PHOTO PROOF <span style={{ color: "#EF4444" }}>*</span>
                </label>

                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  ref={fileInputRef}
                  onChange={handleAfterFileChange}
                  style={{ display: "none" }}
                  id="after-repair-file-input"
                />

                {afterPreview ? (
                  <div style={{ position: "relative", borderRadius: "8px", overflow: "hidden" }}>
                    <img
                      src={afterPreview}
                      alt="After repair proof"
                      style={{ width: "100%", height: "220px", objectFit: "cover" }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="btn btn-secondary btn-sm"
                      style={{ position: "absolute", bottom: "10px", right: "10px", background: "rgba(15, 23, 42, 0.85)" }}
                    >
                      <Camera size={14} /> Retake
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: "2px dashed rgba(255, 255, 255, 0.2)",
                      borderRadius: "8px",
                      padding: "2rem",
                      textAlign: "center",
                      cursor: "pointer",
                      background: "rgba(15, 23, 42, 0.4)",
                    }}
                  >
                    <Camera size={32} style={{ color: "#34D399", margin: "0 auto 8px" }} />
                    <div style={{ fontSize: "0.9rem", fontWeight: "600" }}>Upload or Capture Repaired Road Surface</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>Ensure patch compaction is clearly visible</div>
                  </div>
                )}
              </div>

              {/* Materials Used */}
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "6px" }}>
                  MATERIALS & QUANTITY USED
                </label>
                <input
                  type="text"
                  id="materials-used-input"
                  value={materialsUsed}
                  onChange={(e) => setMaterialsUsed(e.target.value)}
                  style={{
                    width: "100%",
                    background: "var(--bg-input)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-sm)",
                    padding: "10px",
                    color: "var(--text-main)",
                    fontSize: "0.85rem",
                  }}
                />
              </div>

              {/* Notes */}
              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "6px" }}>
                  OPERATIONS SIGN-OFF NOTES
                </label>
                <textarea
                  id="worker-notes-input"
                  rows={2}
                  value={workerNotes}
                  onChange={(e) => setWorkerNotes(e.target.value)}
                  style={{
                    width: "100%",
                    background: "var(--bg-input)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-sm)",
                    padding: "10px",
                    color: "var(--text-main)",
                    fontSize: "0.85rem",
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setCompletingAssignment(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="confirm-repair-submit-btn"
                  className="btn btn-primary"
                  disabled={isSubmitting || !afterFile}
                  style={{ background: "linear-gradient(135deg, #10B981, #059669)", border: "none" }}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={15} className="spin" />
                      <span>Submitting Proof...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={16} />
                      <span>Submit Repair for Authority Audit</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
