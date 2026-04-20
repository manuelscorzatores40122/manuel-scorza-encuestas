import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './StudentHome.css';

const API = process.env.REACT_APP_API_URL || '';
const PARENTESCOS = ['Padre', 'Madre', 'Abuelo/a', 'Tío/a', 'Hermano/a', 'Tutor legal', 'Otro'];

/* ─── Avatar ──────────────────────────────────────────────── */
function Avatar({ src, nombre, apellido, sexo, size = 88, onClick, editable, loading }) {
  const init = `${(apellido || '')[0] || ''}${(nombre || '')[0] || ''}`.toUpperCase();
  const bg = sexo === 'Mujer'
    ? 'linear-gradient(135deg,#f472b6,#c084fc)'
    : 'linear-gradient(135deg,#3b82f6,#34d399)';

  return (
    <div
      className="sh-avatar"
      style={{ width: size, height: size, background: src ? 'transparent' : bg, cursor: editable ? 'pointer' : 'default' }}
      onClick={onClick}
    >
      {src
        ? <img src={src} alt="foto" onError={e => e.target.style.display = 'none'} />
        : <span style={{ fontSize: size * 0.34 }}>{init}</span>
      }
      {loading && (
        <div className="sh-photo-spinner">
          <div className="sh-spinner" />
        </div>
      )}
    </div>
  );
}

