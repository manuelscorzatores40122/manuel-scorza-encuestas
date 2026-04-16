import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
const API = process.env.REACT_APP_API_URL || '';
const PARENTESCOS = ['Padre','Madre','Abuelo/a','Tío/a','Hermano/a','Tutor legal','Otro'];

function Avatar({ src, nombre, apellido, sexo, size=80, onClick, editable }) {
  const init = `${(apellido||'')[0]||''}${(nombre||'')[0]||''}`.toUpperCase();
  const bg = sexo==='Mujer'?'linear-gradient(135deg,#f472b6,#c084fc)':'linear-gradient(135deg,#60a5fa,#34d399)';
  return (
    <div onClick={onClick} style={{width:size,height:size,borderRadius:'50%',background:src?'transparent':bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:size*.36,fontWeight:800,color:'white',overflow:'hidden',flexShrink:0,border:'3px solid rgba(255,255,255,.6)',boxShadow:'0 4px 20px rgba(0,0,0,.2)',cursor:editable?'pointer':'default',position:'relative'}}>
      {src?<img src={src} alt="foto" style={{width:'100%',height:'100%',objectFit:'cover'}} onError={e=>e.target.style.display='none'}/>:init}
    </div>
  );
}

// ── SurveyForm ───────────────────────────────────────────────
function SurveyForm({ surveyId, onFinish, onCancel }) {
  const { user } = useAuth();
  const [survey, setSurvey] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  useEffect(()=>{
    axios.get(`${API}/api/surveys/${surveyId}`).then(r=>{
      setSurvey(r.data);
      if(r.data.response?.completada) setDone(true);
    });
  },[surveyId]);

  const setAns=(qid,field,val)=>setAnswers(p=>({...p,[qid]:{...(p[qid]||{}),question_id:qid,[field]:val}}));
  const toggleMulti=(qid,op)=>{
    const cur=answers[qid]?.respuesta_opciones||[];
    const next=cur.includes(op)?cur.filter(x=>x!==op):[...cur,op];
    setAns(qid,'respuesta_opciones',next);
  };

  const submit=async()=>{
    setErr('');
    const missing=survey.questions.filter(q=>{
      const a=answers[q.id];
      if(!a) return true;
      if(q.tipo==='multiple') return !a.respuesta_opcion;
      if(q.tipo==='multiple_multi') return !a.respuesta_opciones?.length;
      if(q.tipo==='texto') return !a.respuesta_texto?.trim();
      if(q.tipo==='escala') return !a.respuesta_escala;
      if(q.tipo==='sino') return a.respuesta_sino===undefined||a.respuesta_sino===null;
      if(q.tipo==='desplegable') return !a.respuesta_opcion;
      if(q.tipo==='fecha') return !a.respuesta_fecha;
      if(q.tipo==='numero') return a.respuesta_numero===undefined||a.respuesta_numero===null||a.respuesta_numero==='';
      return false;
    });
    if(missing.length){setErr(`Faltan ${missing.length} pregunta(s) obligatoria(s)`);document.getElementById(`q-${missing[0].id}`)?.scrollIntoView({behavior:'smooth',block:'center'});return;}
    setSubmitting(true);
    try {
      await axios.post(`${API}/api/surveys/${surveyId}/respond`,{answers:Object.values(answers)});
      setDone(true);
    } catch(e){setErr(e.response?.data?.error||'Error');}
    setSubmitting(false);
  };

  if(!survey) return <div className="loading"><div className="spinner"/></div>;
  if(done) return (
    <div style={{textAlign:'center',padding:'60px 20px'}}>
      <div style={{fontSize:72,marginBottom:20}}>🎉</div>
      <h2 style={{fontSize:22,fontWeight:800,color:'var(--green)',marginBottom:12}}>¡Encuesta completada!</h2>
      <p style={{color:'var(--g400)',marginBottom:28}}>Tus respuestas fueron guardadas correctamente.</p>
      <button className="btn btn-primary" onClick={onFinish}>← Volver</button>
    </div>
  );

  const total=survey.questions.length;
  const answered=survey.questions.filter(q=>{
    const a=answers[q.id];
    if(!a) return false;
    if(q.tipo==='multiple'||q.tipo==='desplegable') return !!a.respuesta_opcion;
    if(q.tipo==='multiple_multi') return !!(a.respuesta_opciones?.length);
    if(q.tipo==='texto') return !!a.respuesta_texto?.trim();
    if(q.tipo==='escala') return !!a.respuesta_escala;
    if(q.tipo==='sino') return a.respuesta_sino!==undefined&&a.respuesta_sino!==null;
    if(q.tipo==='fecha') return !!a.respuesta_fecha;
    if(q.tipo==='numero') return a.respuesta_numero!==undefined&&a.respuesta_numero!==null&&a.respuesta_numero!=='';
    return false;
  }).length;
  const pct=total?Math.round(answered/total*100):0;

  return (
    <div>
      <button className="btn btn-secondary btn-sm" onClick={onCancel} style={{marginBottom:12}}>← Volver</button>
      <h2 style={{fontSize:19,fontWeight:800,marginBottom:4}}>{survey.titulo}</h2>
      {survey.descripcion&&<p style={{fontSize:13,color:'var(--g400)',marginBottom:16}}>{survey.descripcion}</p>}
      <div className="card" style={{marginBottom:18}}>
        <div style={{display:'flex',justifyContent:'space-between',fontSize:13,fontWeight:600,marginBottom:8}}><span>Progreso</span><span>{answered}/{total}</span></div>
        <div className="progress"><div className="progress-fill" style={{width:`${pct}%`}}/></div>
        <div style={{fontSize:11,color:'var(--g400)',marginTop:4}}>{pct}% completado</div>
      </div>
      {err&&<div className="alert alert-error">⚠️ {err}</div>}
      {survey.questions.map((q,qi)=>{
        const a=answers[q.id]||{};
        const opts=q.opciones?(Array.isArray(q.opciones)?q.opciones:JSON.parse(q.opciones)):[];
        const isAnswered=(q.tipo==='multiple'&&a.respuesta_opcion)||(q.tipo==='multiple_multi'&&a.respuesta_opciones?.length)||(q.tipo==='texto'&&a.respuesta_texto?.trim())||(q.tipo==='escala'&&a.respuesta_escala)||(q.tipo==='sino'&&a.respuesta_sino!==undefined&&a.respuesta_sino!==null)||(q.tipo==='desplegable'&&a.respuesta_opcion)||(q.tipo==='fecha'&&a.respuesta_fecha)||(q.tipo==='numero'&&a.respuesta_numero!==undefined&&a.respuesta_numero!=='');
        return (
          <div key={q.id} id={`q-${q.id}`} className={`q-survey ${isAnswered?'answered':''}`}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
              <span style={{fontSize:11,fontWeight:700,color:'var(--blue)',textTransform:'uppercase',letterSpacing:.5}}>Pregunta {qi+1} <span style={{color:'var(--red)'}}>*</span></span>
              {isAnswered&&<span style={{color:'var(--green)',fontSize:18}}>✓</span>}
            </div>
            <div style={{fontWeight:700,fontSize:15,margin:'8px 0 14px',lineHeight:1.5}}>{q.texto}</div>
            {q.tipo==='multiple'&&opts.map((op,oi)=>(
              <div key={oi} className={`radio-opt ${a.respuesta_opcion===op?'sel':''}`} onClick={()=>setAns(q.id,'respuesta_opcion',op)}>
                <input type="radio" name={`q${q.id}`} checked={a.respuesta_opcion===op} onChange={()=>{}} style={{accentColor:'var(--blue)',flexShrink:0}}/>
                <span style={{fontSize:14}}>{op}</span>
              </div>
            ))}
            {q.tipo==='multiple_multi'&&opts.map((op,oi)=>{
              const sel=(a.respuesta_opciones||[]).includes(op);
              return (
                <div key={oi} className={`check-opt ${sel?'sel':''}`} onClick={()=>toggleMulti(q.id,op)}>
                  <input type="checkbox" checked={sel} onChange={()=>{}} style={{accentColor:'var(--purple)',flexShrink:0}}/>
                  <span style={{fontSize:14}}>{op}</span>
                </div>
              );
            })}
            {q.tipo==='desplegable'&&(
              <select className="select" value={a.respuesta_opcion||''} onChange={e=>setAns(q.id,'respuesta_opcion',e.target.value)}>
                <option value="">Seleccionar...</option>
                {opts.map((op,i)=><option key={i} value={op}>{op}</option>)}
              </select>
            )}
            {q.tipo==='texto'&&<textarea className="textarea" value={a.respuesta_texto||''} onChange={e=>setAns(q.id,'respuesta_texto',e.target.value)} placeholder="Escribe tu respuesta..." rows={3}/>}
            {q.tipo==='escala'&&(
              <div>
                <div className="scale-btns">{[1,2,3,4,5].map(n=>(
                  <button key={n} className={`scale-btn ${a.respuesta_escala===n?'sel':''}`} onClick={()=>setAns(q.id,'respuesta_escala',n)}>{n}</button>
                ))}</div>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'var(--g400)',marginTop:6,maxWidth:260}}><span>1 = Muy malo</span><span>5 = Muy bueno</span></div>
              </div>
            )}
            {q.tipo==='sino'&&(
              <div style={{display:'flex',gap:10}}>
                {[{l:'✅ Sí',v:true},{l:'❌ No',v:false}].map(x=>(
                  <button key={String(x.v)} className="btn" style={{flex:1,justifyContent:'center',background:a.respuesta_sino===x.v?'var(--green)':'var(--g100)',color:a.respuesta_sino===x.v?'white':'var(--g700)',border:a.respuesta_sino===x.v?'none':'1px solid var(--g200)'}} onClick={()=>setAns(q.id,'respuesta_sino',x.v)}>{x.l}</button>
                ))}
              </div>
            )}
            {q.tipo==='fecha'&&<input className="input" type="date" value={a.respuesta_fecha||''} onChange={e=>setAns(q.id,'respuesta_fecha',e.target.value)} style={{maxWidth:200}}/>}
            {q.tipo==='numero'&&<input className="input" type="number" value={a.respuesta_numero??''} onChange={e=>setAns(q.id,'respuesta_numero',e.target.value)} style={{maxWidth:160}} placeholder="0"/>}
          </div>
        );
      })}
      <div style={{display:'flex',gap:10,marginBottom:40}}>
        <button className="btn btn-secondary" onClick={onCancel}>← Cancelar</button>
        <button className="btn btn-success" onClick={submit} disabled={submitting} style={{flex:1,fontSize:15,justifyContent:'center'}}>
          {submitting?'⏳ Enviando...':'✅ Enviar respuestas'}
        </button>
      </div>
    </div>
  );
}

