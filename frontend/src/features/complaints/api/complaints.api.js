import axiosClient from '../../../services/axiosClient';

export const complaintsApi = {
  getCategories: () => axiosClient.get('/complaints/categories'),
  suggestTriage: (description) => axiosClient.post('/complaints/suggest', { description }),
  list: (params) => axiosClient.get('/complaints', { params }),
  getById: (id) => axiosClient.get(`/complaints/${id}`),
  create: (formData) =>
    axiosClient.post('/complaints', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateStatus: (id, payload) => axiosClient.patch(`/complaints/${id}/status`, payload),
  updatePriority: (id, priority) => axiosClient.patch(`/complaints/${id}/priority`, { priority }),
};
