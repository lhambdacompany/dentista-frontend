import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import { api } from '../lib/api';
import { formatearFecha } from '../lib/formatDate';

interface Cita {
  id: string;
  pacienteId: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  motivo?: string;
  estado: string;
  paciente: { id: string; nombre: string; apellido: string };
}

interface Paciente {
  id: string;
  nombre: string;
  apellido: string;
}

interface CitaSeleccionada {
  id: string;
  pacienteNombre: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  motivo?: string;
  estado: string;
}

const ESTADO_ESTILOS: Record<string, string> = {
  PENDIENTE: 'bg-yellow-100 text-yellow-700',
  CONFIRMADO: 'bg-blue-100 text-blue-700',
  ATENDIDO: 'bg-green-100 text-green-700',
  CANCELADO: 'bg-red-100 text-red-700',
};
const ESTADO_ETIQUETAS: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  CONFIRMADO: 'Confirmado',
  ATENDIDO: 'Atendido',
  CANCELADO: 'Cancelado',
};

export function Calendario() {
  const navigate = useNavigate();
  const [eventos, setEventos] = useState<{ id: string; title: string; start: string; end: string; extendedProps: Record<string, unknown> }[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formFecha, setFormFecha] = useState('');
  const [form, setForm] = useState({
    pacienteId: '',
    horaInicio: '09:00',
    horaFin: '09:30',
    motivo: '',
  });

  // Modal de detalle de cita
  const [citaSeleccionada, setCitaSeleccionada] = useState<CitaSeleccionada | null>(null);
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  const cargarCitas = useCallback(async (start: Date, end: Date) => {
    const citas = await api.citas.list(
      start.toISOString(),
      end.toISOString()
    ) as Cita[];
    setEventos(
      citas.map((c) => ({
        id: c.id,
        title: `${c.paciente.nombre} ${c.paciente.apellido}${c.motivo ? ` - ${c.motivo}` : ''}`,
        start: `${c.fecha.slice(0, 10)}T${c.horaInicio}`,
        end: `${c.fecha.slice(0, 10)}T${c.horaFin}`,
        extendedProps: {
          estado: c.estado,
          pacienteNombre: `${c.paciente.nombre} ${c.paciente.apellido}`,
          fecha: c.fecha,
          horaInicio: c.horaInicio,
          horaFin: c.horaFin,
          motivo: c.motivo,
        },
      }))
    );
  }, []);

  useEffect(() => {
    const start = new Date();
    start.setMonth(start.getMonth() - 1);
    const end = new Date();
    end.setMonth(end.getMonth() + 2);
    cargarCitas(start, end);
  }, [cargarCitas]);

  useEffect(() => {
    api.pacientes.list().then((d) => setPacientes((d as Paciente[]) || []));
  }, []);

  const handleDateSelect = (info: { startStr: string }) => {
    setFormFecha(info.startStr.slice(0, 10));
    setForm({ pacienteId: '', horaInicio: '09:00', horaFin: '09:30', motivo: '' });
    setShowForm(true);
  };

  const handleEventClick = (info: { event: { id: string; extendedProps: Record<string, unknown> }; jsEvent: Event }) => {
    info.jsEvent.preventDefault();
    const p = info.event.extendedProps;
    setCitaSeleccionada({
      id: info.event.id,
      pacienteNombre: p.pacienteNombre as string,
      fecha: p.fecha as string,
      horaInicio: p.horaInicio as string,
      horaFin: p.horaFin as string,
      motivo: p.motivo as string | undefined,
      estado: p.estado as string,
    });
    setConfirmandoEliminar(false);
  };

  const cerrarModal = () => {
    setCitaSeleccionada(null);
    setConfirmandoEliminar(false);
  };

  const handleEliminar = async () => {
    if (!citaSeleccionada) return;
    setEliminando(true);
    try {
      await api.citas.delete(citaSeleccionada.id);
      setCitaSeleccionada(null);
      setConfirmandoEliminar(false);
      const start = new Date();
      start.setMonth(start.getMonth() - 1);
      const end = new Date();
      end.setMonth(end.getMonth() + 2);
      cargarCitas(start, end);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar la cita');
    } finally {
      setEliminando(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.pacienteId || !formFecha) return;
    try {
      await api.citas.create({
        pacienteId: form.pacienteId,
        fecha: formFecha,
        horaInicio: form.horaInicio,
        horaFin: form.horaFin,
        motivo: form.motivo || undefined,
      });
      setShowForm(false);
      const start = new Date(formFecha);
      start.setMonth(start.getMonth() - 1);
      const end = new Date(formFecha);
      end.setMonth(end.getMonth() + 2);
      cargarCitas(start, end);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al crear cita');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-800">Calendario</h1>
        <button
          onClick={() => {
            const hoy = new Date().toISOString().slice(0, 10);
            setFormFecha(hoy);
            setForm({ pacienteId: '', horaInicio: '09:00', horaFin: '09:30', motivo: '' });
            setShowForm(true);
          }}
          className="px-4 py-2 bg-[#5fb3b0] text-white rounded-lg hover:bg-[#4a9a97] shrink-0"
        >
          + Nueva cita
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Nueva cita</h2>
          <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fecha</label>
              <input
                type="date"
                value={formFecha}
                onChange={(e) => setFormFecha(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Paciente</label>
              <select
                value={form.pacienteId}
                onChange={(e) => setForm((f) => ({ ...f, pacienteId: e.target.value }))}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                required
              >
                <option value="">Seleccionar paciente</option>
                {pacientes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} {p.apellido}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Hora inicio</label>
                <input
                  type="time"
                  value={form.horaInicio}
                  onChange={(e) => setForm((f) => ({ ...f, horaInicio: e.target.value }))}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Hora fin</label>
                <input
                  type="time"
                  value={form.horaFin}
                  onChange={(e) => setForm((f) => ({ ...f, horaFin: e.target.value }))}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Motivo (opcional)</label>
              <input
                type="text"
                value={form.motivo}
                onChange={(e) => setForm((f) => ({ ...f, motivo: e.target.value }))}
                placeholder="Ej: Control, limpieza"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="px-4 py-2 bg-[#5fb3b0] text-white rounded-lg hover:bg-[#4a9a97]">
                Crear cita
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-slate-200 rounded-lg hover:bg-slate-300"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow p-4 overflow-x-auto">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale={esLocale}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay',
          }}
          buttonText={{
            today: 'Hoy',
            month: 'Mes',
            week: 'Semana',
            day: 'Día',
          }}
          events={eventos}
          selectable
          select={handleDateSelect}
          eventClick={handleEventClick}
        />
      </div>

      {/* Modal de detalle de cita */}
      {citaSeleccionada && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={cerrarModal}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Encabezado */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">{citaSeleccionada.pacienteNombre}</h2>
                <p className="text-sm text-slate-500">{formatearFecha(citaSeleccionada.fecha)}</p>
              </div>
              <button onClick={cerrarModal} className="text-slate-400 hover:text-slate-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Detalle */}
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {citaSeleccionada.horaInicio} - {citaSeleccionada.horaFin}
              </div>
              {citaSeleccionada.motivo && (
                <div className="flex items-center gap-2 text-slate-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {citaSeleccionada.motivo}
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_ESTILOS[citaSeleccionada.estado] ?? 'bg-slate-100 text-slate-600'}`}>
                  {ESTADO_ETIQUETAS[citaSeleccionada.estado] ?? citaSeleccionada.estado}
                </span>
              </div>
            </div>

            <hr className="border-slate-200" />

            {/* Acciones */}
            {!confirmandoEliminar ? (
              <div className="flex gap-2">
                <button
                  onClick={() => navigate(`/citas/${citaSeleccionada.id}`)}
                  className="flex-1 px-4 py-2 bg-[#5fb3b0] text-white rounded-lg hover:bg-[#4a9a97] text-sm font-medium"
                >
                  Ver detalle
                </button>
                <button
                  onClick={() => setConfirmandoEliminar(true)}
                  className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm font-medium border border-red-200"
                >
                  Eliminar
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-slate-700 font-medium">¿Eliminar esta cita? Esta acción no se puede deshacer.</p>
                <div className="flex gap-2">
                  <button
                    onClick={handleEliminar}
                    disabled={eliminando}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium disabled:opacity-50"
                  >
                    {eliminando ? 'Eliminando...' : 'Sí, eliminar'}
                  </button>
                  <button
                    onClick={() => setConfirmandoEliminar(false)}
                    disabled={eliminando}
                    className="flex-1 px-4 py-2 bg-slate-200 rounded-lg hover:bg-slate-300 text-sm font-medium disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
