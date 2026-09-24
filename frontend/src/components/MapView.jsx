import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { Layers, Flame, MapPin, Eye, ThumbsUp, CheckCircle } from "lucide-react";
import { api } from "../services/api";

export default function MapView({
  incidents = [],
  selectedIncident = null,
  onSelectIncident = () => {},
  pickerCoords = null,
  onPickCoords = null,
  height = "520px"
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const pickerMarkerRef = useRef(null);
  const [showHeatmap, setShowHeatmap] = useState(false);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const defaultCenter = pickerCoords
        ? [pickerCoords.lat, pickerCoords.lng]
        : incidents.length > 0
        ? [incidents[0].latitude, incidents[0].longitude]
        : [28.59, 77.20];

      const map = L.map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: 13,
        zoomControl: true,
      });

      // Dark theme OpenStreetMap tiles
      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;

      // Handle map click for location picking if callback provided
      if (onPickCoords) {
        map.on("click", (e) => {
          onPickCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
        });
      }
    }

    return () => {
      // Map cleanup on unmount
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update picker marker if user selected manual coords
  useEffect(() => {
    if (!mapInstanceRef.current || !pickerCoords) return;

    if (pickerMarkerRef.current) {
      pickerMarkerRef.current.setLatLng([pickerCoords.lat, pickerCoords.lng]);
    } else {
      const pickerIcon = L.divIcon({
        className: "picker-pin",
        html: `<div style="background:#3B82F6; width:24px; height:24px; border-radius:50%; border:3px solid white; box-shadow:0 0 12px rgba(59,130,246,0.8); animation:pulse 1.5s infinite;"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
      pickerMarkerRef.current = L.marker([pickerCoords.lat, pickerCoords.lng], {
        icon: pickerIcon,
        draggable: true,
      }).addTo(mapInstanceRef.current);

      pickerMarkerRef.current.on("dragend", (e) => {
        const pt = e.target.getLatLng();
        if (onPickCoords) onPickCoords({ lat: pt.lat, lng: pt.lng });
      });
    }
  }, [pickerCoords]);

  // Render incident markers on data change
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    incidents.forEach((inc) => {
      // Determine marker color and class
      let pinClass = "pin-medium";
      let label = "!";
      if (inc.status === "VERIFIED_CLOSED") {
        pinClass = "pin-resolved";
        label = "✓";
      } else if (inc.priority_level === "CRITICAL") {
        pinClass = "pin-critical";
        label = "⚡";
      } else if (inc.priority_level === "HIGH") {
        pinClass = "pin-high";
        label = "!";
      } else if (inc.priority_level === "LOW") {
        pinClass = "pin-low";
        label = "•";
      }

      if (showHeatmap) {
        // Render Heatmap circles
        const circle = L.circle([inc.latitude, inc.longitude], {
          color: inc.priority_level === "CRITICAL" ? "#EF4444" : inc.priority_level === "HIGH" ? "#F97316" : "#F59E0B",
          fillColor: inc.priority_level === "CRITICAL" ? "#EF4444" : inc.priority_level === "HIGH" ? "#F97316" : "#F59E0B",
          fillOpacity: 0.35 + (inc.priority_score / 200),
          radius: 120 + inc.report_count * 40,
        });
        markersLayerRef.current.addLayer(circle);
      } else {
        // Regular custom Pin marker
        const customIcon = L.divIcon({
          className: "custom-leaflet-marker",
          html: `<div class="custom-pin ${pinClass}">${label}</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const marker = L.marker([inc.latitude, inc.longitude], { icon: customIcon });

        // Popup Content
        const popupEl = document.createElement("div");
        popupEl.style.width = "240px";
        popupEl.innerHTML = `
          <div style="font-family: var(--font-body); font-size: 0.85rem;">
            ${
              inc.before_image_url
                ? `<img src="${api.getImageUrl(inc.before_image_url)}" style="width:100%; height:110px; object-fit:cover; border-radius:6px; margin-bottom:8px;" />`
                : ""
            }
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
              <strong style="color:#F8FAFC; font-size:0.95rem;">#${inc.id}</strong>
              <span style="font-size:0.75rem; font-weight:700; color:${
                inc.priority_level === "CRITICAL" ? "#F87171" : inc.priority_level === "HIGH" ? "#FB923C" : "#FBBF24"
              };">
                ${inc.priority_score}/100
              </span>
            </div>
            <div style="font-weight:600; color:#E2E8F0; margin-bottom:4px;">${inc.canonical_damage_type}</div>
            <div style="font-size:0.75rem; color:#94A3B8; margin-bottom:8px;">${inc.address_text || "Road Section"}</div>
            <div style="display:flex; gap:6px; margin-bottom:8px;">
              <span style="font-size:0.7rem; background:#1E293B; padding:2px 6px; border-radius:4px; color:#94A3B8;">${inc.report_count} Reports</span>
              <span style="font-size:0.7rem; background:#1E293B; padding:2px 6px; border-radius:4px; color:#60A5FA;">${inc.status}</span>
            </div>
            <div style="display:flex; gap:6px;">
              <button id="inspect-btn-${inc.id}" style="flex:1; background:#2563EB; color:white; border:none; padding:6px; border-radius:4px; cursor:pointer; font-size:0.75rem; font-weight:600;">
                View Details
              </button>
              <button id="vote-btn-${inc.id}" style="background:#1E293B; color:#94A3B8; border:1px solid #334155; padding:6px; border-radius:4px; cursor:pointer; font-size:0.75rem;">
                👍 Confirm
              </button>
            </div>
          </div>
        `;

        // Wire popup click event
        marker.bindPopup(popupEl);
        marker.on("popupopen", () => {
          const inspectBtn = document.getElementById(`inspect-btn-${inc.id}`);
          if (inspectBtn) {
            inspectBtn.onclick = () => {
              onSelectIncident(inc);
              marker.closePopup();
            };
          }
          const voteBtn = document.getElementById(`vote-btn-${inc.id}`);
          if (voteBtn) {
            voteBtn.onclick = async () => {
              try {
                await api.voteIncident(inc.id, "STILL_EXISTS");
                voteBtn.innerText = "Confirmed ✓";
                voteBtn.style.color = "#10B981";
              } catch (e) {
                console.error(e);
              }
            };
          }
        });

        markersLayerRef.current.addLayer(marker);
      }
    });

    // If an incident was selected from list, pan to it
    if (selectedIncident && mapInstanceRef.current) {
      mapInstanceRef.current.setView([selectedIncident.latitude, selectedIncident.longitude], 15, {
        animate: true,
      });
    }
  }, [incidents, selectedIncident, showHeatmap]);

  return (
    <div style={{ position: "relative", width: "100%", height, borderRadius: "var(--radius-md)", overflow: "hidden" }}>
      <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />

      {/* Map Control Float Bar */}
      <div
        style={{
          position: "absolute",
          top: "12px",
          right: "12px",
          zIndex: 999,
          background: "rgba(15, 23, 42, 0.85)",
          backdropFilter: "blur(12px)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-sm)",
          padding: "4px",
          display: "flex",
          gap: "4px",
        }}
      >
        <button
          id="toggle-markers-view"
          className={`btn btn-sm ${!showHeatmap ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setShowHeatmap(false)}
          style={{ padding: "4px 10px", fontSize: "0.75rem" }}
        >
          <MapPin size={14} />
          <span>Markers</span>
        </button>
        <button
          id="toggle-heatmap-view"
          className={`btn btn-sm ${showHeatmap ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setShowHeatmap(true)}
          style={{ padding: "4px 10px", fontSize: "0.75rem" }}
        >
          <Flame size={14} style={{ color: "#F97316" }} />
          <span>Damage Heatmap</span>
        </button>
      </div>

      {/* Legend */}
      <div
        style={{
          position: "absolute",
          bottom: "12px",
          left: "12px",
          zIndex: 999,
          background: "rgba(15, 23, 42, 0.9)",
          backdropFilter: "blur(8px)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-sm)",
          padding: "6px 12px",
          display: "flex",
          gap: "12px",
          alignItems: "center",
          fontSize: "0.72rem",
          color: "var(--text-muted)",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span className="pulse-dot critical" /> Critical
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span className="pulse-dot high" /> High
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span className="pulse-dot medium" /> Medium
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span className="pulse-dot low" /> Resolved
        </span>
      </div>
    </div>
  );
}
