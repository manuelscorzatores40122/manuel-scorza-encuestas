import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import './index.css';

import Login from './pages/Login';
import AdminLayout from './components/shared/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import Students from './pages/admin/Students';
import SurveysAdmin from './pages/admin/SurveysAdmin';
import LibraryAdmin from './pages/admin/LibraryAdmin';
import SystemUsers from './pages/admin/SystemUsers';
import StudentHome from './pages/student/StudentHome';

const STAFF = ['admin','director','tutor','docente'];

function Guard({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading"><div className="spinner"/></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={STAFF.includes(user.role)?'/admin':'/alumno'} replace />;
  return children;
}

function Root() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={STAFF.includes(user.role)?'/admin':'/alumno'} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login/>}/>
          <Route path="/" element={<Root/>}/>
          <Route path="/admin" element={<Guard roles={STAFF}><AdminLayout/></Guard>}>
            <Route index element={<Dashboard/>}/>
            <Route path="alumnos" element={<Students/>}/>
            <Route path="encuestas" element={<SurveysAdmin/>}/>
            <Route path="biblioteca" element={<LibraryAdmin/>}/>
            <Route path="usuarios" element={<Guard roles={['admin','director']}><SystemUsers/></Guard>}/>
          </Route>
          <Route path="/alumno" element={<Guard roles={['student']}><StudentHome/></Guard>}/>
          <Route path="*" element={<Navigate to="/" replace/>}/>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