/* ─── SurveyForm ──────────────────────────────────────────── */
function SurveyForm({ surveyId, onFinish, onCancel }) {
  const [survey, setSurvey] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    axios.get(`${API}/api/surveys/${surveyId}`).then(r => {
      setSurvey(r.data);
      if (r.data.response?.completada) setDone(true);
    });
  }, [surveyId]);

  const setAns = (qid, field, val) =>
    setAnswers(p => ({ ...p, [qid]: { ...(p[qid] || {}), question_id: qid, [field]: val } }));

  const toggleMulti = (qid, op) => {
    const cur = answers[qid]?.respuesta_opciones || [];
    const next = cur.includes(op) ? cur.filter(x => x !== op) : [...cur, op];
    setAns(qid, 'respuesta_opciones', next);
  };

  const isAnswered = (q) => {
    const a = answers[q.id];
    if (!a) return false;
    if (q.tipo === 'multiple' || q.tipo === 'desplegable') return !!a.respuesta_opcion;
    if (q.tipo === 'multiple_multi') return !!(a.respuesta_opciones?.length);
    if (q.tipo === 'texto') return !!a.respuesta_texto?.trim();
    if (q.tipo === 'escala') return !!a.respuesta_escala;
    if (q.tipo === 'sino') return a.respuesta_sino !== undefined && a.respuesta_sino !== null;
    if (q.tipo === 'fecha') return !!a.respuesta_fecha;
    if (q.tipo === 'numero') return a.respuesta_numero !== undefined && a.respuesta_numero !== null && a.respuesta_numero !== '';
    return false;
  };

  const submit = async () => {
    setErr('');
    const missing = survey.questions.filter(q => !isAnswered(q));
    if (missing.length) {
      setErr(`Faltan ${missing.length} pregunta(s) obligatoria(s)`);
      document.getElementById(`q-${missing[0].id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${API}/api/surveys/${surveyId}/respond`, { answers: Object.values(answers) });
      setDone(true);
    } catch (e) {
      setErr(e.response?.data?.error || 'Error al enviar');
    }
    setSubmitting(false);
  };

  if (!survey) return <div className="sh-loading"><div className="sh-spinner" /></div>;

  if (done) return (
    <div className="sf-done">
      <div className="sf-done-emoji">🎉</div>
      <h2 className="sf-done-title">¡Encuesta completada!</h2>
      <p className="sf-done-text">Tus respuestas fueron guardadas correctamente.</p>
      <button className="sh-btn sh-btn-primary" onClick={onFinish}>← Volver a encuestas</button>
    </div>
  );

  const total = survey.questions.length;
  const answeredCount = survey.questions.filter(isAnswered).length;
  const pct = total ? Math.round(answeredCount / total * 100) : 0;

  return (
    <div className="sf-wrap">
      <button className="sh-btn sh-btn-secondary sh-btn-sm" onClick={onCancel} style={{ marginBottom: 16 }}>
        ← Volver
      </button>

      <div className="sf-header">
        <h2 className="sf-title">{survey.titulo}</h2>
        {survey.descripcion && <p className="sf-desc">{survey.descripcion}</p>}
      </div>

      {/* Progreso */}
      <div className="sf-progress-card">
        <div className="sf-progress-header">
          <span>Progreso</span>
          <span>{answeredCount} / {total} preguntas</span>
        </div>
        <div className="sf-progress-bar">
          <div className="sf-progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="sf-progress-pct">{pct}% completado</div>
      </div>

      {err && <div className="sh-alert error">⚠️ {err}</div>}

      {/* Preguntas */}
      {survey.questions.map((q, qi) => {
        const a = answers[q.id] || {};
        const opts = q.opciones
          ? (Array.isArray(q.opciones) ? q.opciones : JSON.parse(q.opciones))
          : [];
        const answered = isAnswered(q);

        return (
          <div key={q.id} id={`q-${q.id}`} className={`sf-question ${answered ? 'answered' : ''}`}>
            <div className="sf-q-top">
              <span className="sf-q-num">Pregunta {qi + 1} <span style={{ color: 'var(--red)' }}>*</span></span>
              {answered && <span className="sf-q-check">✓</span>}
            </div>
            <div className="sf-q-text">{q.texto}</div>

            {/* Radio */}
            {q.tipo === 'multiple' && opts.map((op, oi) => (
              <div key={oi} className={`sf-opt ${a.respuesta_opcion === op ? 'sel' : ''}`}
                onClick={() => setAns(q.id, 'respuesta_opcion', op)}>
                <input type="radio" name={`q${q.id}`} checked={a.respuesta_opcion === op} readOnly />
                <span>{op}</span>
              </div>
            ))}

            {/* Checkbox multi */}
            {q.tipo === 'multiple_multi' && opts.map((op, oi) => {
              const sel = (a.respuesta_opciones || []).includes(op);
              return (
                <div key={oi} className={`sf-opt ${sel ? 'sel' : ''}`}
                  onClick={() => toggleMulti(q.id, op)}>
                  <input type="checkbox" checked={sel} readOnly style={{ accentColor: 'var(--navy-light)' }} />
                  <span>{op}</span>
                </div>
              );
            })}

            {/* Desplegable */}
            {q.tipo === 'desplegable' && (
              <select className="sh-select" value={a.respuesta_opcion || ''}
                onChange={e => setAns(q.id, 'respuesta_opcion', e.target.value)}>
                <option value="">Seleccionar...</option>
                {opts.map((op, i) => <option key={i} value={op}>{op}</option>)}
              </select>
            )}

            {/* Texto */}
            {q.tipo === 'texto' && (
              <textarea className="sh-textarea" rows={3}
                value={a.respuesta_texto || ''}
                onChange={e => setAns(q.id, 'respuesta_texto', e.target.value)}
                placeholder="Escribe tu respuesta aquí..." />
            )}

            {/* Escala */}
            {q.tipo === 'escala' && (
              <div>
                <div className="sf-scale">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} className={`sf-scale-btn ${a.respuesta_escala === n ? 'sel' : ''}`}
                      onClick={() => setAns(q.id, 'respuesta_escala', n)}>{n}</button>
                  ))}
                </div>
                <div className="sf-scale-labels">
                  <span>1 = Muy malo</span><span>5 = Muy bueno</span>
                </div>
              </div>
            )}

            {/* Sí/No */}
            {q.tipo === 'sino' && (
              <div className="sf-sino">
                <button className={`sf-sino-btn si ${a.respuesta_sino === true ? 'sel' : ''}`}
                  onClick={() => setAns(q.id, 'respuesta_sino', true)}>✅ Sí</button>
                <button className={`sf-sino-btn no ${a.respuesta_sino === false ? 'sel' : ''}`}
                  onClick={() => setAns(q.id, 'respuesta_sino', false)}>❌ No</button>
              </div>
            )}

            {/* Fecha */}
            {q.tipo === 'fecha' && (
              <input className="sh-input" type="date" value={a.respuesta_fecha || ''}
                onChange={e => setAns(q.id, 'respuesta_fecha', e.target.value)}
                style={{ maxWidth: 200 }} />
            )}

            {/* Número */}
            {q.tipo === 'numero' && (
              <input className="sh-input" type="number" value={a.respuesta_numero ?? ''}
                onChange={e => setAns(q.id, 'respuesta_numero', e.target.value)}
                style={{ maxWidth: 160 }} placeholder="0" />
            )}
          </div>
        );
      })}

      <div style={{ display: 'flex', gap: 10, marginBottom: 40 }}>
        <button className="sh-btn sh-btn-secondary" onClick={onCancel}>← Cancelar</button>
        <button className="sh-btn sh-btn-success" onClick={submit} disabled={submitting}
          style={{ flex: 1 }}>
          {submitting ? '⏳ Enviando...' : '✅ Enviar respuestas'}
        </button>
      </div>
    </div>
  );
}

