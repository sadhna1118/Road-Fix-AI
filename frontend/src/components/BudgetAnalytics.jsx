import React, { useState, useEffect } from "react";
import {
  DollarSign,
  TrendingUp,
  Package,
  Clock,
  Download,
  FileSpreadsheet,
  Map,
  Layers,
  Sparkles,
  PieChart,
  RefreshCw,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { api } from "../services/api";

export default function BudgetAnalytics() {
  const [budgetData, setBudgetData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBudget();
  }, []);

  const loadBudget = async () => {
    setLoading(true);
    try {
      const data = await api.getBudgetEstimate();
      setBudgetData(data);
    } catch (err) {
      console.error("Budget load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatINR = (val) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
      {/* Top Header & Export Toolbar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "800", color: "#F8FAFC" }}>
            Municipal Budget, Materials & GIS Intelligence
          </h2>
          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
            Empirical civil engineering material estimation (IRC / PWD norms), repair budgets, and spatial GIS export.
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {/* CSV Export Button */}
          <a
            id="export-csv-btn"
            href={api.getCsvExportUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-sm"
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            <FileSpreadsheet size={15} style={{ color: "#34D399" }} />
            <span>Export CSV Audit</span>
          </a>

          {/* GeoJSON GIS Export Button */}
          <a
            id="export-geojson-btn"
            href={api.getGeoJsonExportUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-sm"
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            <Map size={15} style={{ color: "#60A5FA" }} />
            <span>Export GeoJSON (GIS)</span>
          </a>

          {/* Refresh Button */}
          <button
            id="refresh-budget-btn"
            className="btn btn-primary btn-sm"
            onClick={loadBudget}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? "spin" : ""} />
            <span>Refresh Projections</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem 1rem", color: "var(--text-dim)" }}>
          <RefreshCw size={32} className="spin" style={{ margin: "0 auto 12px", color: "#3B82F6" }} />
          <div>Computing material volumes and financial requirements...</div>
        </div>
      ) : budgetData ? (
        <div>
          {/* 4 Financial & Savings KPI Cards */}
          <div className="grid-4" style={{ marginBottom: "1.5rem" }}>
            <div className="glass-panel" style={{ padding: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "600" }}>TOTAL PROJECTED BUDGET</span>
                <span style={{ color: "#34D399", fontWeight: "700", fontSize: "0.9rem" }}>₹</span>
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: "800", color: "#34D399" }}>
                {formatINR(budgetData.total_estimated_budget_inr)}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "4px" }}>
                Across {budgetData.total_incidents} registered hazards
              </div>
            </div>

            <div className="glass-panel" style={{ padding: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "600" }}>PENDING REPAIR ALLOCATION</span>
                <Clock size={16} style={{ color: "#F59E0B" }} />
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: "800", color: "#FBBF24" }}>
                {formatINR(budgetData.pending_repair_budget_inr)}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "4px" }}>
                Awaiting completion & sign-off
              </div>
            </div>

            <div className="glass-panel" style={{ padding: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "600" }}>COMPLETED EXPENDITURE</span>
                <ShieldCheck size={16} style={{ color: "#60A5FA" }} />
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: "800", color: "#60A5FA" }}>
                {formatINR(budgetData.completed_repair_expenditure_inr)}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "4px" }}>
                Audited & verified closed
              </div>
            </div>

            <div
              className="glass-panel"
              style={{
                padding: "1.25rem",
                background: "linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(6, 182, 212, 0.08))",
                border: "1px solid rgba(16, 185, 129, 0.3)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "0.75rem", color: "#34D399", fontWeight: "700" }}>AI CLUSTERING SAVINGS</span>
                <Sparkles size={16} style={{ color: "#34D399" }} />
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: "800", color: "#F8FAFC" }}>
                {formatINR(budgetData.duplicate_clustering_savings_inr)}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#A7F3D0", marginTop: "4px" }}>
                Saved via spatial Haversine de-duplication!
              </div>
            </div>
          </div>

          {/* Materials & Logistics Supply Demand Section */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "1.25rem", marginBottom: "1.5rem" }}>
            {/* Materials Breakdown */}
            <div className="glass-panel" style={{ padding: "1.5rem" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: "700", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "8px" }}>
                <Package size={18} style={{ color: "#3B82F6" }} />
                Required Materials & Field Crew Logistics
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {/* Cold Mix Asphalt */}
                <div style={{ background: "#111827", padding: "12px 16px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#F8FAFC" }}>
                      Cold Mix Bituminous Asphalt
                    </span>
                    <strong style={{ color: "#60A5FA" }}>
                      {budgetData.materials_needed.cold_mix_asphalt_tons} Metric Tons
                    </strong>
                  </div>
                  <div style={{ width: "100%", height: "6px", background: "rgba(255,255,255,0.08)", borderRadius: "3px", overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${Math.min(100, budgetData.materials_needed.cold_mix_asphalt_tons * 8)}%`,
                        height: "100%",
                        background: "linear-gradient(90deg, #3B82F6, #06B6D4)",
                      }}
                    />
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginTop: "4px" }}>
                    Approx. {Math.round(budgetData.materials_needed.cold_mix_asphalt_tons * 20)} bags (50kg each) required for immediate patch compaction.
                  </div>
                </div>

                {/* Bitumen Emulsion */}
                <div style={{ background: "#111827", padding: "12px 16px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#F8FAFC" }}>
                      Bitumen Tack Coat Emulsion (RS-1 / SS-1)
                    </span>
                    <strong style={{ color: "#FBBF24" }}>
                      {budgetData.materials_needed.bitumen_emulsion_liters} Liters
                    </strong>
                  </div>
                  <div style={{ width: "100%", height: "6px", background: "rgba(255,255,255,0.08)", borderRadius: "3px", overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${Math.min(100, budgetData.materials_needed.bitumen_emulsion_liters * 0.8)}%`,
                        height: "100%",
                        background: "linear-gradient(90deg, #F59E0B, #F97316)",
                      }}
                    />
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginTop: "4px" }}>
                    Waterproof primer bonding emulsion for asphalt crack sealing.
                  </div>
                </div>

                {/* Estimated Man Hours */}
                <div style={{ background: "#111827", padding: "12px 16px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#F8FAFC" }}>
                      Field Technician Labor Man-Hours
                    </span>
                    <strong style={{ color: "#34D399" }}>
                      {budgetData.materials_needed.estimated_man_hours} Man-Hours
                    </strong>
                  </div>
                  <div style={{ width: "100%", height: "6px", background: "rgba(255,255,255,0.08)", borderRadius: "3px", overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${Math.min(100, budgetData.materials_needed.estimated_man_hours * 1.5)}%`,
                        height: "100%",
                        background: "linear-gradient(90deg, #10B981, #059669)",
                      }}
                    />
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginTop: "4px" }}>
                    Equates to ~{Math.ceil(budgetData.materials_needed.estimated_man_hours / 8)} full crew-shift workdays.
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Civil Standards Info Box */}
            <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <h3 style={{ fontSize: "1rem", fontWeight: "700", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Zap size={18} style={{ color: "#F59E0B" }} />
                  Standard Unit Pricing Matrix
                </h3>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
                  Calculated based on Central Public Works Department (CPWD) & Indian Roads Congress (IRC:SP:72) scheduled rates:
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.8rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <span style={{ color: "var(--text-muted)" }}>Pothole Patching (Cold Bitumen)</span>
                    <strong style={{ color: "#F8FAFC" }}>₹4,800 / spot</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <span style={{ color: "var(--text-muted)" }}>Alligator Crack Sealant (Emulsion)</span>
                    <strong style={{ color: "#F8FAFC" }}>₹16,500 / stretch</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <span style={{ color: "var(--text-muted)" }}>Broken Road Base Recompact</span>
                    <strong style={{ color: "#F8FAFC" }}>₹28,000 / section</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                    <span style={{ color: "var(--text-muted)" }}>Stormwater Drainage Clearing</span>
                    <strong style={{ color: "#F8FAFC" }}>₹5,200 / zone</strong>
                  </div>
                </div>
              </div>

              <div style={{ background: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.3)", padding: "10px", borderRadius: "var(--radius-sm)", marginTop: "1rem" }}>
                <span style={{ fontSize: "0.75rem", color: "#93C5FD" }}>
                  💡 <strong>Pro Tip:</strong> Export GeoJSON data to import directly into Municipal GIS servers or Google Earth for road infrastructure mapping.
                </span>
              </div>
            </div>
          </div>

          {/* Distress-Wise Budget Breakdown Table */}
          <div className="glass-panel" style={{ padding: "1.5rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: "700", marginBottom: "1rem" }}>
              Distress-Wise Financial & Material Breakdown
            </h3>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", fontSize: "0.85rem", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase" }}>
                    <th style={{ padding: "10px 14px" }}>Damage Classification</th>
                    <th style={{ padding: "10px 14px" }}>Active Hazards</th>
                    <th style={{ padding: "10px 14px" }}>Cold Mix Asphalt</th>
                    <th style={{ padding: "10px 14px" }}>Estimated Expenditure</th>
                    <th style={{ padding: "10px 14px" }}>Share of Total Budget</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(budgetData.damage_breakdown || {}).map(([dtype, info]) => {
                    const share = budgetData.total_estimated_budget_inr
                      ? Math.round((info.cost_inr / budgetData.total_estimated_budget_inr) * 100)
                      : 0;

                    return (
                      <tr key={dtype} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                        <td style={{ padding: "12px 14px", fontWeight: "700", color: "#F8FAFC" }}>
                          {dtype}
                        </td>
                        <td style={{ padding: "12px 14px", color: "#93C5FD" }}>
                          {info.count} Incident(s)
                        </td>
                        <td style={{ padding: "12px 14px", color: "var(--text-main)" }}>
                          {info.asphalt_tons} Tons
                        </td>
                        <td style={{ padding: "12px 14px", fontWeight: "700", color: "#34D399" }}>
                          {formatINR(info.cost_inr)}
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <div style={{ flex: 1, height: "6px", background: "rgba(255,255,255,0.08)", borderRadius: "3px", overflow: "hidden" }}>
                              <div style={{ width: `${share}%`, height: "100%", background: "#3B82F6" }} />
                            </div>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", width: "32px" }}>{share}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
