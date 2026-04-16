const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../db');
const { auth } = require('../middleware/auth');

const SECRET = process.env.JWT_SECRET || 'dev_secret';
const MAX_ATTEMPTS = 5;

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { dni, password } = req.body;
    if (!dni || !password) return res.status(400).json({ error: 'DNI y contraseña requeridos' });

    // Buscar en system_users
    const { rows } = await query('SELECT * FROM system_users WHERE dni=$1', [dni.trim()]);
    const user = rows[0];

    if (!user) return res.status(401).json({ error: 'DNI o contraseña incorrectos' });
    if (user.estado === 'bloqueado') return res.status(403).json({ error: 'Cuenta bloqueada. Contacta al administrador.' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      const intentos = (user.intentos_fallidos || 0) + 1;
      const nuevoEstado = intentos >= MAX_ATTEMPTS ? 'bloqueado' : user.estado;
      await query('UPDATE system_users SET intentos_fallidos=$1, estado=$2 WHERE id=$3',
        [intentos, nuevoEstado, user.id]);
      if (nuevoEstado === 'bloqueado') return res.status(403).json({ error: `Cuenta bloqueada tras ${MAX_ATTEMPTS} intentos fallidos.` });
      return res.status(401).json({ error: `Contraseña incorrecta. Intentos restantes: ${MAX_ATTEMPTS - intentos}` });
    }

    // Reset intentos y actualizar último acceso
    await query('UPDATE system_users SET intentos_fallidos=0, ultimo_acceso=NOW() WHERE id=$1', [user.id]);

    // Si es alumno, obtener datos del estudiante
    let studentData = null;
    if (user.role === 'student') {
      const { rows: sr } = await query('SELECT * FROM students WHERE user_id=$1', [user.id]);
      studentData = sr[0] || null;
    }

    const payload = {
      id: user.id,
      dni: user.dni,
      nombre: user.nombre,
      apellido_paterno: user.apellido_paterno,
      apellido_materno: user.apellido_materno,
      role: user.role,
      estado: user.estado,
      student_id: studentData?.id || null,
      grado: studentData?.grado || null,
      seccion: studentData?.seccion || null,
      nivel: studentData?.nivel || null,
    };

    const token = jwt.sign(payload, SECRET, { expiresIn: '10h' });
    res.json({ token, user: payload });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// GET /api/auth/me
router.get('/me', auth, (req, res) => res.json(req.user));

// POST /api/auth/change-password
router.post('/change-password', auth, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!new_password || new_password.length < 6)
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    const { rows } = await query('SELECT password_hash FROM system_users WHERE id=$1', [req.user.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Usuario no encontrado' });
    const valid = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Contraseña actual incorrecta' });
    const hash = await bcrypt.hash(new_password, 10);
    await query('UPDATE system_users SET password_hash=$1, updated_at=NOW() WHERE id=$2', [hash, req.user.id]);
    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/auth/logout
router.post('/logout', auth, (req, res) => res.json({ message: 'Sesión cerrada' }));

module.exports = router;
