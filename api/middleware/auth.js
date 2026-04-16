const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'dev_secret';

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

const roles = (...allowed) => (req, res, next) => {
  auth(req, res, () => {
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ error: 'Sin permisos suficientes' });
    }
    next();
  });
};

const admin = roles('admin', 'director');
const staff = roles('admin', 'director', 'tutor', 'docente');

module.exports = { auth, roles, admin, staff };
