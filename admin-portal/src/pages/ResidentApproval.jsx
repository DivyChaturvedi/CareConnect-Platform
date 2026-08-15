import { useEffect, useRef, useState } from "react";
import { getResidentDirectory, approveResident } from "../services/residentService";

/* ─────────────────────────────────────────────────────────────────────────────
   Design tokens
───────────────────────────────────────────────────────────────────────────── */
const C = {
    bg: "#060b18",
    surface: "rgba(255,255,255,0.05)",
    surfaceHover: "rgba(255,255,255,0.09)",
    border: "rgba(255,255,255,0.09)",
    text: "#e2e8f0",
    muted: "#8b96b3",
    accent: "#4f7fff",
    accentAlt: "#7c3aed",
    accentSoft: "rgba(79,127,255,0.15)",
    warn: "#f5a524",
    warnSoft: "rgba(245,165,36,0.15)",
    danger: "#fb5a6a",
    dangerSoft: "rgba(251,90,106,0.15)",
    success: "#34d399",
    successSoft: "rgba(52,211,153,0.15)",
};

/* ─────────────────────────────────────────────────────────────────────────────
   TiltCard — 3-D hover effect
───────────────────────────────────────────────────────────────────────────── */
function TiltCard({ children, style = {}, max = 4, ...rest }) {
    const ref = useRef(null);
    const onMove = (e) => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        el.style.transform = `perspective(900px) rotateX(${(0.5 - py) * max * 2}deg) rotateY(${(px - 0.5) * max * 2}deg) translateZ(4px)`;
        el.style.setProperty("--mx", `${px * 100}%`);
        el.style.setProperty("--my", `${py * 100}%`);
        el.style.setProperty("--glow-o", "1");
    };
    const onLeave = () => {
        const el = ref.current;
        if (!el) return;
        el.style.transform = "perspective(900px) rotateX(0) rotateY(0) translateZ(0)";
        el.style.setProperty("--glow-o", "0");
    };
    return (
        <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} className="cc-tilt cc-card" style={style} {...rest}>
            <div className="cc-card-glow" />
            {children}
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────────────────
   StatusBadge
───────────────────────────────────────────────────────────────────────────── */
function StatusBadge({ status }) {
    const map = {
        pending: { bg: C.warnSoft, color: C.warn, label: "Pending" },
        approved: { bg: C.successSoft, color: C.success, label: "Approved" },
        rejected: { bg: C.dangerSoft, color: C.danger, label: "Rejected" },
    };
    const s = map[status] || map.pending;
    return (
        <span style={{
            background: s.bg, color: s.color, padding: "5px 14px",
            borderRadius: 20, fontSize: 11, fontWeight: 700,
            letterSpacing: "0.06em", textTransform: "uppercase",
            border: `1px solid ${s.color}44`,
        }}>
            {s.label}
        </span>
    );
}

/* ─────────────────────────────────────────────────────────────────────────────
   DocLink — clickable document download chip
───────────────────────────────────────────────────────────────────────────── */
function DocLink({ label, url }) {
    if (!url) {
        return (
            <span style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "6px 14px", borderRadius: 8, fontSize: 12,
                background: "rgba(255,255,255,0.04)", color: C.muted,
                border: `1px solid ${C.border}`,
            }}>
                <span>📄</span> {label} — <em>Not uploaded</em>
            </span>
        );
    }
    const fileName = url.split("/").pop() || label;
    return (
        <a href={url} target="_blank" rel="noopener noreferrer" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "7px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600,
            background: C.accentSoft, color: C.accent,
            border: `1px solid ${C.accent}44`,
            textDecoration: "none", transition: "all 0.2s",
            cursor: "pointer",
        }}
            onMouseEnter={e => { e.currentTarget.style.background = C.accent; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={e => { e.currentTarget.style.background = C.accentSoft; e.currentTarget.style.color = C.accent; }}
        >
            ⬇ {label} — {fileName}
        </a>
    );
}

