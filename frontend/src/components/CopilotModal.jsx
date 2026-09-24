import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Send,
  Bot,
  User,
  Database,
  X,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  HelpCircle,
  ExternalLink,
} from "lucide-react";
import { api } from "../services/api";

export default function CopilotModal({ isOpen, onClose, onSelectIncident = () => {} }) {
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: "Hello! I am RoadFix Copilot, your civic road maintenance intelligence assistant. Ask me questions about road distresses, critical potholes, worker assignments, materials & budget estimation, or municipal resolution stats.",
      sql_intent: null,
      related_ids: [],
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Setup Web Speech API for voice queries
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recog = new SpeechRecognition();
        recog.continuous = false;
        recog.interimResults = false;
        recog.lang = "en-IN"; // English (India) or Hindi compatible

        recog.onresult = (e) => {
          const transcript = e.results[0][0].transcript;
          if (transcript) {
            setInput(transcript);
            handleSend(transcript);
          }
          setIsListening(false);
        };

        recog.onerror = () => {
          setIsListening(false);
        };

        recog.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recog;
      }
    }
  }, []);

  if (!isOpen) return null;

  const toggleVoiceListen = () => {
    if (!recognitionRef.current) {
      alert("Voice input is not supported in this browser. Please type your query.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.warn(e);
      }
    }
  };

  const speakText = (text) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleSend = async (textToSend) => {
    const query = textToSend || input;
    if (!query.trim()) return;

    const userMsg = { sender: "user", text: query };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await api.queryCopilot(query);
      const botMsg = {
        sender: "bot",
        text: res.answer,
        sql_intent: res.sql_intent,
        related_ids: res.related_incident_ids || [],
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "I encountered an error querying the road database. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const sampleQueries = [
    "Show critical road issues",
    "How many potholes are pending?",
    "Required asphalt & budget",
    "Show available field crews",
    "Waterlogging zones status",
  ];

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: "680px", height: "640px", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "rgba(15, 23, 42, 0.95)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #6366F1, #3B82F6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
              }}
            >
              <Sparkles size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: "700" }}>RoadFix Copilot</h3>
              <p style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
                Voice-Enabled Grounded Municipal Intelligence Engine
              </p>
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Chat History */}
        <div style={{ flex: 1, padding: "1.5rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1rem" }}>
          {messages.map((m, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                gap: "10px",
                alignSelf: m.sender === "user" ? "flex-end" : "flex-start",
                maxWidth: "88%",
              }}
            >
              {m.sender === "bot" && (
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    background: "#2563EB",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: "2px",
                  }}
                >
                  <Bot size={16} />
                </div>
              )}

              <div>
                <div
                  style={{
                    background: m.sender === "user" ? "#2563EB" : "#1E293B",
                    color: "#FFFFFF",
                    padding: "10px 14px",
                    borderRadius: "12px",
                    fontSize: "0.88rem",
                    lineHeight: 1.5,
                  }}
                >
                  {m.text}

                  {/* Audio Readout Icon for Bot */}
                  {m.sender === "bot" && (
                    <div style={{ marginTop: "6px", display: "flex", justifyContent: "flex-end" }}>
                      <button
                        onClick={() => speakText(m.text)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#93C5FD",
                          cursor: "pointer",
                          fontSize: "0.72rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <Volume2 size={13} />
                        <span>Read Aloud</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Related Incident Links */}
                {m.related_ids && m.related_ids.length > 0 && (
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "6px" }}>
                    <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", alignSelf: "center" }}>
                      Linked Tickets:
                    </span>
                    {m.related_ids.map((id) => (
                      <button
                        key={id}
                        onClick={async () => {
                          try {
                            const inc = await api.getIncidentDetail(id);
                            onSelectIncident(inc);
                            onClose();
                          } catch (e) {
                            console.error(e);
                          }
                        }}
                        style={{
                          background: "rgba(59, 130, 246, 0.2)",
                          border: "1px solid rgba(59, 130, 246, 0.4)",
                          color: "#93C5FD",
                          borderRadius: "4px",
                          padding: "2px 8px",
                          fontSize: "0.72rem",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <span>#{id}</span>
                        <ExternalLink size={10} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: "flex", gap: "10px", alignSelf: "flex-start" }}>
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  background: "#2563EB",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Bot size={16} />
              </div>
              <div style={{ background: "#1E293B", padding: "10px 14px", borderRadius: "12px", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                Consulting municipal road database...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Question Chips */}
        <div
          style={{
            padding: "8px 1.5rem",
            background: "rgba(15, 23, 42, 0.8)",
            borderTop: "1px solid var(--border-subtle)",
            display: "flex",
            gap: "6px",
            overflowX: "auto",
            whiteSpace: "nowrap",
          }}
        >
          {sampleQueries.map((q, idx) => (
            <button
              key={idx}
              id={`copilot-quick-chip-${idx}`}
              onClick={() => handleSend(q)}
              style={{
                background: "rgba(30, 41, 59, 0.8)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-full)",
                padding: "4px 10px",
                color: "var(--text-muted)",
                fontSize: "0.72rem",
                cursor: "pointer",
              }}
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input Bar with Voice Button */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(input);
          }}
          style={{
            padding: "1rem 1.5rem",
            borderTop: "1px solid var(--border-subtle)",
            display: "flex",
            gap: "8px",
            background: "rgba(15, 23, 42, 0.95)",
          }}
        >
          <input
            type="text"
            id="copilot-query-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isListening ? "Listening to your voice..." : "Ask Copilot in English or Hindi..."}
            style={{
              flex: 1,
              background: isListening ? "rgba(239, 68, 68, 0.15)" : "var(--bg-input)",
              border: isListening ? "1px solid #EF4444" : "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-sm)",
              padding: "10px 14px",
              color: "var(--text-main)",
              fontSize: "0.9rem",
              outline: "none",
            }}
          />

          {/* Microphone Voice Button */}
          <button
            type="button"
            id="copilot-voice-btn"
            onClick={toggleVoiceListen}
            className={`btn btn-sm ${isListening ? "btn-danger" : "btn-secondary"}`}
            title={isListening ? "Stop listening" : "Click to speak voice query"}
            style={{ padding: "0 12px" }}
          >
            {isListening ? <MicOff size={16} /> : <Mic size={16} />}
          </button>

          {/* Send Button */}
          <button
            type="submit"
            id="copilot-send-btn"
            className="btn btn-primary btn-sm"
            disabled={loading || !input.trim()}
            style={{ padding: "0 16px" }}
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
