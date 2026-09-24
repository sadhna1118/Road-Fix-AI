import React, { useState, useRef, useEffect } from "react";
import { MoveHorizontal } from "lucide-react";

export default function BeforeAfterSlider({ beforeUrl, afterUrl, title }) {
  const [sliderPos, setSliderPos] = useState(50);
  const containerRef = useRef(null);
  const isDragging = useRef(false);

  const handleMove = (clientX) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percent = Math.min(100, Math.max(0, (x / rect.width) * 100));
    setSliderPos(percent);
  };

  const handleTouchMove = (e) => {
    if (isDragging.current && e.touches[0]) {
      handleMove(e.touches[0].clientX);
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging.current) {
      handleMove(e.clientX);
    }
  };

  useEffect(() => {
    const handleMouseUp = () => {
      isDragging.current = false;
    };
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchend", handleMouseUp);
    return () => {
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchend", handleMouseUp);
    };
  }, []);

  return (
    <div style={{ margin: "1rem 0" }}>
      {title && (
        <h4 style={{ fontSize: "0.95rem", color: "var(--text-muted)", marginBottom: "8px" }}>
          {title}
        </h4>
      )}
      <div
        ref={containerRef}
        className="ba-container"
        onMouseDown={(e) => {
          isDragging.current = true;
          handleMove(e.clientX);
        }}
        onTouchStart={(e) => {
          isDragging.current = true;
          if (e.touches[0]) handleMove(e.touches[0].clientX);
        }}
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
      >
        {/* Before Image (underneath) */}
        <span className="ba-label before">Before: Damage Evidence</span>
        <img src={beforeUrl} alt="Before damage" className="ba-image ba-before" />

        {/* After Image (clipped) */}
        <div className="ba-after-wrapper" style={{ width: `${sliderPos}%` }}>
          <span className="ba-label after" style={{ right: "auto", left: "12px", top: "42px" }}>
            After: Repaired Pavement
          </span>
          <img
            src={afterUrl}
            alt="After repair"
            className="ba-image"
            style={{ width: containerRef.current ? `${containerRef.current.offsetWidth}px` : "100%", maxWidth: "none" }}
          />
        </div>

        {/* Divider & Handle */}
        <div className="ba-handle" style={{ left: `${sliderPos}%` }}>
          <div className="ba-handle-btn">
            <MoveHorizontal size={18} />
          </div>
        </div>
      </div>
      <p style={{ textAlign: "center", fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "6px" }}>
        Drag slider left/right to audit repair quality
      </p>
    </div>
  );
}
