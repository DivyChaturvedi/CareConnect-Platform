import API from "../api/axios";

export const getTemplates = () => API.get("notifications/templates/");
export const createTemplate = (data) => API.post("notifications/templates/", data);
export const updateTemplate = (id, data) => API.put(`notifications/templates/${id}/`, data);
export const deleteTemplate = (id) => API.delete(`notifications/templates/${id}/`);

export const getSocieties = () => API.get("societies/");