import api from './api';

export const taskService = {
  async getTasks(params = {}) {
    return api.get('/tasks', { params });
  },

  async getStats() {
    return api.get('/tasks/stats');
  },

  async getTaskById(id) {
    return api.get(`/tasks/${id}`);
  },

  async createTask(data) {
    return api.post('/tasks', data);
  },

  async updateTask(id, data) {
    return api.put(`/tasks/${id}`, data);
  },

  async updateStatus(id, status) {
    return api.patch(`/tasks/${id}/status`, { status });
  },

  async deleteTask(id) {
    return api.delete(`/tasks/${id}`);
  },
};

export default taskService;
