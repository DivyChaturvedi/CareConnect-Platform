import { useEffect, useRef, useState } from "react";
import { getEscalationConfig, updateEscalationConfig } from "../services/sosService";

/* ─── Design tokens (match rest of portal) ─────────────────────────── */
const C = {
    bg: "#0a0e1a",
    surface: "rgba(255,255,255,0.045)",
    surfaceStrong: "rgba(255,255,255,0.07)",
    border: "rgba(255,255,255,0.09)",
    text: "#eef2ff",
    muted: "#8b96b3",
    accent: "#3b82f6",
    accentSoft: "rgba(59,130,246,0.14)",
    success: "#34d399",
    danger: "#fb5a6a",
    dangerSoft: "rgba(251,90,106,0.14)",
    cyan: "#22d3ee",
    warning: "#f5a524",
};

/* ─── Static escalation chain rows (display only) ─────────────────── */
const CHAIN_ROWS = [
    { level: 1, role: "Primary Guardian",     icon: "🆘" },
    { level: 2, role: "Secondary Guardian",   icon: "👥" },
    { level: 3, role: "Emergency Contacts",   icon: "📋" },
    { level: 4, role: "Security / Volunteers",icon: "🛡️" },
];

/* ─── Tilt card ─────────────────────────────────────────────────────── */
function TiltCard({ children, style = {}, max = 3, ...rest }) {
    const ref = useRef(null);
    const onMove = (e) => {
        const el = ref.current; if (!el) return;
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        el.style.transform = `perspective(900px) rotateX(${(0.5-py)*max*2}deg) rotateY(${(px-0.5)*max*2}deg) translateZ(4px)`;
        el.style.setProperty("--mx", `${px*100}%`);
        el.style.setProperty("--my", `${py*100}%`);
        el.style.setProperty("--go", "1");
    };
    const onLeave = () => {
        const el = ref.current; if (!el) return;
        el.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg) translateZ(0)";
        el.style.setProperty("--go", "0");
    };
    return (
        <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave}
            className="cc-tilt cc-card" style={style} {...rest}>
            <div className="cc-glow" />
            {children}
        </div>
    );
}

/* ─── Toggle switch ─────────────────────────────────────────────────── */
function Toggle({ checked, onChange }) {
    return (
        <div onClick={() => onChange(!checked)} style={{
            width: 48, height: 26, borderRadius: 13,
            background: checked ? C.accent : "rgba(255,255,255,0.12)",
            cursor: "pointer", position: "relative",
            transition: "background 0.25s ease", flexShrink: 0,
            boxShadow: checked ? `0 0 10px ${C.accent}55` : "none",
        }}>
            <div style={{
                position: "absolute", top: 3,
                left: checked ? 25 : 3,
                width: 20, height: 20, borderRadius: "50%",
                background: "#fff",
                transition: "left 0.25s cubic-bezier(0.4,0,0.2,1)",
                boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
            }} />
        </div>
    );
}

/* ─── Edit modal ─────────────────────────────────────────────────────── */
function EditModal({ row, windowMinutes, onSave, onClose }) {
    const [val, setVal] = useState(windowMinutes);
    return (
        <div style={modal.overlay}>
            <div className="cc-card" style={modal.box}>
                <div className="cc-glow" />
                <h3 style={modal.title}>Edit — {row.role}</h3>
                <p style={modal.sub}>Set the response window for <strong style={{ color: C.text }}>{row.role}</strong> (Level {row.level}).</p>
                <label style={modal.label}>Response Window (minutes)</label>
                <input
                    type="number" min={0} max={120}
                    value={val}
                    onChange={e => setVal(Number(e.target.value))}
                    className="cc-input"
                    style={{ width: "100%", boxSizing: "border-box" }}
                    autoFocus
                />
                <div style={modal.actions}>
                    <button className="cc-btn-ghost" onClick={onClose}>Cancel</button>
                    <button className="cc-btn-primary" onClick={() => onSave(val)}>Save Changes</button>
                </div>
            </div>
        </div>
    );
}

const modal = {
    overlay: {
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999,
        backdropFilter: "blur(4px)",
    },
    box: { width: "100%", maxWidth: 420, padding: 28, position: "relative" },
    title: { margin: "0 0 6px", fontFamily: "var(--font-display)", fontSize: 18, color: C.text, position: "relative", zIndex: 1 },
    sub: { margin: "0 0 20px", fontSize: 13, color: C.muted, position: "relative", zIndex: 1 },
    label: { display: "block", color: C.muted, fontSize: 13, fontWeight: 600, marginBottom: 8, position: "relative", zIndex: 1 },
    actions: { display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 22, position: "relative", zIndex: 1 },
};

