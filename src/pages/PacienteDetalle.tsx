import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { formatearFecha } from '../lib/formatDate';
import { numerosDesdeCantidad } from '../lib/odontogramaUtils';


interface Odontograma {
  id: string;
  fecha: string;
  titulo?: string;
  _count?: { dientes: number };
}

interface Cita {
  id: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  motivo?: string;
  estado: string;
}

interface Paciente {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  fechaNacimiento: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  nota?: string;
  alergias?: string;
  obraSocial?: { id: string; nombre: string };
  obraSocialId?: string;
  odontogramas?: Odontograma[];
}

interface ObraSocial {
  id: string;
  nombre: string;
}

const ODONTOGRAMAS_POR_PAGINA = 5;
const CITAS_POR_PAGINA = 5;

const ESTADO_CITA_BADGE: Record<string, string> = {
  PENDIENTE:  'bg-yellow-100 text-yellow-700',
  CONFIRMADA: 'bg-blue-100 text-blue-700',
  FINALIZADA: 'bg-green-100 text-green-700',
  CANCELADA:  'bg-red-100 text-red-700',
};

export function PacienteDetalle() {
  const { id } = useParams<{ id: string }>();
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [odontogramas, setOdontogramas] = useState<Odontograma[]>([]);
  const [paginaOdonto, setPaginaOdonto] = useState(1);
  const [totalOdonto, setTotalOdonto] = useState(0);
  const [proximaCita, setProximaCita] = useState<Cita | null>(null);
  const [todasLasCitas, setTodasLasCitas] = useState<Cita[]>([]);
  const [paginaCitas, setPaginaCitas] = useState(1);
  const [nuevoOdontograma, setNuevoOdontograma] = useState(false);
  const [tituloOdontograma, setTituloOdontograma] = useState('');
  const [numerosDientesInput, setNumerosDientesInput] = useState('');
  const [editando, setEditando] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Paciente>>({});
  const [obrasSociales, setObrasSociales] = useState<ObraSocial[]>([]);
  const [guardandoPaciente, setGuardandoPaciente] = useState(false);

  const loadPaciente = () => {
    if (id) api.pacientes.get(id).then((d) => {
      setPaciente(d as Paciente);
      const ods = (d as Paciente)?.odontogramas || [];
      setTotalOdonto(ods.length);
    });
  };

  const abrirEdicion = () => {
    if (!paciente) return;
    setEditForm({
      nombre: paciente.nombre,
      apellido: paciente.apellido,
      dni: paciente.dni,
      fechaNacimiento: paciente.fechaNacimiento?.slice(0, 10) ?? '',
      telefono: paciente.telefono ?? '',
      email: paciente.email ?? '',
      direccion: paciente.direccion ?? '',
      nota: paciente.nota ?? '',
      alergias: paciente.alergias ?? '',
      obraSocialId: paciente.obraSocial?.id ?? '',
    });
    if (obrasSociales.length === 0) {
      api.obrasSociales.list().then((list) => setObrasSociales(list as ObraSocial[]));
    }
    setEditando(true);
  };

  const handleGuardarPaciente = async () => {
    if (!id) return;
    setGuardandoPaciente(true);
    try {
      const payload = {
        ...editForm,
        obraSocialId: editForm.obraSocialId || null,
      };
      const actualizado = await api.pacientes.update(id, payload) as Paciente;
      setPaciente((prev) => prev ? { ...prev, ...actualizado } : actualizado);
      setEditando(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setGuardandoPaciente(false);
    }
  };

  const loadOdontogramas = () => {
    if (!id) return;
    api.odontograma.list(id).then((list) => {
      const arr = list as Odontograma[];
      setOdontogramas(arr);
      setTotalOdonto(arr.length);
    });
  };

  useEffect(() => {
    loadPaciente();
  }, [id]);

  useEffect(() => {
    loadOdontogramas();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const hoy = new Date().toISOString().slice(0, 10);
    const enUnMes = new Date();
    enUnMes.setMonth(enUnMes.getMonth() + 1);
    api.citas.list(hoy, enUnMes.toISOString(), id).then((citas) => {
      const arr = citas as Cita[];
      const prox = arr.find((c) => new Date(c.fecha) >= new Date());
      setProximaCita(prox || null);
    });
    // Cargar todas las citas del paciente (sin filtro de fecha)
    api.citas.list(undefined, undefined, id).then((citas) => {
      const arr = (citas as Cita[]).sort(
        (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
      );
      setTodasLasCitas(arr);
    });
  }, [id]);

  const handleCrearOdontograma = async () => {
    if (!id) return;
    let numeros: number[] | undefined;
    const cant = parseInt(numerosDientesInput, 10);
    if ([8, 16, 32, 52].includes(cant)) {
      numeros = numerosDesdeCantidad(cant);
    } else if (numerosDientesInput.trim()) {
      numeros = numerosDientesInput.split(/[\s,]+/).map((n) => parseInt(n.trim(), 10)).filter((n) => !Number.isNaN(n));
      if (numeros.length === 0) numeros = undefined;
    } else {
      numeros = undefined; // 32 por defecto
    }
    try {
      const od = await api.odontograma.create(id, tituloOdontograma || undefined, undefined, numeros) as { id: string };
      setNuevoOdontograma(false);
      setTituloOdontograma('');
      setNumerosDientesInput('');
      loadOdontogramas();
      loadPaciente();
      window.location.href = `/odontograma/${od.id}`;
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error');
    }
  };

  const totalPaginasCitas = Math.ceil(todasLasCitas.length / CITAS_POR_PAGINA);
  const citasPaginadas = todasLasCitas.slice(
    (paginaCitas - 1) * CITAS_POR_PAGINA,
    paginaCitas * CITAS_POR_PAGINA
  );

  const totalPaginas = Math.ceil(totalOdonto / ODONTOGRAMAS_POR_PAGINA);
  const odontogramasPaginados = odontogramas.slice(
    (paginaOdonto - 1) * ODONTOGRAMAS_POR_PAGINA,
    paginaOdonto * ODONTOGRAMAS_POR_PAGINA
  );

  if (!paciente) return <div className="text-center py-12">Cargando...</div>;

  return (
    <div className="space-y-6">
      <Link to="/pacientes" className="inline-flex items-center text-[#5fb3b0] hover:underline">
        ← Volver a pacientes
      </Link>

      <div className="bg-white rounded-xl shadow p-4 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">
            {paciente.nombre} {paciente.apellido}
          </h1>
          {!editando && (
            <button
              type="button"
              onClick={abrirEdicion}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 hover:border-slate-400 shrink-0 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Editar
            </button>
          )}
        </div>

        {editando ? (
          <div className="mt-4 space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Nombre</label>
                <input type="text" value={editForm.nombre ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, nombre: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5fb3b0]/50" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Apellido</label>
                <input type="text" value={editForm.apellido ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, apellido: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5fb3b0]/50" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">DNI</label>
                <input type="text" value={editForm.dni ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, dni: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5fb3b0]/50" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Fecha de nacimiento</label>
                <input type="date" value={editForm.fechaNacimiento ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, fechaNacimiento: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5fb3b0]/50" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Teléfono</label>
                <input type="tel" value={editForm.telefono ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, telefono: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5fb3b0]/50" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Email</label>
                <input type="email" value={editForm.email ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5fb3b0]/50" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">Domicilio</label>
                <input type="text" value={editForm.direccion ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, direccion: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5fb3b0]/50" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">Obra social</label>
                <select value={editForm.obraSocialId ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, obraSocialId: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5fb3b0]/50">
                  <option value="">Sin obra social</option>
                  {obrasSociales.map((o) => (
                    <option key={o.id} value={o.id}>{o.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">Alergias</label>
                <input type="text" value={editForm.alergias ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, alergias: e.target.value }))}
                  placeholder="Dejar vacío si no hay alergias conocidas"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5fb3b0]/50" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">Nota interna</label>
                <textarea value={editForm.nota ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, nota: e.target.value }))}
                  rows={2} placeholder="Observaciones internas sobre el paciente"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#5fb3b0]/50" />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={handleGuardarPaciente} disabled={guardandoPaciente}
                className="px-5 py-2 bg-[#5fb3b0] text-white rounded-lg hover:bg-[#4a9a97] text-sm font-medium disabled:opacity-60">
                {guardandoPaciente ? 'Guardando...' : 'Guardar cambios'}
              </button>
              <button type="button" onClick={() => setEditando(false)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 text-sm">
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 grid sm:grid-cols-2 gap-3 sm:gap-4 text-slate-600 text-sm sm:text-base">
            <p>DNI: {paciente.dni}</p>
            <p>Tel: {paciente.telefono || '-'}</p>
            <p>Email: {paciente.email || '-'}</p>
            <p>Nacimiento: {formatearFecha(paciente.fechaNacimiento)}</p>
            <p>Obra social: {paciente.obraSocial?.nombre || 'Sin obra social'}</p>
            {paciente.alergias && (
              <p className="text-amber-600 col-span-2">
                ⚠ Alergias: {paciente.alergias}
              </p>
            )}
            {paciente.nota && (
              <div className="sm:col-span-2 p-3 bg-slate-50 rounded-lg">
                <p className="text-sm font-medium text-slate-700">Nota:</p>
                <p className="text-slate-600">{paciente.nota}</p>
              </div>
            )}
          </div>
        )}

        {proximaCita && (
          <div className="mt-6 p-4 bg-[#5fb3b0]/15 border border-[#5fb3b0]/30 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-slate-800">Próxima cita</p>
              <p className="text-slate-600">
                {formatearFecha(proximaCita.fecha)} · {proximaCita.horaInicio} {proximaCita.motivo ? `- ${proximaCita.motivo}` : ''}
              </p>
            </div>
            {paciente.telefono && (() => {
              const tel = paciente.telefono!.replace(/\D/g, '');
              if (!tel) return null;
              const msg = encodeURIComponent(`Hola ${paciente.nombre}, te recordamos que tenés un turno programado. ¡Te esperamos!`);
              return (
                <a
                  href={`https://wa.me/${tel}?text=${msg}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 transition-colors shrink-0"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Enviar recordatorio
                </a>
              );
            })()}
          </div>
        )}

        {/* ── CITAS ── */}
        <div className="mt-6">
          <div className="flex items-center justify-between gap-4 mb-3">
            <h2 className="text-lg font-semibold text-slate-800">Citas</h2>
            <Link
              to="/calendario"
              className="text-sm text-[#5fb3b0] hover:underline shrink-0"
            >
              + Nueva cita
            </Link>
          </div>

          {todasLasCitas.length === 0 ? (
            <p className="text-slate-500 text-sm py-2">No hay citas registradas para este paciente.</p>
          ) : (
            <div className="space-y-2">
              {citasPaginadas.map((c) => (
                <Link
                  key={c.id}
                  to={`/citas/${c.id}`}
                  className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition group"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 text-sm">
                      {formatearFecha(c.fecha)} · {c.horaInicio}–{c.horaFin}
                    </p>
                    {c.motivo && (
                      <p className="text-xs text-slate-500 truncate">{c.motivo}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_CITA_BADGE[c.estado] ?? 'bg-slate-100 text-slate-600'}`}>
                      {c.estado}
                    </span>
                    <svg className="w-4 h-4 text-slate-400 group-hover:text-[#5fb3b0] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}

              {totalPaginasCitas > 1 && (
                <div className="flex justify-center gap-2 mt-3">
                  <button
                    onClick={() => setPaginaCitas((p) => Math.max(1, p - 1))}
                    disabled={paginaCitas <= 1}
                    className="px-3 py-1 rounded bg-slate-200 disabled:opacity-50 text-sm"
                  >
                    Anterior
                  </button>
                  <span className="px-3 py-1 text-sm text-slate-600">{paginaCitas} / {totalPaginasCitas}</span>
                  <button
                    onClick={() => setPaginaCitas((p) => Math.min(totalPaginasCitas, p + 1))}
                    disabled={paginaCitas >= totalPaginasCitas}
                    className="px-3 py-1 rounded bg-slate-200 disabled:opacity-50 text-sm"
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Botones Notas, Imágenes, Historial - arriba del odontograma */}
        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            to={`/pacientes/${id}/notas`}
            className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 text-sm"
          >
            Notas clínicas
          </Link>
          <Link
            to={`/pacientes/${id}/imagenes`}
            className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 text-sm"
          >
            Imágenes
          </Link>
          <Link
            to={`/pacientes/${id}/historial`}
            className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 text-sm"
          >
            Historial
          </Link>
          <Link
            to={`/pacientes/${id}/historia-clinica`}
            className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 text-sm"
          >
            Historia clínica
          </Link>
        </div>

        {/* Odontogramas */}
        <div className="mt-6">
          <div className="flex flex-col sm:flex-row justify-between gap-4 mb-4">
            <h2 className="text-lg font-semibold text-slate-800">Odontogramas</h2>
            <button
              onClick={() => setNuevoOdontograma(true)}
              className="px-3 py-1.5 bg-[#5fb3b0] text-white rounded-lg hover:bg-[#4a9a97] text-sm shrink-0"
            >
              + Nuevo odontograma
            </button>
          </div>

          {nuevoOdontograma && (
            <div className="mb-4 p-4 bg-slate-50 rounded-lg flex flex-col gap-3">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm text-slate-600 mb-1">Título (opcional)</label>
                <input
                  type="text"
                  value={tituloOdontograma}
                  onChange={(e) => setTituloOdontograma(e.target.value)}
                  placeholder="Ej: Control marzo 2025"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Cantidad de dientes</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {[8, 16, 32, 52].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setNumerosDientesInput(n === 32 ? '' : n.toString())}
                      className={`px-3 py-1.5 text-sm border rounded-lg ${
                        (numerosDientesInput === '' && n === 32) || numerosDientesInput === n.toString()
                          ? 'border-[#5fb3b0] bg-[#5fb3b0]/10 text-[#5fb3b0]'
                          : 'border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {n} dientes
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={numerosDientesInput}
                  onChange={(e) => setNumerosDientesInput(e.target.value)}
                  placeholder="8, 16, 32 o 52. Vacío = 32 (permanente estándar)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCrearOdontograma}
                  className="px-4 py-2 bg-[#5fb3b0] text-white rounded-lg hover:bg-[#4a9a97]"
                >
                  Crear y abrir
                </button>
                <button
                  onClick={() => {
                    setNuevoOdontograma(false);
                    setTituloOdontograma('');
                    setNumerosDientesInput('');
                  }}
                  className="px-4 py-2 bg-slate-200 rounded-lg hover:bg-slate-300"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {odontogramasPaginados.length > 0 ? (
            <div className="space-y-2">
              {odontogramasPaginados.map((o) => (
                <Link
                  key={o.id}
                  to={`/odontograma/${o.id}`}
                  className="flex justify-between items-center p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition"
                >
                  <span className="font-medium">
                    {o.titulo || `Odontograma ${formatearFecha(o.fecha)}`}
                  </span>
                  <span className="text-sm text-slate-500">
                    {o._count?.dientes ?? 0} dientes · {formatearFecha(o.fecha)}
                  </span>
                </Link>
              ))}
              {totalPaginas > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                  <button
                    onClick={() => setPaginaOdonto((p) => Math.max(1, p - 1))}
                    disabled={paginaOdonto <= 1}
                    className="px-3 py-1 rounded bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    Anterior
                  </button>
                  <span className="px-3 py-1 text-sm text-slate-600">
                    {paginaOdonto} / {totalPaginas}
                  </span>
                  <button
                    onClick={() => setPaginaOdonto((p) => Math.min(totalPaginas, p + 1))}
                    disabled={paginaOdonto >= totalPaginas}
                    className="px-3 py-1 rounded bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-slate-500 py-4">
              No hay odontogramas. Crea uno para registrar el estado dental del paciente.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
