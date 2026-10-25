import api from './api';

export const authService = {
  async register(data) {
    return api.post('/auth/register', data);
  },

  async login(credentials) {
    return api.post('/auth/login', credentials);
  },

  async logout() {
    return api.post('/auth/logout');
  },

  async getMe() {
    return api.get('/auth/me');
  },
};

export default authService;
