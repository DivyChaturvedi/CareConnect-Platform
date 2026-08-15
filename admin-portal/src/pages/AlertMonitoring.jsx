import { useEffect, useRef, useState } from "react";
import {
    PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
    ResponsiveContainer, LineChart, Line, CartesianGrid,
} from "recharts";
import { getAlertsList, getDashboardStats } from "../services/monitoringService";



const COLORS = {
    bg: "#0a0e1a",
    surface: "rgba(255,255,255,0.045)",
    border: "rgba(255,255,255,0.09)",
    text: "#eef2ff",
    muted: "#8b96b3",
    accent: "#f5a524",
    accent2: "#22d3ee",
    success: "#34d399",
    danger: "#fb5a6a",
    purple: "#a78bfa",
};

const STATUS_COLORS = {
    open: COLORS.accent2,
    active: COLORS.accent,
    escalated: COLORS.danger,
    resolved: COLORS.success,
    closed: COLORS.muted,
};

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


function getCategoryIcon(categoryName) {
    if (!categoryName) return "⚠️";
    const name = categoryName.toLowerCase();
    if (name.includes("medical") || name.includes("health")) return "🏥";
    if (name.includes("fire")) return "🔥";
    if (name.includes("security") || name.includes("threat")) return "🚨";
    if (name.includes("fall") || name.includes("accident")) return "🤕";
    return "⚠️";
}

