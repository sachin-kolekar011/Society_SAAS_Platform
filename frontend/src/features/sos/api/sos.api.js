import axiosClient from '../../../services/axiosClient';

export const sosApi = {
  trigger: () => axiosClient.post('/sos'),
  list: () => axiosClient.get('/sos'),
  acknowledge: (id) => axiosClient.patch(`/sos/${id}/acknowledge`),
  resolve: (id, notes) => axiosClient.patch(`/sos/${id}/resolve`, { notes }),
};