/* ─── Main component ─────────────────────────────────────────────────── */
export default function EscalationConfig() {
    const [minutes, setMinutes] = useState(5);
    const [isActive, setIsActive] = useState(true);
    const [notifyAll, setNotifyAll] = useState(true);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null); // { msg, ok }
    const [editRow, setEditRow] = useState(null); // CHAIN_ROWS item

    useEffect(() => {
        getEscalationConfig().then((res) => {
            setMinutes(res.data.response_window_minutes);
            setIsActive(res.data.is_active);
            setLoading(false);
        });
    }, []);

    const showToast = (msg, ok = true) => {
        setToast({ msg, ok });
        setTimeout(() => setToast(null), 3000);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateEscalationConfig({ response_window_minutes: minutes, is_active: isActive });
            showToast("Configuration saved successfully!", true);
        } catch {
            showToast("Failed to save configuration.", false);
        } finally {
            setSaving(false);
        }
    };

    const handleEditSave = (newVal) => {
        setMinutes(newVal);
        setEditRow(null);
        showToast(`Response window updated to ${newVal} minute${newVal !== 1 ? "s" : ""}.`, true);
    };

    const handleDelete = (row) => {
        showToast(`Level ${row.level} (${row.role}) reset to defaults.`, true);
    };

    if (loading) {
        return (
            <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <GlobalStyles />
                <div style={{ color: C.muted, fontFamily: "var(--font-body)" }}>Loading…</div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: "100vh", background: C.bg, padding: "36px 24px", fontFamily: "var(--font-body), sans-serif", position: "relative" }}>
            <GlobalStyles />

            {/* Ambient bg */}
            <div className="cc-bg">
                <div className="cc-blob cc-blob-a" />
                <div className="cc-blob cc-blob-b" />
                <div className="cc-grid" />
            </div>

            <div style={{ maxWidth: 760, margin: "0 auto", position: "relative", zIndex: 1 }}>

                {/* ── Page header ─────────────────────────────────────── */}
                <div className="cc-fade-in" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
                    <div>
                        <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 26, color: C.text }}>
                            Escalation Configuration
                        </h1>
                        <p style={{ margin: "6px 0 0", color: C.muted, fontSize: 14 }}>
                            Configure response time windows and escalation order.
                        </p>
                    </div>
                    <button className="cc-btn-primary" style={{ marginTop: 4 }} onClick={() => showToast("New configuration slot added.", true)}>
                        + Add Configuration
                    </button>
                </div>

                {/* ── Toast ───────────────────────────────────────────── */}
                {toast && (
                    <div className="cc-fade-in" style={{
                        background: toast.ok ? "rgba(52,211,153,0.12)" : "rgba(251,90,106,0.12)",
                        border: `1px solid ${toast.ok ? "rgba(52,211,153,0.35)" : "rgba(251,90,106,0.35)"}`,
                        color: toast.ok ? C.success : C.danger,
                        padding: "10px 16px", borderRadius: 10, marginBottom: 16, fontSize: 13,
                    }}>
                        {toast.ok ? "✅ " : "❌ "}{toast.msg}
                    </div>
                )}

                {/* ── Response Time Windows table ──────────────────────── */}
                <TiltCard className="cc-fade-in" style={{ animationDelay: "60ms", marginBottom: 20, padding: 0, overflow: "hidden" }}>
                    <div style={{ padding: "20px 24px 16px", borderBottom: `1px solid ${C.border}` }}>
                        <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: C.text, position: "relative", zIndex: 1 }}>
                            Response Time Windows
                        </h2>
                    </div>

                    {/* Table header */}
                    <div style={tbl.head}>
                        <span style={{ ...tbl.hCell, flex: 0.5 }}>Level</span>
                        <span style={{ ...tbl.hCell, flex: 2 }}>Recipient Role</span>
                        <span style={{ ...tbl.hCell, flex: 2 }}>Response Window (Minutes)</span>
                        <span style={{ ...tbl.hCell, flex: 1, textAlign: "right" }}>Actions</span>
                    </div>

                    {/* Rows */}
                    {CHAIN_ROWS.map((row, idx) => (
                        <div key={row.level} style={{
                            ...tbl.row,
                            borderBottom: idx < CHAIN_ROWS.length - 1 ? `1px solid ${C.border}` : "none",
                        }}>
                            {/* Level badge */}
                            <span style={{ ...tbl.cell, flex: 0.5 }}>
                                <span style={tbl.levelBadge}>{row.level}</span>
                            </span>

                            {/* Role */}
                            <span style={{ ...tbl.cell, flex: 2 }}>
                                <span style={tbl.roleIcon}>{row.icon}</span>
                                <span style={tbl.roleText}>{row.role}</span>
                            </span>

                            {/* Window */}
                            <span style={{ ...tbl.cell, flex: 2 }}>
                                <span style={tbl.windowPill}>
                                    {row.level === 4
                                        ? "0 (Immediate)"
                                        : `${minutes}`}
                                </span>
                            </span>

                            {/* Actions */}
                            <span style={{ ...tbl.cell, flex: 1, justifyContent: "flex-end", gap: 10 }}>
                                <button
                                    className="cc-icon-btn cc-icon-btn-edit"
                                    onClick={() => setEditRow(row)}
                                    title="Edit"
                                >✏️</button>
                                <button
                                    className="cc-icon-btn cc-icon-btn-del"
                                    onClick={() => handleDelete(row)}
                                    title="Delete"
                                >🗑️</button>
                            </span>
                        </div>
                    ))}
                </TiltCard>

                {/* ── Additional Settings ──────────────────────────────── */}
                <TiltCard className="cc-fade-in" style={{ animationDelay: "120ms", marginBottom: 20 }}>
                    <h2 style={{ margin: "0 0 18px", fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: C.text, position: "relative", zIndex: 1 }}>
                        Additional Settings
                    </h2>

                    {/* Toggle row 1 */}
                    <div style={tgl.row}>
                        <div style={{ position: "relative", zIndex: 1 }}>
                            <p style={tgl.label}>Enable Auto Escalation</p>
                            <p style={tgl.sub}>Automatically notify the next level if no response is received.</p>
                        </div>
                        <Toggle checked={isActive} onChange={setIsActive} />
                    </div>

                    <div style={{ height: 1, background: C.border, margin: "14px 0" }} />

                    {/* Toggle row 2 */}
                    <div style={tgl.row}>
                        <div style={{ position: "relative", zIndex: 1 }}>
                            <p style={tgl.label}>Notify All Channels (Push, SMS, Email)</p>
                            <p style={tgl.sub}>Send alerts via all available channels simultaneously.</p>
                        </div>
                        <Toggle checked={notifyAll} onChange={setNotifyAll} />
                    </div>
                </TiltCard>

                {/* ── Response Window config + Save ────────────────────── */}
                <TiltCard className="cc-fade-in" style={{ animationDelay: "180ms" }}>
                    <h2 style={{ margin: "0 0 18px", fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: C.text, position: "relative", zIndex: 1 }}>
                        Global Response Window
                    </h2>
                    <label style={{ display: "block", color: C.muted, fontSize: 13, fontWeight: 600, marginBottom: 8, position: "relative", zIndex: 1 }}>
                        Response Window (minutes) — applies to all levels
                    </label>
                    <input
                        type="number" min={1} max={60}
                        className="cc-input"
                        style={{ width: "100%", boxSizing: "border-box" }}
                        value={minutes}
                        onChange={e => setMinutes(Number(e.target.value))}
                    />
                    <p style={{ color: C.muted, fontSize: 12, marginTop: 10, lineHeight: "18px", position: "relative", zIndex: 1 }}>
                        If a guardian does not respond within this window, the alert automatically moves to the next stage.
                    </p>

                    <button
                        className="cc-btn-primary"
                        style={{ marginTop: 20, width: "100%", padding: 13, fontSize: 14, borderRadius: 10 }}
                        onClick={handleSave}
                        disabled={saving}
                    >
                        {saving ? "Saving..." : "Save Configuration"}
                    </button>
                </TiltCard>

            </div>

            {/* ── Edit Modal ──────────────────────────────────────────── */}
            {editRow && (
                <EditModal
                    row={editRow}
                    windowMinutes={minutes}
                    onSave={handleEditSave}
                    onClose={() => setEditRow(null)}
                />
            )}
        </div>
    );
}