function formatExactTime(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function timeAgo(dateStr) {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

function StatBox({ label, value, color }) {
    return (
        <TiltCard className="cc-fade-in cc-card cc-stat" max={2}>
            <div className="cc-card-glow" />
            <div style={{ ...styles.statValue, color: color || COLORS.text }}>{value}</div>
            <div style={styles.statLabel}>{label}</div>
        </TiltCard>
    );
}

function StatusBadge({ status }) {
    const color = STATUS_COLORS[status] || COLORS.muted;
    return (
        <span style={{ ...styles.badge, color, background: `${color}22`, border: `1px solid ${color}55` }}>
            {status}
        </span>
    );
}

export default function AlertMonitoring() {
    const [stats, setStats] = useState(null);
    const [alerts, setAlerts] = useState([]);
    const [statusFilter, setStatusFilter] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([getDashboardStats(), getAlertsList()]).then(([statsRes, alertsRes]) => {
            setStats(statsRes.data);
            setAlerts(alertsRes.data.results ?? alertsRes.data);
            setLoading(false);
        });
    }, []);

    useEffect(() => {
        getAlertsList(statusFilter ? { status: statusFilter } : {}).then((res) =>
            setAlerts(res.data.results ?? res.data)
        );
    }, [statusFilter]);

    if (loading) {
        return (
            <div style={styles.page}>
                <GlobalStyles />
                <div style={{ ...styles.center, color: COLORS.muted }}>Loading dashboard…</div>
            </div>
        );
    }

    const statusPieData = (stats.status_breakdown || []).map((s) => ({
        name: s.status, value: s.count,
    }));

    const deliveryData = {};
    (stats.delivery_breakdown || []).forEach((d) => {
        if (!deliveryData[d.channel]) deliveryData[d.channel] = { channel: d.channel };
        deliveryData[d.channel][d.status] = d.count;
    });
    const deliveryChartData = Object.values(deliveryData);

    const trendData = (stats.daily_trend || []).map((d) => ({
        date: d.date.slice(5), count: d.count,
    }));

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
                    <h1 style={styles.heading}>Alert Monitoring</h1>
                    <p style={{ color: COLORS.muted, fontSize: 14, marginTop: 6 }}>
                        Live incidents, delivery status, and response analytics
                    </p>
                </div>

                {/* Stat boxes */}
                <div style={styles.statsGrid}>
                    <StatBox label="Total Alerts" value={stats.total_alerts} />
                    <StatBox label="Escalation Rate" value={`${stats.escalation_rate}%`} color={COLORS.danger} />
                    <StatBox
                        label="Avg Response Time"
                        value={stats.avg_response_minutes ? `${stats.avg_response_minutes}m` : "N/A"}
                        color={COLORS.success}
                    />
                </div>

                {/* Charts row */}
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
                        <h3 style={styles.cardTitle}>Delivery Status by Channel</h3>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={deliveryChartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                                <XAxis dataKey="channel" stroke={COLORS.muted} fontSize={12} />
                                <YAxis stroke={COLORS.muted} fontSize={12} />
                                <Tooltip contentStyle={{ background: "#12172a", border: `1px solid ${COLORS.border}`, borderRadius: 8 }} />
                                <Bar dataKey="sent" fill={COLORS.success} radius={[4, 4, 0, 0]} />
                                <Bar dataKey="failed" fill={COLORS.danger} radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </TiltCard>
                </div>

                <TiltCard className="cc-fade-in cc-card" max={1.5} style={{ marginBottom: 20 }}>
                    <div className="cc-card-glow" />
                    <h3 style={styles.cardTitle}>Alerts Trend (Last 7 Days)</h3>
                    <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={trendData}>
                            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                            <XAxis dataKey="date" stroke={COLORS.muted} fontSize={12} />
                            <YAxis stroke={COLORS.muted} fontSize={12} allowDecimals={false} />
                            <Tooltip contentStyle={{ background: "#12172a", border: `1px solid ${COLORS.border}`, borderRadius: 8 }} />
                            <Line type="monotone" dataKey="count" stroke={COLORS.accent} strokeWidth={2} dot={{ fill: COLORS.accent }} />
                        </LineChart>
                    </ResponsiveContainer>
                </TiltCard>

             {/* Response Time Distribution + Escalation Funnel */}
                <div style={styles.chartsRow}>
                    <TiltCard className="cc-fade-in cc-card" max={1.5} style={{ flex: 1, minWidth: 280 }}>
                        <div className="cc-card-glow" />
                        <h3 style={styles.cardTitle}>Response Time Distribution</h3>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={stats.response_time_distribution || []}>
                                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                                <XAxis dataKey="range" stroke={COLORS.muted} fontSize={11} />
                                <YAxis stroke={COLORS.muted} fontSize={12} allowDecimals={false} />
                                <Tooltip contentStyle={{ background: "#12172a", border: `1px solid ${COLORS.border}`, borderRadius: 8 }} />
                                <Bar dataKey="count" fill={COLORS.purple} radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </TiltCard>

                    <TiltCard className="cc-fade-in cc-card" max={1.5} style={{ flex: 1, minWidth: 280 }}>
                        <div className="cc-card-glow" />
                        <h3 style={styles.cardTitle}>Escalation Funnel</h3>
                        <div style={{ position: "relative", zIndex: 1 }}>
                            {(stats.escalation_funnel || []).map((stage, idx) => {
                                const maxCount = stats.escalation_funnel[0]?.count || 1;
                                const widthPct = Math.max((stage.count / maxCount) * 100, 8);
                                return (
                                    <div key={stage.stage} style={{ marginBottom: 12 }}>
                                        <div style={styles.funnelLabelRow}>
                                            <span style={styles.funnelLabel}>{stage.stage}</span>
                                            <span style={styles.funnelCount}>{stage.count}</span>
                                        </div>
                                        <div style={styles.funnelTrack}>
                                            <div
                                                style={{
                                                    ...styles.funnelFill,
                                                    width: `${widthPct}%`,
                                                    background: `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.accent2})`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </TiltCard>
                </div>

                {/* Per-Channel Delivery Table */}
                <TiltCard className="cc-fade-in cc-card" max={1.5}>
                    <div className="cc-card-glow" />
                    <h3 style={styles.cardTitle}>Alert Delivery Overview</h3>
                    <table style={styles.deliveryTable}>
                        <thead>
                            <tr>
                                <th style={styles.tableHeader}>Channel</th>
                                <th style={styles.tableHeader}>Sent</th>
                                <th style={styles.tableHeader}>Failed</th>
                                <th style={styles.tableHeader}>Delivery Rate</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(stats.channel_stats || []).map((c) => (
                                <tr key={c.channel}>
                                    <td style={styles.tableCell}>{c.channel}</td>
                                    <td style={styles.tableCell}>{c.sent}</td>
                                    <td style={styles.tableCell}>{c.failed}</td>
                                    <td style={styles.tableCell}>
                                        <span style={{
                                            color: c.delivery_rate >= 90 ? COLORS.success : c.delivery_rate >= 70 ? COLORS.accent : COLORS.danger,
                                            fontWeight: 700,
                                        }}>
                                            {c.delivery_rate}%
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </TiltCard>   

                {/* Live incidents list */}
                <TiltCard className="cc-fade-in cc-card" max={1}>
                    <div className="cc-card-glow" />
                    <div style={styles.listHeader}>
                        <h3 style={styles.cardTitle}>Live Incidents</h3>
                        <select
                            className="cc-select"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="">All Statuses</option>
                            <option value="open">Open</option>
                            <option value="active">Active</option>
                            <option value="escalated">Escalated</option>
                            <option value="resolved">Resolved</option>
                            <option value="closed">Closed</option>
                        </select>
                    </div>

                    {alerts.length === 0 ? (
                        <p style={{ color: COLORS.muted, fontSize: 13, textAlign: "center", padding: 24 }}>
                            No alerts found
                        </p>
                    ) : (
                    alerts.map((a) => (
                            <div key={a.id} style={styles.incidentRow}>
                                <div style={styles.incidentLeft}>
                                    <div style={styles.incidentIconCircle}>
                                        <span style={styles.incidentIcon}>{getCategoryIcon(a.category_name)}</span>
                                    </div>
                                    <div>
                                        <div style={styles.incidentName}>{a.resident_name}</div>
                                        <div style={styles.incidentMeta}>
                                            <span style={styles.incidentCategory}>{a.category_name || "Unknown"}</span>
                                            {" · "}{a.address || "No location"}
                                        </div>
                                    </div>
                                </div>
                                <div style={styles.incidentRight}>
                                    <div style={styles.incidentTimeBlock}>
                                        <span style={styles.incidentTimeAgo}>{timeAgo(a.created_at)}</span>
                                        <span style={styles.incidentExactTime}>{formatExactTime(a.created_at)}</span>
                                    </div>
                                    <StatusBadge status={a.status} />
                                </div>
                            </div>
                        ))
                    )}
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
            .cc-select {
                background: rgba(255,255,255,0.06); border: 1px solid ${COLORS.border}; color: ${COLORS.text};
                padding: 8px 12px; border-radius: 8px; font-family: var(--font-body); font-size: 13px; outline: none;
            }
        `}</style>
    );
}

const styles = {
    page: { minHeight: "100vh", background: COLORS.bg, padding: "36px 24px", fontFamily: "var(--font-body), sans-serif", position: "relative" },
    center: { minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" },
    container: { maxWidth: 1100, margin: "0 auto", position: "relative", zIndex: 1 },
    heading: { margin: 0, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 26, color: COLORS.text },
    statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 20 },
    statValue: { fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 700, position: "relative", zIndex: 1 },
    statLabel: { color: COLORS.muted, fontSize: 12, fontWeight: 600, marginTop: 6, position: "relative", zIndex: 1 },
    chartsRow: { display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 20 },
    cardTitle: { margin: "0 0 14px 0", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15, color: COLORS.text, position: "relative", zIndex: 1 },
    listHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", zIndex: 1 },
    incidentRow: {
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "14px 0", borderBottom: `1px solid ${COLORS.border}`, position: "relative", zIndex: 1,
    },
    incidentName: { color: COLORS.text, fontSize: 14, fontWeight: 600, marginBottom: 3 },
    incidentMeta: { color: COLORS.muted, fontSize: 12 },
    badge: { padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: "uppercase" },
    funnelLabelRow: { display: "flex", justifyContent: "space-between", marginBottom: 6 },
    funnelLabel: { color: COLORS.text, fontSize: 12, fontWeight: 600 },
    funnelCount: { color: COLORS.muted, fontSize: 12, fontWeight: 700 },
    funnelTrack: { height: 22, background: "rgba(255,255,255,0.05)", borderRadius: 6, overflow: "hidden" },
    funnelFill: { height: "100%", borderRadius: 6, transition: "width 0.4s ease" },
    deliveryTable: { width: "100%", borderCollapse: "collapse", position: "relative", zIndex: 1 },
    tableHeader: {
        textAlign: "left", padding: "10px 8px", color: COLORS.muted, fontSize: 11,
        fontWeight: 700, textTransform: "uppercase", borderBottom: `1px solid ${COLORS.border}`,
    },
    tableCell: { padding: "12px 8px", color: COLORS.text, fontSize: 13, borderBottom: `1px solid ${COLORS.border}` },

    incidentLeft: { display: "flex", alignItems: "center", gap: 12 },
    incidentIconCircle: {
        width: 38, height: 38, borderRadius: 10, background: "rgba(251,90,106,0.12)",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
    },
    incidentIcon: { fontSize: 17 },
    incidentCategory: { color: COLORS.text, fontWeight: 700 },

    incidentRight: { display: "flex", alignItems: "center", gap: 14 },
    incidentTimeBlock: { display: "flex", flexDirection: "column", alignItems: "flex-end" },
    incidentTimeAgo: { color: COLORS.text, fontSize: 12, fontWeight: 600 },
    incidentExactTime: { color: COLORS.muted, fontSize: 11, marginTop: 2 },
};