import api from './api';

export const userService = {
  async getProfile() {
    return api.get('/users/me');
  },

  async updateProfile(data) {
    return api.patch('/users/me', data);
  },
};

export default userService;