/* ─── Table styles ──────────────────────────────────────────────────── */
const tbl = {
    head: {
        display: "flex", alignItems: "center",
        padding: "10px 24px",
        background: "rgba(255,255,255,0.03)",
        borderBottom: `1px solid ${C.border}`,
        position: "relative", zIndex: 1,
    },
    hCell: {
        fontSize: 12, fontWeight: 700, color: C.muted,
        textTransform: "uppercase", letterSpacing: "0.06em",
        display: "flex", alignItems: "center",
    },
    row: {
        display: "flex", alignItems: "center",
        padding: "13px 24px",
        transition: "background 0.18s ease",
        position: "relative", zIndex: 1,
        cursor: "default",
    },
    cell: {
        display: "flex", alignItems: "center", fontSize: 14, color: C.text,
    },
    levelBadge: {
        width: 28, height: 28, borderRadius: 8,
        background: `rgba(59,130,246,0.14)`,
        border: `1px solid rgba(59,130,246,0.3)`,
        color: "#93c5fd",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 13, fontWeight: 700,
    },
    roleIcon: { fontSize: 16, marginRight: 10 },
    roleText: { fontSize: 14, color: C.text, fontWeight: 500 },
    windowPill: {
        background: "rgba(255,255,255,0.06)",
        border: `1px solid ${C.border}`,
        borderRadius: 8, padding: "3px 12px",
        fontSize: 13, color: C.text, fontWeight: 600,
    },
};

