import axios from 'axios'

// In production VITE_API_URL = https://your-backend.railway.app
// In development the Vite proxy forwards /api → http://localhost:8000
const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

const api = axios.create({ baseURL: BASE })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  updateProfile: (data) => api.patch('/auth/me', data),
}

export const encounterApi = {
  create: (data) => api.post('/encounters', data),
  list: () => api.get('/encounters'),
  get: (id) => api.get(`/encounters/${id}`),
  update: (id, data) => api.patch(`/encounters/${id}`, data),
  transcribe: (id, audioBlob) => {
    const form = new FormData()
    form.append('audio', audioBlob, 'audio.webm')
    return api.post(`/encounters/${id}/transcribe`, form)
  },
  generateSoap: (id) => api.post(`/encounters/${id}/generate-soap`),
  updateSoap: (id, data) => api.patch(`/encounters/${id}/soap`, data),
  extractEntities: (id) => api.post(`/encounters/${id}/extract-entities`),
  // PDF Export
  exportPdf: (id) => `/api/encounters/${id}/export-pdf`,
  // Prescription
  generatePrescription: (id) => api.post(`/encounters/${id}/prescription`),
  getPrescription: (id) => api.get(`/encounters/${id}/prescription`),
  updatePrescription: (id, data) => api.patch(`/encounters/${id}/prescription`, data),
  prescriptionPdfUrl: (id) => `/api/encounters/${id}/prescription/pdf`,
  // Reminders
  generateReminders: (id) => api.post(`/encounters/${id}/reminders`),
  getReminders: (id) => api.get(`/encounters/${id}/reminders`),
  // Referral
  generateReferral: (id, data) => api.post(`/encounters/${id}/referral`, data),
  getReferral: (id) => api.get(`/encounters/${id}/referral`),
}

export const patientApi = {
  create: (data) => api.post('/patients', data),
  list: (search) => api.get('/patients', { params: search ? { search } : {} }),
  get: (id) => api.get(`/patients/${id}`),
  update: (id, data) => api.patch(`/patients/${id}`, data),
  delete: (id) => api.delete(`/patients/${id}`),
  getEncounters: (id) => api.get(`/patients/${id}/encounters`),
}

export const aiApi = {
  checkDrugInteractions: (drugs) => api.post('/drugs/interactions', { drugs }),
  differentialDiagnosis: (data) => api.post('/ai/differential-diagnosis', data),
  labInterpretation: (data) => api.post('/ai/lab-interpretation', data),
}

export const remindersApi = {
  listAll: () => api.get('/reminders'),
  update: (id, data) => api.patch(`/reminders/${id}`, data),
}

export const usageApi = {
  stats: () => api.get('/usage/stats'),
  history: (page = 1, perPage = 20) => api.get('/usage/history', { params: { page, per_page: perPage } }),
  updateBudget: (data) => api.patch('/usage/budget', data),
}

export default api
