import axiosClient from '../../../services/axiosClient';

export const dashboardApi = {
  getSummary: () => axiosClient.get('/dashboard/summary'),
};
