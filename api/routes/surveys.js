const router = require('express').Router();
const XLSX = require('xlsx');
const { query } = require('../db');
const { auth, admin, staff } = require('../middleware/auth');

// GET /api/surveys
router.get('/', auth, async (req, res) => {
  try {
    const isStaff = ['admin','director','tutor','docente'].includes(req.user.role);
    if (isStaff) {
      const { rows } = await query(`
        SELECT s.*,
          (SELECT COUNT(*) FROM questions q WHERE q.survey_id=s.id) as total_preguntas,
          (SELECT COUNT(*) FROM responses r WHERE r.survey_id=s.id AND r.completada=true) as total_respuestas,
          u.nombre as created_by_name
        FROM surveys s LEFT JOIN system_users u ON s.created_by=u.id
        ORDER BY s.created_at DESC
      `);
      return res.json(rows);
    }
    // Alumno: encuestas activas asignadas a su nivel/grado
    const sid = req.user.student_id;
    if (!sid) return res.json([]);
    const { rows: st } = await query('SELECT nivel,grado,seccion FROM students WHERE id=$1', [sid]);
    const student = st[0];
    if (!student) return res.json([]);
    const { rows } = await query(`
      SELECT s.*,
        (SELECT COUNT(*) FROM questions q WHERE q.survey_id=s.id) as total_preguntas,
        r.completada, r.fecha_completada
      FROM surveys s
      LEFT JOIN responses r ON r.survey_id=s.id AND r.student_id=$1
      WHERE s.estado='activa'
        AND (s.nivel_asignado IS NULL OR s.nivel_asignado='' OR s.nivel_asignado=$2)
        AND (s.grado_asignado IS NULL OR s.grado_asignado='' OR s.grado_asignado=$3)
        AND (s.seccion_asignada IS NULL OR s.seccion_asignada='' OR s.seccion_asignada=$4)
        AND (s.fecha_fin IS NULL OR s.fecha_fin > NOW())
      ORDER BY s.created_at DESC
    `, [sid, student.nivel, student.grado, student.seccion]);
    res.json(rows);
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
});

// GET /api/surveys/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const { rows: sr } = await query('SELECT * FROM surveys WHERE id=$1', [req.params.id]);
    if (!sr[0]) return res.status(404).json({ error: 'No encontrada' });
    const { rows: qs } = await query('SELECT * FROM questions WHERE survey_id=$1 ORDER BY orden', [req.params.id]);
    let response = null;
    if (req.user.student_id) {
      const { rows: rr } = await query('SELECT * FROM responses WHERE survey_id=$1 AND student_id=$2',
        [req.params.id, req.user.student_id]);
      response = rr[0] || null;
    }
    res.json({ ...sr[0], questions: qs, response });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/surveys
router.post('/', admin, async (req, res) => {
  try {
    const { titulo, descripcion, estado='borrador', nivel_asignado, grado_asignado,
            seccion_asignada, fecha_inicio, fecha_fin, preguntas=[] } = req.body;
    if (!titulo) return res.status(400).json({ error: 'Título requerido' });

    const { rows: sr } = await query(`
      INSERT INTO surveys (titulo, descripcion, estado, nivel_asignado, grado_asignado,
        seccion_asignada, fecha_inicio, fecha_fin, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *
    `, [titulo, descripcion||null, estado, nivel_asignado||null, grado_asignado||null,
        seccion_asignada||null, fecha_inicio||null, fecha_fin||null, req.user.id]);

    const survey = sr[0];
    for (let i = 0; i < preguntas.length; i++) {
      const p = preguntas[i];
      await query(`
        INSERT INTO questions (survey_id, texto, tipo, opciones, orden, requerida)
        VALUES ($1,$2,$3,$4,$5,$6)
      `, [survey.id, p.texto, p.tipo||'multiple',
          p.opciones ? JSON.stringify(p.opciones) : null, i, true]);
    }
    res.status(201).json(survey);
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
});

// PUT /api/surveys/:id
router.put('/:id', admin, async (req, res) => {
  try {
    const { titulo, descripcion, estado, nivel_asignado, grado_asignado,
            seccion_asignada, fecha_inicio, fecha_fin, preguntas } = req.body;

    // Proteger encuestas con respuestas: no cambiar tipo/opciones de preguntas
    const { rows: hasResp } = await query(
      'SELECT COUNT(*) FROM responses WHERE survey_id=$1 AND completada=true', [req.params.id]);
    const hasAnswers = parseInt(hasResp[0].count) > 0;

    await query(`
      UPDATE surveys SET titulo=$1, descripcion=$2, estado=$3, nivel_asignado=$4,
        grado_asignado=$5, seccion_asignada=$6, fecha_inicio=$7, fecha_fin=$8, updated_at=NOW()
      WHERE id=$9
    `, [titulo, descripcion||null, estado, nivel_asignado||null, grado_asignado||null,
        seccion_asignada||null, fecha_inicio||null, fecha_fin||null, req.params.id]);

    if (preguntas && !hasAnswers) {
      await query('DELETE FROM questions WHERE survey_id=$1', [req.params.id]);
      for (let i = 0; i < preguntas.length; i++) {
        const p = preguntas[i];
        await query(`
          INSERT INTO questions (survey_id, texto, tipo, opciones, orden, requerida)
          VALUES ($1,$2,$3,$4,$5,$6)
        `, [req.params.id, p.texto, p.tipo||'multiple',
            p.opciones ? JSON.stringify(p.opciones) : null, i, true]);
      }
    } else if (preguntas && hasAnswers) {
      // Solo actualizar texto, no tipo ni opciones
      for (const p of preguntas) {
        if (p.id) await query('UPDATE questions SET texto=$1 WHERE id=$2 AND survey_id=$3',
          [p.texto, p.id, req.params.id]);
      }
    }

    res.json({ message: 'Actualizada', protected: hasAnswers });
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
});

// POST /api/surveys/:id/duplicate
router.post('/:id/duplicate', admin, async (req, res) => {
  try {
    const { rows: sr } = await query('SELECT * FROM surveys WHERE id=$1', [req.params.id]);
    if (!sr[0]) return res.status(404).json({ error: 'No encontrada' });
    const s = sr[0];
    const { rows: nr } = await query(`
      INSERT INTO surveys (titulo, descripcion, estado, nivel_asignado, grado_asignado,
        seccion_asignada, created_by)
      VALUES ($1,$2,'borrador',$3,$4,$5,$6) RETURNING *
    `, [`${s.titulo} (copia)`, s.descripcion, s.nivel_asignado, s.grado_asignado,
        s.seccion_asignada, req.user.id]);
    const { rows: qs } = await query('SELECT * FROM questions WHERE survey_id=$1 ORDER BY orden', [req.params.id]);
    for (const q of qs) {
      await query(`INSERT INTO questions (survey_id, texto, tipo, opciones, orden, requerida)
        VALUES ($1,$2,$3,$4,$5,$6)`,
        [nr[0].id, q.texto, q.tipo, q.opciones, q.orden, q.requerida]);
    }
    res.json(nr[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/surveys/:id
router.delete('/:id', admin, async (req, res) => {
  try {
    await query('DELETE FROM surveys WHERE id=$1', [req.params.id]);
    res.json({ message: 'Eliminada' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/surveys/:id/respond
router.post('/:id/respond', auth, async (req, res) => {
  try {
    if (!req.user.student_id) return res.status(403).json({ error: 'Solo estudiantes pueden responder' });
    const { answers } = req.body;
    const sid = req.user.student_id;

    const existing = await query('SELECT * FROM responses WHERE survey_id=$1 AND student_id=$2',
      [req.params.id, sid]);
    if (existing.rows[0]?.completada) return res.status(400).json({ error: 'Ya respondiste esta encuesta' });

    let responseId;
    if (existing.rows[0]) {
      await query('UPDATE responses SET completada=true,fecha_completada=NOW() WHERE id=$1', [existing.rows[0].id]);
      responseId = existing.rows[0].id;
    } else {
      const { rows: rr } = await query(`
        INSERT INTO responses (survey_id, student_id, completada, fecha_completada)
        VALUES ($1,$2,true,NOW()) RETURNING id
      `, [req.params.id, sid]);
      responseId = rr[0].id;
    }

    await query('DELETE FROM answers WHERE response_id=$1', [responseId]);
    for (const a of answers) {
      await query(`
        INSERT INTO answers (response_id, question_id, respuesta_texto, respuesta_opcion,
          respuesta_opciones, respuesta_escala, respuesta_sino, respuesta_fecha, respuesta_numero)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      `, [responseId, a.question_id,
          a.respuesta_texto||null, a.respuesta_opcion||null,
          a.respuesta_opciones ? JSON.stringify(a.respuesta_opciones) : null,
          a.respuesta_escala||null, a.respuesta_sino??null,
          a.respuesta_fecha||null, a.respuesta_numero||null]);
    }
    res.json({ message: 'Respuestas guardadas' });
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
});

// GET /api/surveys/:id/results
router.get('/:id/results', staff, async (req, res) => {
  try {
    const { nivel, grado, seccion, sexo, fecha_desde, fecha_hasta } = req.query;
    const { rows: sr } = await query('SELECT * FROM surveys WHERE id=$1', [req.params.id]);
    const { rows: qs } = await query('SELECT * FROM questions WHERE survey_id=$1 ORDER BY orden', [req.params.id]);

    let respConds = ['r.survey_id=$1', 'r.completada=true'];
    const respParams = [req.params.id];
    let pi = 2;

    if (nivel)    { respConds.push(`s.nivel=$${pi}`);   respParams.push(nivel); pi++; }
    if (grado)    { respConds.push(`s.grado=$${pi}`);   respParams.push(grado); pi++; }
    if (seccion)  { respConds.push(`s.seccion=$${pi}`); respParams.push(seccion); pi++; }
    if (sexo)     { respConds.push(`s.sexo=$${pi}`);    respParams.push(sexo); pi++; }
    if (fecha_desde) { respConds.push(`r.fecha_completada>=$${pi}`); respParams.push(fecha_desde); pi++; }
    if (fecha_hasta) { respConds.push(`r.fecha_completada<=$${pi}`); respParams.push(fecha_hasta); pi++; }

    const { rows: responses } = await query(`
      SELECT r.*, s.nombres, s.apellido_paterno, s.apellido_materno,
             s.dni, s.grado, s.seccion, s.nivel, s.sexo
      FROM responses r JOIN students s ON r.student_id=s.id
      WHERE ${respConds.join(' AND ')}
      ORDER BY s.apellido_paterno, s.nombres
    `, respParams);

    const detailed = await Promise.all(responses.map(async (r) => {
      const { rows: ans } = await query('SELECT * FROM answers WHERE response_id=$1', [r.id]);
      return { ...r, answers: ans };
    }));

    res.json({ survey: sr[0], questions: qs, responses: detailed, total: detailed.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/surveys/:id/export
router.get('/:id/export', staff, async (req, res) => {
  try {
    const { rows: sr } = await query('SELECT * FROM surveys WHERE id=$1', [req.params.id]);
    if (!sr[0]) return res.status(404).json({ error: 'No encontrada' });
    const { rows: qs } = await query('SELECT * FROM questions WHERE survey_id=$1 ORDER BY orden', [req.params.id]);
    const { rows: responses } = await query(`
      SELECT r.*, s.nombres, s.apellido_paterno, s.apellido_materno, s.dni, s.grado, s.seccion, s.nivel, s.sexo
      FROM responses r JOIN students s ON r.student_id=s.id
      WHERE r.survey_id=$1 AND r.completada=true ORDER BY s.apellido_paterno
    `, [req.params.id]);

    const wb = XLSX.utils.book_new();
    const headers = ['N°','DNI','Ap. Paterno','Ap. Materno','Nombres','Nivel','Grado','Sec.','Sexo','Fecha',
      ...qs.map((q,i)=>`P${i+1}: ${q.texto.substring(0,40)}`)];

    const dataRows = await Promise.all(responses.map(async (r, i) => {
      const { rows: ans } = await query('SELECT * FROM answers WHERE response_id=$1', [r.id]);
      const am = {};
      ans.forEach(a => {
        am[a.question_id] = a.respuesta_opcion || a.respuesta_texto ||
          (a.respuesta_opciones ? JSON.parse(a.respuesta_opciones).join(', ') : '') ||
          (a.respuesta_sino !== null ? (a.respuesta_sino ? 'Sí' : 'No') : '') ||
          (a.respuesta_escala ? String(a.respuesta_escala) : '') ||
          (a.respuesta_fecha ? a.respuesta_fecha : '') ||
          (a.respuesta_numero ? String(a.respuesta_numero) : '') || '';
      });
      return [i+1, r.dni, r.apellido_paterno, r.apellido_materno, r.nombres,
        r.nivel, r.grado?.trim(), r.seccion?.trim(), r.sexo,
        r.fecha_completada ? new Date(r.fecha_completada).toLocaleDateString('es-PE') : '',
        ...qs.map(q => am[q.id] || '')];
    }));

    const ws = XLSX.utils.aoa_to_sheet([
      [`ENCUESTA: ${sr[0].titulo}`], [`IE 40122 MANUEL SCORZA TORRES`],
      [`Exportado: ${new Date().toLocaleDateString('es-PE')} · Respuestas: ${responses.length}`],
      [], headers, ...dataRows,
    ]);
    ws['!cols'] = [5,14,20,20,26,12,12,8,10,14,...qs.map(()=>({wch:30}))].map(w=>typeof w==='number'?{wch:w}:w);
    XLSX.utils.book_append_sheet(wb, ws, 'Respuestas');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="encuesta_${req.params.id}.xlsx"`);
    res.send(buf);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/surveys/:id/pending — alumnos que no respondieron
router.get('/:id/pending', staff, async (req, res) => {
  try {
    const { rows: sv } = await query('SELECT * FROM surveys WHERE id=$1', [req.params.id]);
    if (!sv[0]) return res.status(404).json({ error: 'No encontrada' });
    const s = sv[0];
    const { rows } = await query(`
      SELECT st.id, st.dni, st.nombres, st.apellido_paterno, st.apellido_materno,
             st.grado, st.seccion, st.nivel
      FROM students st
      WHERE st.estado='activo'
        AND ($1 IS NULL OR $1='' OR st.nivel=$1)
        AND ($2 IS NULL OR $2='' OR st.grado=$2)
        AND ($3 IS NULL OR $3='' OR st.seccion=$3)
        AND st.id NOT IN (
          SELECT student_id FROM responses WHERE survey_id=$4 AND completada=true
        )
      ORDER BY st.apellido_paterno, st.nombres
    `, [s.nivel_asignado, s.grado_asignado, s.seccion_asignada, req.params.id]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
