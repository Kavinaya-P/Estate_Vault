import axios from 'axios';

const baseURL = process.env.REACT_APP_API_URL || '';
const api = axios.create({ baseURL: `${baseURL}/api` });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('ev_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('ev_token');
      localStorage.removeItem('ev_user');
      if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

const adminApi = axios.create({ baseURL: `${baseURL}/api/admin` });

adminApi.interceptors.request.use(cfg => {
  const token = localStorage.getItem('ev_admin_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

adminApi.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('ev_admin_token');
      localStorage.removeItem('ev_admin');
      if (!window.location.pathname.startsWith('/admin/login')) {
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  register:           (data)        => api.post('/auth/register', data),
  verifyEmail:        (userId, otp) => api.post('/auth/verify-email', { userId, otp }),
  resendVerification: (userId)      => api.post('/auth/resend-verification', { userId }),
  login:              (data)        => api.post('/auth/login', data),
  verifyLoginOtp:     (userId, otp) => api.post('/auth/verify-login-otp', { userId, otp }),
  getMe:              ()            => api.get('/auth/me'),
};

export const vaultAPI = {
  getVault:    ()     => api.get('/vault'),
  addAsset:    (data) => api.post('/vault/assets', data),
  deleteAsset: (id)   => api.delete(`/vault/assets/${id}`),
};

export const nomineesAPI = {
  getNominees:       ()        => api.get('/nominees'),
  addNominee:        (data)    => api.post('/nominees', data),
  removeNominee:     (id)      => api.delete(`/nominees/${id}`),
  acceptInvitation:  (token)   => api.post('/nominees/accept', { token }),
  declineInvitation: (token)   => api.post('/nominees/decline', { token }),
  resendInvitation:  (id)      => api.post(`/nominees/resend/${id}`),
};

export const deadmanAPI = {
  getStatus:      ()     => api.get('/deadman'),
  confirmCheckin: ()     => api.post('/deadman/checkin'),
  updateInterval: (days) => api.patch('/deadman/interval', { days }),
};

export const messagesAPI = {
  getMessages:   ()          => api.get('/messages'),
  createMessage: (data)      => api.post('/messages', data),
  updateMessage: (id, data)  => api.put(`/messages/${id}`, data),
  deleteMessage: (id)        => api.delete(`/messages/${id}`),
};

export const deathAPI = {
  submitDeathRequest:      (formData)            => api.post('/death/request', formData),
  getNomineeRequestStatus: (nomineeToken, email) => api.get('/death/nominee-status', { params: { nomineeToken, vaultOwnerEmail: email } }),
  getVaultAccess:          (nomineeToken, email) => api.get('/death/vault-access', { params: { nomineeToken, vaultOwnerEmail: email } }),
};


export const adminAuthAPI = {
  login:     (data)           => adminApi.post('/auth/login', data),
  verifyOtp: (adminId, otp)   => adminApi.post('/auth/verify-otp', { adminId, otp }),
  create:    (data, setupKey) => adminApi.post('/auth/create', data, { headers: { 'x-setup-key': setupKey } }),
};

export const adminDeathAPI = {
  getAllRequests:  ()                 => adminApi.get('/death/requests'),
  getRequest:     (id)               => adminApi.get(`/death/requests/${id}`),
  approveRequest: (id, adminNotes)   => adminApi.post(`/death/requests/${id}/approve`, { adminNotes }),
  rejectRequest:  (id, adminNotes)   => adminApi.post(`/death/requests/${id}/reject`, { adminNotes }),
};

export default api;
