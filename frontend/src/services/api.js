import axios from 'axios';

// Dedicated Axios instance configured for cookie-based credentials
const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for consistent error unwrapping
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const errorPayload = error.response?.data || {
      success: false,
      message: error.message || 'Network error occurred. Please check your connection.',
    };
    return Promise.reject(errorPayload);
  }
);

export default api;
