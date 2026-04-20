import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';
import { FaUser, FaLock } from 'react-icons/fa';
import logo from '../assets/logo.png';

const STAFF = ['admin', 'director', 'tutor', 'docente'];

const BG_IMAGES = [
  'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1600&q=80', // salón de clases moderno
  'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1600&q=80', // graduación/patio
  'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=1600&q=80', // biblioteca/libros
  'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=1600&q=80', // estudiantes
  'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1600&q=80', // pupitre/estudio
];

const SLIDE_INTERVAL = 5000; // ms entre cambios

/* ─── Partículas flotantes ─── */
function Particles() {
  const particles = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 12}s`,
    duration: `${10 + Math.random() * 14}s`,
    size: `${2 + Math.random() * 3}px`,
    opacity: 0.2 + Math.random() * 0.4,
  }));

  return (
    <div className="particles" aria-hidden="true">
      {particles.map((p) => (
        <div
          key={p.id}
          className="particle"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            animationDelay: p.delay,
            animationDuration: p.duration,
            opacity: p.opacity,
          }}
        />
      ))}
    </div>
  );
}

/* ─── Fondo con slideshow ─── */
function BackgroundSlideshow({ current }) {
  return (
    <div className="bg-slides" aria-hidden="true">
      {BG_IMAGES.map((src, i) => (
        <div
          key={i}
          className={`bg-slide ${i === current ? 'active' : ''}`}
          style={{ backgroundImage: `url(${src})` }}
        />
      ))}
    </div>
  );
}

/* ─── Indicadores ─── */
function SlideIndicators({ total, current, onSelect }) {
  return (
    <div className="slide-indicators" aria-label="Navegación de imágenes">
      {Array.from({ length: total }).map((_, i) => (
        <button
          key={i}
          className={`slide-dot ${i === current ? 'active' : ''}`}
          onClick={() => onSelect(i)}
          aria-label={`Imagen ${i + 1}`}
        />
      ))}
    </div>
  );
}

/* ─── Componente principal ─── */
export default function Login() {
  const [dni, setDni]       = useState('');
  const [pass, setPass]     = useState('');
  const [err, setErr]       = useState('');
  const [loading, setLoading] = useState(false);
  const [slide, setSlide]   = useState(0);
  const timerRef            = useRef(null);

  const { login } = useAuth();
  const nav = useNavigate();

  /* Auto-avance del slideshow */
  const startTimer = () => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSlide((s) => (s + 1) % BG_IMAGES.length);
    }, SLIDE_INTERVAL);
  };

  useEffect(() => {
    startTimer();
    return () => clearInterval(timerRef.current);
  }, []);

  const goToSlide = (i) => {
    setSlide(i);
    startTimer(); // reinicia el temporizador al hacer clic manual
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setLoading(true);

    try {
      const u = await login(dni.trim(), pass);
      nav(STAFF.includes(u.role) ? '/admin' : '/alumno');
    } catch (error) {
      setErr(error.response?.data?.error || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Fondo dinámico */}
      <BackgroundSlideshow current={slide} />

      {/* Partículas decorativas */}
      <Particles />
      {/* Tarjeta de login */}
      <div className="login-card">
        {/* Encabezado */}
        <div className="login-logo">
          <div className="login-logo-image">
            <img src={logo} alt="Logo colegio" className="login-icon" />
          </div>
          <h1 className="login-title">IE 40122 Manuel Scorza Torres</h1>
          <p className="login-subtitle">Sistema de Encuestas y Biblioteca 2026</p>
        </div>

        {/* Divisor */}
        <div className="login-divider">
          <div className="login-divider-line" />
          <div className="login-divider-diamond" />
          <div className="login-divider-line" />
        </div>

  


        {/* Error */}
        {err && (
          <div className="alert alert-error" role="alert">
            {err}
          </div>
        )}

        {/* Formulario */}
        <form className="login-form" onSubmit={submit} noValidate>
          <div className="form-group">
            <label className="label" htmlFor="dni">DNI / Usuario</label>
            <div className="input-wrap">
              
              <input
                id="dni"
                className="input"
                value={dni}
                onChange={(e) => setDni(e.target.value)}
                placeholder="Tu número de DNI"
                required
                autoFocus
                autoComplete="username"
              />
              <div className="input-underline" />
            </div>
          </div>

          <div className="form-group">
            <label className="label" htmlFor="pass">Contraseña</label>
            <div className="input-wrap">
              <input
                id="pass"
                className="input"
                type="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                placeholder="Contraseña"
                required
                autoComplete="current-password"
              />
              <div className="input-underline" />
            </div>
          </div>

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            <span className="btn-inner">
              {loading ? (
                <>
                  <div className="spinner" />
                  Ingresando...
                </>
              ) : (
                <>Iniciar Sesión</>
              )}
            </span>
          </button>
        </form>

        {/* Info */}
        <div className="login-info">
          <strong>Contraseña inicial:</strong> Tu número de DNI
        </div>
      </div>

      {/* Indicadores del slideshow */}
      <SlideIndicators
        total={BG_IMAGES.length}
        current={slide}
        onSelect={goToSlide}
      />
    </div>
  );
}