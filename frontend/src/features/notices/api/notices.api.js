import axiosClient from '../../../services/axiosClient';

export const noticesApi = {
  list: (params) => axiosClient.get('/notices', { params }),
  create: (payload) => axiosClient.post('/notices', payload),
};
