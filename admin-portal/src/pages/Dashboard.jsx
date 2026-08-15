import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getProfile } from "../services/authService";

/* ------------------------------------------------------------------ */
/* Design tokens                                                      */
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
};

function getInitials(user) {
    const first = user?.first_name?.[0] || "";
    const last = user?.last_name?.[0] || "";
    return (first + last).toUpperCase() || "?";
}

/* ------------------------------------------------------------------ */
/* Tilt wrapper — gives any card real, mouse-driven 3D depth           */
/* ------------------------------------------------------------------ */
function TiltCard({ children, className = "", style = {}, max = 10, glow = true, ...rest }) {
    const ref = useRef(null);

    const onMove = (e) => {
        const el = ref.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width;
        const py = (e.clientY - rect.top) / rect.height;
        const rx = (0.5 - py) * max * 2;
        const ry = (px - 0.5) * max * 2;
        el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(6px)`;
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
        <div
            ref={ref}
            onMouseMove={onMove}
            onMouseLeave={onLeave}
            className={`cc-tilt ${className}`}
            style={style}
            {...rest}
        >
            {children}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Dashboard                                                           */
/* ------------------------------------------------------------------ */
function Dashboard() {
    const navigate = useNavigate();
   

    const [user, setUser] = useState(null);
  
    const [loading, setLoading] = useState(true);


  

    useEffect(() => {
       
        const fetchProfile = async () => {
            try {
                const response = await getProfile();
                setUser(response.data);
            } catch (error) {
                console.log(error);
                localStorage.removeItem("access");
                localStorage.removeItem("refresh");
                navigate("/");
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        navigate("/");
    };

    if (loading) {
        return (
            <div style={styles.page}>
                <GlobalStyles />
                <div style={styles.center}>
                    <div className="cc-loader">
                        <div className="cc-loader-cube">
                            <div /><div /><div /><div /><div /><div />
                        </div>
                        <p style={{ color: COLORS.muted, marginTop: 24, fontFamily: "var(--font-display)" }}>
                            Loading dashboard…
                        </p>
                    </div>
                </div>
            </div>
        );


    }

    return (
        <div style={styles.page}>
            <GlobalStyles />

            {/* ambient background */}
            <div className="cc-bg">
                <div className="cc-blob cc-blob-a" />
                <div className="cc-blob cc-blob-b" />
                <div className="cc-grid" />
            </div>

            <div style={styles.container}>
                {/* Top Navbar */}
                <div className="cc-fade-in" style={{ ...styles.navbar, animationDelay: "0ms" }}>
                    <div style={styles.brand}>
                        <div className="cc-logo-cube">
                            <span /><span /><span />
                        </div>
                        <h2 style={styles.brandText}>CareConnect</h2>
                    </div>

                    <button className="cc-logout-btn" onClick={handleLogout}>
                        <span>Logout</span>
                    </button>
                </div>

                {/* Profile Hero Card */}
                <TiltCard
                    className="cc-fade-in cc-card cc-hero-card"
                    max={6}
                    style={{ animationDelay: "80ms" }}
                >
                    <div className="cc-card-glow" />
                    <div style={styles.profileSection}>
                        <div className="cc-avatar-ring">
                            <div className="cc-avatar">{getInitials(user)}</div>
                        </div>

                        <div>
                            <h1 className="cc-heading">
                                Welcome, {user?.first_name}
                            </h1>
                            <p style={styles.subText}>
                                Manage your CareConnect account
                            </p>
                        </div>
                    </div>
                </TiltCard>

                {/* User Details */}
                <TiltCard
                    className="cc-fade-in cc-card"
                    max={3}
                    style={{ animationDelay: "160ms" }}
                >
                    <div className="cc-card-glow" />
                    <h3 style={styles.cardTitle}>Profile Information</h3>

                    <InfoRow label="Full Name" value={`${user?.first_name || ""} ${user?.last_name || ""}`} />
                    <InfoRow label="Email" value={user?.email} />
                    <InfoRow
                        label="Role"
                        value={<span className="cc-role-badge">{user?.role}</span>}
                        last
                    />
                </TiltCard>

                {/* Admin Features */}
                {user?.role === "ADMIN" && (
                    <div className="cc-fade-in" style={{ animationDelay: "240ms" }}>
                        <h3 style={{ ...styles.cardTitle, marginBottom: 16, marginLeft: 4 }}>
                            Admin Panel
                        </h3>

                        <div style={styles.linkGrid}>
                            <BlockLink to="/societies" icon="🏢" label="Society Management" hint="Communities" />
                            <BlockLink to="/blocks" icon="🧱" label="Blocks" hint="Structures" />
                            <BlockLink to="/flats" icon="🔑" label="Flats" hint="Units" />
                            <BlockLink to="/resident-approvals" icon="👥" label="Resident Approvals" hint="Pending" />
                            <BlockLink to="/resident-mapping" icon="🔗" label="Resident Mapping" hint="Manual assign" />
                            <BlockLink to="/notification-templates" icon="📝" label="Notification Templates" hint="Configure" />
                            <BlockLink to="/escalation-config" icon="⏱️" label="Escalation Settings" hint="Response window" />
                            <BlockLink to="/alert-monitoring" icon="📊" label="Alert Monitoring" hint="Live incidents" />
                            <BlockLink to="/reporting-dashboard" icon="📈" label="Reporting Dashboard" hint="Analytics & Export" />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Sub components                                                      */
/* ------------------------------------------------------------------ */
function InfoRow({ label, value, last }) {
    return (
        <div style={{ ...styles.row, borderBottom: last ? "none" : styles.row.borderBottom }}>
            <span style={styles.label}>{label}</span>
            <span style={styles.value}>{value}</span>
        </div>
    );
}

function BlockLink({ to, icon, label, hint }) {
    return (
        <TiltCard max={14} className="cc-block-link-wrap">
            <Link to={to} className="cc-block-link">
                <div className="cc-block-face cc-block-top">
                    <span className="cc-block-icon">{icon}</span>
                </div>
                <div className="cc-block-body">
                    <span className="cc-block-hint">{hint}</span>
                    <span className="cc-block-label">{label}</span>
                </div>
                <div className="cc-block-arrow">→</div>
            </Link>
        </TiltCard>
    );
}

/* ------------------------------------------------------------------ */
/* Global CSS — animation, glass, 3D depth                             */
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
                -webkit-mask-image: radial-gradient(ellipse 80% 60% at 50% 20%, black 30%, transparent 75%);
                mask-image: radial-gradient(ellipse 80% 60% at 50% 20%, black 30%, transparent 75%);
            }
            .cc-blob {
                position: absolute;
                border-radius: 50%;
                filter: blur(90px);
                opacity: 0.35;
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
            .cc-fade-in {
                animation: cc-fade-in 0.6s cubic-bezier(0.22,1,0.36,1) both;
            }

            .cc-tilt {
                transition: transform 0.35s cubic-bezier(0.22,1,0.36,1);
                transform-style: preserve-3d;
                will-change: transform;
            }

            .cc-card {
                position: relative;
                background: ${COLORS.surface};
                -webkit-backdrop-filter: blur(18px);
                backdrop-filter: blur(18px);
                padding: 26px;
                border-radius: 20px;
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
            .cc-hero-card { padding: 32px; }

            .cc-avatar-ring {
                width: 84px; height: 84px;
                border-radius: 50%;
                padding: 4px;
                background: conic-gradient(from 0deg, ${COLORS.accent}, ${COLORS.accent2}, ${COLORS.accent});
                animation: cc-spin 6s linear infinite;
                display: flex; align-items: center; justify-content: center;
                flex-shrink: 0;
            }
            @keyframes cc-spin { to { transform: rotate(360deg); } }
            .cc-avatar {
                width: 100%; height: 100%;
                border-radius: 50%;
                background: #12172a;
                color: ${COLORS.accent};
                display: flex; align-items: center; justify-content: center;
                font-family: var(--font-display);
                font-size: 26px; font-weight: 700;
                animation: cc-spin-reverse 6s linear infinite;
            }
            @keyframes cc-spin-reverse { to { transform: rotate(-360deg); } }

            .cc-heading {
                margin: 0;
                font-family: var(--font-display);
                font-weight: 700;
                font-size: 26px;
                letter-spacing: -0.01em;
                color: ${COLORS.text};
            }

            .cc-role-badge {
                background: ${COLORS.accentSoft};
                color: ${COLORS.accent};
                padding: 5px 14px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 700;
                letter-spacing: 0.04em;
                border: 1px solid rgba(245,165,36,0.3);
            }

            .cc-logout-btn {
                position: relative;
                background: rgba(251,90,106,0.12);
                color: ${COLORS.danger};
                border: 1px solid rgba(251,90,106,0.35);
                padding: 10px 20px;
                border-radius: 10px;
                cursor: pointer;
                font-family: var(--font-body);
                font-weight: 600;
                font-size: 14px;
                transition: all 0.25s ease;
            }
            .cc-logout-btn:hover {
                background: ${COLORS.danger};
                color: #fff;
                box-shadow: 0 8px 24px -6px rgba(251,90,106,0.6);
                transform: translateY(-2px);
            }

            .cc-logo-cube {
                width: 30px; height: 30px;
                position: relative;
                display: flex; align-items: center; justify-content: center;
                flex-shrink: 0;
            }
            .cc-logo-cube span {
                position: absolute;
                border-radius: 4px;
            }
            .cc-logo-cube span:nth-child(1) {
                width: 22px; height: 22px;
                background: linear-gradient(135deg, ${COLORS.accent}, #ffcf7a);
                top: 0; left: 4px;
                animation: cc-cube-float 3s ease-in-out infinite;
            }
            .cc-logo-cube span:nth-child(2) {
                width: 22px; height: 22px;
                background: linear-gradient(135deg, ${COLORS.accent2}, #7ee8f5);
                bottom: 0; left: 0;
                opacity: 0.85;
                animation: cc-cube-float 3s ease-in-out infinite 0.5s;
            }
            .cc-logo-cube span:nth-child(3) {
                width: 22px; height: 22px;
                background: linear-gradient(135deg, #c084fc, #e9d5ff);
                bottom: 0; right: 0;
                opacity: 0.7;
                animation: cc-cube-float 3s ease-in-out infinite 1s;
            }
            @keyframes cc-cube-float {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-4px); }
            }

            .cc-brand-text, .brandText {}

            .cc-row, .row {}

            .cc-block-link-wrap { text-decoration: none; }
            .cc-block-link {
                position: relative;
                display: flex;
                flex-direction: column;
                gap: 10px;
                text-decoration: none;
                padding: 20px;
                min-height: 140px;
                border-radius: 18px;
                background: linear-gradient(160deg, ${COLORS.surfaceStrong}, ${COLORS.surface});
                border: 1px solid ${COLORS.border};
                box-shadow: 0 16px 34px -18px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06);
                transition: border-color 0.25s ease, box-shadow 0.25s ease;
            }
            .cc-block-link-wrap:hover .cc-block-link {
                border-color: rgba(245,165,36,0.4);
                box-shadow: 0 22px 44px -16px rgba(245,165,36,0.25), inset 0 1px 0 rgba(255,255,255,0.1);
            }
            .cc-block-icon {
                font-size: 26px;
                filter: drop-shadow(0 6px 10px rgba(0,0,0,0.4));
            }
            .cc-block-body {
                display: flex;
                flex-direction: column;
                gap: 2px;
                margin-top: auto;
            }
            .cc-block-hint {
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 0.08em;
                color: ${COLORS.muted};
                font-weight: 600;
            }
            .cc-block-label {
                font-family: var(--font-display);
                font-size: 17px;
                font-weight: 600;
                color: ${COLORS.text};
            }
            .cc-block-arrow {
                position: absolute;
                top: 18px; right: 18px;
                color: ${COLORS.accent};
                font-size: 18px;
                opacity: 0;
                transform: translateX(-6px);
                transition: all 0.25s ease;
            }
            .cc-block-link-wrap:hover .cc-block-arrow {
                opacity: 1;
                transform: translateX(0);
            }

            .cc-loader { display: flex; flex-direction: column; align-items: center; }
            .cc-loader-cube {
                position: relative;
                width: 60px; height: 60px;
                transform: rotateX(-30deg) rotateY(45deg);
                transform-style: preserve-3d;
                animation: cc-loader-spin 2.4s linear infinite;
            }
            .cc-loader-cube div {
                position: absolute;
                width: 60px; height: 60px;
                border: 2px solid ${COLORS.accent};
                background: rgba(245,165,36,0.08);
            }
            .cc-loader-cube div:nth-child(1) { transform: translateZ(30px); }
            .cc-loader-cube div:nth-child(2) { transform: rotateY(180deg) translateZ(30px); }
            .cc-loader-cube div:nth-child(3) { transform: rotateY(90deg) translateZ(30px); }
            .cc-loader-cube div:nth-child(4) { transform: rotateY(-90deg) translateZ(30px); }
            .cc-loader-cube div:nth-child(5) { transform: rotateX(90deg) translateZ(30px); }
            .cc-loader-cube div:nth-child(6) { transform: rotateX(-90deg) translateZ(30px); }
            @keyframes cc-loader-spin {
                from { transform: rotateX(-30deg) rotateY(0deg); }
                to { transform: rotateX(-30deg) rotateY(360deg); }
            }

            @media (prefers-reduced-motion: reduce) {
                .cc-fade-in, .cc-blob, .cc-avatar-ring, .cc-avatar, .cc-logo-cube span, .cc-loader-cube {
                    animation: none !important;
                }
                .cc-tilt { transition: none !important; }
            }
        `}</style>
    );
}

