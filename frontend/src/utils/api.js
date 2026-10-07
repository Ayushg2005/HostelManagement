import axios from 'axios';

const API = axios.create({
  baseURL: '/api',
});

// Attach Authorization header to every request if user token is stored
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;
