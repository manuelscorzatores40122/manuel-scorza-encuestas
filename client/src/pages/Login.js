import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const STAFF = ['admin','director','tutor','docente'];

export default function Login() {
  const [dni, setDni] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();

  const submit = async e => {
    e.preventDefault(); setErr(''); setLoading(true);
    try {
      const u = await login(dni.trim(), pass);
      nav(STAFF.includes(u.role) ? '/admin' : '/alumno');
    } catch (e) {
      setErr(e.response?.data?.error || 'Error al iniciar sesión');
    } finally { setLoading(false); }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-icon">🏫</div>
          <h1 style={{fontSize:18,fontWeight:800,color:'var(--g900)'}}>IE 40122 Manuel Scorza Torres</h1>
          <p style={{fontSize:12,color:'var(--g400)',marginTop:4}}>Sistema de Encuestas y Biblioteca 2026</p>
        </div>

        {err && <div className="alert alert-error">⚠️ {err}</div>}

        <form onSubmit={submit}>
          <div className="form-group" style={{marginBottom:12}}>
            <label className="label">DNI / Usuario</label>
            <input className="input" value={dni} onChange={e=>setDni(e.target.value)}
              placeholder="Tu número de DNI" required autoFocus/>
          </div>
          <div className="form-group" style={{marginBottom:20}}>
            <label className="label">Contraseña</label>
            <input className="input" type="password" value={pass} onChange={e=>setPass(e.target.value)}
              placeholder="Contraseña" required/>
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}
            style={{width:'100%',padding:'11px',fontSize:14,justifyContent:'center'}}>
            {loading ? <><div className="spinner" style={{width:16,height:16,borderWidth:2}}/> Ingresando...</> : '🔐 Iniciar Sesión'}
          </button>
        </form>

        <div style={{marginTop:18,padding:12,background:'var(--g50)',borderRadius:9,fontSize:12,color:'var(--g500)'}}>
          <strong>ℹ️ Contraseña inicial:</strong> Tu número de DNI
        </div>
      </div>
    </div>
  );
}
