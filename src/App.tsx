import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Pacientes } from './pages/Pacientes';
import { PacienteDetalle } from './pages/PacienteDetalle';
import { Calendario } from './pages/Calendario';
import { ObrasSociales } from './pages/ObrasSociales';
import { Odontograma } from './pages/Odontograma';
import { PacienteNotas } from './pages/PacienteNotas';
import { PacienteImagenes } from './pages/PacienteImagenes';
import { PacienteHistorial } from './pages/PacienteHistorial';
import { CitaDetalle } from './pages/CitaDetalle';
import { Configuracion } from './pages/Configuracion';
import { RegistroPrestaciones } from './pages/RegistroPrestaciones';
import { PrestacionesList } from './pages/PrestacionesList';
import { HistoriaClinica } from './pages/HistoriaClinica';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="pacientes" element={<Pacientes />} />
        <Route path="pacientes/:id/notas" element={<PacienteNotas />} />
        <Route path="pacientes/:id/imagenes" element={<PacienteImagenes />} />
        <Route path="pacientes/:id/historial" element={<PacienteHistorial />} />
        <Route path="pacientes/:id" element={<PacienteDetalle />} />
        <Route path="obras-sociales" element={<ObrasSociales />} />
        <Route path="odontograma/:id" element={<Odontograma />} />
        <Route path="calendario" element={<Calendario />} />
        <Route path="prestaciones" element={<PrestacionesList />} />
        <Route path="citas/:id" element={<CitaDetalle />} />
        <Route path="citas/:citaId/prestaciones" element={<RegistroPrestaciones />} />
        <Route path="citas/:citaId/historia-clinica" element={<HistoriaClinica />} />
        <Route path="pacientes/:id/historia-clinica" element={<HistoriaClinica />} />
        <Route path="configuracion" element={<Configuracion />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
