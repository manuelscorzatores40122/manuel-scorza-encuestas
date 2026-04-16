const router = require('express').Router();
const { query } = require('../db');
const { auth, admin, staff } = require('../middleware/auth');

// GET /api/library — student sees own level/grade items
router.get('/', auth, async (req, res) => {
  try {
    const isStaff = ['admin','director','tutor','docente'].includes(req.user.role);
    if (isStaff) {
      const { rows } = await query('SELECT * FROM library_items ORDER BY created_at DESC');
      return res.json(rows);
    }
    const sid = req.user.student_id;
    if (!sid) return res.json([]);
    const { rows: st } = await query('SELECT nivel,grado,seccion FROM students WHERE id=$1', [sid]);
    const s = st[0]; if (!s) return res.json([]);
    const { rows } = await query(`
      SELECT * FROM library_items
      WHERE activo=true
        AND (nivel_asignado IS NULL OR nivel_asignado='' OR nivel_asignado=$1)
        AND (grado_asignado IS NULL OR grado_asignado='' OR grado_asignado=$2)
        AND (seccion_asignada IS NULL OR seccion_asignada='' OR seccion_asignada=$3)
      ORDER BY created_at DESC
    `, [s.nivel, s.grado, s.seccion]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/library
router.post('/', admin, async (req, res) => {
  try {
    const { titulo, descripcion, tipo='libro', archivo_url, archivo_nombre, archivo_size,
            nivel_asignado, grado_asignado, seccion_asignada } = req.body;
    if (!titulo) return res.status(400).json({ error: 'Título requerido' });
    const { rows } = await query(`
      INSERT INTO library_items (titulo, descripcion, tipo, archivo_url, archivo_nombre,
        archivo_size, nivel_asignado, grado_asignado, seccion_asignada, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *
    `, [titulo, descripcion||null, tipo, archivo_url||null, archivo_nombre||null,
        archivo_size||null, nivel_asignado||null, grado_asignado||null, seccion_asignada||null, req.user.id]);
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/library/:id
router.put('/:id', admin, async (req, res) => {
  try {
    const { titulo, descripcion, tipo, archivo_url, archivo_nombre, nivel_asignado,
            grado_asignado, seccion_asignada, activo } = req.body;
    const { rows } = await query(`
      UPDATE library_items SET titulo=$1, descripcion=$2, tipo=$3, archivo_url=$4,
        archivo_nombre=$5, nivel_asignado=$6, grado_asignado=$7, seccion_asignada=$8,
        activo=$9, updated_at=NOW() WHERE id=$10 RETURNING *
    `, [titulo, descripcion||null, tipo||'libro', archivo_url||null, archivo_nombre||null,
        nivel_asignado||null, grado_asignado||null, seccion_asignada||null, activo!==false, req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'No encontrado' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/library/:id
router.delete('/:id', admin, async (req, res) => {
  try {
    await query('DELETE FROM library_items WHERE id=$1', [req.params.id]);
    res.json({ message: 'Eliminado' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
