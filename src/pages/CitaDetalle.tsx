import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, getUploadUrl } from '../lib/api';
import { formatearFecha } from '../lib/formatDate';


function WhatsAppBtn({ telefono, nombre }: { telefono?: string; nombre: string }) {
  if (!telefono) return null;
  const tel = telefono.replace(/\D/g, '');
  if (!tel) return null;
  const msg = encodeURIComponent(`Hola ${nombre}, te recordamos que tenés un turno programado. ¡Te esperamos!`);
  return (
    <a
      href={`https://wa.me/${tel}?text=${msg}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-500/80 backdrop-blur border border-green-400/50 rounded-xl hover:bg-green-500 transition-all"
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
      WhatsApp
    </a>
  );
}

interface Odontograma {
  id: string;
  fecha: string;
  titulo?: string;
  _count?: { dientes: number };
}

interface Nota {
  id: string;
  titulo: string;
  descripcion: string;
  fecha: string;
  profesional: string;
}

interface Imagen {
  id: string;
  url: string;
  descripcion?: string;
  fecha: string;
  tipo: string;
}

interface RegistroPrestacion {
  id: string;
  _count?: { items: number };
}

interface Cita {
  id: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  motivo?: string;
  estado: string;
  paciente: { id: string; nombre: string; apellido: string; email?: string; telefono?: string };
  odontogramas: Odontograma[];
  notasClinicas: Nota[];
  imagenes: Imagen[];
  registroPrestacion?: RegistroPrestacion | null;
}

const ESTADOS_CITA = ['PENDIENTE', 'CONFIRMADA', 'FINALIZADA', 'CANCELADO'] as const;

const ESTADO_BADGE: Record<string, string> = {
  PENDIENTE:  'bg-yellow-400/20 border-yellow-300/50 text-yellow-100',
  CONFIRMADA: 'bg-blue-400/20 border-blue-300/50 text-blue-100',
  FINALIZADA: 'bg-green-400/20 border-green-300/50 text-green-100',
  CANCELADO:  'bg-red-400/20 border-red-300/50 text-red-100',
};

export function CitaDetalle() {
  const { id } = useParams<{ id: string }>();
  const [cita, setCita] = useState<Cita | null>(null);
  const [nuevoOdonto, setNuevoOdonto] = useState(false);
  const [nuevaNota, setNuevaNota] = useState(false);
  const [tituloOdonto, setTituloOdonto] = useState('');
  const [formNota, setFormNota] = useState({ titulo: '', descripcion: '', profesional: 'Micaela Ancarola' });
  const [lightboxImg, setLightboxImg] = useState<Imagen | null>(null);
  const [editandoCita, setEditandoCita] = useState(false);
  const [editEstado, setEditEstado] = useState('');
  const [editFecha, setEditFecha] = useState('');
  const [editHoraInicio, setEditHoraInicio] = useState('');
  const [editHoraFin, setEditHoraFin] = useState('');
  const [guardandoCita, setGuardandoCita] = useState(false);

  const load = () => {
    if (!id) return;
    api.citas.get(id).then(setCita as (d: unknown) => void);
  };

  useEffect(() => {
    load();
  }, [id]);

  const handleCrearOdontograma = async () => {
    if (!cita || !id) return;
    try {
      const od = await api.odontograma.create(cita.paciente.id, tituloOdonto || undefined, id) as { id: string };
      setNuevoOdonto(false);
      setTituloOdonto('');
      window.location.href = `/odontograma/${od.id}`;
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error');
    }
  };

  const handleCrearNota = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cita || !formNota.titulo.trim() || !formNota.descripcion.trim()) return;
    try {
      await api.notas.create({ ...formNota, pacienteId: cita.paciente.id, citaId: id! });
      setFormNota({ titulo: '', descripcion: '', profesional: 'Micaela Ancarola' });
      setNuevaNota(false);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error');
    }
  };

  const iniciarEdicionCita = () => {
    if (!cita) return;
    setEditEstado(cita.estado);
    setEditFecha(cita.fecha.slice(0, 10));
    setEditHoraInicio(cita.horaInicio);
    setEditHoraFin(cita.horaFin);
    setEditandoCita(true);
  };

  const handleActualizarCita = async () => {
    if (!id) return;
    setGuardandoCita(true);
    try {
      await api.citas.update(id, {
        estado: editEstado,
        fecha: editFecha,
        horaInicio: editHoraInicio,
        horaFin: editHoraFin,
      });
      setEditandoCita(false);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al actualizar');
    } finally {
      setGuardandoCita(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !cita || !id) return;
    try {
      await api.imagenes.upload(cita.paciente.id, file, undefined, 'FOTO_CLINICA', id);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al subir');
    }
    e.target.value = '';
  };

  if (!cita) return <div className="text-center py-16 text-slate-500">Cargando...</div>;

  const pacienteId = cita.paciente.id;
  const fechaStr = formatearFecha(cita.fecha);

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <Link
        to="/calendario"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-[#5fb3b0] transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Volver al calendario
      </Link>

      {/* Header principal */}
      <div className="bg-gradient-to-br from-[#5fb3b0] to-[#4a9a97] rounded-2xl shadow-lg p-8 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <p className="text-white/80 text-sm font-medium uppercase tracking-wider">{fechaStr}</p>
            <h1 className="text-3xl font-bold mt-1">
              {cita.horaInicio} – {cita.horaFin}
            </h1>
            <Link
              to={`/pacientes/${pacienteId}`}
              className="inline-flex items-center gap-2 mt-3 text-white/95 hover:text-white font-medium transition-colors"
            >
              {cita.paciente.nombre} {cita.paciente.apellido}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            {cita.motivo && (
              <p className="mt-2 text-white/85 text-sm">{cita.motivo}</p>
            )}
          </div>
          <div className="flex flex-col items-start gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium border ${ESTADO_BADGE[cita.estado] ?? 'bg-white/20 border-white/30 text-white'}`}>
                {cita.estado}
              </span>
              <button
                type="button"
                onClick={iniciarEdicionCita}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-white/20 backdrop-blur border border-white/30 rounded-xl hover:bg-white/30 transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-2a2 2 0 01.586-1.414z" />
                </svg>
                Editar
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <WhatsAppBtn telefono={cita.paciente.telefono} nombre={`${cita.paciente.nombre} ${cita.paciente.apellido}`} />
            </div>
          </div>
        </div>

        {/* Formulario edición inline */}
        {editandoCita && (
          <div className="mt-6 pt-6 border-t border-white/20">
            <p className="text-white/80 text-xs font-bold uppercase tracking-wider mb-4">Editar cita</p>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="space-y-1">
                <label className="text-xs text-white/70">Estado</label>
                <select
                  value={editEstado}
                  onChange={(e) => setEditEstado(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-white/20 border border-white/30 text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/40"
                >
                  {ESTADOS_CITA.map((est) => (
                    <option key={est} value={est} className="text-slate-800 bg-white">{est}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-white/70">Fecha</label>
                <input
                  type="date"
                  value={editFecha}
                  onChange={(e) => setEditFecha(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-white/20 border border-white/30 text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/40 [color-scheme:dark]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-white/70">Hora inicio</label>
                <input
                  type="time"
                  value={editHoraInicio}
                  onChange={(e) => setEditHoraInicio(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-white/20 border border-white/30 text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/40 [color-scheme:dark]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-white/70">Hora fin</label>
                <input
                  type="time"
                  value={editHoraFin}
                  onChange={(e) => setEditHoraFin(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-white/20 border border-white/30 text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/40 [color-scheme:dark]"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleActualizarCita}
                  disabled={guardandoCita}
                  className="px-4 py-2 bg-white text-[#4a9a97] rounded-lg text-sm font-semibold hover:bg-white/90 transition-colors disabled:opacity-60"
                >
                  {guardandoCita ? 'Guardando...' : 'Guardar'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditandoCita(false)}
                  className="px-4 py-2 bg-white/20 border border-white/30 text-white rounded-lg text-sm hover:bg-white/30 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Acciones rápidas - Registro y Historia Clínica */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          to={`/citas/${id}/prestaciones`}
          className="group flex items-center gap-4 p-6 bg-white rounded-2xl shadow-sm border border-slate-200 hover:border-[#5fb3b0]/30 hover:shadow-md transition-all"
        >
          <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-[#5fb3b0]/10 flex items-center justify-center group-hover:bg-[#5fb3b0]/20 transition-colors">
            <svg className="w-7 h-7 text-[#5fb3b0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-800 group-hover:text-[#5fb3b0] transition-colors">
              Registro de prestaciones
            </h3>
            <p className="text-sm text-slate-500 mt-0.5">
              {cita.registroPrestacion
                ? `${cita.registroPrestacion._count?.items ?? 0} prestaciones registradas`
                : 'Crear registro para esta sesión'}
            </p>
          </div>
          <svg className="w-5 h-5 text-slate-400 group-hover:text-[#5fb3b0] group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>

        <Link
          to={`/citas/${id}/historia-clinica`}
          className="group flex items-center gap-4 p-6 bg-white rounded-2xl shadow-sm border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all"
        >
          <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center group-hover:bg-slate-200 transition-colors">
            <svg className="w-7 h-7 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-800 group-hover:text-slate-600 transition-colors">
              Historia clínica
            </h3>
            <p className="text-sm text-slate-500 mt-0.5">
              Formulario completo de esta sesión
            </p>
          </div>
          <svg className="w-5 h-5 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {/* Contenido en tarjetas */}
      <div className="space-y-8">
        {/* Odontogramas */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-[#5fb3b0]/10 flex items-center justify-center">
                <svg className="w-4 h-4 text-[#5fb3b0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z" />
                </svg>
              </span>
              Odontogramas
            </h2>
            <button
              onClick={() => setNuevoOdonto(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#5fb3b0] rounded-xl hover:bg-[#4a9a97] transition-colors shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nuevo odontograma
            </button>
          </div>
          <div className="p-6">
            {nuevoOdonto && (
              <div className="mb-6 p-5 bg-slate-50 rounded-xl flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex-1 min-w-0">
                  <label className="block text-sm font-medium text-slate-600 mb-2">Título (opcional)</label>
                  <input
                    type="text"
                    value={tituloOdonto}
                    onChange={(e) => setTituloOdonto(e.target.value)}
                    placeholder={`Odontograma ${fechaStr}`}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#5fb3b0]/30 focus:border-[#5fb3b0]"
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleCrearOdontograma} className="px-5 py-2.5 bg-[#5fb3b0] text-white rounded-xl font-medium hover:bg-[#4a9a97] transition-colors">
                    Crear y abrir
                  </button>
                  <button onClick={() => { setNuevoOdonto(false); setTituloOdonto(''); }} className="px-5 py-2.5 bg-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-300 transition-colors">
                    Cancelar
                  </button>
                </div>
              </div>
            )}
            {cita.odontogramas.length > 0 ? (
              <div className="space-y-3">
                {cita.odontogramas.map((o) => (
                  <Link
                    key={o.id}
                    to={`/odontograma/${o.id}`}
                    className="flex items-center justify-between p-4 rounded-xl bg-slate-50 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all group"
                  >
                    <span className="font-medium text-slate-800 group-hover:text-[#5fb3b0] transition-colors">
                      {o.titulo || `Odontograma ${formatearFecha(o.fecha)}`}
                    </span>
                    <span className="text-sm text-slate-500 flex items-center gap-2">
                      {o._count?.dientes ?? 0} dientes
                      <svg className="w-4 h-4 text-slate-400 group-hover:text-[#5fb3b0] group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-center py-8">No hay odontogramas en esta cita.</p>
            )}
          </div>
        </div>

        {/* Notas clínicas */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </span>
              Notas clínicas
            </h2>
            <button
              onClick={() => setNuevaNota(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#5fb3b0] border border-[#5fb3b0] rounded-xl hover:bg-[#5fb3b0]/5 transition-colors shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nueva nota
            </button>
          </div>
          <div className="p-6">
            {nuevaNota && (
              <form onSubmit={handleCrearNota} className="mb-6 p-5 bg-slate-50 rounded-xl space-y-4">
                <input
                  type="text"
                  placeholder="Título"
                  value={formNota.titulo}
                  onChange={(e) => setFormNota((f) => ({ ...f, titulo: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#5fb3b0]/30 focus:border-[#5fb3b0]"
                  required
                />
                <textarea
                  placeholder="Descripción"
                  value={formNota.descripcion}
                  onChange={(e) => setFormNota((f) => ({ ...f, descripcion: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#5fb3b0]/30 focus:border-[#5fb3b0] resize-none"
                  rows={3}
                  required
                />
                <input
                  type="text"
                  placeholder="Profesional"
                  value={formNota.profesional}
                  onChange={(e) => setFormNota((f) => ({ ...f, profesional: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#5fb3b0]/30 focus:border-[#5fb3b0]"
                />
                <div className="flex gap-2">
                  <button type="submit" className="px-5 py-2.5 bg-[#5fb3b0] text-white rounded-xl font-medium hover:bg-[#4a9a97] transition-colors">Guardar</button>
                  <button type="button" onClick={() => setNuevaNota(false)} className="px-5 py-2.5 bg-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-300 transition-colors">Cancelar</button>
                </div>
              </form>
            )}
            {cita.notasClinicas.length > 0 ? (
              <div className="space-y-4">
                {cita.notasClinicas.map((n) => (
                  <div key={n.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                    <h3 className="font-semibold text-slate-800">{n.titulo}</h3>
                    <p className="text-slate-600 text-sm mt-2 leading-relaxed">{n.descripcion}</p>
                    <p className="text-slate-400 text-xs mt-3">{n.profesional} · {formatearFecha(n.fecha)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-center py-8">No hay notas en esta cita.</p>
            )}
          </div>
        </div>

        {/* Imágenes */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </span>
              Imágenes
            </h2>
            <label className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#5fb3b0] rounded-xl hover:bg-[#4a9a97] cursor-pointer transition-colors shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Subir imagen
              <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
            </label>
          </div>
          <div className="p-6">
            {cita.imagenes.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {cita.imagenes.map((img) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setLightboxImg(img)}
                    className="group block text-left rounded-xl overflow-hidden border border-slate-200 hover:border-[#5fb3b0]/50 hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-[#5fb3b0]/30"
                  >
                    <div className="aspect-square overflow-hidden bg-slate-100">
                      <img
                        src={getUploadUrl(img.url)}
                        alt={img.descripcion || 'Imagen'}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <p className="p-3 text-sm text-slate-600 truncate">{img.descripcion || img.tipo}</p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-center py-8">No hay imágenes en esta cita.</p>
            )}
          </div>
        </div>
      </div>

      {lightboxImg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightboxImg(null)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Escape' && setLightboxImg(null)}
        >
          <button onClick={() => setLightboxImg(null)} className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white text-2xl transition-colors">
            ×
          </button>
          <img src={getUploadUrl(lightboxImg.url)} alt="" className="max-w-full max-h-[90vh] object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
