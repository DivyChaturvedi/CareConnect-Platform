import API from "../api/axios";

export const getFlats = () => {
    return API.get("society/flats/");
};

export const createFlat = (data) => {
    return API.post("society/flats/", data);
};

export const deleteFlat = (id) => {
    return API.delete(`society/flats/${id}/`);
};