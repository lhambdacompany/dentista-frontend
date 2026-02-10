import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { formatearFecha } from '../lib/formatDate';
import { numerosDesdeCantidad } from '../lib/odontogramaUtils';

function RecordatorioButton({ citaId }: { citaId: string }) {
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
    <div className="flex items-center gap-1 shrink-0">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="text-xs px-2 py-1 bg-slate-200 hover:bg-slate-300 rounded disabled:opacity-50"
        title="Enviar recordatorio por email"
      >
        {loading ? '...' : '✉ Enviar recordatorio'}
      </button>
      {msg && <span className="text-xs text-slate-600">{msg}</span>}
    </div>
  );
}

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
  odontogramas?: Odontograma[];
}

const ODONTOGRAMAS_POR_PAGINA = 5;

export function PacienteDetalle() {
  const { id } = useParams<{ id: string }>();
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [odontogramas, setOdontogramas] = useState<Odontograma[]>([]);
  const [paginaOdonto, setPaginaOdonto] = useState(1);
  const [totalOdonto, setTotalOdonto] = useState(0);
  const [proximaCita, setProximaCita] = useState<Cita | null>(null);
  const [nuevoOdontograma, setNuevoOdontograma] = useState(false);
  const [tituloOdontograma, setTituloOdontograma] = useState('');
  const [numerosDientesInput, setNumerosDientesInput] = useState('');

  const loadPaciente = () => {
    if (id) api.pacientes.get(id).then((d) => {
      setPaciente(d as Paciente);
      const ods = (d as Paciente)?.odontogramas || [];
      setTotalOdonto(ods.length);
    });
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
        <h1 className="text-xl sm:text-2xl font-bold text-slate-800">
          {paciente.nombre} {paciente.apellido}
        </h1>
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

        {proximaCita && (
          <div className="mt-6 p-4 bg-[#5fb3b0]/15 border border-[#5fb3b0]/30 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-slate-800">Próxima cita</p>
              <p className="text-slate-600">
                {formatearFecha(proximaCita.fecha)} · {proximaCita.horaInicio} {proximaCita.motivo ? `- ${proximaCita.motivo}` : ''}
              </p>
            </div>
            <RecordatorioButton citaId={proximaCita.id} />
          </div>
        )}

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
