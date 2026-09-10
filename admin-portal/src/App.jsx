import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";

// Lazy load pages for fast initial load and small bundle size
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const SocietyManagement = lazy(() => import("./pages/SocietyManagement"));
const BlockManagement = lazy(() => import("./pages/BlockManagement"));
const FlatManagement = lazy(() => import("./pages/FlatManagement"));
const ResidentApproval = lazy(() => import("./pages/ResidentApproval"));
const ResidentMapping = lazy(() => import("./pages/ResidentMapping"));
const NotificationTemplates = lazy(() => import("./pages/NotificationTemplates"));
const EscalationConfig = lazy(() => import("./pages/EscalationConfig"));
const AlertMonitoring = lazy(() => import("./pages/AlertMonitoring"));
const ReportingDashboard = lazy(() => import("./pages/ReportingDashboard"));

function PageLoader() {
    return (
        <div style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#0a0e1a",
            color: "#8b96b3",
            fontFamily: "system-ui, -apple-system, sans-serif"
        }}>
            <div style={{ textAlign: "center" }}>
                <div style={{
                    width: "36px",
                    height: "36px",
                    border: "3px solid rgba(245,165,36,0.2)",
                    borderTop: "3px solid #f5a524",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                    margin: "0 auto 12px auto"
                }} />
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                <span style={{ fontSize: "14px" }}>Loading CareConnect...</span>
            </div>
        </div>
    );
}

function App() {
    return (
        <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
                <Routes>
                    {/* Public routes */}
                    <Route path="/" element={<Login />} />
                    <Route path="/register" element={<Register />} />

                    {/* Protected routes */}
                    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                    <Route path="/societies" element={<ProtectedRoute><SocietyManagement /></ProtectedRoute>} />
                    <Route path="/blocks" element={<ProtectedRoute><BlockManagement /></ProtectedRoute>} />
                    <Route path="/flats" element={<ProtectedRoute><FlatManagement /></ProtectedRoute>} />
                    <Route path="/resident-approvals" element={<ProtectedRoute><ResidentApproval /></ProtectedRoute>} />
                    <Route path="/resident-mapping" element={<ProtectedRoute><ResidentMapping /></ProtectedRoute>} />
                    <Route path="/notification-templates" element={<ProtectedRoute><NotificationTemplates /></ProtectedRoute>} />
                    <Route path="/escalation-config" element={<ProtectedRoute><EscalationConfig /></ProtectedRoute>} />
                    <Route path="/alert-monitoring" element={<ProtectedRoute><AlertMonitoring /></ProtectedRoute>} />
                    <Route path="/reporting-dashboard" element={<ProtectedRoute><ReportingDashboard /></ProtectedRoute>} />
                </Routes>
            </Suspense>
        </BrowserRouter>
    );
}

export default App;