/* ─── StudentProfile ──────────────────────────────────────── */
function StudentProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [success, setSuccess] = useState('');
  const [err, setErr] = useState('');
  const [formTab, setFormTab] = useState('contacto');
  const fileRef = useRef();

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const r = await axios.get(`${API}/api/students/me`);
    setProfile(r.data);
    setForm(r.data);
    setLoading(false);
  };

  const sf = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const handlePhoto = async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setErr('La foto no debe superar 2MB'); return; }
    setPhotoUploading(true);
    const reader = new FileReader();
    reader.onload = async ev => {
      try {
        const r = await axios.put(`${API}/api/students/me`, { ...form, foto_url: ev.target.result });
        setProfile(r.data); setForm(r.data);
        setSuccess('✅ Foto actualizada');
        setTimeout(() => setSuccess(''), 3000);
      } catch { setErr('Error al guardar foto'); }
      setPhotoUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const save = async () => {
    setSaving(true); setErr(''); setSuccess('');
    try {
      const r = await axios.put(`${API}/api/students/me`, form);
      setProfile(r.data); setForm(r.data);
      setEditing(false);
      setSuccess('✅ Datos guardados');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) { setErr(e.response?.data?.error || 'Error al guardar'); }
    setSaving(false);
  };

  const fmt = d => {
    try { return d ? new Date(d).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' }) : null; }
    catch { return d; }
  };

  const edad = d => {
    if (!d) return null;
    return `${Math.floor((Date.now() - new Date(d).getTime()) / 31557600000)} años`;
  };

  if (loading) return <div className="sh-loading"><div className="sh-spinner" /></div>;
  if (!profile) return <div className="sh-alert error">No se pudo cargar el perfil</div>;

  const FORM_TABS = [
    ['contacto', '📱 Mi contacto'],
    ['apoderado', '👨‍👩‍👦 Apoderado'],
    ['padres', '👨👩 Padre/Madre'],
  ];

  const inpProps = (f, type = 'text', ph = '') => ({
    className: 'sh-input',
    type,
    placeholder: ph,
    value: form[f] || '',
    onChange: e => sf(f, e.target.value),
  });

  const contacts = [
    {
      icon: '👨‍👩‍👦', title: 'Apoderado', color: 'var(--blue)',
      nombre: `${profile.apoderado_apellidos || ''} ${profile.apoderado_nombre || ''}`.trim() || null,
      tel: profile.apoderado_telefono, par: profile.apoderado_parentesco,
    },
    { icon: '👨', title: 'Padre', color: 'var(--green)', nombre: profile.padre_nombre, tel: profile.padre_telefono },
    { icon: '👩', title: 'Madre', color: 'var(--purple)', nombre: profile.madre_nombre, tel: profile.madre_telefono },
  ].filter(c => c.nombre || c.tel);

  return (
    <div>
      {/* Hero */}
      <div className="sh-hero">
        <div style={{ position: 'relative' }}>
          <Avatar
            src={profile.foto_url}
            nombre={profile.nombres}
            apellido={profile.apellido_paterno}
            sexo={profile.sexo}
            size={90}
            editable
            loading={photoUploading}
            onClick={() => fileRef.current?.click()}
          />
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
        </div>

        <div className="sh-hero-info">
          <div className="sh-hero-name">{profile.apellido_paterno} {profile.apellido_materno}</div>
          <div className="sh-hero-firstname">{profile.nombres}</div>
          <div className="sh-hero-tags">
            {[profile.nivel, `${profile.grado?.trim()} "${profile.seccion?.trim()}"`, profile.fecha_nacimiento && edad(profile.fecha_nacimiento)]
              .filter(Boolean)
              .map((t, i) => <span key={i} className="sh-hero-tag">{t}</span>)
            }
            {profile.dni && <span className="sh-hero-tag gold">DNI: {profile.dni}</span>}
          </div>
          <div className="sh-hero-caption">Toca la foto para cambiarla</div>
        </div>

        <div className="sh-hero-actions">
          {editing ? (
            <>
              <button className="sh-btn sh-btn-secondary sh-btn-sm"
                onClick={() => { setEditing(false); setForm(profile); }}>
                Cancelar
              </button>
              <button className="sh-btn sh-btn-gold sh-btn-sm" onClick={save} disabled={saving}>
                {saving ? '⏳' : '💾 Guardar'}
              </button>
            </>
          ) : (
            <button className="sh-btn sh-btn-secondary sh-btn-sm"
              style={{ background: 'rgba(255,255,255,0.12)', color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}
              onClick={() => setEditing(true)}>
              ✏️ Editar
            </button>
          )}
        </div>
      </div>

      {success && <div className="sh-alert success">{success}</div>}
      {err && (
        <div className="sh-alert error">
          ⚠️ {err}
          <button className="sh-alert-close" onClick={() => setErr('')}>✕</button>
        </div>
      )}

      {/* Vista detalle */}
      {!editing ? (
        <>
          {/* Contactos de emergencia */}
          {contacts.length > 0 && (
            <div>
              <div className="sh-section-title">🚨 Contactos de Emergencia</div>
              <div className="sh-contact-grid">
                {contacts.map(c => (
                  <div key={c.title} className="sh-contact-card"
                    style={{ borderColor: `${c.color}30` }}>
                    <div className="sh-contact-type" style={{ color: c.color }}>
                      {c.icon} {c.title}{c.par && ` · ${c.par}`}
                    </div>
                    {c.nombre && <div className="sh-contact-name">{c.nombre}</div>}
                    {c.tel
                      ? <a href={`tel:${c.tel}`} className="sh-call-btn">📞 {c.tel}</a>
                      : <span style={{ fontSize: 12, color: 'var(--text-4)' }}>Sin celular</span>
                    }
                  </div>
                ))}
              </div>
            </div>
          )}

          {!profile.apoderado_telefono && !profile.padre_telefono && !profile.madre_telefono && (
            <div className="sh-alert warning">
              ⚠️ No hay celulares de emergencia. Presiona <strong>Editar</strong> para agregarlos.
            </div>
          )}

          {/* Datos personales */}
          <div className="sh-card">
            <div className="sh-section-title">Datos Personales</div>
            <div className="sh-data-grid">
              {[
                ['Fecha Nac.', fmt(profile.fecha_nacimiento)],
                ['Sexo', profile.sexo],
                ['Código', profile.codigo_estudiante],
                ['Teléfono', profile.telefono],
                ['Email', profile.email],
              ].map(([l, v]) => (
                <div key={l} className="sh-data-item">
                  <div className="sh-data-label">{l}</div>
                  <div className={`sh-data-val ${!v ? 'empty' : ''}`}>{v || '—'}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Formulario edición */}
          <div className="sh-form-tabs">
            {FORM_TABS.map(([k, l]) => (
              <button key={k} className={`sh-form-tab ${formTab === k ? 'active' : ''}`}
                onClick={() => setFormTab(k)}>{l}</button>
            ))}
          </div>

          {formTab === 'contacto' && (
            <div className="sh-card">
              <div className="sh-form-row cols-2">
                {[['telefono', 'Teléfono', '999 999 999'], ['email', 'Email', 'correo@ejemplo.com']].map(([f, l, ph]) => (
                  <div key={f} className="sh-form-group">
                    <label className="sh-label">{l}</label>
                    <input {...inpProps(f, 'text', ph)} />
                  </div>
                ))}
                <div className="sh-form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="sh-label">Dirección</label>
                  <input {...inpProps('direccion', 'text', 'Calle, número, distrito...')} />
                </div>
              </div>
            </div>
          )}

          {formTab === 'apoderado' && (
            <div className="sh-card">
              <div className="sh-form-row cols-3">
                {[['apoderado_apellidos', 'Apellidos'], ['apoderado_nombre', 'Nombres']].map(([f, l]) => (
                  <div key={f} className="sh-form-group">
                    <label className="sh-label">{l}</label>
                    <input {...inpProps(f)} />
                  </div>
                ))}
                <div className="sh-form-group">
                  <label className="sh-label">Parentesco</label>
                  <select className="sh-select" value={form.apoderado_parentesco || ''}
                    onChange={e => sf('apoderado_parentesco', e.target.value)}>
                    <option value="">Seleccionar</option>
                    {PARENTESCOS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                {[['apoderado_dni', 'DNI'], ['apoderado_telefono', '📞 Celular emergencia', '999 999 999'], ['apoderado_email', 'Email']].map(([f, l, ph]) => (
                  <div key={f} className="sh-form-group">
                    <label className="sh-label">{l}</label>
                    <input {...inpProps(f, f.includes('email') ? 'email' : 'text', ph || '')} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {formTab === 'padres' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[{ pre: 'padre', title: '👨 Padre' }, { pre: 'madre', title: '👩 Madre' }].map(({ pre, title }) => (
                <div key={pre} className="sh-card">
                  <div className="sh-section-title">{title}</div>
                  {[['nombre', 'Apellidos y Nombres'], ['dni', 'DNI'], ['telefono', '📞 Celular'], ['email', 'Email']].map(([f, l]) => (
                    <div key={f} className="sh-form-group" style={{ marginBottom: 10 }}>
                      <label className="sh-label">{l}</label>
                      <input {...inpProps(`${pre}_${f}`, f === 'email' ? 'email' : 'text')} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginBottom: 40, marginTop: 8 }}>
            <button className="sh-btn sh-btn-secondary"
              onClick={() => { setEditing(false); setForm(profile); }}>
              Cancelar
            </button>
            <button className="sh-btn sh-btn-success" onClick={save} disabled={saving}
              style={{ flex: 1 }}>
              {saving ? '⏳ Guardando...' : '💾 Guardar cambios'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ─── LibraryStudent ──────────────────────────────────────── */
function LibraryStudent() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/api/library`).then(r => { setItems(r.data); setLoading(false); });
  }, []);

  const tipoIcon = { libro: '📖', documento: '📄', video: '🎬', enlace: '🔗', otro: '📦' };

  if (loading) return <div className="sh-loading"><div className="sh-spinner" /></div>;

  if (items.length === 0) return (
    <div className="sh-empty">
      <div className="sh-empty-icon">📚</div>
      <h3>Sin materiales disponibles</h3>
      <p>El administrador aún no ha subido materiales para tu grado</p>
    </div>
  );

  return (
    <div className="sh-library-grid">
      {items.map(it => (
        <div key={it.id} className="sh-lib-card">
          <div className="sh-lib-icon">{tipoIcon[it.tipo] || '📦'}</div>
          <div className="sh-lib-title">{it.titulo}</div>
          {it.descripcion && <p className="sh-lib-desc">{it.descripcion}</p>}
          {it.archivo_url && (
            <a href={it.archivo_url} target="_blank" rel="noreferrer"
              className="sh-btn sh-btn-primary sh-btn-sm">
              📥 {it.archivo_nombre || 'Descargar'}
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── MAIN ────────────────────────────────────────────────── */
export default function StudentHome() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState('encuestas');
  const [surveys, setSurveys] = useState([]);
  const [loadingSurveys, setLoadingSurveys] = useState(true);
  const [activeSurvey, setActiveSurvey] = useState(null);

  const loadSurveys = async () => {
    setLoadingSurveys(true);
    const r = await axios.get(`${API}/api/surveys`);
    setSurveys(r.data);
    setLoadingSurveys(false);
  };

  useEffect(() => { if (tab === 'encuestas') loadSurveys(); }, [tab]);

  const handleLogout = () => { logout(); nav('/login'); };

  const pending = surveys.filter(s => !s.completada);
  const done = surveys.filter(s => s.completada);

  /* Vista de encuesta activa */
  if (activeSurvey) return (
    <div className="sh-page">
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '28px 20px' }}>
        <SurveyForm
          surveyId={activeSurvey}
          onFinish={() => { setActiveSurvey(null); loadSurveys(); }}
          onCancel={() => setActiveSurvey(null)}
        />
      </div>
    </div>
  );

  const TABS = [
    ['encuestas', '📋', 'Encuestas'],
    ['perfil', '👤', 'Mi Perfil'],
    ['biblioteca', '📚', 'Biblioteca'],
  ];

  return (
    <div className="sh-page">
      {/* ── Navbar ── */}
      <nav className="sh-navbar">
        <div className="sh-nav-brand">
          <div className="sh-nav-logo">📋</div>
          <span className="sh-nav-name">IE 40122 Manuel Scorza Torres</span>
        </div>

        <div className="sh-nav-user">
          <div className="sh-nav-info">
            <div className="sh-nav-fullname">
              {user?.apellido_paterno} {user?.nombre}
            </div>
            <div className="sh-nav-grade">
              {user?.grado?.trim()} "{user?.seccion?.trim()}" · {user?.nivel}
            </div>
          </div>
          <button className="sh-logout-btn" onClick={handleLogout}>
            ↩ Salir
          </button>
        </div>
      </nav>

      {/* ── Contenido ── */}
      <div className="sh-body">
        {/* Tabs */}
        <div className="sh-tabs">
          {TABS.map(([k, icon, label]) => (
            <button key={k} className={`sh-tab ${tab === k ? 'active' : ''}`}
              onClick={() => setTab(k)}>
              <span className="sh-tab-icon">{icon}</span>
              {label}
            </button>
          ))}
        </div>

        {/* ── ENCUESTAS ── */}
        {tab === 'encuestas' && (
          <>
            <div className="sh-stats">
              <div className="sh-stat yellow">
                <div className="sh-stat-icon">⏳</div>
                <div>
                  <div className="sh-stat-val">{pending.length}</div>
                  <div className="sh-stat-lbl">Pendientes</div>
                </div>
              </div>
              <div className="sh-stat green">
                <div className="sh-stat-icon">✅</div>
                <div>
                  <div className="sh-stat-val">{done.length}</div>
                  <div className="sh-stat-lbl">Completadas</div>
                </div>
              </div>
            </div>

            {loadingSurveys
              ? <div className="sh-loading"><div className="sh-spinner" /></div>
              : surveys.length === 0
                ? (
                  <div className="sh-empty">
                    <div className="sh-empty-icon">📭</div>
                    <h3>Sin encuestas disponibles</h3>
                    <p>El administrador publicará encuestas pronto</p>
                  </div>
                )
                : (
                  <>
                    {pending.length > 0 && (
                      <>
                        <div className="sh-section-title">⏳ Pendientes</div>
                        {pending.map(s => (
                          <div key={s.id} className="sh-survey-card pending">
                            <div className="sh-survey-content">
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5, flexWrap: 'wrap' }}>
                                <span className="sh-survey-title">{s.titulo}</span>
                                <span className="sh-badge yellow">Pendiente</span>
                              </div>
                              {s.descripcion && <p className="sh-survey-desc">{s.descripcion}</p>}
                              <div className="sh-survey-meta">
                                <span>📝 {s.total_preguntas} preguntas</span>
                                {s.fecha_fin && (
                                  <span>📅 Hasta {new Date(s.fecha_fin).toLocaleDateString('es-PE')}</span>
                                )}
                              </div>
                            </div>
                            <button className="sh-btn sh-btn-primary"
                              onClick={() => setActiveSurvey(s.id)}>
                              ✍️ Responder
                            </button>
                          </div>
                        ))}
                      </>
                    )}

                    {done.length > 0 && (
                      <>
                        <div className="sh-section-title" style={{ marginTop: 20 }}>✅ Completadas</div>
                        {done.map(s => (
                          <div key={s.id} className="sh-survey-card done">
                            <div className="sh-survey-content">
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5, flexWrap: 'wrap' }}>
                                <span className="sh-survey-title">{s.titulo}</span>
                                <span className="sh-badge green">Completada</span>
                              </div>
                              <div className="sh-survey-meta">
                                <span>📝 {s.total_preguntas} preguntas</span>
                                {s.fecha_completada && (
                                  <span>Respondida el {new Date(s.fecha_completada).toLocaleDateString('es-PE')}</span>
                                )}
                              </div>
                            </div>
                            <span style={{ fontSize: 28 }}>✅</span>
                          </div>
                        ))}
                      </>
                    )}
                  </>
                )
            }
          </>
        )}

        {tab === 'perfil' && <StudentProfile />}
        {tab === 'biblioteca' && <LibraryStudent />}
      </div>
    </div>
  );
}