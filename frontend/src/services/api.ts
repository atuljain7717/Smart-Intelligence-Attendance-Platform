
import axios from "axios";

/*
 * Smart Attendance Intelligence
 *
 * Frontend:
 *   http://localhost:5173
 *
 * Backend:
 *   http://127.0.0.1:8000
 *
 * We keep the backend URL explicit so Axios always
 * knows where the FastAPI server is running.
 */

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

/*
 * REQUEST INTERCEPTOR
 */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    /*
     * IMPORTANT:
     *
     * Never globally set Content-Type.
     *
     * Axios/browser automatically handles:
     *
     * application/json
     *
     * and for FormData:
     *
     * multipart/form-data; boundary=...
     *
     * This is required by FastAPI UploadFile endpoints.
     */
    if (config.data instanceof FormData) {
      if (config.headers) {
        delete config.headers["Content-Type"];
        delete config.headers["content-type"];
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/*
 * RESPONSE INTERCEPTOR
 */
api.interceptors.response.use(
  (response) => {
    return response;
  },

  (error) => {
    /*
     * No response means the browser could not reach
     * the backend at all.
     */
    if (!error.response) {
      console.error("API Network Error:", {
        message: error.message,
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        method: error.config?.method,
      });
    }

    /*
     * Unauthorized
     */
    if (error.response?.status === 401) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
    }

    return Promise.reject(error);
  }
);

export default api;
