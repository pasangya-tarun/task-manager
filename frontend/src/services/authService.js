import api from './api';

export const authService = {
  async register(data) {
    return api.post('/auth/register', data);
  },

  async verifyEmail({ email, otp }) {
    return api.post('/auth/verify-email', { email, otp });
  },

  async resendOtp({ email }) {
    return api.post('/auth/resend-otp', { email });
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
