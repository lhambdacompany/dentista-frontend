import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { api } from '../lib/api';

function CitaWhatsAppButton({ paciente }: { paciente: { nombre: string; telefono?: string } }) {
  if (!paciente.telefono) return null;

  const telefono = paciente.telefono.replace(/\D/g, '');
  const mensaje = encodeURIComponent(
    `Hola ${paciente.nombre}, te recordamos que tenés un turno programado. ¡Te esperamos!`
  );
  const url = `https://wa.me/${telefono}?text=${mensaje}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs px-2 py-1 bg-green-100 hover:bg-green-200 text-green-800 rounded inline-flex items-center gap-1"
      title="Enviar recordatorio por WhatsApp"
    >
      📱 WhatsApp
    </a>
  );
}

function CitaRecordatorioButton({ citaId }: { citaId: string }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const handleClick = async () => {
    setLoading(true);
    setMsg('');
    try {
      const res = await api.citas.enviarRecordatorio(citaId) as { enviado: boolean; mensaje: string };
      setMsg(res.enviado ? '✓ Enviado' : res.mensaje);
      if (!res.enviado) setTimeout(() => setMsg(''), 4000);
    } catch {
      setMsg('Error');
      setTimeout(() => setMsg(''), 3000);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="text-xs px-2 py-1 bg-slate-200 hover:bg-slate-300 rounded disabled:opacity-50"
        title="Enviar recordatorio por email"
      >
        {loading ? '...' : '✉ Recordatorio'}
      </button>
      {msg && <span className="text-xs text-slate-600">{msg}</span>}
    </div>
  );
}

interface Cita {
  id: string;
  horaInicio: string;
  horaFin: string;
  motivo?: string;
  estado: string;
  paciente: { id: string; nombre: string; apellido: string; telefono?: string };
}

interface Paciente {
  id: string;
  nombre: string;
  apellido: string;
}

interface CitaPorDia {
  fecha: string;
  total: number;
  atendidos: number;
}

interface CitasMes {
  total: number;
  pendientes: number;
  confirmadas: number;
  atendidas: number;
  canceladas: number;
}

interface DashboardData {
  citasDelDia: Cita[];
  proximaCita: Cita | null;
  pacientesRecientes: Paciente[];
  totalPacientes: number;
  alertas: { tipo: string; mensaje: string }[];
  totalCitas?: number;
  citasPorDia?: CitaPorDia[];
  citasEsteMes?: CitasMes;
}

const COLORS = ['#5fb3b0', '#94a3b8', '#22c55e', '#eab308', '#ef4444'];

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    api.dashboard().then(setData as (d: unknown) => void);
  }, []);

  if (!data) return <div className="text-center py-12">Cargando...</div>;

  const citasMes = data.citasEsteMes;
  const pieData = citasMes
    ? [
        { name: 'Pendientes', value: citasMes.pendientes, color: COLORS[1] },
        { name: 'Confirmadas', value: citasMes.confirmadas, color: COLORS[0] },
        { name: 'Atendidas', value: citasMes.atendidas, color: COLORS[2] },
        { name: 'Canceladas', value: citasMes.canceladas, color: COLORS[4] },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>

      {data.alertas?.length > 0 && (
        <div
          className={`rounded-lg p-4 ${
            data.alertas[0]?.tipo === 'proxima'
              ? 'bg-[#5fb3b0]/15 border border-[#5fb3b0]/30 text-slate-800'
              : 'bg-amber-50 border border-amber-200 text-amber-800'
          }`}
        >
          {data.alertas.map((a, i) => (
            <p key={i} className="font-medium">
              {a.mensaje}
            </p>
          ))}
        </div>
      )}

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-sm text-slate-500">Total pacientes</p>
          <p className="text-2xl font-bold text-slate-800">{data.totalPacientes}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-sm text-slate-500">Citas hoy</p>
          <p className="text-2xl font-bold text-slate-800">{data.citasDelDia?.length ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-sm text-slate-500">Citas este mes</p>
          <p className="text-2xl font-bold text-slate-800">{data.citasEsteMes?.total ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-sm text-slate-500">Atendidas (mes)</p>
          <p className="text-2xl font-bold text-green-600">{data.citasEsteMes?.atendidas ?? 0}</p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Citas por día (últimos 7)</h2>
          {data.citasPorDia && data.citasPorDia.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.citasPorDia}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="total" name="Total" fill="#5fb3b0" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="atendidos" name="Atendidas" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-slate-500 text-sm">Sin datos</p>
          )}
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Citas del mes por estado</h2>
          {pieData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-slate-500 text-sm">Sin citas este mes</p>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Citas del día</h2>
          {data.citasDelDia.length === 0 ? (
            <p className="text-slate-500">No hay citas programadas</p>
          ) : (
            <ul className="space-y-3">
              {data.citasDelDia.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-col sm:flex-row justify-between gap-2 sm:items-center p-3 bg-slate-50 rounded-lg"
                >
                  <div>
                    <Link
                      to={`/citas/${c.id}`}
                      className="font-medium text-[#5fb3b0] hover:underline"
                    >
                      {c.paciente.nombre} {c.paciente.apellido}
                    </Link>
                    <p className="text-sm text-slate-500">
                      {c.horaInicio} - {c.horaFin} · {c.motivo || 'Sin motivo'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-1 rounded shrink-0 ${
                        c.estado === 'CONFIRMADO'
                          ? 'bg-green-100 text-green-800'
                          : c.estado === 'PENDIENTE'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {c.estado}
                    </span>
                    <CitaRecordatorioButton citaId={c.id} />
                    <CitaWhatsAppButton paciente={c.paciente} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Pacientes recientes</h2>
          {data.pacientesRecientes.length === 0 ? (
            <p className="text-slate-500">No hay pacientes registrados</p>
          ) : (
            <ul className="space-y-2">
              {data.pacientesRecientes.map((p) => (
                <li key={p.id}>
                  <Link
                    to={`/pacientes/${p.id}`}
                    className="text-[#5fb3b0] hover:underline"
                  >
                    {p.nombre} {p.apellido}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