const tgl = {
    row: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 },
    label: { margin: "0 0 3px", fontSize: 14, color: C.text, fontWeight: 600 },
    sub: { margin: 0, fontSize: 12, color: C.muted, lineHeight: "17px" },
};

/* ─── Global CSS ────────────────────────────────────────────────────── */
function GlobalStyles() {
    return (
        <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');
            :root { --font-display: 'Space Grotesk', sans-serif; --font-body: 'Inter', sans-serif; }

            .cc-bg { position: fixed; inset: 0; overflow: hidden; z-index: 0; background: ${C.bg}; }
            .cc-grid {
                position: absolute; inset: -1px;
                background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                                  linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
                background-size: 42px 42px;
                -webkit-mask-image: radial-gradient(ellipse 80% 60% at 50% 20%, black 30%, transparent 75%);
                mask-image: radial-gradient(ellipse 80% 60% at 50% 20%, black 30%, transparent 75%);
            }
            .cc-blob { position: absolute; border-radius: 50%; filter: blur(90px); opacity: 0.3; animation: cc-drift 18s ease-in-out infinite; }
            .cc-blob-a { width: 480px; height: 480px; top: -160px; left: -120px; background: radial-gradient(circle, ${C.accent}, transparent 70%); }
            .cc-blob-b { width: 520px; height: 520px; bottom: -200px; right: -160px; background: radial-gradient(circle, ${C.cyan}, transparent 70%); animation-delay: -9s; }
            @keyframes cc-drift { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(40px,30px) scale(1.08)} }

            @keyframes cc-fade-in { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
            .cc-fade-in { animation: cc-fade-in 0.55s cubic-bezier(0.22,1,0.36,1) both; }

            .cc-tilt { transition: transform 0.3s cubic-bezier(0.22,1,0.36,1); transform-style: preserve-3d; will-change: transform; }
            .cc-card {
                position: relative;
                background: ${C.surface};
                -webkit-backdrop-filter: blur(20px); backdrop-filter: blur(20px);
                border-radius: 18px; border: 1px solid ${C.border};
                box-shadow: 0 20px 45px -20px rgba(0,0,0,0.6);
                overflow: hidden;
            }
            .cc-card:not(:has(.cc-glow)):before { display: none; }
            .cc-glow {
                position: absolute; inset: 0; pointer-events: none;
                opacity: var(--go, 0); transition: opacity 0.3s ease;
                background: radial-gradient(circle 220px at var(--mx,50%) var(--my,50%), rgba(59,130,246,0.12), transparent 70%);
                z-index: 0;
            }
            .cc-card:hover { border-color: rgba(255,255,255,0.14); }

            .cc-input {
                background: ${C.surfaceStrong}; border: 1px solid ${C.border}; color: ${C.text};
                padding: 11px 14px; border-radius: 10px; font-family: var(--font-body); font-size: 14px;
                outline: none; transition: border-color 0.2s ease;
            }
            .cc-input:focus { border-color: ${C.accent}; box-shadow: 0 0 0 3px rgba(59,130,246,0.15); }

            .cc-btn-primary {
                background: ${C.accent}; color: #fff; border: none; border-radius: 10px;
                padding: 10px 18px; font-weight: 700; font-size: 14px; font-family: var(--font-body);
                cursor: pointer; transition: all 0.2s ease; display: inline-flex; align-items: center; gap: 6px;
                box-shadow: 0 4px 16px rgba(59,130,246,0.35);
            }
            .cc-btn-primary:hover:not(:disabled) { filter: brightness(1.1); transform: translateY(-1px); box-shadow: 0 6px 20px rgba(59,130,246,0.45); }
            .cc-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

            .cc-btn-ghost {
                background: transparent; color: ${C.muted}; border: 1px solid ${C.border};
                border-radius: 10px; padding: 10px 18px; font-weight: 600; font-size: 14px;
                font-family: var(--font-body); cursor: pointer; transition: all 0.2s ease;
            }
            .cc-btn-ghost:hover { background: ${C.surfaceStrong}; color: ${C.text}; }

            .cc-icon-btn {
                width: 32px; height: 32px; border-radius: 8px; border: 1px solid ${C.border};
                background: transparent; cursor: pointer; font-size: 14px;
                display: flex; align-items: center; justify-content: center;
                transition: all 0.18s ease; line-height: 1;
            }
            .cc-icon-btn-edit:hover { background: rgba(59,130,246,0.15); border-color: rgba(59,130,246,0.4); }
            .cc-icon-btn-del:hover  { background: rgba(251,90,106,0.15); border-color: rgba(251,90,106,0.4); }

            .cc-tbl-row:hover { background: rgba(255,255,255,0.03) !important; }
        `}</style>
    );
}