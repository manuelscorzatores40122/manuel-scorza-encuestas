const router = require('express').Router();
const bcrypt = require('bcryptjs');
const XLSX = require('xlsx');
const { query } = require('../db');
const { auth, admin, staff } = require('../middleware/auth');

// ── helpers ──────────────────────────────────────────────────
const cleanPhone = (v) => {
  if (!v) return null;
  v = String(v).trim();
  if (v.includes('/')) {
    for (const p of v.split('/')) {
      const d = p.trim().replace(/\D/g, '');
      if (d.startsWith('9') && d.length === 9) return d;
    }
    const last = v.split('/').pop().trim().replace(/\D/g, '');
    return last.substring(0, 20) || null;
  }
  return v.replace(/[^\d\-\+\s]/g, '').trim().substring(0, 20) || null;
};

const parseFecha = (raw) => {
  if (!raw) return null;
  const s = String(raw).trim();
  if (s.includes('/')) {
    const p = s.split('/');
    if (p.length === 3) return `${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}`;
  }
  return null;
};

const splitApod = (full) => {
  if (!full) return [null, null];
  const parts = full.trim().split(' ');
  if (parts.length >= 3) return [parts.slice(0, 2).join(' '), parts.slice(2).join(' ')];
  if (parts.length === 2) return [parts[0], parts[1]];
  return [null, full];
};

