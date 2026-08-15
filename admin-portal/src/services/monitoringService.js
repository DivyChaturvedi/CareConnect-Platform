import API from "../api/axios";

export const getAlertsList = (params = {}) => API.get("sos/monitoring/alerts/", { params });
export const getDashboardStats = () => API.get("sos/monitoring/stats/");