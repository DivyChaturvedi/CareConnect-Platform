import API from "../api/axios";

export const getBlocks = () => {
    return API.get("society/blocks/");
};

export const createBlock = (data) => {
    return API.post("society/blocks/", data);
};

export const deleteBlock = (id) => {
    return API.delete(`society/blocks/${id}/`);
};