// ── GET /api/students — lista con filtros y paginación ───────
router.get('/', staff, async (req, res) => {
  try {
    const {
      q = '', nivel = '', grado = '', seccion = '', sexo = '',
      estado = '', con_celular = '', page = 1, limit = 25,
    } = req.query;

    const pg = Math.max(1, parseInt(page));
    const lm = Math.min(100, Math.max(5, parseInt(limit)));
    const offset = (pg - 1) * lm;

    const conditions = [];
    const params = [];
    let pi = 1;

    if (q) {
      conditions.push(`(
        unaccent(lower(s.apellido_paterno || ' ' || s.apellido_materno || ' ' || s.nombres)) ILIKE unaccent('%' || $${pi} || '%')
        OR s.dni ILIKE $${pi}
        OR s.padre_telefono ILIKE $${pi}
        OR s.madre_telefono ILIKE $${pi}
        OR s.apoderado_telefono ILIKE $${pi}
      )`);
      params.push(q); pi++;
    }
    if (nivel)      { conditions.push(`s.nivel = $${pi}`);   params.push(nivel); pi++; }
    if (grado)      { conditions.push(`s.grado = $${pi}`);   params.push(grado); pi++; }
    if (seccion)    { conditions.push(`s.seccion = $${pi}`); params.push(seccion); pi++; }
    if (sexo)       { conditions.push(`s.sexo = $${pi}`);    params.push(sexo); pi++; }
    if (estado)     { conditions.push(`s.estado = $${pi}`);  params.push(estado); pi++; }
    if (con_celular === 'true') {
      conditions.push(`(s.apoderado_telefono IS NOT NULL OR s.padre_telefono IS NOT NULL OR s.madre_telefono IS NOT NULL)`);
    }
    if (con_celular === 'false') {
      conditions.push(`(s.apoderado_telefono IS NULL AND s.padre_telefono IS NULL AND s.madre_telefono IS NULL)`);
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const countRes = await query(`SELECT COUNT(*) FROM students s ${where}`, params);
    const total = parseInt(countRes.rows[0].count);

    params.push(lm, offset);
    const dataRes = await query(`
      SELECT s.*, u.email as user_email, u.estado as user_estado, u.ultimo_acceso
      FROM students s
      LEFT JOIN system_users u ON s.user_id = u.id
      ${where}
      ORDER BY s.apellido_paterno, s.apellido_materno, s.nombres
      LIMIT $${pi} OFFSET $${pi+1}
    `, params);

    res.json({
      data: dataRes.rows,
      pagination: { total, page: pg, limit: lm, pages: Math.ceil(total / lm) },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/students/:id ────────────────────────────────────
router.get('/:id', staff, async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT s.*, u.email as user_email, u.estado as user_estado, u.intentos_fallidos, u.ultimo_acceso
      FROM students s LEFT JOIN system_users u ON s.user_id = u.id
      WHERE s.id = $1
    `, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'No encontrado' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/students — crear manual ───────────────────────
router.post('/', admin, async (req, res) => {
  try {
    const {
      dni, nombres, apellido_paterno, apellido_materno,
      nivel = 'Primaria', grado, seccion, sexo, fecha_nacimiento,
      codigo_estudiante,
      padre_nombre, padre_dni, padre_telefono, padre_email,
      madre_nombre, madre_dni, madre_telefono, madre_email,
      apoderado_nombre, apoderado_apellidos, apoderado_dni,
      apoderado_telefono, apoderado_email, apoderado_parentesco,
      telefono, email, direccion,
    } = req.body;

    if (!dni || !nombres) return res.status(400).json({ error: 'DNI y nombres son requeridos' });

    // Verificar duplicado
    const { rows: ex } = await query('SELECT id FROM students WHERE dni=$1', [dni.trim()]);
    if (ex[0]) return res.status(409).json({ error: `El DNI ${dni} ya existe en el sistema` });

    // Crear usuario del sistema
    const hash = await bcrypt.hash(dni.trim(), 10);
    const { rows: ur } = await query(`
      INSERT INTO system_users (dni, nombre, apellido_paterno, apellido_materno, role, password_hash)
      VALUES ($1,$2,$3,$4,'student',$5) RETURNING id
    `, [dni.trim(), nombres, apellido_paterno || '', apellido_materno || '', hash]);

    const { rows: sr } = await query(`
      INSERT INTO students (
        dni, nombres, apellido_paterno, apellido_materno, nivel, grado, seccion, sexo,
        fecha_nacimiento, codigo_estudiante,
        padre_nombre, padre_dni, padre_telefono, padre_email,
        madre_nombre, madre_dni, madre_telefono, madre_email,
        apoderado_nombre, apoderado_apellidos, apoderado_dni,
        apoderado_telefono, apoderado_email, apoderado_parentesco,
        telefono, email, direccion, user_id, importado_desde
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,$16,$17,$18,
        $19,$20,$21,$22,$23,$24,
        $25,$26,$27,$28,'manual'
      ) RETURNING *
    `, [
      dni.trim(), nombres, apellido_paterno||null, apellido_materno||null,
      nivel, grado||null, seccion||null, sexo||null, fecha_nacimiento||null, codigo_estudiante||null,
      padre_nombre||null, padre_dni||null, cleanPhone(padre_telefono),  padre_email||null,
      madre_nombre||null, madre_dni||null, cleanPhone(madre_telefono),  madre_email||null,
      apoderado_nombre||null, apoderado_apellidos||null, apoderado_dni||null,
      cleanPhone(apoderado_telefono), apoderado_email||null, apoderado_parentesco||null,
      telefono||null, email||null, direccion||null, ur[0].id,
    ]);
    res.status(201).json(sr[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'El DNI ya existe' });
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// ── PUT /api/students/:id ────────────────────────────────────
router.put('/:id', admin, async (req, res) => {
  try {
    const {
      nombres, apellido_paterno, apellido_materno, nivel, grado, seccion, sexo,
      fecha_nacimiento, codigo_estudiante, estado, foto_url,
      padre_nombre, padre_dni, padre_telefono, padre_email,
      madre_nombre, madre_dni, madre_telefono, madre_email,
      apoderado_nombre, apoderado_apellidos, apoderado_dni,
      apoderado_telefono, apoderado_email, apoderado_parentesco,
      telefono, email, direccion,
    } = req.body;

    const { rows } = await query(`
      UPDATE students SET
        nombres=$1, apellido_paterno=$2, apellido_materno=$3,
        nivel=$4, grado=$5, seccion=$6, sexo=$7,
        fecha_nacimiento=$8, codigo_estudiante=$9, estado=$10, foto_url=$11,
        padre_nombre=$12, padre_dni=$13, padre_telefono=$14, padre_email=$15,
        madre_nombre=$16, madre_dni=$17, madre_telefono=$18, madre_email=$19,
        apoderado_nombre=$20, apoderado_apellidos=$21, apoderado_dni=$22,
        apoderado_telefono=$23, apoderado_email=$24, apoderado_parentesco=$25,
        telefono=$26, email=$27, direccion=$28, updated_at=NOW()
      WHERE id=$29 RETURNING *
    `, [
      nombres||null, apellido_paterno||null, apellido_materno||null,
      nivel||null, grado||null, seccion||null, sexo||null,
      fecha_nacimiento||null, codigo_estudiante||null, estado||'activo', foto_url||null,
      padre_nombre||null, padre_dni||null, cleanPhone(padre_telefono), padre_email||null,
      madre_nombre||null, madre_dni||null, cleanPhone(madre_telefono), madre_email||null,
      apoderado_nombre||null, apoderado_apellidos||null, apoderado_dni||null,
      cleanPhone(apoderado_telefono), apoderado_email||null, apoderado_parentesco||null,
      telefono||null, email||null, direccion||null, req.params.id,
    ]);
    if (!rows[0]) return res.status(404).json({ error: 'No encontrado' });
    res.json(rows[0]);
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
});

// ── PATCH /api/students/:id/estado ──────────────────────────
router.patch('/:id/estado', admin, async (req, res) => {
  try {
    const { estado } = req.body;
    const valid = ['activo','retirado','egresado','bloqueado'];
    if (!valid.includes(estado)) return res.status(400).json({ error: 'Estado inválido' });
    const { rows } = await query(
      'UPDATE students SET estado=$1, updated_at=NOW() WHERE id=$2 RETURNING id, estado',
      [estado, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'No encontrado' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── DELETE /api/students/:id ─────────────────────────────────
router.delete('/:id', admin, async (req, res) => {
  try {
    const { rows } = await query('SELECT user_id FROM students WHERE id=$1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'No encontrado' });
    await query('DELETE FROM students WHERE id=$1', [req.params.id]);
    if (rows[0].user_id) {
      await query('DELETE FROM system_users WHERE id=$1', [rows[0].user_id]);
    }
    res.json({ message: 'Alumno eliminado' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/students/:id/reset-password ───────────────────
router.post('/:id/reset-password', admin, async (req, res) => {
  try {
    const { rows } = await query('SELECT s.dni, s.user_id FROM students s WHERE s.id=$1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'No encontrado' });
    const hash = await bcrypt.hash(rows[0].dni, 10);
    await query('UPDATE system_users SET password_hash=$1, intentos_fallidos=0, estado=\'activo\', updated_at=NOW() WHERE id=$2',
      [hash, rows[0].user_id]);
    res.json({ message: `Contraseña restablecida al DNI: ${rows[0].dni}` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/students/export/excel ──────────────────────────
router.get('/export/excel', staff, async (req, res) => {
  try {
    const { nivel='', grado='', seccion='', estado='' } = req.query;
    const conds = []; const params = []; let pi = 1;
    if (nivel)   { conds.push(`nivel=$${pi}`);   params.push(nivel); pi++; }
    if (grado)   { conds.push(`grado=$${pi}`);   params.push(grado); pi++; }
    if (seccion) { conds.push(`seccion=$${pi}`); params.push(seccion); pi++; }
    if (estado)  { conds.push(`estado=$${pi}`);  params.push(estado); pi++; }
    const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
    const { rows } = await query(`SELECT * FROM students ${where} ORDER BY nivel, grado, seccion, apellido_paterno, nombres`, params);

    const wb = XLSX.utils.book_new();
    const headers = ['N°','Nivel','Grado','Sección','DNI','Apellido Paterno','Apellido Materno','Nombres','Sexo','Fecha Nac.','Estado','Código','Apoderado','Cel. Apoderado','Padre','Cel. Padre','Madre','Cel. Madre'];
    const wsData = [
      ['IE 40122 MANUEL SCORZA TORRES — Lista de Alumnos'],
      [`Exportado: ${new Date().toLocaleDateString('es-PE')} · Total: ${rows.length} alumnos`],
      [],
      headers,
      ...rows.map((r, i) => [
        i+1, r.nivel, r.grado?.trim(), r.seccion?.trim(),
        r.dni, r.apellido_paterno, r.apellido_materno, r.nombres,
        r.sexo, r.fecha_nacimiento ? new Date(r.fecha_nacimiento).toLocaleDateString('es-PE') : '',
        r.estado, r.codigo_estudiante,
        `${r.apoderado_apellidos||''} ${r.apoderado_nombre||''}`.trim(), r.apoderado_telefono,
        r.padre_nombre, r.padre_telefono,
        r.madre_nombre, r.madre_telefono,
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [5,12,12,10,14,20,20,26,10,13,12,14,28,14,28,14,28,14].map(w=>({wch:w}));
    XLSX.utils.book_append_sheet(wb, ws, 'Alumnos');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="alumnos_export.xlsx"');
    res.send(buf);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/students/import ────────────────────────────────
router.post('/import', admin, async (req, res) => {
  try {
    const { students, nivel, archivo_nombre } = req.body;
    if (!students?.length) return res.status(400).json({ error: 'Sin datos' });

    let nuevos = 0, duplicados = 0, errores = 0;
    const errList = [], dupList = [];

    for (const s of students) {
      if (!s.dni || !s.nombres) { errores++; errList.push({ dni: s.dni||'?', error: 'DNI o nombres faltantes' }); continue; }
      try {
        // Verificar duplicado
        const { rows: ex } = await query('SELECT id FROM students WHERE dni=$1', [s.dni.trim()]);
        if (ex[0]) { duplicados++; dupList.push(s.dni); continue; }

        const hash = await bcrypt.hash(s.dni.trim(), 10);
        const { rows: ur } = await query(`
          INSERT INTO system_users (dni, nombre, apellido_paterno, apellido_materno, role, password_hash)
          VALUES ($1,$2,$3,$4,'student',$5)
          ON CONFLICT (dni) DO UPDATE SET updated_at=NOW() RETURNING id
        `, [s.dni.trim(), s.nombres, s.apellido_paterno||'', s.apellido_materno||'', hash]);

        await query(`
          INSERT INTO students (
            dni, nombres, apellido_paterno, apellido_materno, nivel, grado, seccion,
            sexo, fecha_nacimiento, codigo_estudiante,
            padre_nombre, padre_dni, padre_telefono,
            madre_nombre, madre_dni, madre_telefono,
            apoderado_nombre, apoderado_apellidos, apoderado_dni,
            apoderado_parentesco, apoderado_telefono,
            user_id, importado_desde
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
        `, [
          s.dni.trim(), s.nombres, s.apellido_paterno||null, s.apellido_materno||null,
          nivel||s.nivel||'Primaria', s.grado||null, s.seccion||null,
          s.sexo||null, s.fecha_nacimiento||null, s.codigo_estudiante||null,
          s.padre_nombre||null, s.padre_dni||null, s.padre_telefono||null,
          s.madre_nombre||null, s.madre_dni||null, s.madre_telefono||null,
          s.apoderado_nombre||null, s.apoderado_apellidos||null, s.apoderado_dni||null,
          s.apoderado_parentesco||null, s.apoderado_telefono||null,
          ur[0].id, 'siagie',
        ]);
        nuevos++;
      } catch (e) {
        errores++;
        errList.push({ dni: s.dni, error: e.message.substring(0, 100) });
      }
    }

    // Guardar log
    await query(`
      INSERT INTO import_logs (archivo_nombre, nivel, total, nuevos, duplicados, errores, detalles, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    `, [archivo_nombre||'desconocido', nivel||'mixto', students.length, nuevos, duplicados, errores,
        JSON.stringify({ errores: errList, duplicados: dupList }), req.user.id]);

    res.json({
      message: `Importación completada: ${nuevos} nuevos, ${duplicados} duplicados, ${errores} errores`,
      nuevos, duplicados, errores, errores_detalle: errList, duplicados_detalle: dupList,
    });
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
});

// ── GET /api/students/meta/options ───────────────────────────
router.get('/meta/options', staff, async (req, res) => {
  try {
    const [grados, secciones] = await Promise.all([
      query('SELECT DISTINCT nivel, grado FROM students WHERE grado IS NOT NULL ORDER BY nivel, grado'),
      query('SELECT DISTINCT seccion FROM students WHERE seccion IS NOT NULL ORDER BY seccion'),
    ]);
    res.json({
      grados: grados.rows,
      secciones: secciones.rows.map(r => r.seccion),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

// ── GET /api/students/me (alumno autenticado) ────────────────
router.get('/me', auth, async (req, res) => {
  try {
    if (!req.user.student_id) return res.status(404).json({ error: 'Sin perfil de alumno' });
    const { rows } = await query('SELECT * FROM students WHERE id=$1', [req.user.student_id]);
    if (!rows[0]) return res.status(404).json({ error: 'No encontrado' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PUT /api/students/me (alumno edita su perfil) ────────────
router.put('/me', auth, async (req, res) => {
  try {
    if (!req.user.student_id) return res.status(404).json({ error: 'Sin perfil de alumno' });
    const {
      foto_url, telefono, email, direccion,
      padre_nombre, padre_dni, padre_telefono, padre_email,
      madre_nombre, madre_dni, madre_telefono, madre_email,
      apoderado_nombre, apoderado_apellidos, apoderado_dni,
      apoderado_telefono, apoderado_email, apoderado_parentesco,
    } = req.body;
    const { rows } = await query(`
      UPDATE students SET
        foto_url=$1, telefono=$2, email=$3, direccion=$4,
        padre_nombre=$5, padre_dni=$6, padre_telefono=$7, padre_email=$8,
        madre_nombre=$9, madre_dni=$10, madre_telefono=$11, madre_email=$12,
        apoderado_nombre=$13, apoderado_apellidos=$14, apoderado_dni=$15,
        apoderado_telefono=$16, apoderado_email=$17, apoderado_parentesco=$18,
        updated_at=NOW()
      WHERE id=$19 RETURNING *
    `, [
      foto_url||null, telefono||null, email||null, direccion||null,
      padre_nombre||null, padre_dni||null, cleanPhone(padre_telefono), padre_email||null,
      madre_nombre||null, madre_dni||null, cleanPhone(madre_telefono), madre_email||null,
      apoderado_nombre||null, apoderado_apellidos||null, apoderado_dni||null,
      cleanPhone(apoderado_telefono), apoderado_email||null, apoderado_parentesco||null,
      req.user.student_id,
    ]);
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
