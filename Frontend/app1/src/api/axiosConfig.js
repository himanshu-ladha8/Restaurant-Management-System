import axios from "axios";

// Get base URL from environment variable or use default
const getBaseURL = () => {
  const envURL = process.env.REACT_APP_API_BASE_URL;
  if (envURL) {
    return envURL;
  }
  // Default for development
  return "https://localhost:44300/api";
};

const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000, // 30 seconds timeout
});

// ✅ Attach JWT token to ALL requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle errors and auto-logout
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't log 401 errors as they're expected during auth checks
    if (error.response?.status !== 401) {
      console.error("API Error:", error);
    }
    
    // Handle network errors
    if (!error.response) {
      console.error("Network Error:", error.message);
      return Promise.reject({
        ...error,
        message: "Network error. Please check your connection.",
        isNetworkError: true,
      });
    }

    // Handle 401 Unauthorized - token expired or invalid
    if (error.response?.status === 401) {
      // Clear auth data
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("lastActivity");
      
      // Only redirect if not already on a login page
      const currentPath = window.location.pathname;
      if (!currentPath.includes("login") && !currentPath.includes("register")) {
        // Store return URL
        localStorage.setItem("returnUrl", currentPath);
        
        // Redirect to appropriate login page based on current route
        if (currentPath.startsWith("/customer") || currentPath.startsWith("/table-menu")) {
          window.location.href = "/customer-login";
        } else {
          window.location.href = "/admin-login";
        }
      }
    }

    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      console.error("Access forbidden:", error.response.data);
      return Promise.reject({
        ...error,
        message: "You don't have permission to perform this action.",
      });
    }

    // Handle 500 Server Error
    if (error.response?.status >= 500) {
      return Promise.reject({
        ...error,
        message: "Server error. Please try again later.",
      });
    }
    
    return Promise.reject(error);
  }
);

export default api;
