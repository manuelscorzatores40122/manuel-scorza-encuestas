import { useEffect, useState } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js';
import axios from 'axios';

Chart.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);
const API = process.env.REACT_APP_API_URL || '';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/api/dashboard`).then(r => { setStats(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner"/></div>;
  if (!stats) return <div className="alert alert-error">Error al cargar estadísticas</div>;

  const { alumnos, encuestas, respuestas, por_nivel, ultimas_importaciones } = stats;

  const barData = {
    labels: por_nivel.map(n => n.nivel),
    datasets: [{ label: 'Alumnos', data: por_nivel.map(n => parseInt(n.count)),
      backgroundColor: ['rgba(26,86,219,.8)','rgba(124,58,237,.8)'], borderRadius: 8, borderSkipped: false }],
  };
  const doughData = {
    labels: ['Activas','Borradores','Cerradas'],
    datasets: [{ data: [parseInt(encuestas.activas),parseInt(encuestas.borradores),
      parseInt(encuestas.total)-parseInt(encuestas.activas)-parseInt(encuestas.borradores)],
      backgroundColor: ['#059669','#d97706','#94a3b8'], borderWidth: 0 }],
  };

  const StatCard = ({ icon, val, lbl, color, bg }) => (
    <div className="stat" style={{ borderLeftColor: color }}>
      <div className="stat-ic" style={{ background: bg }}>{icon}</div>
      <div><div className="stat-val">{val}</div><div className="stat-lbl">{lbl}</div></div>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--g900)' }}>Panel de Control</h1>
        <p style={{ fontSize: 13, color: 'var(--g400)', marginTop: 4 }}>IE 40122 Manuel Scorza Torres · 2026</p>
      </div>

      <div className="stats">
        <StatCard icon="👨‍🎓" val={alumnos.total} lbl="Total alumnos" color="var(--blue)" bg="var(--blue-l)"/>
        <StatCard icon="✅" val={alumnos.activos} lbl="Alumnos activos" color="var(--green)" bg="var(--green-l)"/>
        <StatCard icon="📋" val={encuestas.activas} lbl="Encuestas activas" color="var(--purple)" bg="var(--purple-l)"/>
        <StatCard icon="📝" val={respuestas.total} lbl="Respuestas totales" color="var(--yellow)" bg="var(--yellow-l)"/>
        <StatCard icon="🏫" val={alumnos.primaria} lbl="Primaria" color="var(--cyan)" bg="var(--cyan-l)"/>
        <StatCard icon="🎓" val={alumnos.secundaria} lbl="Secundaria" color="var(--purple)" bg="var(--purple-l)"/>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 20 }}>
        <div className="card">
          <div className="card-title" style={{ marginBottom: 16 }}>📊 Alumnos por Nivel</div>
          <Bar data={barData} options={{ responsive: true, plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } } }}
            height={120}/>
        </div>
        <div className="card">
          <div className="card-title" style={{ marginBottom: 16 }}>📋 Estado de Encuestas</div>
          <Doughnut data={doughData} options={{ responsive: true, cutout: '65%',
            plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, boxWidth: 12 } } } }}/>
          <div style={{ textAlign: 'center', marginTop: 10, fontSize: 24, fontWeight: 800, color: 'var(--g900)' }}>
            {encuestas.total} <span style={{ fontSize: 12, color: 'var(--g400)', fontWeight: 400 }}>total</span>
          </div>
        </div>
      </div>

      {/* Últimas importaciones */}
      <div className="card">
        <div className="card-title" style={{ marginBottom: 14 }}>📥 Últimas Importaciones</div>
        {ultimas_importaciones.length === 0 ? (
          <div className="empty"><p>Sin importaciones registradas</p></div>
        ) : (
          <div className="tbl-wrap">
            <table>
              <thead><tr>
                <th>Archivo</th><th>Nivel</th><th>Total</th><th>Nuevos</th><th>Duplicados</th><th>Errores</th><th>Fecha</th>
              </tr></thead>
              <tbody>
                {ultimas_importaciones.map(imp => (
                  <tr key={imp.id}>
                    <td style={{ fontWeight: 600 }}>{imp.archivo_nombre}</td>
                    <td><span className={`badge ${imp.nivel==='Primaria'?'badge-blue':'badge-purple'}`}>{imp.nivel}</span></td>
                    <td>{imp.total}</td>
                    <td><span className="badge badge-green">{imp.nuevos}</span></td>
                    <td><span className="badge badge-yellow">{imp.duplicados}</span></td>
                    <td><span className="badge badge-red">{imp.errores}</span></td>
                    <td style={{ color: 'var(--g400)', fontSize: 12 }}>{new Date(imp.created_at).toLocaleDateString('es-PE')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
