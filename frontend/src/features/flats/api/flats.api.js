import axiosClient from '../../../services/axiosClient';

export const flatsApi = {
  list: (params) => axiosClient.get('/flats', { params }),
  create: (payload) => axiosClient.post('/flats', payload),
  update: (id, payload) => axiosClient.patch(`/flats/${id}`, payload),
  remove: (id) => axiosClient.delete(`/flats/${id}`),
};