/* ─────────────────────────────────────────────────────────────────────────────
   ResidentDetailModal — B panel: Resident-Flat Mapping / Approval
───────────────────────────────────────────────────────────────────────────── */
function ResidentDetailModal({ resident, onClose, onAction, actioning }) {
    if (!resident) return null;

    const r = resident;
    const name = `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim();
    const location = r.flat_number
        ? `${r.society_name_actual ?? ""} / ${r.block_name ?? ""} / Flat ${r.flat_number}${r.floor != null ? ` · Floor ${r.floor}` : ""}`
        : "No flat mapped yet";

    const requestedOn = r.requested_at
        ? new Date(r.requested_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
        : "—";

    return (
        <div style={modal.overlay} onClick={onClose}>
            <div style={modal.box} onClick={e => e.stopPropagation()}>
                <GlobalStyles />

                {/* Header */}
                <div style={modal.header}>
                    <div>
                        <h2 style={modal.title}>Resident–Flat Mapping</h2>
                        <p style={{ color: C.muted, margin: 0, fontSize: 13 }}>Review details & documents</p>
                    </div>
                    <button onClick={onClose} style={modal.closeBtn}>✕</button>
                </div>

                <div style={modal.body}>
                    {/* Left column — Resident Info */}
                    <div style={modal.leftCol}>
                        <SectionLabel>Resident Info</SectionLabel>
                        <InfoRow label="Name" value={name || "—"} />
                        <InfoRow label="Email" value={r.email ?? "—"} />
                        <InfoRow label="Phone" value={r.phone_number ?? "—"} />
                        <InfoRow label="Requested On" value={requestedOn} />

                        <div style={{ marginTop: 20 }}>
                            <SectionLabel>Flat Details</SectionLabel>
                            <InfoRow label="Society" value={r.society_name_actual ?? "—"} />
                            <InfoRow label="Block / Tower" value={r.block_name ?? "—"} />
                            <InfoRow label="Flat No." value={r.flat_number ?? "—"} />
                            <InfoRow label="Floor" value={r.floor != null ? `Floor ${r.floor}` : "—"} />
                        </div>

                        {/* Documents */}
                        <div style={{ marginTop: 20 }}>
                            <SectionLabel>Documents</SectionLabel>
                            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
                                <DocLink label="Aadhaar Card" url={r.aadhaar_card_url} />
                                <DocLink label="Address Proof" url={r.address_proof_url} />
                            </div>
                        </div>
                    </div>

                    {/* Right column — Status & Actions */}
                    <div style={modal.rightCol}>
                        <SectionLabel>Current Status</SectionLabel>
                        <div style={{ marginTop: 8, marginBottom: 24 }}>
                            <StatusBadge status={r.approval_status} />
                        </div>

                        <SectionLabel>Actions</SectionLabel>
                        <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                            {r.approval_status !== "approved" && (
                                <button
                                    className="cc-action-btn cc-approve-btn"
                                    disabled={actioning}
                                    onClick={() => onAction(r.id, "approved")}
                                    style={{ flex: 1 }}
                                >
                                    ✓  Approve
                                </button>
                            )}
                            {r.approval_status !== "rejected" && (
                                <button
                                    className="cc-action-btn cc-reject-btn"
                                    disabled={actioning}
                                    onClick={() => onAction(r.id, "rejected")}
                                    style={{ flex: 1 }}
                                >
                                    ✕  Reject
                                </button>
                            )}
                            <button
                                className="cc-action-btn"
                                onClick={onClose}
                                style={{ flex: 1, background: "rgba(255,255,255,0.05)", color: C.muted, border: `1px solid ${C.border}` }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function SectionLabel({ children }) {
    return <p style={{ color: C.muted, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 8px" }}>{children}</p>;
}

function InfoRow({ label, value }) {
    return (
        <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "flex-start" }}>
            <span style={{ fontSize: 12, color: C.muted, minWidth: 90, flexShrink: 0 }}>{label}</span>
            <span style={{ fontSize: 13, color: C.text, fontWeight: 500, wordBreak: "break-all" }}>{value}</span>
        </div>
    );
}

const modal = {
    overlay: {
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    },
    box: {
        background: "#0b1022", border: `1px solid ${C.border}`,
        borderRadius: 20, width: "100%", maxWidth: 820,
        maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 40px 80px -20px rgba(0,0,0,0.8)",
        fontFamily: "var(--font-body, sans-serif)",
    },
    header: {
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        padding: "24px 28px 18px", borderBottom: `1px solid ${C.border}`,
    },
    title: { margin: 0, color: C.text, fontSize: 20, fontFamily: "var(--font-display, sans-serif)", fontWeight: 700 },
    closeBtn: {
        background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`,
        color: C.muted, borderRadius: 8, padding: "6px 12px",
        cursor: "pointer", fontSize: 14, fontWeight: 600,
    },
    body: { display: "flex", gap: 0, flexWrap: "wrap" },
    leftCol: { flex: 1.4, minWidth: 260, padding: "24px 28px", borderRight: `1px solid ${C.border}` },
    rightCol: { flex: 1, minWidth: 200, padding: "24px 28px" },
};

