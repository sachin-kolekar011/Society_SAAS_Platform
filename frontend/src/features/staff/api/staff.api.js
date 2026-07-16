import axiosClient from '../../../services/axiosClient';

export const staffApi = {
  list: (params) => axiosClient.get('/staff', { params }),
  create: (payload) => axiosClient.post('/staff', payload),
  setStatus: (id, isActive) => axiosClient.patch(`/staff/${id}/status`, { isActive }),
};