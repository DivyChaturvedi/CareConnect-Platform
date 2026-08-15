import API from "../api/axios";

export const getResidentDirectory = (params = {}) => {
    return API.get("resident/directory/", { params });
};

export const approveResident = (id, status) => {
    return API.patch(`resident/${id}/approve/`, { approval_status: status });
};

export const mapResidentFlat = (flat_id) => {
    return API.patch("resident/map/", { flat_id });
};

export const getSocieties = () => API.get("society/societies/");
export const getBlocks = (societyId) => API.get(`society/blocks/?society=${societyId}`);
export const getFlats = (blockId) => API.get(`society/flats/?block=${blockId}`);

export const mapResidentToFlat = (residentId, flatId) => {
    return API.put(`resident/${residentId}/map-flat/`, { flat_id: flatId });
};