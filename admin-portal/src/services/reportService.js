import API from "../api/axios";

export const getReportSummary = (params = {}) => API.get("sos/reports/summary/", { params });

export const downloadExcelReport = async (params = {}) => {
    const response = await API.get("sos/reports/export/excel/", { params, responseType: "blob" });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "incident_report.xlsx");
    document.body.appendChild(link);
    link.click();
    link.remove();
};

export const downloadPdfReport = async (params = {}) => {
    const response = await API.get("sos/reports/export/pdf/", { params, responseType: "blob" });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "incident_report.pdf");
    document.body.appendChild(link);
    link.click();
    link.remove();
};