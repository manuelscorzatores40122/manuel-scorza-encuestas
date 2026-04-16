import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';

const API = process.env.REACT_APP_API_URL || '';
const ESTADOS = ['activo','retirado','egresado','bloqueado'];
const NIVELES = ['Primaria','Secundaria'];
const GRADOS_P = ['PRIMERO','SEGUNDO','TERCERO','CUARTO','QUINTO','SEXTO'];
const GRADOS_S = ['PRIMERO','SEGUNDO','TERCERO','CUARTO','QUINTO'];
const PARENTESCOS = ['Padre','Madre','Abuelo/a','Tío/a','Hermano/a','Tutor legal','Otro'];
const PER_PAGE_OPTS = [10,25,50,100];

const cleanPhone = v => {
  if (!v) return null;
  v = String(v).trim();
  if (v.includes('/')) {
    for (const p of v.split('/')) {
      const d = p.trim().replace(/\D/g,'');
      if (d.startsWith('9') && d.length===9) return d;
    }
    return v.split('/').pop().trim().replace(/\D/g,'').substring(0,20)||null;
  }
  return v.replace(/[^\d\-\+\s]/g,'').trim().substring(0,20)||null;
};

const parseFecha = raw => {
  if (!raw) return null;
  const s = String(raw).trim();
  if (s.includes('/')) { const p=s.split('/'); if(p.length===3) return `${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}`; }
  if (typeof raw==='number') { try { const d=XLSX.SSF.parse_date_code(raw); if(d) return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`; } catch{} }
  return null;
};

const splitApod = full => {
  if (!full) return [null,null];
  const p = full.trim().split(' ');
  if (p.length>=3) return [p.slice(0,2).join(' '), p.slice(2).join(' ')];
  if (p.length===2) return [p[0],p[1]];
  return [null,full];
};

function Avatar({ src, nombre, apellido, sexo, size=34 }) {
  const init = `${(apellido||'')[0]||''}${(nombre||'')[0]||''}`.toUpperCase();
  const bg = sexo==='Mujer'?'linear-gradient(135deg,#f472b6,#c084fc)':'linear-gradient(135deg,#60a5fa,#34d399)';
  return (
    <div className="avatar" style={{width:size,height:size,background:src?'transparent':bg,fontSize:12,border:'2px solid var(--g200)'}}>
      {src?<img src={src} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} onError={e=>e.target.style.display='none'}/>:init}
    </div>
  );
}

function StatusBadge({ estado }) {
  return <span className={`badge status-${estado}`}><span className="dot"/>{estado}</span>;
}

// ── Student Edit Modal ───────────────────────────────────────
function StudentModal({ student, onClose, onSaved }) {
  const [form, setForm] = useState(student || {
    nivel:'Primaria', grado:'', seccion:'', sexo:'', estado:'activo',
    nombres:'', apellido_paterno:'', apellido_materno:'', dni:'', fecha_nacimiento:'',
    codigo_estudiante:'', telefono:'', email:'', direccion:'',
    padre_nombre:'', padre_dni:'', padre_telefono:'', padre_email:'',
    madre_nombre:'', madre_dni:'', madre_telefono:'', madre_email:'',
    apoderado_nombre:'', apoderado_apellidos:'', apoderado_dni:'',
    apoderado_telefono:'', apoderado_email:'', apoderado_parentesco:'',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [tab, setTab] = useState('datos');

  const set = (f,v) => setForm(p=>({...p,[f]:v}));
  const inp = (field,type='text',ph='') => ({
    className:'input', type, placeholder:ph,
    value:form[field]||'', onChange:e=>set(field,e.target.value)
  });

  const save = async () => {
    if (!form.nombres||!form.dni) return setErr('DNI y nombres son obligatorios');
    setSaving(true); setErr('');
    try {
      const url = student?.id ? `${API}/api/students/${student.id}` : `${API}/api/students`;
      const method = student?.id ? 'put' : 'post';
      const r = await axios[method](url, form);
      onSaved(r.data);
    } catch(e) { setErr(e.response?.data?.error||'Error al guardar'); }
    setSaving(false);
  };

  const grados = form.nivel==='Primaria' ? GRADOS_P : GRADOS_S;

  return (
    <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal modal-lg">
        <div className="modal-head">
          <div className="modal-title">{student?.id?'✏️ Editar Alumno':'➕ Nuevo Alumno'}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div style={{padding:'0 22px'}}>
          <div className="tabs" style={{margin:'16px 0 0'}}>
            {[['datos','👤 Datos'],['contacto','📱 Contacto'],['familia','👨‍👩‍👦 Familia']].map(([k,l])=>(
              <button key={k} className={`tab ${tab===k?'active':''}`} onClick={()=>setTab(k)}>{l}</button>
            ))}
          </div>
        </div>
        <div className="modal-body">
          {err && <div className="alert alert-error">{err}</div>}

          {tab==='datos' && (
            <>
              <div className="form-row cols-3">
                <div className="form-group"><label className="label">Nivel *</label>
                  <select className="select" value={form.nivel} onChange={e=>set('nivel',e.target.value)}>
                    {NIVELES.map(n=><option key={n} value={n}>{n}</option>)}
                  </select></div>
                <div className="form-group"><label className="label">Grado *</label>
                  <select className="select" value={form.grado||''} onChange={e=>set('grado',e.target.value)}>
                    <option value="">Seleccionar</option>
                    {grados.map(g=><option key={g} value={g}>{g}</option>)}
                  </select></div>
                <div className="form-group"><label className="label">Sección *</label>
                  <select className="select" value={form.seccion||''} onChange={e=>set('seccion',e.target.value)}>
                    <option value="">Seleccionar</option>
                    {['A','B','C','D','E','F'].map(s=><option key={s} value={s}>{s}</option>)}
                  </select></div>
              </div>
              <div className="form-row cols-2">
                <div className="form-group"><label className="label">DNI *</label><input {...inp('dni','text','12345678')} maxLength={12}/></div>
                <div className="form-group"><label className="label">Código Estudiante</label><input {...inp('codigo_estudiante')}/></div>
              </div>
              <div className="form-row cols-3">
                <div className="form-group"><label className="label">Apellido Paterno *</label><input {...inp('apellido_paterno')}/></div>
                <div className="form-group"><label className="label">Apellido Materno *</label><input {...inp('apellido_materno')}/></div>
                <div className="form-group"><label className="label">Nombres *</label><input {...inp('nombres')}/></div>
              </div>
              <div className="form-row cols-3">
                <div className="form-group"><label className="label">Sexo</label>
                  <select className="select" value={form.sexo||''} onChange={e=>set('sexo',e.target.value)}>
                    <option value="">Seleccionar</option>
                    <option value="Hombre">Hombre</option><option value="Mujer">Mujer</option>
                  </select></div>
                <div className="form-group"><label className="label">Fecha Nacimiento</label><input {...inp('fecha_nacimiento','date')}/></div>
                <div className="form-group"><label className="label">Estado</label>
                  <select className="select" value={form.estado||'activo'} onChange={e=>set('estado',e.target.value)}>
                    {ESTADOS.map(s=><option key={s} value={s}>{s}</option>)}
                  </select></div>
              </div>
            </>
          )}

          {tab==='contacto' && (
            <div className="form-row cols-2">
              {[['telefono','Teléfono','999 999 999'],['email','Email','correo@ejemplo.com'],['direccion','Dirección','Calle, número..']].map(([f,l,ph])=>(
                <div key={f} className="form-group"><label className="label">{l}</label><input {...inp(f,'text',ph)}/></div>
              ))}
            </div>
          )}

          {tab==='familia' && (
            <>
              <div style={{fontWeight:700,fontSize:12,color:'var(--blue)',textTransform:'uppercase',letterSpacing:.5,marginBottom:10}}>
                👨‍👩‍👦 Apoderado Principal
              </div>
              <div className="form-row cols-3">
                <div className="form-group"><label className="label">Apellidos</label><input {...inp('apoderado_apellidos')}/></div>
                <div className="form-group"><label className="label">Nombres</label><input {...inp('apoderado_nombre')}/></div>
                <div className="form-group"><label className="label">Parentesco</label>
                  <select className="select" value={form.apoderado_parentesco||''} onChange={e=>set('apoderado_parentesco',e.target.value)}>
                    <option value="">—</option>{PARENTESCOS.map(p=><option key={p} value={p}>{p}</option>)}
                  </select></div>
                <div className="form-group"><label className="label">DNI</label><input {...inp('apoderado_dni')}/></div>
                <div className="form-group"><label className="label">📞 Celular Emergencia</label><input {...inp('apoderado_telefono','text','999 999 999')}/></div>
                <div className="form-group"><label className="label">Email</label><input {...inp('apoderado_email','email')}/></div>
              </div>

              <div style={{borderTop:'1px solid var(--g200)',margin:'16px 0',paddingTop:16}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
                  {[{pre:'padre',title:'👨 Padre'},{pre:'madre',title:'👩 Madre'}].map(({pre,title})=>(
                    <div key={pre}>
                      <div style={{fontWeight:700,fontSize:12,color:'var(--green)',textTransform:'uppercase',letterSpacing:.5,marginBottom:10}}>{title}</div>
                      {[['nombre','Apellidos y Nombres'],['dni','DNI'],['telefono','📞 Celular'],['email','Email']].map(([f,l])=>(
                        <div key={f} className="form-group"><label className="label">{l}</label><input {...inp(`${pre}_${f}`)}/></div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving?'⏳ Guardando...':'💾 Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Student Detail Modal (view + emergency) ──────────────────
function StudentDetail({ student: s, onClose, onEdit, onReset, onEstado }) {
  const cel = t => t ? <a href={`tel:${t}`} className="call-btn">📞 {t}</a> : <span style={{color:'var(--g300)',fontSize:12}}>Sin celular</span>;
  const Row = ({l,v}) => (
    <div style={{display:'flex',gap:8,padding:'6px 0',borderBottom:'1px solid var(--g100)'}}>
      <span style={{fontSize:11,fontWeight:700,color:'var(--g400)',minWidth:100,textTransform:'uppercase',paddingTop:2}}>{l}</span>
      <span style={{fontSize:13,color:v?'var(--g900)':'var(--g300)',flex:1}}>{v||'—'}</span>
    </div>
  );

  return (
    <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal modal-lg">
        {/* Hero */}
        <div className="hero" style={{borderRadius:'16px 16px 0 0',padding:'20px 22px'}}>
          <Avatar src={s.foto_url} nombre={s.nombres} apellido={s.apellido_paterno} sexo={s.sexo} size={68}/>
          <div style={{flex:1}}>
            <div style={{fontWeight:800,fontSize:18,color:'white',lineHeight:1.2}}>{s.apellido_paterno} {s.apellido_materno}</div>
            <div style={{fontSize:14,color:'rgba(255,255,255,.8)',marginTop:3}}>{s.nombres}</div>
            <div style={{display:'flex',gap:8,marginTop:10,flexWrap:'wrap'}}>
              {[s.nivel,`${s.grado?.trim()} "${s.seccion?.trim()}"`,`DNI: ${s.dni}`].map((t,i)=>(
                <span key={i} style={{background:'rgba(255,255,255,.15)',borderRadius:20,padding:'3px 12px',fontSize:12,fontWeight:600,color:'white'}}>{t}</span>
              ))}
              <StatusBadge estado={s.estado||'activo'}/>
            </div>
          </div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            <button className="btn btn-sm" style={{background:'rgba(255,255,255,.15)',color:'white',border:'1px solid rgba(255,255,255,.3)'}} onClick={onEdit}>✏️ Editar</button>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="modal-body">
          {/* Emergency contacts */}
          <div style={{marginBottom:20}}>
            <div style={{fontSize:12,fontWeight:700,color:'var(--g500)',textTransform:'uppercase',letterSpacing:1,marginBottom:12}}>🚨 Contactos de Emergencia</div>
            <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
              {[
                {label:'Apoderado',icon:'👨‍👩‍👦',color:'var(--blue)',
                 nombre:`${s.apoderado_apellidos||''} ${s.apoderado_nombre||''}`.trim()||null,
                 tel:s.apoderado_telefono, par:s.apoderado_parentesco},
                {label:'Padre',icon:'👨',color:'var(--green)',nombre:s.padre_nombre,tel:s.padre_telefono},
                {label:'Madre',icon:'👩',color:'var(--purple)',nombre:s.madre_nombre,tel:s.madre_telefono},
              ].map(c=>(
                <div key={c.label} style={{flex:1,minWidth:160,background:'var(--g50)',border:'1.5px solid var(--g200)',borderRadius:10,padding:'12px 14px'}}>
                  <div style={{fontWeight:700,fontSize:12,color:c.color,marginBottom:6}}>{c.icon} {c.label}{c.par&&` · ${c.par}`}</div>
                  {c.nombre&&<div style={{fontSize:12,fontWeight:600,marginBottom:6,color:'var(--g700)'}}>{c.nombre}</div>}
                  {cel(c.tel)}
                </div>
              ))}
            </div>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
            <div>
              <div style={{fontSize:12,fontWeight:700,color:'var(--g500)',textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>Datos del Alumno</div>
              <Row l="Fecha Nac." v={s.fecha_nacimiento?new Date(s.fecha_nacimiento).toLocaleDateString('es-PE'):null}/>
              <Row l="Código" v={s.codigo_estudiante}/>
              <Row l="Sexo" v={s.sexo}/><Row l="Email" v={s.email}/><Row l="Teléfono" v={s.telefono}/>
              <Row l="Dirección" v={s.direccion}/><Row l="Importado" v={s.importado_desde}/>
            </div>
            <div>
              <div style={{fontSize:12,fontWeight:700,color:'var(--g500)',textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>Datos DNI Familia</div>
              <Row l="Ap. DNI" v={s.apoderado_dni}/><Row l="Padre DNI" v={s.padre_dni}/><Row l="Madre DNI" v={s.madre_dni}/>
              <div style={{marginTop:14}}>
                <div style={{fontSize:12,fontWeight:700,color:'var(--g500)',textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>Cuenta</div>
                <Row l="Estado cuenta" v={s.user_estado}/><Row l="Último acceso" v={s.ultimo_acceso?new Date(s.ultimo_acceso).toLocaleString('es-PE'):null}/>
              </div>
            </div>
          </div>

          <div style={{display:'flex',gap:8,marginTop:18,flexWrap:'wrap'}}>
            <button className="btn btn-warning btn-sm" onClick={()=>onReset(s)}>🔑 Restablecer contraseña</button>
            {ESTADOS.filter(e=>e!==s.estado).map(e=>(
              <button key={e} className="btn btn-ghost btn-sm" onClick={()=>onEstado(s,e)}>
                {e==='activo'?'✅':e==='bloqueado'?'🔒':e==='retirado'?'⏸':'🎓'} Marcar {e}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Import Result Modal ──────────────────────────────────────
function ImportResult({ result, onClose }) {
  return (
    <div className="overlay">
      <div className="modal modal-sm">
        <div className="modal-head">
          <div className="modal-title">📥 Resultado de Importación</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="import-result">
            {[
              {val:result.nuevos,lbl:'Nuevos',bg:'var(--green-l)',c:'var(--green)'},
              {val:result.duplicados,lbl:'Duplicados',bg:'var(--yellow-l)',c:'var(--yellow)'},
              {val:result.errores,lbl:'Errores',bg:'var(--red-l)',c:'var(--red)'},
              {val:result.nuevos+result.duplicados+result.errores,lbl:'Total',bg:'var(--blue-l)',c:'var(--blue)'},
            ].map(s=>(
              <div key={s.lbl} className="import-stat" style={{background:s.bg}}>
                <div className="val" style={{color:s.c}}>{s.val}</div>
                <div className="lbl" style={{color:s.c}}>{s.lbl}</div>
              </div>
            ))}
          </div>
          {result.duplicados_detalle?.length>0 && (
            <div style={{marginTop:14}}>
              <div style={{fontSize:12,fontWeight:700,color:'var(--g500)',marginBottom:6}}>DNIs duplicados (no importados):</div>
              <div style={{maxHeight:100,overflowY:'auto',fontSize:12,color:'var(--g600)',background:'var(--g50)',padding:8,borderRadius:6}}>
                {result.duplicados_detalle.join(', ')}
              </div>
            </div>
          )}
          {result.errores_detalle?.length>0 && (
            <div style={{marginTop:10}}>
              <div style={{fontSize:12,fontWeight:700,color:'var(--red)',marginBottom:6}}>Errores:</div>
              <div style={{maxHeight:120,overflowY:'auto',fontSize:11,color:'var(--g600)',background:'var(--red-l)',padding:8,borderRadius:6}}>
                {result.errores_detalle.map((e,i)=><div key={i}>DNI {e.dni}: {e.error}</div>)}
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer"><button className="btn btn-primary" onClick={onClose}>Entendido</button></div>
      </div>
    </div>
  );
}

// ── MAIN STUDENTS PAGE ───────────────────────────────────────
export default function Students() {
  const [students, setStudents] = useState([]);
  const [pagination, setPagination] = useState({ total:0, page:1, pages:1, limit:25 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ q:'', nivel:'', grado:'', seccion:'', sexo:'', estado:'', con_celular:'' });
  const [perPage, setPerPage] = useState(25);
  const [page, setPage] = useState(1);
  const [viewStudent, setViewStudent] = useState(null);
  const [editStudent, setEditStudent] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [importing, setImporting] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const fileRef = useRef();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ ...filters, page, limit: perPage });
      const r = await axios.get(`${API}/api/students?${params}`);
      setStudents(r.data.data); setPagination(r.data.pagination);
    } catch(e) { setErr(e.response?.data?.error||'Error al cargar'); }
    setLoading(false);
  }, [filters, page, perPage]);

  useEffect(() => { load(); }, [load]);

  const setFilter = (k,v) => { setFilters(p=>({...p,[k]:v})); setPage(1); };

  const handleImport = async e => {
    const file = e.target.files?.[0]; if (!file) return;
    setImporting(true); setErr('');
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type:'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header:1, defval:'' });

      let isPrimaria = false;
      for (let i=0;i<15;i++) {
        const r = rows[i]||[];
        if (r[19]==='PADRE') { isPrimaria=true; break; }
        if (r[18]==='PADRE') break;
      }
      const nivel = isPrimaria ? 'Primaria' : 'Secundaria';
      const cm = isPrimaria
        ? {ITEM:1,GRADO:2,SECCION:3,DNI:5,CODIGO:7,AP_PAT:8,AP_MAT:9,NOMBRES:10,SEXO:11,FECHA_NAC:13,
           PADRE:19,PADRE_DNI:32,PADRE_CEL:35,MADRE:36,MADRE_DNI:40,MADRE_CEL:43,
           APOD:44,APOD_PARENTESCO:46,APOD_DNI:48,APOD_CEL:51}
        : {ITEM:1,GRADO:2,SECCION:3,DNI:5,CODIGO:7,AP_PAT:8,AP_MAT:9,NOMBRES:10,SEXO:11,FECHA_NAC:12,
           PADRE:18,PADRE_DNI:31,PADRE_CEL:34,MADRE:35,MADRE_DNI:39,MADRE_CEL:42,
           APOD:43,APOD_PARENTESCO:45,APOD_DNI:47,APOD_CEL:50};

      const g = (row,k) => { const idx=cm[k]; if(idx===undefined||idx>=row.length||!row[idx]) return null; return String(row[idx]).trim()||null; };
      const seen = new Set(); const students = [];

      for (let i=12;i<rows.length;i++) {
        const row = rows[i];
        if (!row||!row[cm.ITEM]) continue;
        try { parseInt(String(row[cm.ITEM]).trim()); } catch { continue; }
        const dni=g(row,'DNI'); const nombres=g(row,'NOMBRES');
        if (!dni||!nombres||seen.has(dni)) continue;
        seen.add(dni);
        const [apAps,apNom] = splitApod(g(row,'APOD'));
        students.push({
          dni, nombres, apellido_paterno:g(row,'AP_PAT'), apellido_materno:g(row,'AP_MAT'),
          grado:g(row,'GRADO'), seccion:g(row,'SECCION'), sexo:g(row,'SEXO'),
          fecha_nacimiento:parseFecha(row[cm.FECHA_NAC]), codigo_estudiante:g(row,'CODIGO'),
          padre_nombre:g(row,'PADRE'), padre_dni:g(row,'PADRE_DNI'), padre_telefono:cleanPhone(g(row,'PADRE_CEL')),
          madre_nombre:g(row,'MADRE'), madre_dni:g(row,'MADRE_DNI'), madre_telefono:cleanPhone(g(row,'MADRE_CEL')),
          apoderado_nombre:apNom, apoderado_apellidos:apAps,
          apoderado_dni:g(row,'APOD_DNI'), apoderado_parentesco:g(row,'APOD_PARENTESCO'), apoderado_telefono:cleanPhone(g(row,'APOD_CEL')),
        });
      }
      if (!students.length) { setErr('No se encontraron alumnos válidos'); setImporting(false); return; }
      const res = await axios.post(`${API}/api/students/import`, { students, nivel, archivo_nombre: file.name });
      setImportResult(res.data); load();
    } catch(e) { setErr('Error: '+(e.response?.data?.error||e.message)); }
    finally { setImporting(false); if(fileRef.current) fileRef.current.value=''; }
  };

  const exportExcel = () => {
    const params = new URLSearchParams({ nivel:filters.nivel, grado:filters.grado, seccion:filters.seccion, estado:filters.estado });
    window.open(`${API}/api/students/export/excel?${params}`, '_blank');
  };

  const handleEstado = async (s, estado) => {
    try {
      await axios.patch(`${API}/api/students/${s.id}/estado`, { estado });
      load(); setViewStudent(null);
      setMsg(`Alumno marcado como ${estado}`); setTimeout(()=>setMsg(''),3000);
    } catch(e) { setErr(e.response?.data?.error||'Error'); }
  };

  const handleReset = async (s) => {
    if (!window.confirm(`¿Restablecer contraseña de ${s.nombres} a su DNI?`)) return;
    try {
      await axios.post(`${API}/api/students/${s.id}/reset-password`);
      setMsg(`Contraseña restablecida al DNI: ${s.dni}`); setTimeout(()=>setMsg(''),4000);
    } catch(e) { setErr(e.response?.data?.error||'Error'); }
  };

  const handleDelete = async (s) => {
    if (!window.confirm(`¿Eliminar permanentemente a ${s.nombres}? Esta acción no se puede deshacer.`)) return;
    try { await axios.delete(`${API}/api/students/${s.id}`); load(); setViewStudent(null); }
    catch(e) { setErr(e.response?.data?.error||'Error al eliminar'); }
  };

  const grados = filters.nivel==='Primaria' ? GRADOS_P : filters.nivel==='Secundaria' ? GRADOS_S : [...GRADOS_P,...GRADOS_S].filter((g,i,a)=>a.indexOf(g)===i);

  return (
    <div>
      {err&&<div className="alert alert-error">⚠️ {err}<button onClick={()=>setErr('')} style={{marginLeft:'auto',background:'none',border:'none',cursor:'pointer',fontSize:16}}>✕</button></div>}
      {msg&&<div className="alert alert-success">✅ {msg}</div>}

      {/* Search & Filters */}
      <div className="search-bar">
        <div className="search-input-wrap" style={{flex:2,minWidth:220}}>
          <span className="icon">🔍</span>
          <input className="input search-input" placeholder="Buscar por nombre, DNI, celular..." value={filters.q} onChange={e=>setFilter('q',e.target.value)}/>
        </div>
        <div className="filter-group">
          <select className="select" style={{minWidth:110}} value={filters.nivel} onChange={e=>setFilter('nivel',e.target.value)}>
            <option value="">Todos los niveles</option>
            {NIVELES.map(n=><option key={n} value={n}>{n}</option>)}
          </select>
          <select className="select" style={{minWidth:120}} value={filters.grado} onChange={e=>setFilter('grado',e.target.value)}>
            <option value="">Todos los grados</option>
            {grados.map(g=><option key={g} value={g}>{g}</option>)}
          </select>
          <select className="select" style={{minWidth:100}} value={filters.seccion} onChange={e=>setFilter('seccion',e.target.value)}>
            <option value="">Todas las secs.</option>
            {['A','B','C','D','E','F'].map(s=><option key={s} value={s}>Sección {s}</option>)}
          </select>
          <select className="select" style={{minWidth:100}} value={filters.sexo} onChange={e=>setFilter('sexo',e.target.value)}>
            <option value="">Sexo</option><option value="Hombre">Hombre</option><option value="Mujer">Mujer</option>
          </select>
          <select className="select" style={{minWidth:110}} value={filters.estado} onChange={e=>setFilter('estado',e.target.value)}>
            <option value="">Todos los estados</option>
            {ESTADOS.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
          <select className="select" style={{minWidth:130}} value={filters.con_celular} onChange={e=>setFilter('con_celular',e.target.value)}>
            <option value="">Con/sin celular</option>
            <option value="true">Con celular</option>
            <option value="false">Sin celular</option>
          </select>
        </div>
        <div style={{display:'flex',gap:6,marginLeft:'auto'}}>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{display:'none'}} onChange={handleImport} id="imp-file"/>
          <label htmlFor="imp-file" className="btn btn-primary" style={{cursor:importing?'wait':'pointer'}}>
            {importing?<><div className="spinner" style={{width:14,height:14,borderWidth:2}}/> Importando...</>:'📥 Importar Excel'}
          </label>
          <button className="btn btn-success" onClick={()=>setEditStudent({})}>➕ Nuevo</button>
          <button className="btn btn-ghost" onClick={exportExcel}>📤 Exportar</button>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{display:'flex',gap:12,marginBottom:12,fontSize:13,color:'var(--g500)'}}>
        <span>Total: <strong style={{color:'var(--g900)'}}>{pagination.total}</strong></span>
        <span>·</span>
        <span>Mostrando página <strong>{page}</strong> de <strong>{pagination.pages}</strong></span>
        <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:6}}>
          <span>Por página:</span>
          {PER_PAGE_OPTS.map(n=>(
            <button key={n} className={`page-btn ${perPage===n?'active':''}`} onClick={()=>{setPerPage(n);setPage(1);}}>{n}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? <div className="loading"><div className="spinner"/></div> : (
        <div className="card" style={{padding:0}}>
          <div className="tbl-wrap">
            <table>
              <thead><tr>
                <th>Alumno</th><th>Nivel</th><th>Grado / Sec.</th><th>Estado</th>
                <th>🚨 Apoderado</th><th>👨 Padre</th><th>👩 Madre</th><th>Acciones</th>
              </tr></thead>
              <tbody>
                {students.length===0
                  ? <tr><td colSpan={8} style={{textAlign:'center',padding:40,color:'var(--g400)'}}>Sin resultados</td></tr>
                  : students.map(s=>(
                  <tr key={s.id}>
                    <td>
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        <Avatar src={s.foto_url} nombre={s.nombres} apellido={s.apellido_paterno} sexo={s.sexo}/>
                        <div>
                          <div style={{fontWeight:700,fontSize:13}}>{s.apellido_paterno} {s.apellido_materno}</div>
                          <div style={{fontSize:12,color:'var(--g400)'}}>{s.nombres}</div>
                          <div style={{fontSize:11,color:'var(--g300)'}}>DNI: {s.dni}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className={`badge ${s.nivel==='Primaria'?'badge-blue':'badge-purple'}`}>{s.nivel}</span></td>
                    <td style={{whiteSpace:'nowrap'}}>
                      <span className="badge badge-cyan">{s.grado?.trim()}</span>{' '}
                      <span className="badge badge-gray">"{s.seccion?.trim()}"</span>
                    </td>
                    <td><StatusBadge estado={s.estado||'activo'}/></td>
                    <td>
                      {s.apoderado_nombre||s.apoderado_apellidos ? (
                        <div>
                          <div style={{fontSize:12,fontWeight:600,marginBottom:4,maxWidth:150,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                            {s.apoderado_apellidos} {s.apoderado_nombre}
                            {s.apoderado_parentesco&&<span style={{fontSize:10,color:'var(--g400)',marginLeft:4}}>({s.apoderado_parentesco})</span>}
                          </div>
                          {s.apoderado_telefono?<a href={`tel:${s.apoderado_telefono}`} className="call-btn">📞 {s.apoderado_telefono}</a>:<span style={{fontSize:11,color:'var(--g300)'}}>Sin celular</span>}
                        </div>
                      ):<span style={{fontSize:11,color:'var(--g300)'}}>—</span>}
                    </td>
                    <td>
                      {s.padre_nombre&&<div style={{fontSize:12,maxWidth:130,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',marginBottom:3}}>{s.padre_nombre}</div>}
                      {s.padre_telefono?<a href={`tel:${s.padre_telefono}`} className="call-btn">📞 {s.padre_telefono}</a>:<span style={{fontSize:11,color:'var(--g300)'}}>—</span>}
                    </td>
                    <td>
                      {s.madre_nombre&&<div style={{fontSize:12,maxWidth:130,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',marginBottom:3}}>{s.madre_nombre}</div>}
                      {s.madre_telefono?<a href={`tel:${s.madre_telefono}`} className="call-btn">📞 {s.madre_telefono}</a>:<span style={{fontSize:11,color:'var(--g300)'}}>—</span>}
                    </td>
                    <td>
                      <div className="tbl-actions">
                        <button className="btn btn-outline btn-xs" onClick={()=>setViewStudent(s)}>👁</button>
                        <button className="btn btn-secondary btn-xs" onClick={()=>setEditStudent(s)}>✏️</button>
                        <button className="btn btn-warning btn-xs" onClick={()=>handleReset(s)}>🔑</button>
                        <button className="btn btn-danger btn-xs" onClick={()=>handleDelete(s)}>🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="pagination">
            <span>Mostrando {((page-1)*perPage)+1}–{Math.min(page*perPage,pagination.total)} de {pagination.total} alumnos</span>
            <div className="page-btns">
              <button className="page-btn" onClick={()=>setPage(1)} disabled={page===1}>«</button>
              <button className="page-btn" onClick={()=>setPage(p=>p-1)} disabled={page===1}>‹</button>
              {Array.from({length:Math.min(5,pagination.pages)},(_,i)=>{
                const pg = page<=3?i+1:page>=pagination.pages-2?pagination.pages-4+i:page-2+i;
                if (pg<1||pg>pagination.pages) return null;
                return <button key={pg} className={`page-btn ${pg===page?'active':''}`} onClick={()=>setPage(pg)}>{pg}</button>;
              })}
              <button className="page-btn" onClick={()=>setPage(p=>p+1)} disabled={page===pagination.pages}>›</button>
              <button className="page-btn" onClick={()=>setPage(pagination.pages)} disabled={page===pagination.pages}>»</button>
            </div>
          </div>
        </div>
      )}

      {viewStudent && (
        <StudentDetail
          student={viewStudent}
          onClose={()=>setViewStudent(null)}
          onEdit={()=>{setEditStudent(viewStudent);setViewStudent(null);}}
          onReset={handleReset}
          onEstado={handleEstado}
        />
      )}
      {editStudent!==null && (
        <StudentModal
          student={editStudent?.id?editStudent:null}
          onClose={()=>setEditStudent(null)}
          onSaved={()=>{setEditStudent(null);load();setMsg('Alumno guardado');setTimeout(()=>setMsg(''),3000);}}
        />
      )}
      {importResult && <ImportResult result={importResult} onClose={()=>setImportResult(null)}/>}
    </div>
  );
}
