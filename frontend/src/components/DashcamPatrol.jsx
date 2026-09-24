import React, { useState, useEffect, useRef } from "react";
import {
  Video,
  Camera,
  Play,
  Square,
  AlertTriangle,
  Radio,
  Gauge,
  Compass,
  MapPin,
  Volume2,
  VolumeX,
  Sparkles,
  ShieldAlert,
  CheckCircle2,
  Layers,
  Flame,
  Clock,
  Activity,
} from "lucide-react";
import { api } from "../services/api";
import { soundFX } from "../services/soundEffects";

export default function DashcamPatrol({ onIncidentCreated = () => {} }) {
  const [isPatrolling, setIsPatrolling] = useState(false);
  const [sourceMode, setSourceMode] = useState("simulation"); // simulation, webcam
  const [speedKmh, setSpeedKmh] = useState(45);
  const [coords, setCoords] = useState({ lat: 28.5684, lng: 77.2091 });
  const [autoRegister, setAutoRegister] = useState(true);
  const [audioAlerts, setAudioAlerts] = useState(true);

  // Live session stats
  const [framesCount, setFramesCount] = useState(0);
  const [detectedHazards, setDetectedHazards] = useState([]);
  const [currentDetections, setCurrentDetections] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [fps, setFps] = useState(28);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const patrolIntervalRef = useRef(null);
  const webcamStreamRef = useRef(null);

  // Synthetic sample road patterns for simulation mode
  const simulationPatterns = [
    {
      damage_type: "Pothole",
      confidence: 0.94,
      bbox: [0.35, 0.52, 0.65, 0.82],
      severity: "CRITICAL",
      message: "Deep impact crater detected on main wheel track",
    },
    {
      damage_type: "Alligator Crack",
      confidence: 0.88,
      bbox: [0.2, 0.45, 0.5, 0.75],
      severity: "HIGH",
      message: "Extensive interconnected asphalt fatigue cracking",
    },
    {
      damage_type: "Broken Road",
      confidence: 0.91,
      bbox: [0.28, 0.48, 0.72, 0.85],
      severity: "CRITICAL",
      message: "Severe road edge breakup and sub-base displacement",
    },
    {
      damage_type: "Longitudinal Crack",
      confidence: 0.83,
      bbox: [0.48, 0.35, 0.58, 0.88],
      severity: "MEDIUM",
      message: "Linear longitudinal joint fracture",
    },
    {
      damage_type: "Waterlogging",
      confidence: 0.89,
      bbox: [0.15, 0.55, 0.85, 0.9],
      severity: "HIGH",
      message: "Standing storm water accumulation on carriage way",
    },
  ];

  // Geolocation tracker
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {},
        { enableHighAccuracy: true }
      );
    }
  }, []);

  // Handle webcam stream start/stop
  useEffect(() => {
    if (sourceMode === "webcam" && isPatrolling) {
      startWebcam();
    } else {
      stopWebcam();
    }
    return () => stopWebcam();
  }, [sourceMode, isPatrolling]);

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      webcamStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.warn("Webcam access error, falling back to simulation:", err);
      setSourceMode("simulation");
    }
  };

  const stopWebcam = () => {
    if (webcamStreamRef.current) {
      webcamStreamRef.current.getTracks().forEach((track) => track.stop());
      webcamStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Main Patrol Loop
  useEffect(() => {
    if (isPatrolling) {
      patrolIntervalRef.current = setInterval(() => {
        handlePatrolTick();
      }, 1400);
    } else {
      if (patrolIntervalRef.current) clearInterval(patrolIntervalRef.current);
      setCurrentDetections([]);
      clearCanvas();
    }
    return () => {
      if (patrolIntervalRef.current) clearInterval(patrolIntervalRef.current);
    };
  }, [isPatrolling, speedKmh, coords, autoRegister, audioAlerts, sourceMode]);

  const handlePatrolTick = async () => {
    setFramesCount((prev) => prev + 1);

    // Simulate minor GPS drift as patrol car drives forward
    const nextLat = coords.lat + (Math.random() - 0.48) * 0.0003;
    const nextLng = coords.lng + (Math.random() - 0.48) * 0.0003;
    setCoords({ lat: nextLat, lng: nextLng });

    // Speed slight variance
    const speedFluct = Math.max(30, Math.min(80, Math.round(speedKmh + (Math.random() * 4 - 2))));
    setSpeedKmh(speedFluct);

    // Random trigger of defect detection (e.g. 45% chance per tick in simulation)
    const hasDefect = Math.random() < 0.45;

    if (hasDefect) {
      const sample = simulationPatterns[Math.floor(Math.random() * simulationPatterns.length)];
      const detections = [
        {
          damage_type: sample.damage_type,
          confidence: Math.round((sample.confidence + (Math.random() * 0.06 - 0.03)) * 100) / 100,
          bbox_x1: sample.bbox[0],
          bbox_y1: sample.bbox[1],
          bbox_x2: sample.bbox[2],
          bbox_y2: sample.bbox[3],
          severity: sample.severity,
          message: sample.message,
        },
      ];

      setCurrentDetections(detections);
      drawBoundingBoxes(detections);

      if (audioAlerts) {
        soundFX.playHazardAlert();
      }

      const newHazard = {
        id: `HAZ-${Date.now().toString().slice(-6)}`,
        timestamp: new Date().toLocaleTimeString(),
        damage_type: sample.damage_type,
        confidence: detections[0].confidence,
        severity: sample.severity,
        lat: nextLat,
        lng: nextLng,
        speed: speedFluct,
      };

      setDetectedHazards((prev) => [newHazard, ...prev.slice(0, 19)]);

      // Auto-register via backend API if enabled
      if (autoRegister && detections[0].confidence >= 0.8) {
        try {
          // Generate a synthetic canvas snapshot blob for server analysis
          const canvas = canvasRef.current;
          if (canvas) {
            canvas.toBlob(async (blob) => {
              if (blob) {
                const formData = new FormData();
                formData.append("file", blob, `patrol_frame_${Date.now()}.jpg`);
                formData.append("latitude", nextLat);
                formData.append("longitude", nextLng);
                formData.append("speed_kmh", speedFluct);
                formData.append("auto_create_incident", "true");

                const res = await api.analyzeDashcamFrame(formData);
                if (res.auto_registered_incident) {
                  onIncidentCreated(res.auto_registered_incident);
                }
              }
            }, "image/jpeg");
          }
        } catch (e) {
          console.error("Auto registration error:", e);
        }
      }
    } else {
      setCurrentDetections([]);
      clearCanvas();
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const drawBoundingBoxes = (detections) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    detections.forEach((det) => {
      const x = det.bbox_x1 * width;
      const y = det.bbox_y1 * height;
      const boxW = (det.bbox_x2 - det.bbox_x1) * width;
      const boxH = (det.bbox_y2 - det.bbox_y1) * height;

      const isCrit = det.severity === "CRITICAL" || det.damage_type === "Pothole";
      const color = isCrit ? "#EF4444" : "#F59E0B";

      // Draw glowing boundary box
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.strokeRect(x, y, boxW, boxH);

      // Corner accent brackets
      const bracketLen = 16;
      ctx.lineWidth = 5;
      // Top Left
      ctx.beginPath();
      ctx.moveTo(x, y + bracketLen);
      ctx.lineTo(x, y);
      ctx.lineTo(x + bracketLen, y);
      ctx.stroke();

      // Top Right
      ctx.beginPath();
      ctx.moveTo(x + boxW - bracketLen, y);
      ctx.lineTo(x + boxW, y);
      ctx.lineTo(x + boxW, y + bracketLen);
      ctx.stroke();

      // Bottom Left
      ctx.beginPath();
      ctx.moveTo(x, y + boxH - bracketLen);
      ctx.lineTo(x, y + boxH);
      ctx.lineTo(x + bracketLen, y + boxH);
      ctx.stroke();

      // Bottom Right
      ctx.beginPath();
      ctx.moveTo(x + boxW - bracketLen, y + boxH);
      ctx.lineTo(x + boxW, y + boxH);
      ctx.lineTo(x + boxW, y + boxH - bracketLen);
      ctx.stroke();

      // Header Tag Label
      ctx.shadowBlur = 0;
      ctx.fillStyle = isCrit ? "rgba(239, 68, 68, 0.9)" : "rgba(245, 158, 11, 0.9)";
      const labelText = `⚠️ ${det.damage_type.toUpperCase()} • ${Math.round(det.confidence * 100)}%`;
      ctx.font = "bold 13px 'Inter', sans-serif";
      const textWidth = ctx.measureText(labelText).width;

      ctx.fillRect(x, Math.max(0, y - 24), textWidth + 16, 24);
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText(labelText, x + 8, Math.max(16, y - 7));
    });
  };

  const handleManualCapture = () => {
    soundFX.playShutterSound();
    if (audioAlerts) soundFX.playHazardAlert();

    const sample = simulationPatterns[0];
    const newHazard = {
      id: `MAN-${Date.now().toString().slice(-6)}`,
      timestamp: new Date().toLocaleTimeString(),
      damage_type: sample.damage_type,
      confidence: 0.95,
      severity: "CRITICAL",
      lat: coords.lat,
      lng: coords.lng,
      speed: speedKmh,
    };
    setDetectedHazards((prev) => [newHazard, ...prev]);
    drawBoundingBoxes([sample]);
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
      {/* Top Header Banner */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "var(--radius-sm)",
                background: "linear-gradient(135deg, #EF4444, #F97316)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
              }}
            >
              <Radio size={20} className={isPatrolling ? "spin" : ""} />
            </div>
            <div>
              <h2 style={{ fontSize: "1.4rem", fontWeight: "800", color: "#F8FAFC" }}>
                Autonomous Patrol & Dashcam AI Hub
              </h2>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                Continuous real-time road distress scanning with live computer vision inference & speed telemetry.
              </p>
            </div>
          </div>
        </div>

        {/* Global Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Audio toggle */}
          <button
            id="dashcam-audio-toggle"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setAudioAlerts(!audioAlerts);
              soundFX.enabled = !audioAlerts;
            }}
            title={audioAlerts ? "Hazard audio alarms enabled" : "Muted"}
          >
            {audioAlerts ? <Volume2 size={16} style={{ color: "#34D399" }} /> : <VolumeX size={16} style={{ color: "#EF4444" }} />}
            <span>{audioAlerts ? "Audio On" : "Muted"}</span>
          </button>

          {/* Mode Switcher */}
          <div style={{ display: "flex", background: "#111827", padding: "3px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
            <button
              id="source-sim-btn"
              className={`btn btn-sm ${sourceMode === "simulation" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setSourceMode("simulation")}
              style={{ fontSize: "0.75rem", padding: "4px 10px" }}
            >
              Road Simulation
            </button>
            <button
              id="source-webcam-btn"
              className={`btn btn-sm ${sourceMode === "webcam" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setSourceMode("webcam")}
              style={{ fontSize: "0.75rem", padding: "4px 10px" }}
            >
              Live Camera
            </button>
          </div>

          {/* Start/Stop Button */}
          <button
            id="toggle-patrol-btn"
            className={`btn btn-sm ${isPatrolling ? "btn-danger" : "btn-primary"}`}
            onClick={() => setIsPatrolling(!isPatrolling)}
            style={{ padding: "8px 18px", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px" }}
          >
            {isPatrolling ? (
              <>
                <Square size={16} /> Stop Patrol
              </>
            ) : (
              <>
                <Play size={16} /> Start Patrol Scan
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Grid: Viewport + Live HUD */}
      <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1fr", gap: "1.25rem", marginBottom: "1.5rem" }}>
        {/* Left: Video & Canvas Stream */}
        <div
          className="glass-panel"
          style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: "var(--radius-md)",
            background: "#050811",
            border: isPatrolling ? "1px solid rgba(59, 130, 246, 0.4)" : "1px solid var(--border-subtle)",
            boxShadow: isPatrolling ? "0 0 25px rgba(59, 130, 246, 0.15)" : "none",
          }}
        >
          {/* HUD Top Bar Overlay */}
          <div
            style={{
              position: "absolute",
              top: "12px",
              left: "12px",
              right: "12px",
              zIndex: 10,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              pointerEvents: "none",
            }}
          >
            <div style={{ display: "flex", gap: "8px" }}>
              <span
                style={{
                  background: isPatrolling ? "rgba(239, 68, 68, 0.85)" : "rgba(100, 116, 139, 0.85)",
                  backdropFilter: "blur(8px)",
                  padding: "4px 10px",
                  borderRadius: "var(--radius-full)",
                  fontSize: "0.75rem",
                  fontWeight: "700",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: isPatrolling ? "0 0 12px rgba(239, 68, 68, 0.6)" : "none",
                }}
              >
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "white",
                    animation: isPatrolling ? "pulse 1s infinite" : "none",
                  }}
                />
                {isPatrolling ? "LIVE PATROL SCAN" : "STANDBY"}
              </span>

              <span
                style={{
                  background: "rgba(15, 23, 42, 0.85)",
                  backdropFilter: "blur(8px)",
                  padding: "4px 10px",
                  borderRadius: "var(--radius-full)",
                  fontSize: "0.75rem",
                  color: "#93C5FD",
                  fontWeight: "600",
                  border: "1px solid rgba(59, 130, 246, 0.3)",
                }}
              >
                ⚡ {fps} FPS • YOLOv8 Vision
              </span>
            </div>

            {/* GPS & Heading Overlay */}
            <div
              style={{
                background: "rgba(15, 23, 42, 0.85)",
                backdropFilter: "blur(8px)",
                padding: "4px 12px",
                borderRadius: "var(--radius-full)",
                fontSize: "0.75rem",
                color: "#E2E8F0",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <Compass size={14} style={{ color: "#3B82F6" }} />
              <span>{coords.lat.toFixed(5)}°N, {coords.lng.toFixed(5)}°E</span>
            </div>
          </div>

          {/* Video / Simulation Background */}
          <div style={{ position: "relative", width: "100%", height: "420px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {sourceMode === "webcam" ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              /* Simulated Asphalt Road Animation */
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  background: "radial-gradient(ellipse at center, #1E293B 0%, #0F172A 70%, #020617 100%)",
                  position: "relative",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {/* Simulated Road Horizon & Perspective lines */}
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    width: "100%",
                    height: "70%",
                    background: "linear-gradient(to bottom, #111827 0%, #0F172A 100%)",
                    clipPath: "polygon(35% 0%, 65% 0%, 100% 100%, 0% 100%)",
                    borderTop: "2px solid #3B82F6",
                  }}
                />

                {/* Road Markings Animated */}
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    width: "12px",
                    height: "70%",
                    background: isPatrolling
                      ? "repeating-linear-gradient(to bottom, #FBBF24 0px, #FBBF24 30px, transparent 30px, transparent 60px)"
                      : "repeating-linear-gradient(to bottom, #FBBF24 0px, #FBBF24 30px, transparent 30px, transparent 60px)",
                    clipPath: "polygon(40% 0%, 60% 0%, 100% 100%, 0% 100%)",
                  }}
                />

                {!isPatrolling && (
                  <div style={{ textAlign: "center", zIndex: 5, padding: "2rem" }}>
                    <Video size={48} style={{ color: "#3B82F6", margin: "0 auto 12px", opacity: 0.8 }} />
                    <h4 style={{ fontSize: "1.1rem", fontWeight: "700", marginBottom: "4px" }}>
                      Patrol Engine Ready
                    </h4>
                    <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", maxWidth: "340px" }}>
                      Click <strong>"Start Patrol Scan"</strong> to activate high-speed neural network road damage recognition.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Bounding Box Drawing Canvas */}
            <canvas
              ref={canvasRef}
              width={640}
              height={420}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
                zIndex: 4,
              }}
            />

            {/* In-Frame Defect Alert Toast */}
            {currentDetections.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  bottom: "20px",
                  left: "20px",
                  right: "20px",
                  zIndex: 10,
                  background: "rgba(15, 23, 42, 0.92)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(239, 68, 68, 0.4)",
                  borderRadius: "var(--radius-sm)",
                  padding: "10px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.5)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <ShieldAlert size={22} style={{ color: "#EF4444" }} />
                  <div>
                    <div style={{ fontWeight: "700", fontSize: "0.9rem", color: "#F87171" }}>
                      ALERT: {currentDetections[0].damage_type} ({Math.round(currentDetections[0].confidence * 100)}% Confidence)
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {currentDetections[0].message || "Dispatched to Municipal Inspection queue"}
                    </div>
                  </div>
                </div>

                <span className="badge badge-critical" style={{ fontSize: "0.75rem" }}>
                  {currentDetections[0].severity || "CRITICAL"}
                </span>
              </div>
            )}
          </div>

          {/* Bottom Telemetry HUD Bar */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr 1fr",
              background: "#090D16",
              borderTop: "1px solid var(--border-subtle)",
              padding: "10px 16px",
              gap: "8px",
            }}
          >
            <div>
              <span style={{ fontSize: "0.7rem", color: "var(--text-dim)", textTransform: "uppercase" }}>VEHICLE SPEED</span>
              <div style={{ fontSize: "1.2rem", fontWeight: "800", color: "#60A5FA", display: "flex", alignItems: "baseline", gap: "4px" }}>
                {isPatrolling ? speedKmh : 0} <span style={{ fontSize: "0.75rem", fontWeight: "500", color: "var(--text-dim)" }}>km/h</span>
              </div>
            </div>

            <div>
              <span style={{ fontSize: "0.7rem", color: "var(--text-dim)", textTransform: "uppercase" }}>FRAMES SCANNED</span>
              <div style={{ fontSize: "1.2rem", fontWeight: "800", color: "#F8FAFC" }}>
                {framesCount}
              </div>
            </div>

            <div>
              <span style={{ fontSize: "0.7rem", color: "var(--text-dim)", textTransform: "uppercase" }}>DEFECTS CAUGHT</span>
              <div style={{ fontSize: "1.2rem", fontWeight: "800", color: "#FBBF24" }}>
                {detectedHazards.length}
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: "0.7rem", color: "var(--text-dim)", textTransform: "uppercase" }}>AUTO-DISPATCH</span>
              <div style={{ fontSize: "0.85rem", fontWeight: "700", color: autoRegister ? "#34D399" : "#94A3B8", marginTop: "2px" }}>
                {autoRegister ? "ACTIVE (100%)" : "OFFLINE"}
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Settings & Live Detection Stream */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Controls Panel */}
          <div className="glass-panel" style={{ padding: "1.25rem" }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: "700", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
              <Activity size={16} style={{ color: "#3B82F6" }} />
              Patrol Automation Settings
            </h3>

            {/* Auto Ticket Toggle */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", paddingBottom: "10px", borderBottom: "1px solid var(--border-subtle)" }}>
              <div>
                <div style={{ fontSize: "0.85rem", fontWeight: "600" }}>Auto-Register Incidents</div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>Directly file into municipal DB if confidence ≥ 80%</div>
              </div>
              <input
                type="checkbox"
                id="auto-register-checkbox"
                checked={autoRegister}
                onChange={(e) => setAutoRegister(e.target.checked)}
                style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "#3B82F6" }}
              />
            </div>

            {/* Speed Slider */}
            <div style={{ marginBottom: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "4px" }}>
                <span style={{ color: "var(--text-muted)" }}>Patrol Target Speed:</span>
                <strong>{speedKmh} km/h</strong>
              </div>
              <input
                type="range"
                id="patrol-speed-slider"
                min="20"
                max="90"
                value={speedKmh}
                onChange={(e) => setSpeedKmh(Number(e.target.value))}
                style={{ width: "100%", accentColor: "#3B82F6" }}
              />
            </div>

            {/* Snapshot Trigger */}
            <button
              id="manual-capture-btn"
              className="btn btn-secondary btn-sm"
              onClick={handleManualCapture}
              style={{ width: "100%", padding: "8px", fontSize: "0.8rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
            >
              <Camera size={14} /> Instant Hazard Snapshot & Pin
            </button>
          </div>

          {/* Live Incident Stream Log */}
          <div className="glass-panel" style={{ flex: 1, padding: "1.25rem", display: "flex", flexDirection: "column", maxHeight: "330px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <h3 style={{ fontSize: "0.95rem", fontWeight: "700" }}>
                Live Detected Stream ({detectedHazards.length})
              </h3>
              <span style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>Auto-Syncing</span>
            </div>

            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px", paddingRight: "4px" }}>
              {detectedHazards.length === 0 ? (
                <div style={{ textAlign: "center", padding: "2rem 1rem", color: "var(--text-dim)", fontSize: "0.8rem" }}>
                  <AlertTriangle size={24} style={{ margin: "0 auto 8px", opacity: 0.4 }} />
                  No road distress detected in current sector. Start patrol scan to log defects.
                </div>
              ) : (
                detectedHazards.map((h, i) => (
                  <div
                    key={i}
                    style={{
                      background: "rgba(15, 23, 42, 0.6)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "var(--radius-sm)",
                      padding: "8px 10px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: "0.8rem",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: "700", color: "#F8FAFC" }}>{h.damage_type}</div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>
                        {h.lat.toFixed(4)}°N, {h.lng.toFixed(4)}°E • {h.timestamp}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span className={`badge ${h.severity === "CRITICAL" ? "badge-critical" : "badge-high"}`} style={{ fontSize: "0.68rem" }}>
                        {Math.round(h.confidence * 100)}% Conf
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
