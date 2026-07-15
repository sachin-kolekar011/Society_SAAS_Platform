import axiosClient from '../../../services/axiosClient';

export const pollsApi = {
  list: () => axiosClient.get('/polls'),
  create: (payload) => axiosClient.post('/polls', payload),
  vote: (pollId, optionId) => axiosClient.post(`/polls/${pollId}/vote`, { optionId }),
};