/* ------------------------------------------------------------------ */
/* Inline styles (layout only — visual language lives in GlobalStyles) */
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
        maxWidth: "900px",
        margin: "0 auto",
        position: "relative",
        zIndex: 1,
    },

    navbar: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "28px",
    },

    brand: {
        display: "flex",
        alignItems: "center",
        gap: "12px",
    },

    brandText: {
        margin: 0,
        fontFamily: "var(--font-display)",
        fontWeight: 700,
        fontSize: "20px",
        color: COLORS.text,
        letterSpacing: "-0.01em",
    },

    profileSection: {
        display: "flex",
        alignItems: "center",
        gap: "22px",
        position: "relative",
        zIndex: 1,
    },

    subText: {
        color: COLORS.muted,
        marginTop: "6px",
        fontSize: "14px",
    },

    cardTitle: {
        margin: "0 0 6px 0",
        fontFamily: "var(--font-display)",
        fontWeight: 600,
        fontSize: "16px",
        color: COLORS.text,
        position: "relative",
        zIndex: 1,
    },

    row: {
        display: "flex",
        justifyContent: "space-between",
        padding: "14px 0",
        borderBottom: `1px solid ${COLORS.border}`,
        position: "relative",
        zIndex: 1,
    },

    label: {
        color: COLORS.muted,
        fontWeight: 500,
        fontSize: "14px",
    },

    value: {
        color: COLORS.text,
        fontWeight: 600,
        fontSize: "14px",
    },

    linkGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
        gap: "16px",
    },

    center: {
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
        zIndex: 1,
    },
};

export default Dashboard;