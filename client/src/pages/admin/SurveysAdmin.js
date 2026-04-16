import { useState, useEffect } from 'react';
import axios from 'axios';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js';
Chart.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const API = process.env.REACT_APP_API_URL || '';

const TIPOS = [
  { v:'multiple',     l:'⭕ Opción múltiple (una respuesta)' },
  { v:'multiple_multi',l:'☑️ Selección múltiple (varias)' },
  { v:'texto',        l:'✏️ Texto libre' },
  { v:'escala',       l:'📊 Escala 1–5' },
  { v:'sino',         l:'✅ Sí / No' },
  { v:'desplegable',  l:'📋 Lista desplegable' },
  { v:'fecha',        l:'📅 Fecha' },
  { v:'numero',       l:'🔢 Número' },
];
const NIVELES = ['Primaria','Secundaria'];
const GRADOS = ['PRIMERO','SEGUNDO','TERCERO','CUARTO','QUINTO','SEXTO'];
const ESTADOS_SURVEY = ['borrador','activa','cerrada','archivada'];

const emptyQ = () => ({ texto:'', tipo:'multiple', opciones:['','',''], requerida:true });

// ── Survey Builder ───────────────────────────────────────────
function SurveyBuilder({ survey, onSave, onCancel }) {
  const [form, setForm] = useState({
    titulo:'', descripcion:'', estado:'borrador',
    nivel_asignado:'', grado_asignado:'', seccion_asignada:'',
    fecha_inicio:'', fecha_fin:'',
    ...(survey||{})
  });
  const [qs, setQs] = useState([emptyQ()]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(()=>{
    if (survey?.id) {
      axios.get(`${API}/api/surveys/${survey.id}`).then(r=>{
        if (r.data.questions?.length) setQs(r.data.questions.map(q=>({
          ...q, opciones:q.opciones?(Array.isArray(q.opciones)?q.opciones:JSON.parse(q.opciones)):['','','']
        })));
      });
    }
  },[survey]);

  const sf = (f,v) => setForm(p=>({...p,[f]:v}));
  const upd = (i,f,v) => setQs(p=>p.map((q,j)=>j===i?{...q,[f]:v}:q));
  const addOpt = qi => setQs(p=>p.map((q,i)=>i===qi?{...q,opciones:[...q.opciones,'']}:q));
  const updOpt = (qi,oi,v) => setQs(p=>p.map((q,i)=>i===qi?{...q,opciones:q.opciones.map((o,j)=>j===oi?v:o)}:q));
  const remOpt = (qi,oi) => setQs(p=>p.map((q,i)=>i===qi?{...q,opciones:q.opciones.filter((_,j)=>j!==oi)}:q));
  const move = (i,d) => { const a=[...qs]; [a[i],a[i+d]]=[a[i+d],a[i]]; setQs(a); };

  const save = async () => {
    if (!form.titulo.trim()) return setErr('El título es obligatorio');
    if (qs.some(q=>!q.texto.trim())) return setErr('Todas las preguntas necesitan texto');
    const clean = qs.map(q=>({...q, opciones:['multiple','multiple_multi','desplegable'].includes(q.tipo)?q.opciones.filter(o=>o.trim()):null}));
    if (clean.some(q=>['multiple','multiple_multi','desplegable'].includes(q.tipo)&&(!q.opciones||q.opciones.length<2)))
      return setErr('Las preguntas de opción/desplegable necesitan al menos 2 opciones');
    setSaving(true); setErr('');
    try {
      const method = survey?.id?'put':'post';
      const url = survey?.id?`${API}/api/surveys/${survey.id}`:`${API}/api/surveys`;
      await axios[method](url,{...form,preguntas:clean});
      onSave();
    } catch(e){ setErr(e.response?.data?.error||'Error al guardar'); }
    setSaving(false);
  };

  const inp = (f,type='text',ph='') => ({className:'input',type,placeholder:ph,value:form[f]||'',onChange:e=>sf(f,e.target.value)});

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20,flexWrap:'wrap',gap:10}}>
        <div>
          <h2 style={{fontSize:20,fontWeight:800}}>{survey?.id?'✏️ Editar Encuesta':'➕ Nueva Encuesta'}</h2>
          <p style={{fontSize:13,color:'var(--g400)',marginTop:4}}>Configura y asigna preguntas a los estudiantes</p>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button className="btn btn-secondary" onClick={onCancel}>← Cancelar</button>
          <button className="btn btn-ghost" onClick={()=>{sf('estado','borrador');save();}}>📝 Guardar borrador</button>
          <button className="btn btn-primary" onClick={()=>{sf('estado','activa');save();}} disabled={saving}>
            {saving?'⏳ Guardando...':'🚀 Publicar'}
          </button>
        </div>
      </div>
      {err&&<div className="alert alert-error">{err}</div>}

      <div className="card" style={{marginBottom:16}}>
        <div className="card-title" style={{marginBottom:14}}>📄 Información General</div>
        <div className="form-row cols-2">
          <div className="form-group" style={{gridColumn:'span 2'}}><label className="label">Título *</label><input {...inp('titulo','text','Ej: Encuesta de Convivencia Escolar 2026')}/></div>
          <div className="form-group" style={{gridColumn:'span 2'}}><label className="label">Descripción</label><textarea className="textarea" value={form.descripcion||''} onChange={e=>sf('descripcion',e.target.value)} placeholder="Instrucciones para los estudiantes..." rows={2}/></div>
          <div className="form-group"><label className="label">Estado</label>
            <select className="select" value={form.estado||'borrador'} onChange={e=>sf('estado',e.target.value)}>
              {ESTADOS_SURVEY.map(s=><option key={s} value={s}>{s}</option>)}
            </select></div>
          <div className="form-group"><label className="label">Fecha de inicio</label><input {...inp('fecha_inicio','datetime-local')}/></div>
          <div className="form-group"><label className="label">Fecha de cierre</label><input {...inp('fecha_fin','datetime-local')}/></div>
        </div>
        <div style={{marginTop:4}}>
          <div style={{fontSize:12,fontWeight:700,color:'var(--g500)',textTransform:'uppercase',letterSpacing:.5,marginBottom:10}}>🎯 Asignación (dejar vacío = todos)</div>
          <div className="form-row cols-3">
            <div className="form-group"><label className="label">Nivel</label>
              <select className="select" value={form.nivel_asignado||''} onChange={e=>sf('nivel_asignado',e.target.value)}>
                <option value="">Todos</option>{NIVELES.map(n=><option key={n} value={n}>{n}</option>)}
              </select></div>
            <div className="form-group"><label className="label">Grado</label>
              <select className="select" value={form.grado_asignado||''} onChange={e=>sf('grado_asignado',e.target.value)}>
                <option value="">Todos</option>{GRADOS.map(g=><option key={g} value={g}>{g}</option>)}
              </select></div>
            <div className="form-group"><label className="label">Sección</label>
              <select className="select" value={form.seccion_asignada||''} onChange={e=>sf('seccion_asignada',e.target.value)}>
                <option value="">Todas</option>{['A','B','C','D','E','F'].map(s=><option key={s} value={s}>{s}</option>)}
              </select></div>
          </div>
        </div>
      </div>

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
        <div style={{fontWeight:700,fontSize:15}}>❓ Preguntas ({qs.length})</div>
        <button className="btn btn-outline btn-sm" onClick={()=>setQs(p=>[...p,emptyQ()])}>➕ Agregar pregunta</button>
      </div>

      {qs.map((q,qi)=>(
        <div key={qi} className="q-block">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
            <span style={{fontWeight:700,fontSize:12,color:'var(--blue)',textTransform:'uppercase',letterSpacing:.5}}>Pregunta {qi+1}</span>
            <div style={{display:'flex',gap:4}}>
              <button className="btn btn-secondary btn-xs" onClick={()=>move(qi,-1)} disabled={qi===0}>▲</button>
              <button className="btn btn-secondary btn-xs" onClick={()=>move(qi,1)} disabled={qi===qs.length-1}>▼</button>
              <button className="btn btn-danger btn-xs" onClick={()=>setQs(p=>p.filter((_,i)=>i!==qi))} disabled={qs.length===1}>🗑</button>
            </div>
          </div>
          <div className="form-group" style={{marginBottom:10}}>
            <label className="label">Texto de la pregunta *</label>
            <textarea className="textarea" value={q.texto} onChange={e=>upd(qi,'texto',e.target.value)} rows={2} placeholder="Escribe la pregunta..."/>
          </div>
          <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
            <div className="form-group" style={{flex:1,minWidth:180,marginBottom:0}}>
              <label className="label">Tipo</label>
              <select className="select" value={q.tipo} onChange={e=>upd(qi,'tipo',e.target.value)}>
                {TIPOS.map(t=><option key={t.v} value={t.v}>{t.l}</option>)}
              </select>
            </div>
          </div>

          {['multiple','multiple_multi','desplegable'].includes(q.tipo)&&(
            <div style={{marginTop:10}}>
              <label className="label">Opciones</label>
              {q.opciones.map((op,oi)=>(
                <div key={oi} style={{display:'flex',gap:6,marginBottom:5}}>
                  <span style={{color:'var(--g400)',paddingTop:8,fontSize:13}}>{q.tipo==='multiple'?'⭕':q.tipo==='multiple_multi'?'☑️':'📋'}</span>
                  <input className="input" value={op} onChange={e=>updOpt(qi,oi,e.target.value)} placeholder={`Opción ${oi+1}`} style={{flex:1}}/>
                  <button className="btn btn-secondary btn-xs" onClick={()=>remOpt(qi,oi)} disabled={q.opciones.length<=2}>✕</button>
                </div>
              ))}
              <button className="btn btn-outline btn-xs" onClick={()=>addOpt(qi)} style={{marginTop:4}}>➕ Opción</button>
            </div>
          )}
          {q.tipo==='escala'&&(
            <div style={{marginTop:10}}>
              <label className="label">Vista previa</label>
              <div className="scale-btns">{[1,2,3,4,5].map(n=><div key={n} className="scale-btn" style={{cursor:'default',opacity:.6}}>{n}</div>)}</div>
              <p style={{fontSize:11,color:'var(--g400)',marginTop:4}}>1 = Muy malo · 5 = Muy bueno</p>
            </div>
          )}
          {q.tipo==='sino'&&(
            <div style={{marginTop:10}}>
              <label className="label">Vista previa</label>
              <div style={{display:'flex',gap:8}}>
                {['✅ Sí','❌ No'].map(o=><div key={o} style={{padding:'7px 20px',background:'var(--g100)',borderRadius:8,fontSize:13,fontWeight:600,color:'var(--g700)'}}>{o}</div>)}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Survey Results ───────────────────────────────────────────
function SurveyResults({ surveyId, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('resumen');
  const [filters, setFilters] = useState({ nivel:'', grado:'', seccion:'', sexo:'' });
  const [pending, setPending] = useState([]);

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams(filters);
    const [res, pend] = await Promise.all([
      axios.get(`${API}/api/surveys/${surveyId}/results?${params}`),
      axios.get(`${API}/api/surveys/${surveyId}/pending`),
    ]);
    setData(res.data); setPending(pend.data); setLoading(false);
  };
  useEffect(()=>{ load(); },[filters]);

  const exportExcel = () => window.open(`${API}/api/surveys/${surveyId}/export`,'_blank');

  if (loading) return <div className="loading"><div className="spinner"/></div>;
  if (!data) return <div className="alert alert-error">Error al cargar</div>;

  const { survey, questions, responses, total } = data;

  const getSummary = q => {
    const ans = responses.flatMap(r=>r.answers.filter(a=>a.question_id===q.id));
    if (q.tipo==='multiple'||q.tipo==='desplegable') {
      const opciones = Array.isArray(q.opciones)?q.opciones:(q.opciones?JSON.parse(q.opciones):[]);
      const counts={}; opciones.forEach(o=>{counts[o]=0;});
      ans.forEach(a=>{if(a.respuesta_opcion) counts[a.respuesta_opcion]=(counts[a.respuesta_opcion]||0)+1;});
      return { type:'multiple', counts, total:ans.filter(a=>a.respuesta_opcion).length };
    }
    if (q.tipo==='multiple_multi') {
      const all=[]; ans.forEach(a=>{if(a.respuesta_opciones){try{JSON.parse(a.respuesta_opciones).forEach(o=>all.push(o));}catch{}}});
      const counts={}; all.forEach(o=>{counts[o]=(counts[o]||0)+1;});
      return { type:'multiple', counts, total:ans.length };
    }
    if (q.tipo==='escala') {
      const vals=ans.map(a=>a.respuesta_escala).filter(Boolean);
      const avg=vals.length?(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1):'N/A';
      const dist={1:0,2:0,3:0,4:0,5:0}; vals.forEach(v=>{dist[v]=(dist[v]||0)+1;});
      return { type:'escala', avg, dist, total:vals.length };
    }
    if (q.tipo==='sino') {
      const si=ans.filter(a=>a.respuesta_sino===true).length;
      const no=ans.filter(a=>a.respuesta_sino===false).length;
      return { type:'sino', si, no, total:si+no };
    }
    return { type:'texto', answers:ans.map(a=>a.respuesta_texto).filter(Boolean) };
  };

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20,flexWrap:'wrap',gap:10}}>
        <div>
          <button className="btn btn-secondary btn-sm" onClick={onBack} style={{marginBottom:8}}>← Volver</button>
          <h2 style={{fontSize:20,fontWeight:800}}>📊 {survey.titulo}</h2>
          <p style={{fontSize:13,color:'var(--g400)',marginTop:4}}>{total} respuestas · {pending.length} pendientes</p>
        </div>
        <button className="btn btn-success" onClick={exportExcel}>📥 Exportar Excel</button>
      </div>

      {/* Filters */}
      <div className="search-bar" style={{marginBottom:16}}>
        {[['nivel','Nivel',...NIVELES],['grado','Grado',...GRADOS],['sexo','Sexo','Hombre','Mujer']].map(([f,lbl,...opts])=>(
          <select key={f} className="select" style={{minWidth:110}} value={filters[f]} onChange={e=>setFilters(p=>({...p,[f]:e.target.value}))}>
            <option value="">{lbl}: Todos</option>
            {opts.map(o=><option key={o} value={o}>{o}</option>)}
          </select>
        ))}
      </div>

      <div className="tabs">
        {[['resumen','📊 Resumen'],['individual','👤 Individual'],['pendientes','⏳ Pendientes']].map(([k,l])=>(
          <button key={k} className={`tab ${tab===k?'active':''}`} onClick={()=>setTab(k)}>{l}</button>
        ))}
      </div>

      {tab==='resumen' && questions.map((q,qi)=>{
        const s=getSummary(q);
        return (
          <div key={q.id} className="card" style={{marginBottom:14}}>
            <div style={{fontSize:11,fontWeight:700,color:'var(--blue)',textTransform:'uppercase',marginBottom:4}}>Pregunta {qi+1}</div>
            <div style={{fontWeight:700,fontSize:15,marginBottom:14}}>{q.texto}</div>
            {s.type==='multiple' && Object.entries(s.counts).map(([op,cnt])=>{
              const pct=s.total>0?Math.round(cnt/s.total*100):0;
              return (
                <div key={op} style={{marginBottom:8}}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:4}}>
                    <span>{op}</span><span style={{fontWeight:700}}>{cnt} ({pct}%)</span>
                  </div>
                  <div className="progress"><div className="progress-fill" style={{width:`${pct}%`}}/></div>
                </div>
              );
            })}
            {s.type==='escala'&&(
              <div>
                <div style={{fontSize:30,fontWeight:800,color:'var(--blue)',marginBottom:12}}>{s.avg} <span style={{fontSize:14,color:'var(--g400)',fontWeight:400}}>/ 5</span></div>
                <div style={{display:'flex',gap:8}}>
                  {[1,2,3,4,5].map(n=>(
                    <div key={n} style={{flex:1,textAlign:'center'}}>
                      <div style={{fontWeight:700,fontSize:16}}>{s.dist[n]||0}</div>
                      <div style={{height:6,borderRadius:4,background:s.dist[n]>0?'var(--blue)':'var(--g200)',marginTop:4}}/>
                      <div style={{fontSize:11,color:'var(--g400)',marginTop:3}}>{n}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {s.type==='sino'&&(
              <div style={{display:'flex',gap:16}}>
                {[{l:'✅ Sí',v:s.si,c:'var(--green)'},{l:'❌ No',v:s.no,c:'var(--red)'}].map(x=>(
                  <div key={x.l} style={{padding:'14px 24px',background:`${x.c}15`,borderRadius:10,border:`1.5px solid ${x.c}40`}}>
                    <div style={{fontSize:28,fontWeight:800,color:x.c}}>{x.v}</div>
                    <div style={{fontSize:13,color:x.c,fontWeight:600}}>{x.l} · {s.total>0?Math.round(x.v/s.total*100):0}%</div>
                  </div>
                ))}
              </div>
            )}
            {s.type==='texto'&&(
              s.answers.length===0?<p style={{color:'var(--g400)',fontSize:13}}>Sin respuestas</p>
              :s.answers.slice(0,8).map((a,i)=>(
                <div key={i} style={{padding:'7px 12px',background:'var(--g50)',borderRadius:7,marginBottom:5,fontSize:13,borderLeft:'3px solid var(--blue)'}}>{a}</div>
              ))
            )}
          </div>
        );
      })}

      {tab==='individual'&&(
        <div className="card" style={{padding:0}}>
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>N°</th><th>Alumno</th><th>Nivel</th><th>Grado</th><th>Fecha</th>
                {questions.map((q,i)=><th key={q.id}>P{i+1}</th>)}</tr></thead>
              <tbody>
                {responses.length===0?<tr><td colSpan={5+questions.length} style={{textAlign:'center',padding:40,color:'var(--g400)'}}>Sin respuestas</td></tr>
                :responses.map((r,idx)=>{
                  const amap={};
                  r.answers.forEach(a=>{
                    amap[a.question_id]=a.respuesta_opcion||a.respuesta_texto||
                      (a.respuesta_opciones?JSON.parse(a.respuesta_opciones).join(', '):'')
                      ||(a.respuesta_sino!==null?(a.respuesta_sino?'Sí':'No'):'')
                      ||(a.respuesta_escala?String(a.respuesta_escala):'')
                      ||(a.respuesta_fecha?a.respuesta_fecha:'')
                      ||(a.respuesta_numero?String(a.respuesta_numero):'')||'';
                  });
                  return (
                    <tr key={r.id}>
                      <td>{idx+1}</td>
                      <td style={{fontWeight:600}}>{r.apellido_paterno} {r.apellido_materno}, {r.nombres}</td>
                      <td><span className={`badge ${r.nivel==='Primaria'?'badge-blue':'badge-purple'}`}>{r.nivel}</span></td>
                      <td>{r.grado?.trim()} "{r.seccion?.trim()}"</td>
                      <td style={{whiteSpace:'nowrap',fontSize:12}}>{r.fecha_completada?new Date(r.fecha_completada).toLocaleDateString('es-PE'):''}</td>
                      {questions.map(q=><td key={q.id} style={{maxWidth:130,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{amap[q.id]||'—'}</td>)}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab==='pendientes'&&(
        <div className="card" style={{padding:0}}>
          <div style={{padding:'12px 16px',background:'var(--yellow-l)',fontSize:13,color:'#92400e',fontWeight:600,borderRadius:'var(--r2) var(--r2) 0 0'}}>
            ⏳ {pending.length} alumnos aún no han respondido esta encuesta
          </div>
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>N°</th><th>Alumno</th><th>Nivel</th><th>Grado / Sec.</th></tr></thead>
              <tbody>
                {pending.length===0?<tr><td colSpan={4} style={{textAlign:'center',padding:24,color:'var(--g400)'}}>✅ Todos respondieron</td></tr>
                :pending.map((s,i)=>(
                  <tr key={s.id}>
                    <td>{i+1}</td>
                    <td style={{fontWeight:600}}>{s.apellido_paterno} {s.apellido_materno}, {s.nombres}</td>
                    <td><span className={`badge ${s.nivel==='Primaria'?'badge-blue':'badge-purple'}`}>{s.nivel}</span></td>
                    <td>{s.grado?.trim()} "{s.seccion?.trim()}"</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── MAIN SURVEYS PAGE ────────────────────────────────────────
export default function SurveysAdmin() {
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); // list | build | results
  const [editing, setEditing] = useState(null);
  const [resultsId, setResultsId] = useState(null);
  const [msg, setMsg] = useState('');

  const load = async () => {
    setLoading(true);
    const r = await axios.get(`${API}/api/surveys`);
    setSurveys(r.data); setLoading(false);
  };

  useEffect(()=>{ load(); },[]);

  const del = async id => {
    if (!window.confirm('¿Eliminar encuesta y todas sus respuestas?')) return;
    await axios.delete(`${API}/api/surveys/${id}`); load();
  };

  const duplicate = async s => {
    await axios.post(`${API}/api/surveys/${s.id}/duplicate`);
    load(); setMsg('Encuesta duplicada'); setTimeout(()=>setMsg(''),3000);
  };

  const toggleEstado = async s => {
    const nuevo = s.estado==='activa'?'cerrada':'activa';
    await axios.put(`${API}/api/surveys/${s.id}`,{titulo:s.titulo,descripcion:s.descripcion,estado:nuevo});
    load();
  };

  if (view==='build') return <SurveyBuilder survey={editing} onSave={()=>{setView('list');setEditing(null);load();}} onCancel={()=>{setView('list');setEditing(null);}}/>;
  if (view==='results'&&resultsId) return <SurveyResults surveyId={resultsId} onBack={()=>{setView('list');setResultsId(null);load();}}/>;

  const stateBadge = e => ({ borrador:'badge-gray', activa:'badge-green', cerrada:'badge-red', archivada:'badge-gray' }[e]||'badge-gray');

  return (
    <div>
      {msg&&<div className="alert alert-success">✅ {msg}</div>}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:800}}>📋 Encuestas</h1>
          <p style={{fontSize:13,color:'var(--g400)',marginTop:4}}>{surveys.length} encuestas · {surveys.filter(s=>s.estado==='activa').length} activas</p>
        </div>
        <button className="btn btn-primary" onClick={()=>{setEditing(null);setView('build');}}>➕ Nueva Encuesta</button>
      </div>

      {loading?<div className="loading"><div className="spinner"/></div>
      :surveys.length===0?<div className="empty"><div className="empty-icon">📭</div><h3>Sin encuestas</h3><p>Crea la primera encuesta</p></div>
      :surveys.map(s=>(
        <div key={s.id} className="card" style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:16,flexWrap:'wrap',borderLeft:`4px solid ${s.estado==='activa'?'var(--green)':s.estado==='borrador'?'var(--yellow)':'var(--g300)'}`}}>
          <div style={{flex:1,minWidth:200}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6,flexWrap:'wrap'}}>
              <span style={{fontWeight:700,fontSize:16}}>{s.titulo}</span>
              <span className={`badge ${stateBadge(s.estado)}`}><span className="dot"/>{s.estado}</span>
            </div>
            {s.descripcion&&<p style={{fontSize:13,color:'var(--g400)',marginBottom:8}}>{s.descripcion}</p>}
            <div style={{display:'flex',gap:16,fontSize:12,color:'var(--g400)',flexWrap:'wrap'}}>
              <span>📝 {s.total_preguntas} preguntas</span>
              <span>✅ {s.total_respuestas} respuestas</span>
              {s.nivel_asignado&&<span>🏫 {s.nivel_asignado}</span>}
              {s.grado_asignado&&<span>📚 {s.grado_asignado}</span>}
              {s.fecha_fin&&<span>📅 Cierra: {new Date(s.fecha_fin).toLocaleDateString('es-PE')}</span>}
              <span>👤 {s.created_by_name}</span>
            </div>
          </div>
          <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
            <button className="btn btn-secondary btn-sm" onClick={()=>{setResultsId(s.id);setView('results');}}>📊 Resultados</button>
            <button className="btn btn-success btn-sm" onClick={()=>window.open(`${API}/api/surveys/${s.id}/export`,'_blank')}>📥 Excel</button>
            <button className="btn btn-outline btn-sm" onClick={()=>{setEditing(s);setView('build');}}>✏️</button>
            <button className="btn btn-ghost btn-sm" onClick={()=>duplicate(s)}>📋 Duplicar</button>
            <button className="btn btn-ghost btn-sm" onClick={()=>toggleEstado(s)}>{s.estado==='activa'?'⏸ Cerrar':'▶️ Activar'}</button>
            <button className="btn btn-danger btn-sm" onClick={()=>del(s.id)}>🗑</button>
          </div>
        </div>
      ))}
    </div>
  );
}
