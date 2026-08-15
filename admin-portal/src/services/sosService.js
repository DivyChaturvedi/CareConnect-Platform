import API from "../api/axios";

export const getEscalationConfig = () => API.get("sos/escalation-config/");
export const updateEscalationConfig = (data) => API.put("sos/escalation-config/", data);