import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../services/authService";
import "./Register.css";

function Register() {
    const navigate = useNavigate();
    const cardRef = useRef(null);

    const [formData, setFormData] = useState({
        first_name: "",
        last_name: "",
        email: "",
        phone_number: "",
        role: "RESIDENT",
        password: "",
    });
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
        if (errorMessage) setErrorMessage("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage("");
        setIsSubmitting(true);

        try {
            await register(formData);
            navigate("/");
        } catch (error) {
            setErrorMessage(
                error.response?.data?.detail ||
                "Registration failed. Please check your details and try again."
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    /* subtle 3D tilt on the whole card, mouse-driven — same mechanic as Login */
    const onCardMove = (e) => {
        const el = cardRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width;
        const py = (e.clientY - rect.top) / rect.height;
        const rx = (0.5 - py) * 4;
        const ry = (px - 0.5) * 4;
        el.style.transform = `perspective(1100px) rotateX(${rx}deg) rotateY(${ry}deg)`;
        el.style.setProperty("--mx", `${px * 100}%`);
        el.style.setProperty("--my", `${py * 100}%`);
        el.style.setProperty("--glow-o", "1");
    };
    const onCardLeave = () => {
        const el = cardRef.current;
        if (!el) return;
        el.style.transform = "perspective(1100px) rotateX(0deg) rotateY(0deg)";
        el.style.setProperty("--glow-o", "0");
    };

    return (
        <div className="register-page">
            <div className="cc-bg">
                <div className="cc-blob cc-blob-a" />
                <div className="cc-blob cc-blob-b" />
                <div className="cc-grid" />
            </div>

            <div
                ref={cardRef}
                onMouseMove={onCardMove}
                onMouseLeave={onCardLeave}
                className="register-card cc-fade-in cc-tilt"
            >
                <div className="cc-card-glow" />

                <div className="register-brand-row">
                    <div className="register-logo">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                            <path
                                d="M12 2L2 7v6c0 5 4 9.5 10 11 6-1.5 10-6 10-11V7l-10-5z"
                                stroke="#0a0e1a"
                                strokeWidth="1.8"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </div>
                    <span className="register-brand-text">CareConnect</span>
                </div>

                <h1>Create your account</h1>
                <p className="subtitle">Join our community platform</p>

                {errorMessage && (
                    <div className="form-error" role="alert">
                        {errorMessage}
                    </div>
                )}

                <form onSubmit={handleSubmit} noValidate>
                    <div className="input-row">
                        <div className="input-group">
                            <label htmlFor="first_name">First name</label>
                            <input
                                id="first_name"
                                type="text"
                                name="first_name"
                                autoComplete="given-name"
                                placeholder="Jane"
                                value={formData.first_name}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="input-group">
                            <label htmlFor="last_name">Last name</label>
                            <input
                                id="last_name"
                                type="text"
                                name="last_name"
                                autoComplete="family-name"
                                placeholder="Doe"
                                value={formData.last_name}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div className="input-group">
                        <label htmlFor="email">Email address</label>
                        <input
                            id="email"
                            type="email"
                            name="email"
                            autoComplete="email"
                            placeholder="you@company.com"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="input-group">
                        <label htmlFor="phone_number">Phone number</label>
                        <input
                            id="phone_number"
                            type="tel"
                            name="phone_number"
                            autoComplete="tel"
                            placeholder="+1 (555) 000-0000"
                            value={formData.phone_number}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="input-group">
                        <label htmlFor="role">Role</label>
                        <select
                            id="role"
                            name="role"
                            value={formData.role}
                            onChange={handleChange}
                        >
                            <option value="RESIDENT">Resident</option>
                            <option value="GUARDIAN">Guardian</option>
                            <option value="VOLUNTEER">Volunteer</option>
                            <option value="SECURITY">Security</option>
                        </select>
                    </div>

                    <div className="input-group">
                        <label htmlFor="password">Password</label>
                        <div className="password-field">
                            <input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                name="password"
                                autoComplete="new-password"
                                placeholder="Create a password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                minLength={8}
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword((v) => !v)}
                                aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                                {showPassword ? "Hide" : "Show"}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="register-btn"
                        disabled={isSubmitting}
                    >
                        {isSubmitting && <span className="spinner" />}
                        {isSubmitting ? "Creating account..." : "Create account"}
                    </button>
                </form>

                <p className="login-text">
                    Already have an account? <Link to="/">Sign in</Link>
                </p>
            </div>
        </div>
    );
}

export default Register;