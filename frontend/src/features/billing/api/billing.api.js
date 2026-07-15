import axiosClient from '../../../services/axiosClient';

export const billingApi = {
  list: (params) => axiosClient.get('/billing/bills', { params }),
  generate: (payload) => axiosClient.post('/billing/bills/generate', payload),
  createOrder: (billId) => axiosClient.post(`/billing/bills/${billId}/pay/order`),
  verify: (payload) => axiosClient.post('/billing/payments/verify', payload),
};
