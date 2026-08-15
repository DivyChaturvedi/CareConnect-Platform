import API from "../api/axios";

export const getSocieties = () => {
    return API.get("society/societies/");
};

export const createSociety = (data) => {
    return API.post("society/societies/", data);
};

export const deleteSociety = (id) => {
    return API.delete(`society/societies/${id}/`);
};

export const updateSociety = (id, data) => {
    return API.put(`society/societies/${id}/`, data);
};