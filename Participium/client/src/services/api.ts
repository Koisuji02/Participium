
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE ?? 'http://localhost:5000/api/v1',
  // withCredentials: true, // enable if backend uses httpOnly cookies
});

// attach token from localStorage if present
api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    console.error('Failed to retrieve token from localStorage:', e);
  }
  return config;
});

export default api;
