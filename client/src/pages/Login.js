import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const STAFF = ['admin', 'director', 'tutor', 'docente'];

export default function Login() {
  const [dni, setDni] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setLoading(true);

    try {
      const u = await login(dni.trim(), pass);
      nav(STAFF.includes(u.role) ? '/admin' : '/alumno');
    } catch (e) {
      setErr(e.response?.data?.error || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <img
            src="/assets/logo.png"
            alt="Logo colegio"
            className="login-icon"
          />

          <h1 className="login-title">IE 40122 Manuel Scorza Torres</h1>
          <p className="login-subtitle">
            Sistema de Encuestas y Biblioteca
          </p>
        </div>

        {err && <div className="alert alert-error">⚠️ {err}</div>}

        <form onSubmit={submit}>
          <div className="form-group mb-12">
            <label className="label">Usuario/DNI</label>
            <input
              className="input"
              value={dni}
              onChange={(e) => setDni(e.target.value)}
              placeholder="Ingresa tu número de DNI"
              required
              autoFocus
            />
          </div>

          <div className="form-group mb-20">
            <label className="label">Contraseña</label>
            <input
              className="input"
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="Contraseña"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary login-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="spinner small" />
                Ingresando...
              </>
            ) : (
              'Iniciar Sesión'
            )}
          </button>
        </form>

        <div className="login-info">
          <strong>ℹ️ Contraseña inicial:</strong> Tu número de DNI
        </div>
      </div>
    </div>
  );
}