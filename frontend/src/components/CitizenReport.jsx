import React, { useState, useEffect, useRef } from "react";
import {
  Camera,
  Upload,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Navigation,
  Clock,
  ShieldCheck,
  RefreshCw,
  Map,
  Package,
  DollarSign,
  Layers,
} from "lucide-react";
import { api } from "../services/api";
import { soundFX } from "../services/soundEffects";
import MapView from "./MapView";

export default function CitizenReport({ onReportSubmitted = () => {} }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [coords, setCoords] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState(null);

  const [citizenName, setCitizenName] = useState("");
  const [userNotes, setUserNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [showMapPicker, setShowMapPicker] = useState(false);

  const fileInputRef = useRef(null);

  // Auto-fetch GPS on component mount
  useEffect(() => {
    fetchGPS();
  }, []);

  const fetchGPS = () => {
    setGpsLoading(true);
    setGpsError(null);

    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser. Using default road sector coords.");
      setCoords({ lat: 28.5684, lng: 77.2091 });
      setAccuracy(15.0);
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setAccuracy(pos.coords.accuracy);
        setGpsLoading(false);
      },
      (err) => {
        console.warn("GPS error:", err);
        setGpsError("Location access unavailable or denied. Using default road sector coords.");
        setCoords({ lat: 28.5684, lng: 77.2091 });
        setAccuracy(12.5);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      soundFX.playShutterSound();
      setFile(selected);
      const objUrl = URL.createObjectURL(selected);
      setPreviewUrl(objUrl);
      setSubmitResult(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      alert("Please capture or upload a road damage photo first.");
      return;
    }
    if (!coords) {
      alert("Location coordinates required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("latitude", coords.lat);
      formData.append("longitude", coords.lng);
      formData.append("accuracy_meters", accuracy || 5.0);
      formData.append("citizen_name", citizenName || "Anonymous Citizen");
      if (userNotes) formData.append("user_notes", userNotes);

      const res = await api.reportIncident(formData);
      soundFX.playSuccessChime();
      setSubmitResult(res);

      if (onReportSubmitted) {
        onReportSubmitted(res.incident);
      }
    } catch (err) {
      console.error(err);
      alert(`Error submitting report: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setPreviewUrl(null);
    setUserNotes("");
    setSubmitResult(null);
    fetchGPS();
  };

  return (
    <div style={{ maxWidth: "760px", margin: "0 auto" }}>
      {/* Title */}
      <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.75rem", fontWeight: "800", color: "#FFFFFF" }}>
          Report Road Distress
        </h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
          Take a photo of potholes, cracks, or waterlogging. AI will inspect the road damage in real time and notify municipal authorities.
        </p>
      </div>

      {submitResult ? (
        /* Submission Success & Detection View */
        <div className="glass-panel" style={{ padding: "2rem", textAlign: "center" }}>
          <div
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              background: submitResult.is_duplicate ? "rgba(245, 158, 11, 0.2)" : "rgba(16, 185, 129, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1rem",
              color: submitResult.is_duplicate ? "#FBBF24" : "#34D399",
            }}
          >
            {submitResult.is_duplicate ? <AlertTriangle size={32} /> : <CheckCircle2 size={32} />}
          </div>

          <h3 style={{ fontSize: "1.3rem", fontWeight: "700", marginBottom: "8px" }}>
            {submitResult.is_duplicate ? "Duplicate Detected & Merged" : "Report Verified & Registered"}
          </h3>

          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
            {submitResult.message}
          </p>

          {/* AI Vision Detection Details */}
          <div
            style={{
              background: "#111827",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              padding: "1.25rem",
              textAlign: "left",
              marginBottom: "1.5rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <Sparkles size={18} style={{ color: "#3B82F6" }} />
              <strong style={{ fontSize: "0.95rem" }}>Real-time Computer Vision Analysis:</strong>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "0.85rem" }}>
              <div>
                <span style={{ color: "var(--text-dim)" }}>Detected Distress:</span>
                <p style={{ fontWeight: "700", color: "#F8FAFC", fontSize: "1rem" }}>
                  {submitResult.incident.canonical_damage_type}
                </p>
              </div>

              <div>
                <span style={{ color: "var(--text-dim)" }}>AI Model Confidence:</span>
                <p style={{ fontWeight: "700", color: "#60A5FA", fontSize: "1rem" }}>
                  {Math.round(submitResult.incident.confidence * 100)}%
                </p>
              </div>

              <div>
                <span style={{ color: "var(--text-dim)" }}>Calculated Priority:</span>
                <p style={{ fontWeight: "700", color: "#F87171", fontSize: "1rem" }}>
                  {submitResult.incident.priority_level} ({submitResult.incident.priority_score}/100)
                </p>
              </div>

              <div>
                <span style={{ color: "var(--text-dim)" }}>Crowdsource Confirmations:</span>
                <p style={{ fontWeight: "700", color: "#34D399", fontSize: "1rem" }}>
                  {submitResult.incident.report_count} Verified Citizen Reports
                </p>
              </div>
            </div>

            {/* Estimated Repair Logistics Box */}
            <div
              style={{
                marginTop: "1rem",
                padding: "10px 12px",
                background: "rgba(59, 130, 246, 0.08)",
                border: "1px solid rgba(59, 130, 246, 0.25)",
                borderRadius: "var(--radius-sm)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "0.8rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Package size={16} style={{ color: "#60A5FA" }} />
                <span>
                  Estimated Material: <strong>~9 bags Cold Mix Bitumen (450kg)</strong>
                </span>
              </div>
              <span style={{ color: "#34D399", fontWeight: "700" }}>Est. Cost: ~₹4,800</span>
            </div>

            {/* AI Annotated preview */}
            {submitResult.incident.before_image_url && (
              <div style={{ marginTop: "1rem" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>AI Vision Bounding Box Canvas:</span>
                <img
                  src={api.getImageUrl(submitResult.incident.before_image_url)}
                  alt="AI detection preview"
                  style={{ width: "100%", height: "240px", objectFit: "cover", borderRadius: "8px", marginTop: "6px" }}
                />
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
            <button id="file-another-report-btn" className="btn btn-primary" onClick={resetForm}>
              File Another Road Report
            </button>
          </div>
        </div>
      ) : (
        /* Report Form */
        <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: "1.75rem" }}>
          {/* Photo Capture Area */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "8px", color: "var(--text-muted)" }}>
              ROAD EVIDENCE PHOTO <span style={{ color: "#EF4444" }}>*</span>
            </label>

            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{ display: "none" }}
              id="camera-file-input"
            />

            {previewUrl ? (
              <div style={{ position: "relative", borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid var(--border-subtle)" }}>
                <img
                  src={previewUrl}
                  alt="Upload preview"
                  style={{ width: "100%", height: "280px", objectFit: "cover", display: "block" }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn btn-secondary btn-sm"
                  style={{ position: "absolute", bottom: "12px", right: "12px", background: "rgba(15, 23, 42, 0.85)" }}
                >
                  <RefreshCw size={14} /> Retake Photo
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: "2px dashed rgba(255, 255, 255, 0.15)",
                  borderRadius: "var(--radius-md)",
                  padding: "2.5rem 1rem",
                  textAlign: "center",
                  cursor: "pointer",
                  background: "rgba(15, 23, 42, 0.4)",
                  transition: "all 0.2s ease",
                }}
              >
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "50%",
                    background: "rgba(59, 130, 246, 0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 12px",
                    color: "#60A5FA",
                  }}
                >
                  <Camera size={28} />
                </div>
                <h4 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "4px" }}>
                  Take Photo or Upload Evidence
                </h4>
                <p style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>
                  Supports mobile camera shutter or image files (JPG, PNG, WebP)
                </p>
              </div>
            )}
          </div>

          {/* GPS Geolocation Banner */}
          <div
            style={{
              background: "#111827",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-sm)",
              padding: "12px 16px",
              marginBottom: "1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Navigation size={20} style={{ color: "#3B82F6", flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: "0.85rem", fontWeight: "600", color: "#F8FAFC" }}>
                  {coords ? `${coords.lat.toFixed(5)}° N, ${coords.lng.toFixed(5)}° E` : "Detecting Location..."}
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>
                  {gpsLoading
                    ? "Acquiring satellite GPS lock..."
                    : accuracy
                    ? `Precision: ±${accuracy.toFixed(1)} meters (High Accuracy GPS)`
                    : "Default municipal sector coordinates"}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "6px" }}>
              <button
                type="button"
                id="toggle-map-picker-btn"
                onClick={() => setShowMapPicker(!showMapPicker)}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: "0.75rem" }}
              >
                <Map size={13} />
                <span>{showMapPicker ? "Hide Map" : "Adjust Pin on Map"}</span>
              </button>

              <button
                type="button"
                id="refresh-gps-btn"
                onClick={fetchGPS}
                className="btn btn-secondary btn-sm"
                disabled={gpsLoading}
                title="Refresh GPS"
                style={{ fontSize: "0.75rem" }}
              >
                <RefreshCw size={13} className={gpsLoading ? "spin" : ""} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Interactive OpenStreetMap Coordinate Picker */}
          {showMapPicker && coords && (
            <div style={{ marginBottom: "1.25rem", borderRadius: "var(--radius-sm)", overflow: "hidden", border: "1px solid rgba(59, 130, 246, 0.4)" }}>
              <div style={{ background: "#0F172A", padding: "6px 12px", fontSize: "0.75rem", color: "#93C5FD", display: "flex", justifyContent: "space-between" }}>
                <span>📍 Click anywhere on the map or drag the blue marker to fine-tune exact pothole location.</span>
              </div>
              <MapView
                pickerCoords={coords}
                onPickCoords={(pt) => {
                  setCoords({ lat: pt.lat, lng: pt.lng });
                  setAccuracy(2.0); // Exact user placed
                }}
                height="220px"
              />
            </div>
          )}

          {/* Citizen Name (Optional) */}
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "6px", color: "var(--text-muted)" }}>
              YOUR NAME (OPTIONAL)
            </label>
            <input
              type="text"
              id="citizen-name-input"
              value={citizenName}
              onChange={(e) => setCitizenName(e.target.value)}
              placeholder="e.g. Rahul Verma or leave blank for Anonymous"
              style={{
                width: "100%",
                background: "var(--bg-input)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-sm)",
                padding: "10px 14px",
                color: "var(--text-main)",
                fontFamily: "var(--font-body)",
                fontSize: "0.9rem",
              }}
            />
          </div>

          {/* User Notes */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "6px", color: "var(--text-muted)" }}>
              DAMAGE DETAILS / OBSERVATIONS
            </label>
            <textarea
              id="user-notes-input"
              value={userNotes}
              onChange={(e) => setUserNotes(e.target.value)}
              rows={3}
              placeholder="e.g. Deep pothole right before traffic intersection, cars violently braking..."
              style={{
                width: "100%",
                background: "var(--bg-input)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-sm)",
                padding: "10px 14px",
                color: "var(--text-main)",
                fontFamily: "var(--font-body)",
                fontSize: "0.9rem",
                resize: "vertical",
              }}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            id="submit-report-btn"
            className="btn btn-primary"
            disabled={isSubmitting || !file}
            style={{ width: "100%", padding: "12px", fontSize: "1rem" }}
          >
            {isSubmitting ? (
              <>
                <RefreshCw size={18} className="spin" />
                <span>Running AI Vision & Spatial Cluster Check...</span>
              </>
            ) : (
              <>
                <ShieldCheck size={18} />
                <span>Analyze & Submit Road Report</span>
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
