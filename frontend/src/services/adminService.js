import api from './api';

export const adminService = {
  async getUsers(params = {}) {
    return api.get('/admin/users', { params });
  },

  async getUserById(id) {
    return api.get(`/admin/users/${id}`);
  },

  async updateUserStatus(id, isActive) {
    return api.patch(`/admin/users/${id}/status`, { isActive });
  },

  async updateUserRole(id, role) {
    return api.patch(`/admin/users/${id}/role`, { role });
  },
};

export default adminService;
