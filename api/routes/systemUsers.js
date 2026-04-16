const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { query } = require('../db');
const { admin } = require('../middleware/auth');

// GET /api/system-users
router.get('/', admin, async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT id, dni, nombre, apellido_paterno, apellido_materno, email, role, estado, ultimo_acceso, created_at
      FROM system_users WHERE role != 'student' ORDER BY role, nombre
    `);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/system-users — crear admin/docente/tutor/director
router.post('/', admin, async (req, res) => {
  try {
    const { dni, nombre, apellido_paterno, apellido_materno, email, role, password } = req.body;
    if (!dni || !nombre || !role) return res.status(400).json({ error: 'DNI, nombre y rol requeridos' });
    const validRoles = ['admin','director','tutor','docente'];
    if (!validRoles.includes(role)) return res.status(400).json({ error: 'Rol inválido' });
    const hash = await bcrypt.hash(password || dni, 10);
    const { rows } = await query(`
      INSERT INTO system_users (dni, nombre, apellido_paterno, apellido_materno, email, role, password_hash)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, dni, nombre, role, estado
    `, [dni.trim(), nombre, apellido_paterno||null, apellido_materno||null, email||null, role, hash]);
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'El DNI ya existe' });
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/system-users/:id
router.put('/:id', admin, async (req, res) => {
  try {
    const { nombre, apellido_paterno, apellido_materno, email, role, estado } = req.body;
    const { rows } = await query(`
      UPDATE system_users SET nombre=$1, apellido_paterno=$2, apellido_materno=$3,
        email=$4, role=$5, estado=$6, updated_at=NOW()
      WHERE id=$7 AND dni != 'admin' RETURNING id, dni, nombre, role, estado
    `, [nombre, apellido_paterno||null, apellido_materno||null, email||null, role, estado||'activo', req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'No encontrado' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/system-users/:id/reset
router.post('/:id/reset', admin, async (req, res) => {
  try {
    const { rows } = await query('SELECT dni FROM system_users WHERE id=$1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'No encontrado' });
    const hash = await bcrypt.hash(rows[0].dni, 10);
    await query('UPDATE system_users SET password_hash=$1, intentos_fallidos=0, estado=\'activo\' WHERE id=$2', [hash, req.params.id]);
    res.json({ message: `Contraseña restablecida al DNI: ${rows[0].dni}` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/system-users/:id
router.delete('/:id', admin, async (req, res) => {
  try {
    await query('DELETE FROM system_users WHERE id=$1 AND dni!=\'admin\'', [req.params.id]);
    res.json({ message: 'Eliminado' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
