import { useState, useEffect } from 'react';
import axios from 'axios';
const API = process.env.REACT_APP_API_URL || '';
const ROLES = ['admin','director','tutor','docente'];
const ROLE_COLOR = { admin:'badge-red', director:'badge-purple', tutor:'badge-blue', docente:'badge-cyan' };

function UserModal({ user, onClose, onSaved }) {
  const [form, setForm] = useState({ dni:'', nombre:'', apellido_paterno:'', apellido_materno:'', email:'', role:'docente', estado:'activo', password:'', ...(user||{}) });
  const [saving, setSaving] = useState(false); const [err, setErr] = useState('');
  const sf=(f,v)=>setForm(p=>({...p,[f]:v}));
  const inp=(f,type='text',ph='')=>({className:'input',type,placeholder:ph,value:form[f]||'',onChange:e=>sf(f,e.target.value)});
  const save=async()=>{
    if(!form.dni||!form.nombre||!form.role) return setErr('DNI, nombre y rol son obligatorios');
    setSaving(true); setErr('');
    try {
      const method=user?.id?'put':'post'; const url=user?.id?`${API}/api/system-users/${user.id}`:`${API}/api/system-users`;
      const r=await axios[method](url,form); onSaved(r.data);
    } catch(e){setErr(e.response?.data?.error||'Error');} setSaving(false);
  };
  return (
    <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal modal-sm">
        <div className="modal-head"><div className="modal-title">{user?.id?'✏️ Editar usuario':'➕ Nuevo usuario'}</div><button className="modal-close" onClick={onClose}>✕</button></div>
        <div className="modal-body">
          {err&&<div className="alert alert-error">{err}</div>}
          <div className="form-row cols-2">
            <div className="form-group"><label className="label">DNI *</label><input {...inp('dni','text','12345678')} maxLength={12}/></div>
            <div className="form-group"><label className="label">Rol *</label>
              <select className="select" value={form.role} onChange={e=>sf('role',e.target.value)}>
                {ROLES.map(r=><option key={r} value={r}>{r}</option>)}
              </select></div>
            <div className="form-group" style={{gridColumn:'span 2'}}><label className="label">Nombre *</label><input {...inp('nombre')}/></div>
            <div className="form-group"><label className="label">Apellido Paterno</label><input {...inp('apellido_paterno')}/></div>
            <div className="form-group"><label className="label">Apellido Materno</label><input {...inp('apellido_materno')}/></div>
            <div className="form-group" style={{gridColumn:'span 2'}}><label className="label">Email</label><input {...inp('email','email','correo@ie.edu.pe')}/></div>
            {!user?.id&&<div className="form-group" style={{gridColumn:'span 2'}}><label className="label">Contraseña (vacío = DNI)</label><input {...inp('password','password','Dejar vacío para usar DNI')}/></div>}
            {user?.id&&<div className="form-group"><label className="label">Estado</label>
              <select className="select" value={form.estado||'activo'} onChange={e=>sf('estado',e.target.value)}>
                {['activo','inactivo','bloqueado'].map(s=><option key={s} value={s}>{s}</option>)}
              </select></div>}
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

export default function SystemUsers() {
  const [users, setUsers] = useState([]); const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); const [msg, setMsg] = useState('');
  const load=async()=>{setLoading(true);const r=await axios.get(`${API}/api/system-users`);setUsers(r.data);setLoading(false);};
  useEffect(()=>{load();},[]);
  const del=async u=>{if(!window.confirm(`¿Eliminar a ${u.nombre}?`))return;await axios.delete(`${API}/api/system-users/${u.id}`);load();};
  const reset=async u=>{if(!window.confirm(`¿Restablecer contraseña de ${u.nombre} a su DNI?`))return;await axios.post(`${API}/api/system-users/${u.id}/reset`);setMsg(`Contraseña restablecida al DNI: ${u.dni}`);setTimeout(()=>setMsg(''),4000);};
  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <div><h1 style={{fontSize:22,fontWeight:800}}>👥 Usuarios del Sistema</h1>
          <p style={{fontSize:13,color:'var(--g400)',marginTop:4}}>Administradores, directores, tutores y docentes</p></div>
        <button className="btn btn-primary" onClick={()=>setEditing({})}>➕ Nuevo usuario</button>
      </div>
      {msg&&<div className="alert alert-success">✅ {msg}</div>}
      {loading?<div className="loading"><div className="spinner"/></div>:(
        <div className="card" style={{padding:0}}>
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>Usuario</th><th>DNI</th><th>Rol</th><th>Estado</th><th>Último acceso</th><th>Acciones</th></tr></thead>
              <tbody>
                {users.map(u=>(
                  <tr key={u.id}>
                    <td><div style={{fontWeight:700}}>{u.apellido_paterno} {u.apellido_materno}, {u.nombre}</div>
                      {u.email&&<div style={{fontSize:12,color:'var(--g400)'}}>{u.email}</div>}</td>
                    <td><code style={{background:'var(--g100)',padding:'2px 7px',borderRadius:5,fontSize:12}}>{u.dni}</code></td>
                    <td><span className={`badge ${ROLE_COLOR[u.role]||'badge-gray'}`}>{u.role}</span></td>
                    <td><span className={`badge status-${u.estado||'activo'}`}><span className="dot"/>{u.estado||'activo'}</span></td>
                    <td style={{fontSize:12,color:'var(--g400)'}}>{u.ultimo_acceso?new Date(u.ultimo_acceso).toLocaleString('es-PE'):'Nunca'}</td>
                    <td><div className="tbl-actions">
                      <button className="btn btn-outline btn-xs" onClick={()=>setEditing(u)}>✏️</button>
                      <button className="btn btn-warning btn-xs" onClick={()=>reset(u)}>🔑</button>
                      {u.dni!=='admin'&&<button className="btn btn-danger btn-xs" onClick={()=>del(u)}>🗑</button>}
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {editing!==null&&<UserModal user={editing?.id?editing:null} onClose={()=>setEditing(null)} onSaved={()=>{setEditing(null);load();setMsg('Usuario guardado');setTimeout(()=>setMsg(''),3000);}}/>}
    </div>
  );
}
