import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || '';

export const useApi = (url, deps = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetch = useCallback(async () => {
    if (!url) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API}${url}`);
      setData(res.data);
      setError('');
    } catch (e) {
      setError(e.response?.data?.error || 'Error al cargar datos');
    } finally { setLoading(false); }
  }, [url, ...deps]); // eslint-disable-line

  useEffect(() => { fetch(); }, [fetch]);
  return { data, loading, error, refetch: fetch };
};

export const api = {
  get: (url) => axios.get(`${API}${url}`).then(r => r.data),
  post: (url, data) => axios.post(`${API}${url}`, data).then(r => r.data),
  put: (url, data) => axios.put(`${API}${url}`, data).then(r => r.data),
  patch: (url, data) => axios.patch(`${API}${url}`, data).then(r => r.data),
  del: (url) => axios.delete(`${API}${url}`).then(r => r.data),
  download: async (url, filename) => {
    const res = await axios.get(`${API}${url}`, { responseType: 'blob' });
    const blob = new Blob([res.data]);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  },
};
