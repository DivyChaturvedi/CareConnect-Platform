import { useEffect, useRef, useState } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { getReportSummary, downloadExcelReport, downloadPdfReport } from "../services/reportService";
import { getSocieties } from "../services/notificationService"; // society list already banaya tha Day 5 mein kahi, agar nahi hai to alag import karna hoga

const COLORS = {
    bg: "#0a0e1a", surface: "rgba(255,255,255,0.045)", border: "rgba(255,255,255,0.09)",
    text: "#eef2ff", muted: "#8b96b3", accent: "#f5a524", accent2: "#22d3ee",
    success: "#34d399", danger: "#fb5a6a", purple: "#a78bfa",
};

const STATUS_COLORS = { open: COLORS.accent2, active: COLORS.accent, escalated: COLORS.danger, resolved: COLORS.success, closed: COLORS.muted };

function TiltCard({ children, className = "", style = {}, max = 3, glow = true, ...rest }) {
    const ref = useRef(null);
    const onMove = (e) => {
        const el = ref.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width;
        const py = (e.clientY - rect.top) / rect.height;
        const rx = (0.5 - py) * max * 2;
        const ry = (px - 0.5) * max * 2;
        el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(4px)`;
        if (glow) {
            el.style.setProperty("--mx", `${px * 100}%`);
            el.style.setProperty("--my", `${py * 100}%`);
            el.style.setProperty("--glow-o", "1");
        }
    };
    const onLeave = () => {
        const el = ref.current;
        if (!el) return;
        el.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg) translateZ(0px)";
        el.style.setProperty("--glow-o", "0");
    };
    return (
        <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} className={`cc-tilt ${className}`} style={style} {...rest}>
            {children}
        </div>
    );
}

export default function ReportingDashboard() {
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);

    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [societies, setSocieties] = useState([]);
    const [societyFilter, setSocietyFilter] = useState("");

    const buildParams = () => {
        const params = {};
        if (dateFrom) params.date_from = dateFrom;
        if (dateTo) params.date_to = dateTo;
        if (societyFilter) params.society = societyFilter;
        return params;
    };

    const fetchSummary = () => {
        setLoading(true);
        getReportSummary(buildParams())
            .then((res) => setSummary(res.data))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchSummary();
        getSocieties?.()
            .then((res) => setSocieties(res.data.results ?? res.data))
            .catch(() => {});
    }, []);

    const handleFilterApply = () => fetchSummary();

    const handleExportExcel = async () => {
        setExporting(true);
        try {
            await downloadExcelReport(buildParams());
        } finally {
            setExporting(false);
        }
    };

    const handleExportPdf = async () => {
        setExporting(true);
        try {
            await downloadPdfReport(buildParams());
        } finally {
            setExporting(false);
        }
    };

    if (loading || !summary) {
        return (
            <div style={styles.page}>
                <GlobalStyles />
                <div style={{ ...styles.center, color: COLORS.muted }}>Loading report…</div>
            </div>
        );
    }

    const statusPieData = (summary.status_breakdown || []).map((s) => ({ name: s.status, value: s.count }));
    const categoryData = (summary.category_breakdown || []).map((c) => ({ name: c.category__name || "Unknown", count: c.count }));
    const societyData = summary.society_breakdown || [];

    return (
        <div style={styles.page}>
            <GlobalStyles />
            <div className="cc-bg">
                <div className="cc-blob cc-blob-a" />
                <div className="cc-blob cc-blob-b" />
                <div className="cc-grid" />
            </div>

            <div style={styles.container}>
                <div className="cc-fade-in" style={{ marginBottom: 24 }}>
                    <h1 style={styles.heading}>Reporting Dashboard</h1>
                    <p style={{ color: COLORS.muted, fontSize: 14, marginTop: 6 }}>
                        Filter, analyze, and export incident reports
                    </p>
                </div>

                {/* Filters */}
                <TiltCard className="cc-fade-in cc-card" max={1.5} style={{ marginBottom: 20 }}>
                    <div className="cc-card-glow" />
                    <div style={styles.filterRow}>
                        <div>
                            <label style={styles.filterLabel}>From</label>
                            <input type="date" className="cc-input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                        </div>
                        <div>
                            <label style={styles.filterLabel}>To</label>
                            <input type="date" className="cc-input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                        </div>
                        <div>
                            <label style={styles.filterLabel}>Society</label>
                            <select className="cc-select" value={societyFilter} onChange={(e) => setSocietyFilter(e.target.value)}>
                                <option value="">All Societies</option>
                                {societies.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <button className="cc-apply-btn" onClick={handleFilterApply}>Apply Filters</button>
                    </div>

                    <div style={styles.exportRow}>
                        <button className="cc-export-btn" onClick={handleExportExcel} disabled={exporting}>
                            📊 {exporting ? "Exporting..." : "Export Excel"}
                        </button>
                        <button className="cc-export-btn" onClick={handleExportPdf} disabled={exporting}>
                            📄 {exporting ? "Exporting..." : "Export PDF"}
                        </button>
                    </div>
                </TiltCard>

                {/* Stat boxes */}
                <div style={styles.statsGrid}>
                    <TiltCard className="cc-fade-in cc-card cc-stat" max={2}>
                        <div className="cc-card-glow" />
                        <div style={styles.statValue}>{summary.total_alerts}</div>
                        <div style={styles.statLabel}>Total Incidents</div>
                    </TiltCard>
                    <TiltCard className="cc-fade-in cc-card cc-stat" max={2}>
                        <div className="cc-card-glow" />
                        <div style={{ ...styles.statValue, color: COLORS.success }}>
                            {summary.avg_response_minutes ? `${summary.avg_response_minutes}m` : "N/A"}
                        </div>
                        <div style={styles.statLabel}>Avg Response Time</div>
                    </TiltCard>
                    <TiltCard className="cc-fade-in cc-card cc-stat" max={2}>
                        <div className="cc-card-glow" />
                        <div style={{ ...styles.statValue, color: COLORS.accent }}>{societyData.length}</div>
                        <div style={styles.statLabel}>Societies Involved</div>
                    </TiltCard>
                </div>

                {/* Charts */}
                <div style={styles.chartsRow}>
                    <TiltCard className="cc-fade-in cc-card" max={1.5} style={{ flex: 1, minWidth: 280 }}>
                        <div className="cc-card-glow" />
                        <h3 style={styles.cardTitle}>Status Breakdown</h3>
                        <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                                <Pie data={statusPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label>
                                    {statusPieData.map((entry, idx) => (
                                        <Cell key={idx} fill={STATUS_COLORS[entry.name] || COLORS.muted} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ background: "#12172a", border: `1px solid ${COLORS.border}`, borderRadius: 8 }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </TiltCard>

                    <TiltCard className="cc-fade-in cc-card" max={1.5} style={{ flex: 1, minWidth: 280 }}>
                        <div className="cc-card-glow" />
                        <h3 style={styles.cardTitle}>Incidents by Category</h3>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={categoryData}>
                                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                                <XAxis dataKey="name" stroke={COLORS.muted} fontSize={11} />
                                <YAxis stroke={COLORS.muted} fontSize={12} allowDecimals={false} />
                                <Tooltip contentStyle={{ background: "#12172a", border: `1px solid ${COLORS.border}`, borderRadius: 8 }} />
                                <Bar dataKey="count" fill={COLORS.purple} radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </TiltCard>
                </div>

                {/* Society-wise table */}
                <TiltCard className="cc-fade-in cc-card" max={1.5}>
                    <div className="cc-card-glow" />
                    <h3 style={styles.cardTitle}>Society-wise Breakdown</h3>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.th}>Society</th>
                                <th style={styles.th}>Incidents</th>
                            </tr>
                        </thead>
                        <tbody>
                            {societyData.map((s) => (
                                <tr key={s.society}>
                                    <td style={styles.td}>{s.society}</td>
                                    <td style={styles.td}>{s.count}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </TiltCard>
            </div>
        </div>
    );
}

function GlobalStyles() {
    return (
        <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');
            :root { --font-display: 'Space Grotesk', sans-serif; --font-body: 'Inter', sans-serif; }
            .cc-bg { position: fixed; inset: 0; overflow: hidden; z-index: 0; background: ${COLORS.bg}; }
            .cc-grid {
                position: absolute; inset: -1px;
                background-image: linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px);
                background-size: 42px 42px;
                -webkit-mask-image: radial-gradient(ellipse 80% 60% at 50% 20%, black 30%, transparent 75%);
                mask-image: radial-gradient(ellipse 80% 60% at 50% 20%, black 30%, transparent 75%);
            }
            .cc-blob { position: absolute; border-radius: 50%; filter: blur(90px); opacity: 0.3; animation: cc-drift 18s ease-in-out infinite; }
            .cc-blob-a { width: 460px; height: 460px; top: -160px; left: -120px; background: radial-gradient(circle, ${COLORS.accent}, transparent 70%); }
            .cc-blob-b { width: 500px; height: 500px; bottom: -200px; right: -160px; background: radial-gradient(circle, ${COLORS.accent2}, transparent 70%); animation-delay: -9s; }
            @keyframes cc-drift { 0%, 100% { transform: translate(0,0) scale(1); } 50% { transform: translate(40px,30px) scale(1.08); } }
            @keyframes cc-fade-in { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
            .cc-fade-in { animation: cc-fade-in 0.6s cubic-bezier(0.22,1,0.36,1) both; }
            .cc-tilt { transition: transform 0.35s cubic-bezier(0.22,1,0.36,1); transform-style: preserve-3d; will-change: transform; }
            .cc-card {
                position: relative; background: ${COLORS.surface};
                -webkit-backdrop-filter: blur(18px); backdrop-filter: blur(18px);
                padding: 20px; border-radius: 18px; border: 1px solid ${COLORS.border};
                margin-bottom: 20px; box-shadow: 0 20px 45px -20px rgba(0,0,0,0.55); overflow: hidden;
            }
            .cc-card-glow {
                position: absolute; inset: 0; pointer-events: none;
                opacity: var(--glow-o, 0); transition: opacity 0.3s ease;
                background: radial-gradient(circle 220px at var(--mx,50%) var(--my,50%), rgba(245,165,36,0.16), transparent 70%);
            }
            .cc-stat { text-align: center; padding: 24px 16px; }
            .cc-input, .cc-select {
                background: rgba(255,255,255,0.06); border: 1px solid ${COLORS.border}; color: ${COLORS.text};
                padding: 9px 12px; border-radius: 8px; font-family: var(--font-body); font-size: 13px; outline: none;
            }
            .cc-apply-btn {
                background: ${COLORS.accent}; color: #1a1200; border: none; border-radius: 8px;
                padding: 10px 18px; font-weight: 700; font-size: 13px; cursor: pointer; align-self: flex-end;
            }
            .cc-export-btn {
                background: rgba(255,255,255,0.06); border: 1px solid ${COLORS.border}; color: ${COLORS.text};
                padding: 10px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; margin-right: 10px;
            }
            .cc-export-btn:hover:not(:disabled) { border-color: ${COLORS.accent}; }
            .cc-export-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        `}</style>
    );
}

