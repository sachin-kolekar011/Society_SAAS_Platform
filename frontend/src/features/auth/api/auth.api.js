import axiosClient from '../../../services/axiosClient';

export const authApi = {
  flatsLookup: (search) => axiosClient.get('/auth/flats-lookup', { params: { search } }),
  register: (payload) => axiosClient.post('/auth/register', payload),
};
