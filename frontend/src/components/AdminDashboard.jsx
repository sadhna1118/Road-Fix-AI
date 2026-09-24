import React, { useState, useEffect } from "react";
import {
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  Send,
  GitMerge,
  Filter,
  Search,
  Download,
  Eye,
  Activity,
  HardHat,
  Shield,
  Layers,
  DollarSign,
  TrendingUp,
  FileSpreadsheet,
} from "lucide-react";
import { api } from "../services/api";
import BeforeAfterSlider from "./BeforeAfterSlider";
import BudgetAnalytics from "./BudgetAnalytics";

export default function AdminDashboard({
  incidents = [],
  onRefresh = () => {},
  onSelectIncident = () => {},
}) {
  const [adminTab, setAdminTab] = useState("operations"); // operations, budget
  const [stats, setStats] = useState(null);
  const [duplicates, setDuplicates] = useState([]);
  const [workers, setWorkers] = useState([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [damageFilter, setDamageFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  // Modals & Drawers
  const [dispatchModalIncident, setDispatchModalIncident] = useState(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState("");
  const [dispatchNotes, setDispatchNotes] = useState("");
  const [inspectIncident, setInspectIncident] = useState(null);
  const [isMerging, setIsMerging] = useState(false);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      const [s, dup, wkr] = await Promise.all([
        api.getDashboardStats(),
        api.getDuplicateClusters(),
        api.getWorkers(),
      ]);
      setStats(s);
      setDuplicates(dup);
      setWorkers(wkr);
      if (wkr.length > 0) setSelectedWorkerId(wkr[0].id);
    } catch (err) {
      console.error("Admin load error:", err);
    }
  };

  const handleMerge = async (cluster) => {
    setIsMerging(true);
    try {
      const sourceIds = cluster.candidates.map((c) => c.incident.id);
      await api.mergeDuplicates(sourceIds, cluster.master_incident.id);
      alert(`Merged ${sourceIds.length} candidate(s) into Master #${cluster.master_incident.id}`);
      await loadAdminData();
      onRefresh();
    } catch (e) {
      alert(`Merge error: ${e.message}`);
    } finally {
      setIsMerging(false);
    }
  };

  const handleVerify = async (incidentId, action) => {
    try {
      await api.verifyIncident(incidentId, action);
      await loadAdminData();
      onRefresh();
      if (inspectIncident?.id === incidentId) {
        const updated = await api.getIncidentDetail(incidentId);
        setInspectIncident(updated);
      }
    } catch (e) {
      alert(`Action error: ${e.message}`);
    }
  };

  const handleDispatch = async (e) => {
    e.preventDefault();
    if (!dispatchModalIncident || !selectedWorkerId) return;
    try {
      await api.assignWorkOrder(dispatchModalIncident.id, selectedWorkerId, dispatchNotes);
      alert(`Work Order dispatched to field technician.`);
      setDispatchModalIncident(null);
      setDispatchNotes("");
      await loadAdminData();
      onRefresh();
    } catch (e) {
      alert(`Dispatch error: ${e.message}`);
    }
  };

  const handleInspect = async (inc) => {
    try {
      const detail = await api.getIncidentDetail(inc.id);
      setInspectIncident(detail);
    } catch (e) {
      setInspectIncident(inc);
    }
  };

  // Filtered incidents
  const filteredIncidents = incidents.filter((inc) => {
    if (statusFilter !== "ALL" && inc.status !== statusFilter) return false;
    if (priorityFilter !== "ALL" && inc.priority_level !== priorityFilter) return false;
    if (damageFilter !== "ALL" && inc.canonical_damage_type !== damageFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const match =
        inc.id.toLowerCase().includes(term) ||
        inc.canonical_damage_type.toLowerCase().includes(term) ||
        (inc.address_text && inc.address_text.toLowerCase().includes(term));
      if (!match) return false;
    }
    return true;
  });

  return (
    <div>
      {/* Sub-Tab Navigation Switcher */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "10px" }}>
        <div
          style={{
            display: "flex",
            background: "#111827",
            padding: "4px",
            borderRadius: "var(--radius-full)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <button
            id="tab-admin-operations-btn"
            className={`btn btn-sm ${adminTab === "operations" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setAdminTab("operations")}
            style={{ borderRadius: "var(--radius-full)" }}
          >
            <Layers size={14} /> Incidents & Dispatch ({incidents.length})
          </button>
          <button
            id="tab-admin-budget-btn"
            className={`btn btn-sm ${adminTab === "budget" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setAdminTab("budget")}
            style={{ borderRadius: "var(--radius-full)" }}
          >
            <DollarSign size={14} /> Budget & Materials Planner
          </button>
        </div>

        {/* Quick CSV Export Shortcut */}
        <a
          href={api.getCsvExportUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary btn-sm"
          style={{ fontSize: "0.78rem" }}
        >
          <FileSpreadsheet size={14} style={{ color: "#34D399" }} />
          <span>Download Incident CSV</span>
        </a>
      </div>

      {adminTab === "budget" ? (
        <BudgetAnalytics />
      ) : (
        <>
          {/* KPI Cards Header */}
      <div className="grid-4" style={{ marginBottom: "1.5rem" }}>
        <div className="glass-panel" style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "600" }}>TOTAL INCIDENTS</span>
            <Layers size={18} style={{ color: "#3B82F6" }} />
          </div>
          <div style={{ fontSize: "1.85rem", fontWeight: "800", color: "#FFFFFF" }}>
            {stats ? stats.total_incidents : "..."}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "4px" }}>
            {stats ? `${stats.high_priority_count} High/Critical Priority` : "Loading..."}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "600" }}>AWAITING REVIEW</span>
            <Clock size={18} style={{ color: "#F59E0B" }} />
          </div>
          <div style={{ fontSize: "1.85rem", fontWeight: "800", color: "#FBBF24" }}>
            {stats ? stats.unverified : "..."}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "4px" }}>
            AI detected, needs municipal sign-off
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "600" }}>REPAIRS IN PROGRESS</span>
            <HardHat size={18} style={{ color: "#3B82F6" }} />
          </div>
          <div style={{ fontSize: "1.85rem", fontWeight: "800", color: "#60A5FA" }}>
            {stats ? stats.in_progress : "..."}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "4px" }}>
            Active work orders assigned to field crews
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "600" }}>ROAD HEALTH INDEX</span>
            <Activity size={18} style={{ color: "#10B981" }} />
          </div>
          <div style={{ fontSize: "1.85rem", fontWeight: "800", color: "#34D399" }}>
            {stats ? `${stats.road_health_index}/100` : "..."}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "4px" }}>
            {stats ? `${stats.resolved} incidents successfully resolved` : "Loading..."}
          </div>
        </div>
      </div>

      {/* Spatial Duplicate Candidates Banner */}
      {duplicates.length > 0 && (
        <div
          className="glass-panel"
          style={{
            padding: "1rem 1.25rem",
            marginBottom: "1.5rem",
            background: "rgba(245, 158, 11, 0.08)",
            border: "1px solid rgba(245, 158, 11, 0.3)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <GitMerge size={20} style={{ color: "#F59E0B" }} />
              <div>
                <strong style={{ fontSize: "0.9rem", color: "#FBBF24" }}>
                  Spatial Duplicate Clusters Detected ({duplicates.length})
                </strong>
                <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  Multiple citizen reports filed within 35 meters of each other. Consolidate to streamline work orders.
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              {duplicates.map((cluster, idx) => (
                <button
                  key={idx}
                  id={`merge-cluster-btn-${idx}`}
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleMerge(cluster)}
                  disabled={isMerging}
                  style={{ fontSize: "0.75rem", borderColor: "rgba(245, 158, 11, 0.4)", color: "#FBBF24" }}
                >
                  <GitMerge size={13} />
                  <span>Merge {cluster.candidates.length} into #{cluster.master_incident.id}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div
        className="glass-panel"
        style={{
          padding: "1rem",
          marginBottom: "1rem",
          display: "flex",
          gap: "12px",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: "220px" }}>
          <Search size={16} style={{ color: "var(--text-dim)" }} />
          <input
            type="text"
            id="admin-search-input"
            placeholder="Search by Incident ID, Road, or Damage Type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              background: "transparent",
              border: "none",
              color: "var(--text-main)",
              fontSize: "0.85rem",
              outline: "none",
            }}
          />
        </div>

        {/* Status Dropdown */}
        <select
          id="filter-status-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            background: "var(--bg-input)",
            border: "1px solid var(--border-subtle)",
            color: "var(--text-main)",
            padding: "6px 12px",
            borderRadius: "var(--radius-sm)",
            fontSize: "0.8rem",
          }}
        >
          <option value="ALL">All Statuses</option>
          <option value="AI_DETECTED">AI Detected</option>
          <option value="VERIFIED">Verified</option>
          <option value="ASSIGNED">Assigned</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="REPAIR_SUBMITTED">Repair Submitted</option>
          <option value="VERIFIED_CLOSED">Verified Closed</option>
        </select>

        {/* Priority Dropdown */}
        <select
          id="filter-priority-select"
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          style={{
            background: "var(--bg-input)",
            border: "1px solid var(--border-subtle)",
            color: "var(--text-main)",
            padding: "6px 12px",
            borderRadius: "var(--radius-sm)",
            fontSize: "0.8rem",
          }}
        >
          <option value="ALL">All Priorities</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>

        {/* Damage Type Dropdown */}
        <select
          id="filter-damage-select"
          value={damageFilter}
          onChange={(e) => setDamageFilter(e.target.value)}
          style={{
            background: "var(--bg-input)",
            border: "1px solid var(--border-subtle)",
            color: "var(--text-main)",
            padding: "6px 12px",
            borderRadius: "var(--radius-sm)",
            fontSize: "0.8rem",
          }}
        >
          <option value="ALL">All Distresses</option>
          <option value="Pothole">Pothole</option>
          <option value="Alligator Crack">Alligator Crack</option>
          <option value="Longitudinal Crack">Longitudinal Crack</option>
          <option value="Broken Road">Broken Road</option>
          <option value="Waterlogging">Waterlogging</option>
        </select>
      </div>

      {/* Incidents Table */}
      <div className="glass-panel" style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase" }}>
              <th style={{ padding: "12px 16px" }}>Incident</th>
              <th style={{ padding: "12px 16px" }}>Classification</th>
              <th style={{ padding: "12px 16px" }}>Priority</th>
              <th style={{ padding: "12px 16px" }}>Status</th>
              <th style={{ padding: "12px 16px" }}>Crowdsource</th>
              <th style={{ padding: "12px 16px" }}>Evidence</th>
              <th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredIncidents.map((inc) => (
              <tr
                key={inc.id}
                style={{
                  borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                  transition: "background 0.15s ease",
                }}
                className="table-row-hover"
              >
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ fontWeight: "700", color: "#F8FAFC" }}>#{inc.id}</div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>
                    {inc.address_text || `${inc.latitude.toFixed(4)}, ${inc.longitude.toFixed(4)}`}
                  </div>
                </td>

                <td style={{ padding: "12px 16px" }}>
                  <div style={{ fontWeight: "600", color: "#E2E8F0" }}>{inc.canonical_damage_type}</div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>
                    {Math.round(inc.confidence * 100)}% AI Confidence
                  </div>
                </td>

                <td style={{ padding: "12px 16px" }}>
                  <span
                    className={`badge badge-${
                      inc.priority_level === "CRITICAL"
                        ? "critical"
                        : inc.priority_level === "HIGH"
                        ? "high"
                        : inc.priority_level === "LOW"
                        ? "low"
                        : "medium"
                    }`}
                  >
                    <span
                      className={`pulse-dot ${
                        inc.priority_level === "CRITICAL"
                          ? "critical"
                          : inc.priority_level === "HIGH"
                          ? "high"
                          : inc.priority_level === "LOW"
                          ? "low"
                          : "medium"
                      }`}
                    />
                    {inc.priority_score}/100
                  </span>
                </td>

                <td style={{ padding: "12px 16px" }}>
                  <span className="badge badge-status">{inc.status}</span>
                </td>

                <td style={{ padding: "12px 16px" }}>
                  <div style={{ fontWeight: "600", color: "#93C5FD" }}>{inc.report_count} Reports</div>
                </td>

                <td style={{ padding: "12px 16px" }}>
                  {inc.before_image_url ? (
                    <img
                      src={api.getImageUrl(inc.before_image_url)}
                      alt="Thumbnail"
                      style={{ width: "42px", height: "42px", objectFit: "cover", borderRadius: "6px" }}
                    />
                  ) : (
                    <span style={{ color: "var(--text-dim)", fontSize: "0.75rem" }}>None</span>
                  )}
                </td>

                <td style={{ padding: "12px 16px", textAlign: "right" }}>
                  <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                    <button
                      id={`inspect-table-btn-${inc.id}`}
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleInspect(inc)}
                      title="Inspect full dossier and audit logs"
                    >
                      <Eye size={13} />
                      <span>Details</span>
                    </button>

                    {inc.status === "AI_DETECTED" && (
                      <button
                        id={`verify-table-btn-${inc.id}`}
                        className="btn btn-primary btn-sm"
                        onClick={() => handleVerify(inc.id, "VERIFY")}
                      >
                        <CheckCircle2 size={13} />
                        <span>Verify</span>
                      </button>
                    )}

                    {["VERIFIED", "AI_DETECTED"].includes(inc.status) && (
                      <button
                        id={`dispatch-table-btn-${inc.id}`}
                        className="btn btn-accent btn-sm"
                        onClick={() => setDispatchModalIncident(inc)}
                      >
                        <Send size={13} />
                        <span>Dispatch</span>
                      </button>
                    )}

                    <a
                      id={`pdf-export-btn-${inc.id}`}
                      href={api.getPdfUrl(inc.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary btn-sm"
                      title="Download Official Municipal Audit PDF"
                    >
                      <Download size={13} />
                      <span>PDF</span>
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </>
      )}

      {/* Dispatch Work Order Modal */}
      {dispatchModalIncident && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ padding: "1.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "700" }}>
                Dispatch Repair Work Order
              </h3>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setDispatchModalIncident(null)}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>
              Assigning field technician to Incident <strong>#{dispatchModalIncident.id}</strong> (
              {dispatchModalIncident.canonical_damage_type}, Priority: {dispatchModalIncident.priority_score}/100).
            </p>

            <form onSubmit={handleDispatch}>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "6px" }}>
                  SELECT FIELD CREW / WORKER
                </label>
                <select
                  id="dispatch-worker-select"
                  value={selectedWorkerId}
                  onChange={(e) => setSelectedWorkerId(e.target.value)}
                  style={{
                    width: "100%",
                    background: "var(--bg-input)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-sm)",
                    padding: "10px",
                    color: "var(--text-main)",
                    fontSize: "0.85rem",
                  }}
                >
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.department}) - Active Jobs: {w.active_jobs_count} [{w.status}]
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "6px" }}>
                  DISPATCH INSTRUCTIONS / SPECIAL MATERIALS
                </label>
                <textarea
                  id="dispatch-notes-input"
                  rows={3}
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  placeholder="e.g. Use cold mix compaction grade 2, safety cones required for high speed lane..."
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
                  onClick={() => setDispatchModalIncident(null)}
                >
                  Cancel
                </button>
                <button type="submit" id="confirm-dispatch-btn" className="btn btn-primary">
                  <Send size={15} /> Confirm & Dispatch Job
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Incident Detail & Audit Modal */}
      {inspectIncident && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: "800px", padding: "2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div>
                <h3 style={{ fontSize: "1.3rem", fontWeight: "800" }}>
                  Incident Dossier #{inspectIncident.id}
                </h3>
                <p style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>
                  {inspectIncident.title} • {inspectIncident.address_text}
                </p>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setInspectIncident(null)}>
                ✕
              </button>
            </div>

            {/* Before vs After Slider if after photo exists */}
            {inspectIncident.after_image_url ? (
              <BeforeAfterSlider
                beforeUrl={api.getImageUrl(inspectIncident.before_image_url)}
                afterUrl={api.getImageUrl(inspectIncident.after_image_url)}
                title="Photographic Audit: Pre-Repair vs Completed Surface"
              />
            ) : inspectIncident.before_image_url ? (
              <div style={{ marginBottom: "1rem" }}>
                <h4 style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "6px" }}>
                  AI Computer Vision Evidence:
                </h4>
                <img
                  src={api.getImageUrl(inspectIncident.before_image_url)}
                  alt="Evidence"
                  style={{ width: "100%", height: "260px", objectFit: "cover", borderRadius: "8px" }}
                />
              </div>
            ) : null}

            {/* Verification actions if repair submitted */}
            {inspectIncident.status === "REPAIR_SUBMITTED" && (
              <div
                style={{
                  background: "rgba(16, 185, 129, 0.1)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  padding: "1rem",
                  borderRadius: "var(--radius-sm)",
                  marginBottom: "1.25rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <strong style={{ color: "#34D399", fontSize: "0.9rem" }}>Field Repair Completed</strong>
                  <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                    Technician has submitted after-repair photo evidence. Perform audit sign-off to close incident.
                  </p>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    id="approve-closure-btn"
                    className="btn btn-primary btn-sm"
                    onClick={async () => {
                      await api.verifyClosure(inspectIncident.id, true, "Photographic audit approved");
                      const updated = await api.getIncidentDetail(inspectIncident.id);
                      setInspectIncident(updated);
                      onRefresh();
                    }}
                  >
                    ✓ Approve Closure
                  </button>
                </div>
              </div>
            )}

            {/* Audit Log Table */}
            <h4 style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginBottom: "8px" }}>
              Immutable Lifecycle Audit Log:
            </h4>
            <div style={{ background: "#111827", borderRadius: "8px", overflow: "hidden", border: "1px solid var(--border-subtle)" }}>
              <table style={{ width: "100%", fontSize: "0.75rem", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "rgba(255, 255, 255, 0.05)", textAlign: "left", color: "var(--text-muted)" }}>
                    <th style={{ padding: "8px 12px" }}>Timestamp</th>
                    <th style={{ padding: "8px 12px" }}>Action</th>
                    <th style={{ padding: "8px 12px" }}>Actor</th>
                    <th style={{ padding: "8px 12px" }}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {(inspectIncident.audit_logs || []).map((log) => (
                    <tr key={log.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}>
                      <td style={{ padding: "8px 12px", color: "var(--text-dim)" }}>
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td style={{ padding: "8px 12px", fontWeight: "600", color: "#60A5FA" }}>{log.action}</td>
                      <td style={{ padding: "8px 12px" }}>{log.actor_name} ({log.actor_role})</td>
                      <td style={{ padding: "8px 12px", color: "var(--text-muted)" }}>{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.25rem", gap: "10px" }}>
              <a
                href={api.getPdfUrl(inspectIncident.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-sm"
              >
                <Download size={14} /> Download Official PDF Report
              </a>
              <button className="btn btn-secondary btn-sm" onClick={() => setInspectIncident(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
