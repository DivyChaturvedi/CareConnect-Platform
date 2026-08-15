import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import BlockManagement from "./pages/BlockManagement";
import FlatManagement from "./pages/FlatManagement";
import SocietyManagement from "./pages/SocietyManagement";
import ResidentApproval from "./pages/ResidentApproval";
import ResidentMapping from "./pages/ResidentMapping";

import ProtectedRoute from "./components/ProtectedRoute";

import NotificationTemplates from "./pages/NotificationTemplates";

import EscalationConfig from "./pages/EscalationConfig";

import AlertMonitoring from "./pages/AlertMonitoring";
import ReportingDashboard from "./pages/ReportingDashboard";

function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Public routes */}
                <Route path="/" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Protected routes — all require login */}
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/societies" element={<ProtectedRoute><SocietyManagement /></ProtectedRoute>} />
                <Route path="/blocks" element={<ProtectedRoute><BlockManagement /></ProtectedRoute>} />
                <Route path="/flats" element={<ProtectedRoute><FlatManagement /></ProtectedRoute>} />
                <Route path="/resident-approvals" element={<ProtectedRoute><ResidentApproval /></ProtectedRoute>} />
                <Route path="/resident-mapping" element={<ProtectedRoute><ResidentMapping /></ProtectedRoute>} />
                <Route path="/notification-templates" element={<NotificationTemplates />} />
                <Route path="/escalation-config" element={<EscalationConfig />} />
                
<Route path="/alert-monitoring" element={<AlertMonitoring />} />

<Route path="/reporting-dashboard" element={<ReportingDashboard />} />

            </Routes>
        </BrowserRouter>
    );
}

export default App;