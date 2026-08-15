import API from "../api/axios";

export const login = (data) => {
    return API.post("login/", data);
};

export const register = (data) => {
    return API.post("register/", data);
};

export const getProfile = () => {
    return API.get("profile/");
};