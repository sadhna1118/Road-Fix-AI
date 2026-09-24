import React from "react";
import { ShieldAlert, User, Building2, HardHat, Sparkles, Radio } from "lucide-react";

export default function Navbar({ currentRole, setCurrentRole, onOpenCopilot }) {
  return (
    <header className="navbar">
      <div className="nav-brand">
        <div className="brand-icon">
          <ShieldAlert size={24} />
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span className="brand-title">RoadFix AI</span>
            <span className="brand-badge">Civic Vision</span>
          </div>
          <p style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginTop: "-2px" }}>
            Autonomous Road Distress & Municipal Dispatch Platform
          </p>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
        {/* Role Switcher */}
        <div className="role-switcher">
          <button
            id="role-citizen-btn"
            className={`role-btn ${currentRole === "citizen" ? "active" : ""}`}
            onClick={() => setCurrentRole("citizen")}
          >
            <User size={15} />
            <span>Citizen Portal</span>
          </button>

          <button
            id="role-patrol-btn"
            className={`role-btn ${currentRole === "patrol" ? "active" : ""}`}
            onClick={() => setCurrentRole("patrol")}
            style={{ position: "relative" }}
          >
            <Radio size={15} style={{ color: "#EF4444" }} />
            <span>Patrol AI</span>
            <span
              style={{
                position: "absolute",
                top: "4px",
                right: "4px",
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "#EF4444",
                animation: "pulse 1.2s infinite",
              }}
            />
          </button>

          <button
            id="role-admin-btn"
            className={`role-btn ${currentRole === "authority" ? "active" : ""}`}
            onClick={() => setCurrentRole("authority")}
          >
            <Building2 size={15} />
            <span>Authority Portal</span>
          </button>

          <button
            id="role-worker-btn"
            className={`role-btn ${currentRole === "worker" ? "active" : ""}`}
            onClick={() => setCurrentRole("worker")}
          >
            <HardHat size={15} />
            <span>Field Crew</span>
          </button>
        </div>

        {/* AI Copilot Trigger */}
        <button
          id="open-copilot-btn"
          className="btn btn-secondary btn-sm"
          onClick={onOpenCopilot}
          style={{ borderColor: "rgba(99, 102, 241, 0.4)", color: "#A5B4FC" }}
        >
          <Sparkles size={15} style={{ color: "#818CF8" }} />
          <span>Ask Copilot</span>
        </button>
      </div>
    </header>
  );
}
