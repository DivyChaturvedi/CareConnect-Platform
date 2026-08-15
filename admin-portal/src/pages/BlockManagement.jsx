import { useEffect, useRef, useState } from "react";
import { getBlocks, createBlock, deleteBlock } from "../services/blockService";
import { getSocieties } from "../services/societyService";

/* ------------------------------------------------------------------ */
/* Design tokens — shared language with Dashboard.jsx / Login.jsx      */
/* ------------------------------------------------------------------ */
const COLORS = {
    bg: "#0a0e1a",
    surface: "rgba(255,255,255,0.045)",
    surfaceStrong: "rgba(255,255,255,0.07)",
    border: "rgba(255,255,255,0.09)",
    text: "#eef2ff",
    muted: "#8b96b3",
    accent: "#f5a524",
    accentSoft: "rgba(245,165,36,0.16)",
    accent2: "#22d3ee",
    danger: "#fb5a6a",
    dangerBg: "rgba(251,90,106,0.1)",
};

/* ------------------------------------------------------------------ */
/* Tilt wrapper — mouse-driven 3D depth                                */
/* ------------------------------------------------------------------ */
function TiltCard({ children, className = "", style = {}, max = 8, ...rest }) {
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
        el.style.setProperty("--mx", `${px * 100}%`);
        el.style.setProperty("--my", `${py * 100}%`);
        el.style.setProperty("--glow-o", "1");
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

function BlockManagement() {
    const [blocks, setBlocks] = useState([]);
    const [societies, setSocieties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    const [formData, setFormData] = useState({
        society: "",
        name: "",
    });

    useEffect(() => {
        Promise.all([fetchBlocks(), fetchSocieties()]).finally(() => setLoading(false));
    }, []);

    const fetchBlocks = async () => {
        const response = await getBlocks();
        setBlocks(response.data);
    };

    const fetchSocieties = async () => {
        const response = await getSocieties();
        setSocieties(response.data);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            await createBlock(formData);
            setFormData({ society: "", name: "" });
            await fetchBlocks();
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        setDeletingId(id);
        try {
            await deleteBlock(id);
            await fetchBlocks();
        } finally {
            setDeletingId(null);
        }
    };

    const societyName = (id) => societies.find((s) => String(s.id) === String(id))?.name;

    return (
        <div style={styles.page}>
            <GlobalStyles />

            <div className="cc-bg">
                <div className="cc-blob cc-blob-a" />
                <div className="cc-blob cc-blob-b" />
                <div className="cc-grid" />
            </div>

            <div style={styles.container}>
                {/* Header */}
                <div className="cc-fade-in" style={{ ...styles.header, animationDelay: "0ms" }}>
                    <div className="cc-header-icon">🧱</div>
                    <div>
                        <h1 className="cc-heading">Block Management</h1>
                        <p style={styles.subText}>Add and manage towers within your societies</p>
                    </div>
                </div>

                {/* Create form */}
                <TiltCard max={3} className="cc-fade-in cc-card" style={{ animationDelay: "80ms" }}>
                    <div className="cc-card-glow" />
                    <h3 style={styles.cardTitle}>New Block</h3>

                    <form onSubmit={handleSubmit} style={{ position: "relative", zIndex: 1 }}>
                        <div style={styles.formRow}>
                            <div style={{ flex: 1 }}>
                                <label className="cc-label">Society</label>
                                <select
                                    className="cc-input cc-select"
                                    value={formData.society}
                                    onChange={(e) => setFormData({ ...formData, society: e.target.value })}
                                    required
                                >
                                    <option value="" disabled>
                                        Select society
                                    </option>
                                    {societies.map((society) => (
                                        <option key={society.id} value={society.id}>
                                            {society.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ flex: 1 }}>
                                <label className="cc-label">Tower name</label>
                                <input
                                    type="text"
                                    className="cc-input"
                                    placeholder="e.g. Tower A"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <button type="submit" disabled={submitting} className="cc-submit-btn">
                            {submitting && <span className="cc-spinner" />}
                            {submitting ? "Creating..." : "Create Block"}
                        </button>
                    </form>
                </TiltCard>

                {/* Block list */}
                <div className="cc-fade-in" style={{ animationDelay: "160ms" }}>
                    <h3 style={{ ...styles.cardTitle, margin: "8px 4px 14px" }}>
                        Existing Blocks {!loading && <span className="cc-count-badge">{blocks.length}</span>}
                    </h3>

                    {loading ? (
                        <div style={styles.skeletonGrid}>
                            {[0, 1, 2].map((i) => (
                                <div key={i} className="cc-skeleton" style={{ animationDelay: `${i * 100}ms` }} />
                            ))}
                        </div>
                    ) : blocks.length === 0 ? (
                        <div className="cc-card cc-empty">
                            <div className="cc-card-glow" />
                            <span style={{ fontSize: "28px" }}>🏗️</span>
                            <p style={{ color: COLORS.muted, margin: "10px 0 0", position: "relative", zIndex: 1 }}>
                                No blocks yet — create one above to get started.
                            </p>
                        </div>
                    ) : (
                        <div style={styles.blockGrid}>
                            {blocks.map((block, i) => (
                                <TiltCard
                                    key={block.id}
                                    max={10}
                                    className={`cc-card cc-block-card ${deletingId === block.id ? "cc-block-removing" : ""}`}
                                    style={{ animationDelay: `${200 + i * 60}ms` }}
                                >
                                    <div className="cc-card-glow" />
                                    <div className="cc-block-icon-badge">🧱</div>
                                    <div style={{ flex: 1, position: "relative", zIndex: 1 }}>
                                        <h3 className="cc-block-name">{block.name}</h3>
                                        {societyName(block.society) && (
                                            <p className="cc-block-society">{societyName(block.society)}</p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleDelete(block.id)}
                                        disabled={deletingId === block.id}
                                        className="cc-delete-btn"
                                        aria-label={`Delete ${block.name}`}
                                    >
                                        {deletingId === block.id ? <span className="cc-spinner cc-spinner-danger" /> : "Delete"}
                                    </button>
                                </TiltCard>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Global CSS                                                          */
/* ------------------------------------------------------------------ */
function GlobalStyles() {
    return (
        <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');

            :root {
                --font-display: 'Space Grotesk', sans-serif;
                --font-body: 'Inter', sans-serif;
            }

            .cc-bg {
                position: fixed;
                inset: 0;
                overflow: hidden;
                z-index: 0;
                background: ${COLORS.bg};
            }
            .cc-grid {
                position: absolute;
                inset: -1px;
                background-image:
                    linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px);
                background-size: 42px 42px;
                mask-image: radial-gradient(ellipse 80% 60% at 50% 20%, black 30%, transparent 75%);
            }
            .cc-blob {
                position: absolute;
                border-radius: 50%;
                filter: blur(90px);
                opacity: 0.32;
                animation: cc-drift 18s ease-in-out infinite;
            }
            .cc-blob-a {
                width: 480px; height: 480px;
                top: -160px; left: -120px;
                background: radial-gradient(circle, ${COLORS.accent}, transparent 70%);
            }
            .cc-blob-b {
                width: 520px; height: 520px;
                bottom: -200px; right: -160px;
                background: radial-gradient(circle, ${COLORS.accent2}, transparent 70%);
                animation-delay: -9s;
            }
            @keyframes cc-drift {
                0%, 100% { transform: translate(0,0) scale(1); }
                50% { transform: translate(40px,30px) scale(1.08); }
            }

            @keyframes cc-fade-in {
                from { opacity: 0; transform: translateY(18px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .cc-fade-in { animation: cc-fade-in 0.6s cubic-bezier(0.22,1,0.36,1) both; }

            .cc-tilt {
                transition: transform 0.35s cubic-bezier(0.22,1,0.36,1);
                transform-style: preserve-3d;
                will-change: transform;
            }

            .cc-card {
                position: relative;
                background: ${COLORS.surface};
                backdrop-filter: blur(18px);
                -webkit-backdrop-filter: blur(18px);
                padding: 24px;
                border-radius: 18px;
                border: 1px solid ${COLORS.border};
                margin-bottom: 20px;
                box-shadow: 0 20px 45px -20px rgba(0,0,0,0.55);
                overflow: hidden;
            }
            .cc-card-glow {
                position: absolute;
                inset: 0;
                pointer-events: none;
                opacity: var(--glow-o, 0);
                transition: opacity 0.3s ease;
                background: radial-gradient(circle 220px at var(--mx,50%) var(--my,50%), rgba(245,165,36,0.16), transparent 70%);
            }

            .cc-header-icon {
                width: 52px; height: 52px;
                border-radius: 14px;
                background: linear-gradient(135deg, ${COLORS.accent}, #ffcf7a);
                display: flex; align-items: center; justify-content: center;
                font-size: 24px;
                box-shadow: 0 10px 24px -8px rgba(245,165,36,0.55);
                animation: cc-bob 3.5s ease-in-out infinite;
                flex-shrink: 0;
            }
            @keyframes cc-bob {
                0%, 100% { transform: translateY(0) rotate(0deg); }
                50% { transform: translateY(-5px) rotate(-4deg); }
            }

            .cc-heading {
                margin: 0;
                font-family: var(--font-display);
                font-weight: 700;
                font-size: 24px;
                letter-spacing: -0.01em;
                color: ${COLORS.text};
            }

            .cc-label {
                display: block;
                margin-bottom: 7px;
                font-size: 13px;
                font-weight: 600;
                color: ${COLORS.muted};
            }

            .cc-input {
                width: 100%;
                padding: 12px 14px;
                background: rgba(255,255,255,0.04);
                border: 1px solid ${COLORS.border};
                border-radius: 10px;
                outline: none;
                font-size: 14px;
                font-family: var(--font-body);
                color: ${COLORS.text};
                box-sizing: border-box;
                transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
            }
            .cc-input::placeholder { color: rgba(139,150,179,0.6); }
            .cc-input:focus {
                border-color: ${COLORS.accent};
                background: rgba(245,165,36,0.06);
                box-shadow: 0 0 0 3px rgba(245,165,36,0.18);
            }
            .cc-select {
                appearance: none;
                -webkit-appearance: none;
                background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6'><path d='M0 0L5 6L10 0' fill='none' stroke='%238b96b3' stroke-width='1.5'/></svg>");
                background-repeat: no-repeat;
                background-position: right 14px center;
            }
            .cc-select option {
                background: #12172a;
                color: ${COLORS.text};
            }

            .cc-submit-btn {
                margin-top: 20px;
                padding: 12px 24px;
                background: linear-gradient(135deg, ${COLORS.accent}, #e0910f);
                color: #1a1200;
                border: none;
                border-radius: 10px;
                font-size: 14px;
                font-weight: 700;
                font-family: var(--font-body);
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                box-shadow: 0 10px 26px -10px rgba(245,165,36,0.7);
                transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
            }
            .cc-submit-btn:hover:not(:disabled) {
                transform: translateY(-2px);
                box-shadow: 0 16px 34px -10px rgba(245,165,36,0.85);
            }
            .cc-submit-btn:disabled { opacity: 0.75; cursor: not-allowed; }

            .cc-spinner {
                width: 14px; height: 14px;
                border: 2px solid rgba(26,18,0,0.35);
                border-top-color: #1a1200;
                border-radius: 50%;
                display: inline-block;
                animation: cc-spin 0.7s linear infinite;
            }
            .cc-spinner-danger {
                border: 2px solid rgba(251,90,106,0.35);
                border-top-color: ${COLORS.danger};
            }
            @keyframes cc-spin { to { transform: rotate(360deg); } }

            .cc-count-badge {
                display: inline-block;
                margin-left: 8px;
                background: ${COLORS.accentSoft};
                color: ${COLORS.accent};
                font-size: 12px;
                font-weight: 700;
                padding: 2px 9px;
                border-radius: 20px;
                vertical-align: middle;
            }

            .cc-block-card {
                display: flex;
                align-items: center;
                gap: 16px;
                margin-bottom: 0;
                transition: transform 0.35s cubic-bezier(0.22,1,0.36,1), opacity 0.3s ease, max-height 0.3s ease;
            }
            .cc-block-removing {
                opacity: 0.4;
                filter: grayscale(0.6);
            }
            .cc-block-icon-badge {
                width: 44px; height: 44px;
                flex-shrink: 0;
                border-radius: 12px;
                background: linear-gradient(160deg, ${COLORS.surfaceStrong}, ${COLORS.surface});
                border: 1px solid ${COLORS.border};
                display: flex; align-items: center; justify-content: center;
                font-size: 20px;
                position: relative;
                z-index: 1;
            }
            .cc-block-name {
                margin: 0;
                font-family: var(--font-display);
                font-weight: 600;
                font-size: 17px;
                color: ${COLORS.text};
            }
            .cc-block-society {
                margin: 2px 0 0;
                font-size: 12px;
                color: ${COLORS.muted};
                text-transform: uppercase;
                letter-spacing: 0.05em;
            }

            .cc-delete-btn {
                position: relative;
                z-index: 1;
                background: rgba(251,90,106,0.12);
                color: ${COLORS.danger};
                border: 1px solid rgba(251,90,106,0.3);
                padding: 9px 16px;
                border-radius: 9px;
                cursor: pointer;
                font-family: var(--font-body);
                font-weight: 600;
                font-size: 13px;
                min-width: 78px;
                transition: all 0.2s ease;
            }
            .cc-delete-btn:hover:not(:disabled) {
                background: ${COLORS.danger};
                color: #fff;
                box-shadow: 0 8px 20px -8px rgba(251,90,106,0.6);
            }
            .cc-delete-btn:disabled { cursor: not-allowed; opacity: 0.7; }

            .cc-empty {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                text-align: center;
                padding: 44px 24px;
            }

            .cc-skeleton {
                height: 76px;
                border-radius: 18px;
                background: linear-gradient(90deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 100%);
                background-size: 200% 100%;
                border: 1px solid ${COLORS.border};
                animation: cc-shimmer 1.6s ease-in-out infinite;
            }
            @keyframes cc-shimmer {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
            }

            @media (prefers-reduced-motion: reduce) {
                .cc-fade-in, .cc-blob, .cc-header-icon, .cc-skeleton { animation: none !important; }
                .cc-tilt { transition: none !important; }
            }
        `}</style>
    );
}

/* ------------------------------------------------------------------ */
/* Layout-only inline styles                                           */
/* ------------------------------------------------------------------ */
const styles = {
    page: {
        minHeight: "100vh",
        background: COLORS.bg,
        padding: "36px 24px",
        fontFamily: "var(--font-body), sans-serif",
        position: "relative",
    },
    container: {
        maxWidth: "760px",
        margin: "0 auto",
        position: "relative",
        zIndex: 1,
    },
    header: {
        display: "flex",
        alignItems: "center",
        gap: "18px",
        marginBottom: "28px",
    },
    subText: {
        color: COLORS.muted,
        marginTop: "6px",
        fontSize: "14px",
    },
    cardTitle: {
        margin: "0 0 16px 0",
        fontFamily: "var(--font-display)",
        fontWeight: 600,
        fontSize: "16px",
        color: COLORS.text,
        position: "relative",
        zIndex: 1,
    },
    formRow: {
        display: "flex",
        gap: "16px",
        flexWrap: "wrap",
        marginBottom: "4px",
    },
    blockGrid: {
        display: "flex",
        flexDirection: "column",
        gap: "14px",
    },
    skeletonGrid: {
        display: "flex",
        flexDirection: "column",
        gap: "14px",
    },
};

export default BlockManagement;