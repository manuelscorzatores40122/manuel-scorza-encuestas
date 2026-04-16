const router = require('express').Router();
const { query } = require('../db');
const { staff } = require('../middleware/auth');

router.get('/', staff, async (req, res) => {
  try {
    const [alumnos, encuestas, respuestas, porNivel, ultimasImport] = await Promise.all([
      query(`SELECT COUNT(*) total, COUNT(*) FILTER(WHERE estado='activo') activos,
               COUNT(*) FILTER(WHERE nivel='Primaria') primaria,
               COUNT(*) FILTER(WHERE nivel='Secundaria') secundaria FROM students`),
      query(`SELECT COUNT(*) total,
               COUNT(*) FILTER(WHERE estado='activa') activas,
               COUNT(*) FILTER(WHERE estado='borrador') borradores FROM surveys`),
      query(`SELECT COUNT(*) total,
               COUNT(*) FILTER(WHERE fecha_completada::date=CURRENT_DATE) hoy FROM responses WHERE completada=true`),
      query(`SELECT nivel, COUNT(*) count FROM students GROUP BY nivel ORDER BY nivel`),
      query(`SELECT * FROM import_logs ORDER BY created_at DESC LIMIT 5`),
    ]);
    res.json({
      alumnos: alumnos.rows[0],
      encuestas: encuestas.rows[0],
      respuestas: respuestas.rows[0],
      por_nivel: porNivel.rows,
      ultimas_importaciones: ultimasImport.rows,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