const styles = {
    page: { minHeight: "100vh", background: COLORS.bg, padding: "36px 24px", fontFamily: "var(--font-body), sans-serif", position: "relative" },
    center: { minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" },
    container: { maxWidth: 1100, margin: "0 auto", position: "relative", zIndex: 1 },
    heading: { margin: 0, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 26, color: COLORS.text },
    filterRow: { display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap", position: "relative", zIndex: 1 },
    filterLabel: { display: "block", color: COLORS.muted, fontSize: 11, fontWeight: 700, marginBottom: 6, textTransform: "uppercase" },
    exportRow: { marginTop: 16, position: "relative", zIndex: 1 },
    statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 20 },
    statValue: { fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 700, color: COLORS.text, position: "relative", zIndex: 1 },
    statLabel: { color: COLORS.muted, fontSize: 12, fontWeight: 600, marginTop: 6, position: "relative", zIndex: 1 },
    chartsRow: { display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 20 },
    cardTitle: { margin: "0 0 14px 0", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15, color: COLORS.text, position: "relative", zIndex: 1 },
    table: { width: "100%", borderCollapse: "collapse", position: "relative", zIndex: 1 },
    th: { textAlign: "left", padding: "10px 8px", color: COLORS.muted, fontSize: 11, fontWeight: 700, textTransform: "uppercase", borderBottom: `1px solid ${COLORS.border}` },
    td: { padding: "12px 8px", color: COLORS.text, fontSize: 13, borderBottom: `1px solid ${COLORS.border}` },
};