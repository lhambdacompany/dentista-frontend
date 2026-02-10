import { useEffect, useState, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import { api } from '../lib/api';

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

export function Calendario() {
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
        url: `/citas/${c.id}`,
        extendedProps: { estado: c.estado },
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
        />
      </div>
    </div>
  );
}
