import axiosClient from '../../../services/axiosClient';

export const gateApi = {
  createPass: (payload) => axiosClient.post('/gate/passes', payload),
  listPasses: (params) => axiosClient.get('/gate/passes', { params }),
  cancelPass: (id) => axiosClient.delete(`/gate/passes/${id}`),
  checkIn: (qrToken) => axiosClient.post('/gate/check-in', { qrToken }),
  checkOut: (qrToken) => axiosClient.post('/gate/check-out', { qrToken }),
};
