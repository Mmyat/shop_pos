import axios from "axios";

// Read Vite environment variable `VITE_API_URL` from `.env` at build time.
// Fallback to localhost for local development.
const baseURL =  typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_URL ? String(import.meta.env.VITE_API_URL) : "http://localhost:8080/api";

const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to automatically add authorization token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor to handle common global responses (e.g. 401 unauthorized redirect)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token has expired or is invalid, wipe session storage and redirect to login
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      // Prevent infinite redirect loop if already on login page
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export default api;
