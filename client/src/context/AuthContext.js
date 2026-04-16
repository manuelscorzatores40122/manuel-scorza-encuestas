import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const Ctx = createContext(null);
const API = process.env.REACT_APP_API_URL || '';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const saved = localStorage.getItem('user');
    if (token && saved) {
      try {
        setUser(JSON.parse(saved));
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      } catch { logout(); }
    }
    setLoading(false);
  }, []);

  const login = async (dni, password) => {
    const res = await axios.post(`${API}/api/auth/login`, { dni, password });
    const { token, user: u } = res.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(u));
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(u);
    return u;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  return <Ctx.Provider value={{ user, login, logout, loading }}>{children}</Ctx.Provider>;
};

export const useAuth = () => useContext(Ctx);
