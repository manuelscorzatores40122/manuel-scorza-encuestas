import { useState, useEffect } from 'react';
import axios from 'axios';
const API = process.env.REACT_APP_API_URL || '';
const TIPOS = ['libro','documento','video','enlace','otro'];
const NIVELES = ['Primaria','Secundaria'];
const GRADOS = ['PRIMERO','SEGUNDO','TERCERO','CUARTO','QUINTO','SEXTO'];

function ItemModal({ item, onClose, onSaved }) {
  const [form, setForm] = useState({ titulo:'', descripcion:'', tipo:'libro', archivo_url:'', archivo_nombre:'', nivel_asignado:'', grado_asignado:'', seccion_asignada:'', activo:true, ...(item||{}) });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const sf = (f,v) => setForm(p=>({...p,[f]:v}));
  const inp = (f,ph='') => ({ className:'input', value:form[f]||'', placeholder:ph, onChange:e=>sf(f,e.target.value) });

  const save = async () => {
    if (!form.titulo) return setErr('El título es obligatorio');
    setSaving(true); setErr('');
    try {
      const method = item?.id?'put':'post';
      const url = item?.id?`${API}/api/library/${item.id}`:`${API}/api/library`;
      const r = await axios[method](url, form);
      onSaved(r.data);
    } catch(e) { setErr(e.response?.data?.error||'Error'); }
    setSaving(false);
  };

  return (
    <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div className="modal-head">
          <div className="modal-title">{item?.id?'✏️ Editar material':'➕ Agregar material'}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {err&&<div className="alert alert-error">{err}</div>}
          <div className="form-row cols-2">
            <div className="form-group" style={{gridColumn:'span 2'}}><label className="label">Título *</label><input {...inp('titulo','Ej: Matemáticas 3ro Primaria')}/></div>
            <div className="form-group"><label className="label">Tipo</label>
              <select className="select" value={form.tipo} onChange={e=>sf('tipo',e.target.value)}>
                {TIPOS.map(t=><option key={t} value={t}>{t}</option>)}
              </select></div>
            <div className="form-group"><label className="label">Estado</label>
              <select className="select" value={form.activo?'activo':'inactivo'} onChange={e=>sf('activo',e.target.value==='activo')}>
                <option value="activo">Activo</option><option value="inactivo">Inactivo</option>
              </select></div>
            <div className="form-group" style={{gridColumn:'span 2'}}><label className="label">URL del archivo / enlace</label>
              <input {...inp('archivo_url','https://...')}/></div>
            <div className="form-group" style={{gridColumn:'span 2'}}><label className="label">Nombre visible del archivo</label>
              <input {...inp('archivo_nombre','Ej: libro_matematicas_3ro.pdf')}/></div>
            <div className="form-group" style={{gridColumn:'span 2'}}><label className="label">Descripción</label>
              <textarea className="textarea" value={form.descripcion||''} onChange={e=>sf('descripcion',e.target.value)} rows={2} placeholder="Descripción opcional..."/></div>
          </div>
          <div style={{borderTop:'1px solid var(--g200)',paddingTop:14,marginTop:4}}>
            <div style={{fontSize:12,fontWeight:700,color:'var(--g500)',textTransform:'uppercase',letterSpacing:.5,marginBottom:10}}>🎯 Asignación (vacío = todos)</div>
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
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving?'⏳ Guardando...':'💾 Guardar'}</button>
        </div>
      </div>
    </div>
  );
}

export default function LibraryAdmin() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState('');

  const load = async () => {
    setLoading(true);
    const r = await axios.get(`${API}/api/library`);
    setItems(r.data); setLoading(false);
  };
  useEffect(()=>{ load(); },[]);

  const del = async id => {
    if (!window.confirm('¿Eliminar este material?')) return;
    await axios.delete(`${API}/api/library/${id}`); load();
  };

  const tipoIcon = { libro:'📖', documento:'📄', video:'🎬', enlace:'🔗', otro:'📦' };

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <div><h1 style={{fontSize:22,fontWeight:800}}>📚 Biblioteca</h1>
          <p style={{fontSize:13,color:'var(--g400)',marginTop:4}}>Materiales disponibles para estudiantes por grado</p></div>
        <button className="btn btn-primary" onClick={()=>setEditing({})}>➕ Agregar material</button>
      </div>
      {msg&&<div className="alert alert-success">✅ {msg}</div>}

      {loading?<div className="loading"><div className="spinner"/></div>
      :items.length===0?<div className="empty"><div className="empty-icon">📚</div><h3>Sin materiales</h3><p>Agrega libros y documentos para los alumnos</p></div>
      :(
        <div className="card" style={{padding:0}}>
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>Material</th><th>Tipo</th><th>Asignación</th><th>Estado</th><th>Acciones</th></tr></thead>
              <tbody>
                {items.map(it=>(
                  <tr key={it.id}>
                    <td>
                      <div style={{fontWeight:700,fontSize:14}}>{it.titulo}</div>
                      {it.descripcion&&<div style={{fontSize:12,color:'var(--g400)'}}>{it.descripcion}</div>}
                      {it.archivo_url&&<a href={it.archivo_url} target="_blank" rel="noreferrer" style={{fontSize:12,color:'var(--blue)',display:'block',marginTop:2}}>🔗 {it.archivo_nombre||'Ver archivo'}</a>}
                    </td>
                    <td><span style={{fontSize:18}}>{tipoIcon[it.tipo]}</span> {it.tipo}</td>
                    <td>
                      <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                        {it.nivel_asignado?<span className={`badge ${it.nivel_asignado==='Primaria'?'badge-blue':'badge-purple'}`}>{it.nivel_asignado}</span>:<span className="badge badge-gray">Todos</span>}
                        {it.grado_asignado&&<span className="badge badge-cyan">{it.grado_asignado}</span>}
                        {it.seccion_asignada&&<span className="badge badge-gray">Sec. {it.seccion_asignada}</span>}
                      </div>
                    </td>
                    <td><span className={`badge ${it.activo?'badge-green':'badge-gray'}`}>{it.activo?'Activo':'Inactivo'}</span></td>
                    <td>
                      <div className="tbl-actions">
                        <button className="btn btn-outline btn-xs" onClick={()=>setEditing(it)}>✏️ Editar</button>
                        <button className="btn btn-danger btn-xs" onClick={()=>del(it.id)}>🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editing!==null&&<ItemModal item={editing?.id?editing:null} onClose={()=>setEditing(null)} onSaved={()=>{setEditing(null);load();setMsg('Material guardado');setTimeout(()=>setMsg(''),3000);}}/>}
    </div>
  );
}
