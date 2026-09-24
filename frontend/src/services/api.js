const API_BASE = "http://127.0.0.1:8000";

export async function fetchJson(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, options);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Request failed with status ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Citizen
  reportIncident: async (formData) => {
    const res = await fetch(`${API_BASE}/api/incidents/report`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to submit report");
    }
    return res.json();
  },

  getIncidents: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.status && params.status !== "ALL") query.append("status", params.status);
    if (params.priority_level && params.priority_level !== "ALL") query.append("priority_level", params.priority_level);
    if (params.damage_type && params.damage_type !== "ALL") query.append("damage_type", params.damage_type);
    if (params.search) query.append("search", params.search);
    return fetchJson(`/api/incidents?${query.toString()}`);
  },

  getIncidentDetail: async (id) => {
    return fetchJson(`/api/incidents/${id}`);
  },

  voteIncident: async (id, voteType) => {
    return fetchJson(`/api/incidents/${id}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vote_type: voteType }),
    });
  },

  // Authority Admin
  getDashboardStats: async () => {
    return fetchJson("/api/authority/stats");
  },

  verifyIncident: async (id, action = "VERIFY") => {
    return fetchJson(`/api/authority/verify/${id}?action=${action}`, {
      method: "POST",
    });
  },

  getDuplicateClusters: async () => {
    return fetchJson("/api/authority/duplicates");
  },

  mergeDuplicates: async (sourceIds, targetId) => {
    return fetchJson("/api/authority/merge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source_incident_ids: sourceIds,
        target_incident_id: targetId,
      }),
    });
  },

  getWorkers: async () => {
    return fetchJson("/api/authority/workers");
  },

  assignWorkOrder: async (incidentId, workerId, notes = "") => {
    return fetchJson(`/api/authority/assign/${incidentId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ worker_id: workerId, notes }),
    });
  },

  // Field Worker
  getWorkerAssignments: async (workerId) => {
    return fetchJson(`/api/workers/${workerId}/assignments`);
  },

  startRepairWork: async (assignmentId, coords = {}) => {
    const formData = new FormData();
    if (coords.latitude) formData.append("worker_lat", coords.latitude);
    if (coords.longitude) formData.append("worker_lon", coords.longitude);
    const res = await fetch(`${API_BASE}/api/workers/assignments/${assignmentId}/start`, {
      method: "POST",
      body: formData,
    });
    return res.json();
  },

  completeRepairWork: async (assignmentId, formData) => {
    const res = await fetch(`${API_BASE}/api/workers/assignments/${assignmentId}/complete`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to submit repair completion");
    }
    return res.json();
  },

  verifyClosure: async (incidentId, approved = true, notes = "") => {
    const formData = new FormData();
    formData.append("approved", approved);
    if (notes) formData.append("notes", notes);
    const res = await fetch(`${API_BASE}/api/workers/verify-closure/${incidentId}`, {
      method: "POST",
      body: formData,
    });
    return res.json();
  },

  // Analytics, Budget & Exports
  getBudgetEstimate: async () => {
    return fetchJson("/api/reports/budget-estimate");
  },

  trackIncident: async (incidentId) => {
    return fetchJson(`/api/incidents/track/${incidentId}`);
  },

  analyzeDashcamFrame: async (formData) => {
    const res = await fetch(`${API_BASE}/api/incidents/dashcam-frame`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Dashcam analysis failed");
    }
    return res.json();
  },

  getHeatmapData: async () => {
    return fetchJson("/api/analytics/heatmap");
  },

  queryCopilot: async (queryText) => {
    return fetchJson("/api/analytics/copilot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: queryText }),
    });
  },

  getPdfUrl: (incidentId) => `${API_BASE}/api/reports/pdf/${incidentId}`,
  getCsvExportUrl: () => `${API_BASE}/api/reports/export/csv`,
  getGeoJsonExportUrl: () => `${API_BASE}/api/reports/export/geojson`,
  getImageUrl: (relativeUrl) => (relativeUrl ? `${API_BASE}${relativeUrl}` : null),
};