// ── StudentProfile ───────────────────────────────────────────
function StudentProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [err, setErr] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);
  const [tab, setTab] = useState('contacto');
  const fileRef = useRef();

  useEffect(()=>{ load(); },[]);
  const load=async()=>{ setLoading(true); const r=await axios.get(`${API}/api/students/me`); setProfile(r.data); setForm(r.data); setLoading(false); };
  const sf=(f,v)=>setForm(p=>({...p,[f]:v}));
  const inp=(f,type='text',ph='')=>({className:'input',type,placeholder:ph,value:form[f]||'',onChange:e=>sf(f,e.target.value)});

  const handlePhoto=async e=>{
    const file=e.target.files?.[0]; if(!file) return;
    if(file.size>2*1024*1024){setErr('La foto no debe superar 2MB');return;}
    setPhotoUploading(true);
    const reader=new FileReader();
    reader.onload=async ev=>{
      try{const r=await axios.put(`${API}/api/students/me`,{...form,foto_url:ev.target.result});setProfile(r.data);setForm(r.data);setSuccess('✅ Foto actualizada');setTimeout(()=>setSuccess(''),3000);}
      catch{setErr('Error al guardar foto');}
      setPhotoUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const save=async()=>{
    setSaving(true); setErr(''); setSuccess('');
    try{ const r=await axios.put(`${API}/api/students/me`,form); setProfile(r.data); setForm(r.data); setEditing(false); setSuccess('✅ Datos guardados'); setTimeout(()=>setSuccess(''),3000); }
    catch(e){setErr(e.response?.data?.error||'Error');}
    setSaving(false);
  };

  const fmt=d=>{try{return d?new Date(d).toLocaleDateString('es-PE',{day:'2-digit',month:'long',year:'numeric'}):null;}catch{return d;}};
  const edad=d=>{if(!d)return null;return `${Math.floor((Date.now()-new Date(d).getTime())/31557600000)} años`;};

  if(loading) return <div className="loading"><div className="spinner"/></div>;
  if(!profile) return <div className="alert alert-error">No se pudo cargar el perfil</div>;

  return (
    <div>
      <div className="hero" style={{marginBottom:18}}>
        <div style={{position:'relative'}}>
          <Avatar src={profile.foto_url} nombre={profile.nombres} apellido={profile.apellido_paterno} sexo={profile.sexo} size={90} editable onClick={()=>fileRef.current?.click()}/>
          {photoUploading&&<div style={{position:'absolute',inset:0,borderRadius:'50%',background:'rgba(0,0,0,.6)',display:'flex',alignItems:'center',justifyContent:'center'}}><div className="spinner" style={{borderColor:'rgba(255,255,255,.3)',borderTopColor:'white'}}/></div>}
          <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={handlePhoto}/>
        </div>
        <div style={{flex:1,minWidth:200,position:'relative',zIndex:1}}>
          <div style={{fontSize:21,fontWeight:800,color:'white',lineHeight:1.2}}>{profile.apellido_paterno} {profile.apellido_materno}</div>
          <div style={{fontSize:16,color:'rgba(255,255,255,.85)',marginTop:3}}>{profile.nombres}</div>
          <div style={{display:'flex',gap:8,marginTop:10,flexWrap:'wrap'}}>
            {[profile.nivel,`${profile.grado?.trim()} "${profile.seccion?.trim()}"`,`DNI: ${profile.dni}`,profile.fecha_nacimiento&&edad(profile.fecha_nacimiento)].filter(Boolean).map((t,i)=>(
              <span key={i} style={{background:'rgba(255,255,255,.15)',borderRadius:20,padding:'3px 12px',fontSize:12,fontWeight:600,color:'white'}}>{t}</span>
            ))}
          </div>
          <div style={{fontSize:11,color:'rgba(255,255,255,.4)',marginTop:6}}>Toca la foto para cambiarla</div>
        </div>
        <div style={{display:'flex',gap:8,position:'relative',zIndex:1}}>
          {editing
            ?<><button className="btn btn-secondary btn-sm" onClick={()=>{setEditing(false);setForm(profile);}}>Cancelar</button><button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>{saving?'⏳':'💾 Guardar'}</button></>
            :<button style={{background:'rgba(255,255,255,.15)',color:'white',border:'1.5px solid rgba(255,255,255,.4)',padding:'8px 16px',borderRadius:9,cursor:'pointer',fontSize:13,fontWeight:700,fontFamily:'inherit'}} onClick={()=>setEditing(true)}>✏️ Editar</button>
          }
        </div>
      </div>

      {success&&<div className="alert alert-success">{success}</div>}
      {err&&<div className="alert alert-error">⚠️ {err}<button onClick={()=>setErr('')} style={{marginLeft:'auto',background:'none',border:'none',cursor:'pointer'}}>✕</button></div>}

      {!editing?(
        <>
          <div style={{marginBottom:18}}>
            <h3 style={{fontSize:14,fontWeight:700,marginBottom:12}}>🚨 Contactos de Emergencia</h3>
            <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
              {[
                {icon:'👨‍👩‍👦',title:'Apoderado',color:'var(--blue)',nombre:`${profile.apoderado_apellidos||''} ${profile.apoderado_nombre||''}`.trim()||null,tel:profile.apoderado_telefono,par:profile.apoderado_parentesco},
                {icon:'👨',title:'Padre',color:'var(--green)',nombre:profile.padre_nombre,tel:profile.padre_telefono},
                {icon:'👩',title:'Madre',color:'var(--purple)',nombre:profile.madre_nombre,tel:profile.madre_telefono},
              ].filter(c=>c.nombre||c.tel).map(c=>(
                <div key={c.title} style={{flex:1,minWidth:180,background:'white',border:`2px solid ${c.color}20`,borderRadius:12,padding:'14px 16px',boxShadow:'var(--sh)'}}>
                  <div style={{fontWeight:700,fontSize:12,color:c.color,marginBottom:6}}>{c.icon} {c.title}{c.par&&` · ${c.par}`}</div>
                  {c.nombre&&<div style={{fontWeight:600,fontSize:13,marginBottom:8}}>{c.nombre}</div>}
                  {c.tel?<a href={`tel:${c.tel}`} className="call-btn" style={{fontSize:14,fontWeight:800}}>📞 {c.tel}</a>:<span style={{fontSize:12,color:'var(--g300)'}}>Sin celular registrado</span>}
                </div>
              ))}
            </div>
            {!profile.apoderado_telefono&&!profile.padre_telefono&&!profile.madre_telefono&&(
              <div className="alert alert-warning" style={{marginTop:10}}>⚠️ No hay celulares de emergencia registrados. Presiona <strong>Editar</strong> para agregarlos.</div>
            )}
          </div>
          <div className="card">
            <h3 style={{fontSize:13,fontWeight:700,color:'var(--g500)',textTransform:'uppercase',letterSpacing:.8,marginBottom:14}}>Datos Personales</h3>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:'8px 24px'}}>
              {[['Fecha Nac.',fmt(profile.fecha_nacimiento)],['Sexo',profile.sexo],['Código',profile.codigo_estudiante],['Teléfono',profile.telefono],['Email',profile.email]].map(([l,v])=>(
                <div key={l} style={{borderBottom:'1px solid var(--g100)',paddingBottom:8}}>
                  <div style={{fontSize:11,fontWeight:700,color:'var(--g400)',textTransform:'uppercase',marginBottom:2}}>{l}</div>
                  <div style={{fontSize:13,color:v?'var(--g900)':'var(--g300)'}}>{v||'—'}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      ):(
        <>
          <div className="tabs">
            {[['contacto','📱 Mi contacto'],['apoderado','👨‍👩‍👦 Apoderado'],['padres','👨👩 Padre/Madre']].map(([k,l])=>(
              <button key={k} className={`tab ${tab===k?'active':''}`} onClick={()=>setTab(k)}>{l}</button>
            ))}
          </div>
          {tab==='contacto'&&(
            <div className="card">
              <div className="form-row cols-2">
                {[['telefono','Teléfono','999 999 999'],['email','Email','correo@ejemplo.com']].map(([f,l,ph])=>(
                  <div key={f} className="form-group"><label className="label">{l}</label><input {...inp(f,'text',ph)}/></div>
                ))}
                <div className="form-group" style={{gridColumn:'span 2'}}><label className="label">Dirección</label><input {...inp('direccion','text','Calle, número, distrito...')}/></div>
              </div>
            </div>
          )}
          {tab==='apoderado'&&(
            <div className="card">
              <div className="form-row cols-3">
                <div className="form-group"><label className="label">Apellidos</label><input {...inp('apoderado_apellidos')}/></div>
                <div className="form-group"><label className="label">Nombres</label><input {...inp('apoderado_nombre')}/></div>
                <div className="form-group"><label className="label">Parentesco</label>
                  <select className="select" value={form.apoderado_parentesco||''} onChange={e=>sf('apoderado_parentesco',e.target.value)}>
                    <option value="">Seleccionar</option>{PARENTESCOS.map(p=><option key={p} value={p}>{p}</option>)}
                  </select></div>
                <div className="form-group"><label className="label">DNI</label><input {...inp('apoderado_dni')}/></div>
                <div className="form-group"><label className="label">📞 Celular emergencia</label><input {...inp('apoderado_telefono','text','999 999 999')}/></div>
                <div className="form-group"><label className="label">Email</label><input {...inp('apoderado_email','email')}/></div>
              </div>
            </div>
          )}
          {tab==='padres'&&(
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              {[{pre:'padre',title:'👨 Padre'},{pre:'madre',title:'👩 Madre'}].map(({pre,title})=>(
                <div key={pre} className="card">
                  <div style={{fontWeight:700,fontSize:13,marginBottom:12}}>{title}</div>
                  {[['nombre','Apellidos y Nombres'],['dni','DNI'],['telefono','📞 Celular'],['email','Email']].map(([f,l])=>(
                    <div key={f} className="form-group"><label className="label">{l}</label><input {...inp(`${pre}_${f}`)}/></div>
                  ))}
                </div>
              ))}
            </div>
          )}
          <div style={{display:'flex',gap:10,marginBottom:40,marginTop:8}}>
            <button className="btn btn-secondary" onClick={()=>{setEditing(false);setForm(profile);}}>Cancelar</button>
            <button className="btn btn-success" onClick={save} disabled={saving} style={{flex:1,justifyContent:'center'}}>{saving?'⏳ Guardando...':'💾 Guardar cambios'}</button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Library Student View ─────────────────────────────────────
function LibraryStudent() {
  const [items, setItems] = useState([]); const [loading, setLoading] = useState(true);
  useEffect(()=>{ axios.get(`${API}/api/library`).then(r=>{setItems(r.data);setLoading(false);}); },[]);
  const tipoIcon={ libro:'📖', documento:'📄', video:'🎬', enlace:'🔗', otro:'📦' };
  if(loading) return <div className="loading"><div className="spinner"/></div>;
  return (
    <div>
      {items.length===0?<div className="empty"><div className="empty-icon">📚</div><h3>Sin materiales disponibles</h3><p>El administrador aún no ha subido materiales para tu grado</p></div>
      :<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:14}}>
        {items.map(it=>(
          <div key={it.id} className="card" style={{borderLeft:`4px solid var(--blue)`}}>
            <div style={{fontSize:28,marginBottom:10}}>{tipoIcon[it.tipo]||'📦'}</div>
            <div style={{fontWeight:700,fontSize:15,marginBottom:6}}>{it.titulo}</div>
            {it.descripcion&&<p style={{fontSize:13,color:'var(--g400)',marginBottom:12}}>{it.descripcion}</p>}
            {it.archivo_url&&(
              <a href={it.archivo_url} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm" style={{display:'inline-flex'}}>
                📥 {it.archivo_nombre||'Descargar'}
              </a>
            )}
          </div>
        ))}
      </div>}
    </div>
  );
}

// ── MAIN STUDENT HOME ────────────────────────────────────────
export default function StudentHome() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState('encuestas');
  const [surveys, setSurveys] = useState([]);
  const [loadingSurveys, setLoadingSurveys] = useState(true);
  const [activeSurvey, setActiveSurvey] = useState(null);

  const loadSurveys=async()=>{
    setLoadingSurveys(true);
    const r=await axios.get(`${API}/api/surveys`);
    setSurveys(r.data); setLoadingSurveys(false);
  };
  useEffect(()=>{if(tab==='encuestas') loadSurveys();},[tab]);

  const handleLogout=()=>{logout();nav('/login');};
  const pending=surveys.filter(s=>!s.completada);
  const done=surveys.filter(s=>s.completada);

  if(activeSurvey) return (
    <div style={{maxWidth:760,margin:'0 auto',padding:24}}>
      <SurveyForm surveyId={activeSurvey} onFinish={()=>{setActiveSurvey(null);loadSurveys();}} onCancel={()=>setActiveSurvey(null)}/>
    </div>
  );

  return (
    <div style={{minHeight:'100vh',background:'var(--g50)'}}>
      {/* Navbar */}
      <nav style={{background:'linear-gradient(135deg,var(--g900) 0%,var(--blue-d) 60%,var(--blue) 100%)',height:60,padding:'0 20px',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:100,boxShadow:'0 2px 12px rgba(26,86,219,.3)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,color:'white'}}>
          <div style={{width:34,height:34,background:'rgba(255,255,255,.15)',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>📋</div>
          <span style={{fontWeight:700,fontSize:14}}>IE Manuel Scorza Torres</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{textAlign:'right'}}>
            <div style={{fontSize:13,fontWeight:700,color:'white'}}>{user?.apellido_paterno} {user?.nombre}</div>
            <div style={{fontSize:11,color:'rgba(255,255,255,.55)'}}>{user?.grado?.trim()} "{user?.seccion?.trim()}" · {user?.nivel}</div>
          </div>
          <button onClick={handleLogout} style={{background:'rgba(255,255,255,.12)',color:'white',border:'1px solid rgba(255,255,255,.25)',padding:'6px 12px',borderRadius:8,cursor:'pointer',fontSize:12,fontWeight:600,fontFamily:'inherit'}}>Salir</button>
        </div>
      </nav>

      <div style={{maxWidth:800,margin:'0 auto',padding:'20px 16px'}}>
        <div className="tabs">
          {[['encuestas','📋 Encuestas'],['perfil','👤 Mi Perfil'],['biblioteca','📚 Biblioteca']].map(([k,l])=>(
            <button key={k} className={`tab ${tab===k?'active':''}`} onClick={()=>setTab(k)}>{l}</button>
          ))}
        </div>

        {tab==='encuestas'&&(
          <>
            <div className="stats" style={{gridTemplateColumns:'1fr 1fr',marginBottom:20}}>
              <div className="stat" style={{borderLeftColor:'var(--yellow)'}}><div className="stat-ic" style={{background:'var(--yellow-l)'}}>⏳</div><div><div className="stat-val">{pending.length}</div><div className="stat-lbl">Pendientes</div></div></div>
              <div className="stat" style={{borderLeftColor:'var(--green)'}}><div className="stat-ic" style={{background:'var(--green-l)'}}>✅</div><div><div className="stat-val">{done.length}</div><div className="stat-lbl">Completadas</div></div></div>
            </div>
            {loadingSurveys?<div className="loading"><div className="spinner"/></div>
            :surveys.length===0?<div className="empty"><div className="empty-icon">📭</div><h3>Sin encuestas disponibles</h3><p>El administrador publicará encuestas pronto</p></div>
            :(
              <>
                {pending.length>0&&<><h3 style={{fontSize:14,fontWeight:700,marginBottom:10,color:'var(--g700)'}}>⏳ Pendientes</h3>
                {pending.map(s=>(
                  <div key={s.id} className="card" style={{display:'flex',justifyContent:'space-between',alignItems:'center',borderLeft:'4px solid var(--yellow)',flexWrap:'wrap',gap:10}}>
                    <div style={{flex:1}}>
                      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6,flexWrap:'wrap'}}>
                        <span style={{fontWeight:700,fontSize:16}}>{s.titulo}</span>
                        <span className="badge badge-yellow">Pendiente</span>
                      </div>
                      {s.descripcion&&<p style={{fontSize:13,color:'var(--g400)',marginBottom:4}}>{s.descripcion}</p>}
                      <div style={{fontSize:12,color:'var(--g400)'}}>📝 {s.total_preguntas} preguntas{s.fecha_fin&&` · 📅 Hasta ${new Date(s.fecha_fin).toLocaleDateString('es-PE')}`}</div>
                    </div>
                    <button className="btn btn-primary" onClick={()=>setActiveSurvey(s.id)}>✍️ Responder</button>
                  </div>
                ))}</>}
                {done.length>0&&<><h3 style={{fontSize:14,fontWeight:700,margin:'20px 0 10px',color:'var(--g700)'}}>✅ Completadas</h3>
                {done.map(s=>(
                  <div key={s.id} className="card" style={{display:'flex',justifyContent:'space-between',alignItems:'center',borderLeft:'4px solid var(--green)',flexWrap:'wrap',gap:10}}>
                    <div style={{flex:1}}>
                      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6,flexWrap:'wrap'}}>
                        <span style={{fontWeight:700,fontSize:15}}>{s.titulo}</span>
                        <span className="badge badge-green">Completada</span>
                      </div>
                      <div style={{fontSize:12,color:'var(--g400)'}}>📝 {s.total_preguntas} preguntas{s.fecha_completada&&` · Respondida el ${new Date(s.fecha_completada).toLocaleDateString('es-PE')}`}</div>
                    </div>
                    <span style={{fontSize:32}}>✅</span>
                  </div>
                ))}</>}
              </>
            )}
          </>
        )}
        {tab==='perfil'&&<StudentProfile/>}
        {tab==='biblioteca'&&<LibraryStudent/>}
      </div>
    </div>
  );
}
