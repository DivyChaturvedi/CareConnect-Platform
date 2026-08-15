import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../services/authService";

/* ------------------------------------------------------------------ */
/* Design tokens — shared language with Dashboard.jsx                  */
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

function Login() {
    const navigate = useNavigate();
    const cardRef = useRef(null);

    const [formData, setFormData] = useState({ email: "", password: "" });
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (errorMessage) setErrorMessage("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage("");
        setIsSubmitting(true);

        try {
            const response = await login(formData);
            localStorage.setItem("access", response.data.access);
            localStorage.setItem("refresh", response.data.refresh);
            navigate("/dashboard");
        } catch (error) {
            const serverMessage = error.response?.data?.detail;
            setErrorMessage(serverMessage || "Incorrect email or password. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    /* subtle 3D tilt on the whole auth card, mouse-driven */
    const onCardMove = (e) => {
        const el = cardRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width;
        const py = (e.clientY - rect.top) / rect.height;
        const rx = (0.5 - py) * 5;
        const ry = (px - 0.5) * 5;
        el.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(0)`;
        el.style.setProperty("--mx", `${px * 100}%`);
        el.style.setProperty("--my", `${py * 100}%`);
        el.style.setProperty("--glow-o", "1");
    };
    const onCardLeave = () => {
        const el = cardRef.current;
        if (!el) return;
        el.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg)";
        el.style.setProperty("--glow-o", "0");
    };

    return (
        <div style={styles.page}>
            <GlobalStyles />

            <div className="cc-bg">
                <div className="cc-blob cc-blob-a" />
                <div className="cc-blob cc-blob-b" />
                <div className="cc-grid" />
            </div>

            <div
                ref={cardRef}
                onMouseMove={onCardMove}
                onMouseLeave={onCardLeave}
                className="cc-tilt cc-auth-card cc-fade-in"
            >
                <div className="cc-card-glow" />

                {/* Logo mark + brand */}
                <div className="cc-brand-row">
                    <div className="cc-logo-mark">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                            <path
                                d="M12 2L2 7v6c0 5 4 9.5 10 11 6-1.5 10-6 10-11V7l-10-5z"
                                stroke="#0a0e1a"
                                strokeWidth="1.8"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </div>
                    <span className="cc-brand-text">CareConnect</span>
                </div>

                <h1 className="cc-heading">Sign in to your account</h1>
                <p style={styles.subText}>Enter your credentials to continue</p>

                {errorMessage && (
                    <div role="alert" className="cc-error">
                        {errorMessage}
                    </div>
                )}

                <form onSubmit={handleSubmit} noValidate style={{ position: "relative", zIndex: 1 }}>
                    <div style={{ marginBottom: "18px" }}>
                        <label htmlFor="email" className="cc-label">
                            Email address
                        </label>
                        <input
                            id="email"
                            type="email"
                            name="email"
                            autoComplete="email"
                            placeholder="you@company.com"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            className="cc-input"
                        />
                    </div>

                    <div style={{ marginBottom: "8px" }}>
                        <label htmlFor="password" className="cc-label">
                            Password
                        </label>
                        <div style={{ position: "relative" }}>
                            <input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                name="password"
                                autoComplete="current-password"
                                placeholder="Enter your password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                className="cc-input"
                                style={{ paddingRight: "48px" }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((v) => !v)}
                                aria-label={showPassword ? "Hide password" : "Show password"}
                                className="cc-show-btn"
                            >
                                {showPassword ? "Hide" : "Show"}
                            </button>
                        </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "22px" }}>
                        <span onClick={() => navigate("/forgot-password")} className="cc-link-text">
                            Forgot password?
                        </span>
                    </div>

                    <button type="submit" disabled={isSubmitting} className="cc-submit-btn">
                        {isSubmitting && <span className="cc-spinner" />}
                        {isSubmitting ? "Signing in..." : "Sign in"}
                    </button>
                </form>

                <p style={styles.footerText}>
                    Don't have an account?{" "}
                    <span onClick={() => navigate("/register")} className="cc-link-text cc-link-strong">
                        Create one
                    </span>
                </p>
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
                -webkit-mask-image: radial-gradient(ellipse 70% 60% at 50% 40%, black 30%, transparent 75%);
                mask-image: radial-gradient(ellipse 70% 60% at 50% 40%, black 30%, transparent 75%);
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
                top: -160px; left: -140px;
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
                from { opacity: 0; transform: translateY(22px) scale(0.98); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }
            .cc-fade-in {
                animation: cc-fade-in 0.65s cubic-bezier(0.22,1,0.36,1) both;
            }

            .cc-tilt {
                transition: transform 0.35s cubic-bezier(0.22,1,0.36,1);
                transform-style: preserve-3d;
                will-change: transform;
            }

            .cc-auth-card {
                position: relative;
                width: 100%;
                max-width: 400px;
                margin: 24px;
                background: ${COLORS.surface};
                -webkit-backdrop-filter: blur(20px);
                backdrop-filter: blur(20px);
                border: 1px solid ${COLORS.border};
                border-radius: 22px;
                padding: 40px 36px;
                box-shadow: 0 30px 60px -20px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06);
                z-index: 1;
                overflow: hidden;
            }
            .cc-card-glow {
                position: absolute;
                inset: 0;
                pointer-events: none;
                opacity: var(--glow-o, 0);
                transition: opacity 0.3s ease;
                background: radial-gradient(circle 260px at var(--mx,50%) var(--my,50%), rgba(245,165,36,0.14), transparent 70%);
            }

            .cc-brand-row {
                position: relative;
                z-index: 1;
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 24px;
            }
            .cc-logo-mark {
                width: 46px; height: 46px;
                border-radius: 12px;
                background: linear-gradient(135deg, ${COLORS.accent}, #ffcf7a);
                display: flex; align-items: center; justify-content: center;
                flex-shrink: 0;
                box-shadow: 0 10px 24px -8px rgba(245,165,36,0.6);
                animation: cc-logo-float 3.5s ease-in-out infinite;
            }
            .cc-brand-text {
                font-family: var(--font-display);
                font-weight: 700;
                font-size: 20px;
                letter-spacing: -0.01em;
                color: ${COLORS.text};
            }
            @keyframes cc-logo-float {
                0%, 100% { transform: translateY(0) rotate(0deg); }
                50% { transform: translateY(-5px) rotate(-4deg); }
            }

            .cc-heading {
                position: relative;
                z-index: 1;
                font-family: var(--font-display);
                font-size: 25px;
                font-weight: 700;
                color: ${COLORS.text};
                margin: 0;
                letter-spacing: -0.01em;
            }

            .cc-error {
                position: relative;
                z-index: 1;
                background: ${COLORS.dangerBg};
                border: 1px solid rgba(251,90,106,0.35);
                color: ${COLORS.danger};
                font-size: 13px;
                padding: 10px 14px;
                border-radius: 10px;
                margin-bottom: 20px;
                animation: cc-shake 0.4s ease;
            }
            @keyframes cc-shake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-4px); }
                75% { transform: translateX(4px); }
            }

            .cc-label {
                position: relative;
                z-index: 1;
                display: block;
                margin-bottom: 7px;
                font-size: 13px;
                font-weight: 600;
                color: ${COLORS.muted};
            }

            .cc-input {
                position: relative;
                z-index: 1;
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

            .cc-show-btn {
                position: absolute;
                z-index: 2;
                right: 12px; top: 50%;
                transform: translateY(-50%);
                background: none;
                border: none;
                cursor: pointer;
                color: ${COLORS.accent};
                font-size: 12px;
                font-weight: 700;
                padding: 4px;
                letter-spacing: 0.02em;
            }

            .cc-link-text {
                position: relative;
                z-index: 1;
                font-size: 13px;
                color: ${COLORS.accent2};
                cursor: pointer;
                font-weight: 500;
                transition: color 0.2s ease;
            }
            .cc-link-text:hover { color: #7ee8f5; }
            .cc-link-strong { font-weight: 700; }

            .cc-submit-btn {
                position: relative;
                z-index: 1;
                width: 100%;
                padding: 13px;
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
            .cc-submit-btn:active:not(:disabled) { transform: translateY(0); }
            .cc-submit-btn:disabled { opacity: 0.75; cursor: not-allowed; }

            .cc-spinner {
                width: 14px; height: 14px;
                border: 2px solid rgba(26,18,0,0.35);
                border-top-color: #1a1200;
                border-radius: 50%;
                display: inline-block;
                animation: cc-spin 0.7s linear infinite;
            }
            @keyframes cc-spin { to { transform: rotate(360deg); } }

            @media (prefers-reduced-motion: reduce) {
                .cc-fade-in, .cc-blob, .cc-logo-mark, .cc-error { animation: none !important; }
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
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
        fontFamily: "var(--font-body), sans-serif",
    },
    subText: {
        position: "relative",
        zIndex: 1,
        fontSize: "14px",
        color: COLORS.muted,
        marginTop: "6px",
        marginBottom: "28px",
    },
    footerText: {
        position: "relative",
        zIndex: 1,
        marginTop: "24px",
        textAlign: "center",
        fontSize: "14px",
        color: COLORS.muted,
    },
};

export default Login;