/* ─────────────────────────────────────────────────────────────────────────────
   Main: ResidentApproval page (Section C — Directory + Section B — Detail)
───────────────────────────────────────────────────────────────────────────── */
export default function ResidentApproval() {
    const [residents, setResidents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [societyFilter, setSocietyFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [selected, setSelected] = useState(null);
    const [actioningId, setActioningId] = useState(null);
    const [page, setPage] = useState(1);
    const PER_PAGE = 5;

    const fetchResidents = async () => {
        setLoading(true);
        try {
            const params = {};
            if (search) params.search = search;
            if (statusFilter) params.status = statusFilter;
            const response = await getResidentDirectory(params);
            setResidents(response.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const t = setTimeout(fetchResidents, 350);
        return () => clearTimeout(t);
    }, [search, statusFilter]);

    const handleAction = async (id, newStatus) => {
        setActioningId(id);
        try {
            await approveResident(id, newStatus);
            setResidents(prev =>
                prev.map(r => r.id === id ? { ...r, approval_status: newStatus } : r)
            );
            if (selected?.id === id) setSelected(s => ({ ...s, approval_status: newStatus }));
        } catch (e) {
            console.error(e);
        } finally {
            setActioningId(null);
        }
    };

    // Filter + paginate
    const filtered = residents.filter(r => {
        if (!societyFilter) return true;
        return (r.society_name_actual ?? "").toLowerCase().includes(societyFilter.toLowerCase());
    });
    const societies = [...new Set(residents.map(r => r.society_name_actual).filter(Boolean))];
    const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
    const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

    return (
        <div style={st.page}>
            <GlobalStyles />
            <div className="cc-bg">
                <div className="cc-blob cc-blob-a" />
                <div className="cc-blob cc-blob-b" />
                <div className="cc-grid" />
            </div>

            <div style={st.container}>
                {/* Page heading */}
                <div className="cc-fade-in" style={{ marginBottom: 28 }}>
                    <h1 className="cc-heading" style={{ fontSize: 26, marginBottom: 4 }}>Resident Directory</h1>
                    <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>
                        Section C — Searchable directory · Section B — Approval detail
                    </p>
                </div>

                {/* ── Filters ── */}
                <TiltCard max={2} className="cc-fade-in" style={{ animationDelay: "60ms", marginBottom: 20, padding: 18 }}>
                    <div style={st.filterRow}>
                        <div style={st.searchWrap}>
                            <span style={st.searchIcon}>🔍</span>
                            <input
                                type="text"
                                placeholder="Search residents..."
                                value={search}
                                onChange={e => { setSearch(e.target.value); setPage(1); }}
                                className="cc-input"
                                style={{ paddingLeft: 36 }}
                            />
                        </div>

                        <select
                            value={societyFilter}
                            onChange={e => { setSocietyFilter(e.target.value); setPage(1); }}
                            className="cc-select"
                        >
                            <option value="">All Societies</option>
                            {societies.map(sn => (
                                <option key={sn} value={sn}>{sn}</option>
                            ))}
                        </select>

                        <select
                            value={statusFilter}
                            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                            className="cc-select"
                        >
                            <option value="">All Statuses</option>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                        </select>
                    </div>
                </TiltCard>

                {/* ── Table Header ── */}
                <div style={st.tableHeader}>
                    <span style={{ flex: 2 }}>Name</span>
                    <span style={{ flex: 2.5 }}>Society / Block / Flat</span>
                    <span style={{ flex: 1, textAlign: "center" }}>Status</span>
                    <span style={{ flex: 1.5 }}>Phone</span>
                    <span style={{ flex: 1, textAlign: "right" }}>Action</span>
                </div>

                {/* ── Rows ── */}
                {loading ? (
                    <div style={{ textAlign: "center", padding: 60, color: C.muted }}>Loading residents…</div>
                ) : paginated.length === 0 ? (
                    <div style={{ textAlign: "center", padding: 60, color: C.muted }}>No residents found.</div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {paginated.map((r, idx) => {
                            const name = `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim();
                            const loc = r.flat_number
                                ? `${r.society_name_actual ?? "—"} / ${r.block_name ?? "—"} / ${r.flat_number}`
                                : "No flat mapped";
                            return (
                                <TiltCard
                                    key={r.id}
                                    max={2}
                                    className="cc-fade-in"
                                    style={{ animationDelay: `${80 + idx * 40}ms`, padding: "16px 20px", cursor: "pointer" }}
                                    onClick={() => setSelected(r)}
                                >
                                    <div style={st.row}>
                                        <div style={{ flex: 2 }}>
                                            <p style={st.rowName}>{name}</p>
                                            <p style={st.rowEmail}>{r.email}</p>
                                        </div>
                                        <p style={{ flex: 2.5, ...st.rowMeta }}>{loc}</p>
                                        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
                                            <StatusBadge status={r.approval_status} />
                                        </div>
                                        <p style={{ flex: 1.5, ...st.rowMeta }}>{r.phone_number ?? "—"}</p>
                                        <div style={{ flex: 1, display: "flex", gap: 6, justifyContent: "flex-end" }}>
                                            {r.approval_status !== "approved" && (
                                                <button
                                                    className="cc-action-btn cc-approve-btn"
                                                    disabled={actioningId === r.id}
                                                    onClick={e => { e.stopPropagation(); handleAction(r.id, "approved"); }}
                                                >✓</button>
                                            )}
                                            {r.approval_status !== "rejected" && (
                                                <button
                                                    className="cc-action-btn cc-reject-btn"
                                                    disabled={actioningId === r.id}
                                                    onClick={e => { e.stopPropagation(); handleAction(r.id, "rejected"); }}
                                                >✕</button>
                                            )}
                                        </div>
                                    </div>
                                </TiltCard>
                            );
                        })}
                    </div>
                )}

                {/* ── Pagination ── */}
                {!loading && filtered.length > 0 && (
                    <div style={st.pagRow}>
                        <span style={{ color: C.muted, fontSize: 13 }}>
                            Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length} entries
                        </span>
                        <div style={{ display: "flex", gap: 6 }}>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                <button
                                    key={p}
                                    onClick={() => setPage(p)}
                                    style={{
                                        width: 32, height: 32, borderRadius: 8, border: "none",
                                        background: p === page ? C.accent : "rgba(255,255,255,0.07)",
                                        color: p === page ? "#fff" : C.muted,
                                        cursor: "pointer", fontSize: 13, fontWeight: 600,
                                        transition: "all 0.2s",
                                    }}
                                >{p}</button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Detail Modal (Section B) ── */}
            <ResidentDetailModal
                resident={selected}
                onClose={() => setSelected(null)}
                onAction={handleAction}
                actioning={!!actioningId}
            />
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Global CSS
───────────────────────────────────────────────────────────────────────────── */
function GlobalStyles() {
    return (
        <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');
            :root { --font-display:'Space Grotesk',sans-serif; --font-body:'Inter',sans-serif; }

            .cc-bg { position:fixed; inset:0; overflow:hidden; z-index:0; background:${C.bg}; }
            .cc-grid {
                position:absolute; inset:-1px;
                background-image: linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px);
                background-size:44px 44px;
                -webkit-mask-image: radial-gradient(ellipse 80% 55% at 50% 15%, black 30%, transparent 80%);
                mask-image: radial-gradient(ellipse 80% 55% at 50% 15%, black 30%, transparent 80%);
            }
            .cc-blob { position:absolute; border-radius:50%; filter:blur(100px); opacity:0.3; animation:cc-drift 20s ease-in-out infinite; }
            .cc-blob-a { width:500px; height:500px; top:-180px; left:-140px; background:radial-gradient(circle,${C.accent},transparent 70%); }
            .cc-blob-b { width:540px; height:540px; bottom:-220px; right:-180px; background:radial-gradient(circle,${C.accentAlt},transparent 70%); animation-delay:-10s; }
            @keyframes cc-drift { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(40px,30px) scale(1.06)} }

            @keyframes cc-fade-in { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
            .cc-fade-in { animation:cc-fade-in 0.55s cubic-bezier(0.22,1,0.36,1) both; }

            .cc-tilt { transition:transform 0.3s cubic-bezier(0.22,1,0.36,1); transform-style:preserve-3d; will-change:transform; }

            .cc-card {
                position:relative; background:${C.surface};
                -webkit-backdrop-filter:blur(20px); backdrop-filter:blur(20px);
                border-radius:18px; border:1px solid ${C.border};
                box-shadow:0 20px 50px -20px rgba(0,0,0,0.6); overflow:hidden;
            }
            .cc-card:hover { background:${C.surfaceHover}; }
            .cc-card-glow {
                position:absolute; inset:0; pointer-events:none;
                opacity:var(--glow-o,0); transition:opacity 0.3s ease;
                background:radial-gradient(circle 240px at var(--mx,50%) var(--my,50%),rgba(79,127,255,0.18),transparent 70%);
            }

            .cc-heading { margin:0; font-family:var(--font-display); font-weight:700; color:${C.text}; }

            .cc-input,.cc-select {
                background:rgba(255,255,255,0.04); border:1px solid ${C.border};
                color:${C.text}; padding:11px 16px; border-radius:10px;
                font-family:var(--font-body); font-size:14px; outline:none;
                transition:border-color 0.2s ease;
            }
            .cc-input { width:100%; box-sizing:border-box; }
            .cc-input:focus,.cc-select:focus { border-color:${C.accent}; }
            .cc-input::placeholder { color:${C.muted}; }

            .cc-action-btn {
                border:none; border-radius:8px; padding:7px 14px;
                font-family:var(--font-body); font-weight:600; font-size:12px;
                cursor:pointer; transition:all 0.2s ease;
            }
            .cc-action-btn:disabled { opacity:0.45; cursor:not-allowed; }
            .cc-approve-btn { background:${C.successSoft}; color:${C.success}; border:1px solid rgba(52,211,153,0.35); }
            .cc-approve-btn:hover:not(:disabled) { background:${C.success}; color:#06251c; }
            .cc-reject-btn { background:${C.dangerSoft}; color:${C.danger}; border:1px solid rgba(251,90,106,0.35); }
            .cc-reject-btn:hover:not(:disabled) { background:${C.danger}; color:#fff; }

            @media(max-width:600px) { .cc-row-actions { flex-direction:column; } }
        `}</style>
    );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Inline styles
───────────────────────────────────────────────────────────────────────────── */
const st = {
    page: { minHeight: "100vh", background: C.bg, padding: "36px 24px", fontFamily: "var(--font-body,sans-serif)", position: "relative" },
    container: { maxWidth: 960, margin: "0 auto", position: "relative", zIndex: 1 },
    filterRow: { display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", position: "relative", zIndex: 1 },
    searchWrap: { flex: 1, minWidth: 200, position: "relative" },
    searchIcon: { position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, zIndex: 1 },
    tableHeader: {
        display: "flex", gap: 12, padding: "10px 22px", marginBottom: 6,
        fontSize: 11, fontWeight: 700, color: C.muted,
        letterSpacing: "0.06em", textTransform: "uppercase",
    },
    row: { display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", position: "relative", zIndex: 1 },
    rowName: { margin: 0, fontWeight: 600, fontSize: 15, color: C.text, fontFamily: "var(--font-display,sans-serif)" },
    rowEmail: { margin: "2px 0 0", fontSize: 12, color: C.muted },
    rowMeta: { margin: 0, fontSize: 13, color: C.muted },
    pagRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20, flexWrap: "wrap", gap: 12 },
};