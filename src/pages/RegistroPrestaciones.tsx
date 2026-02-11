import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { formatearFecha } from '../lib/formatDate';

const CARAS = [
  { value: 'VESTIBULAR', label: 'Vestibular' },
  { value: 'LINGUAL', label: 'Lingual' },
  { value: 'MESIAL', label: 'Mesial' },
  { value: 'DISTAL', label: 'Distal' },
  { value: 'OCLUSAL', label: 'Oclusal' },
] as const;

type EstadoDiente =
  | 'EXISTENTE'
  | 'REQUERIDA'
  | 'AUSENTE'
  | 'PROTESIS_FIJA'
  | 'PROTESIS_REMOVIBLE'
  | 'CORONA';

type Herramienta = EstadoDiente | 'BORRAR';

interface Paciente {
  id: string;
  nombre: string;
  apellido: string;
  dni?: string;
  telefono?: string;
  direccion?: string;
  obraSocial?: { nombre: string };
}

interface Cita {
  id: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  motivo?: string;
  paciente: Paciente;
}

interface PrestacionItem {
  id: string;
  numeroDiente: number;
  cara?: string;
  codigo: string;
  descripcion?: string;
  fechaRealizacion?: string;
  cantidad: number;
  conformidadPaciente: boolean;
}

interface RegistroPrestacion {
  id: string;
  observaciones?: string;
  cantidadDientesExistente?: number;
  protesisFija: boolean;
  protesisRemovible: boolean;
  coronas: boolean;
  consentimientoInformado: boolean;
  estadosDientes?: Record<string, EstadoDiente>;
  items: PrestacionItem[];
}

// ── Config visual por estado ─────────────────────────────────────────────────

const ESTADO_CONFIG: Record<EstadoDiente, {
  bg: string;
  border: string;
  text: string;
  label: string;
  symbol: React.ReactNode;
}> = {
  EXISTENTE: {
    bg: 'bg-red-100', border: 'border-red-400', text: 'text-red-700',
    label: 'Prestaciones existentes',
    symbol: null,
  },
  REQUERIDA: {
    bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-700',
    label: 'Prestaciones requeridas',
    symbol: null,
  },
  AUSENTE: {
    bg: 'bg-slate-100', border: 'border-slate-500', text: 'text-slate-500',
    label: 'Diente ausente / a extraer',
    symbol: (
      <svg viewBox="0 0 32 32" className="absolute inset-0 w-full h-full pointer-events-none" strokeWidth={2.5}>
        <line x1="4" y1="4" x2="28" y2="28" stroke="#64748b" />
        <line x1="28" y1="4" x2="4" y2="28" stroke="#64748b" />
      </svg>
    ),
  },
  PROTESIS_FIJA: {
    bg: 'bg-amber-50', border: 'border-amber-500', text: 'text-amber-700',
    label: 'Prótesis fija',
    symbol: (
      // Arco de portería (⊓)
      <svg viewBox="0 0 32 32" className="absolute inset-0 w-full h-full pointer-events-none" strokeWidth={2.5} fill="none">
        <path d="M 5 26 L 5 10 L 27 10 L 27 26" stroke="#d97706" strokeLinejoin="round" />
      </svg>
    ),
  },
  PROTESIS_REMOVIBLE: {
    bg: 'bg-purple-50', border: 'border-purple-500', text: 'text-purple-700',
    label: 'Prótesis removible',
    symbol: (
      // Rectángulo interior
      <svg viewBox="0 0 32 32" className="absolute inset-0 w-full h-full pointer-events-none" strokeWidth={2.5} fill="none">
        <rect x="5" y="5" width="22" height="22" rx="1" stroke="#7c3aed" />
      </svg>
    ),
  },
  CORONA: {
    bg: 'bg-teal-50', border: 'border-teal-500', text: 'text-teal-700',
    label: 'Corona',
    symbol: (
      // Círculo interior
      <svg viewBox="0 0 32 32" className="absolute inset-0 w-full h-full pointer-events-none" strokeWidth={2.5} fill="none">
        <circle cx="16" cy="16" r="11" stroke="#0f766e" />
      </svg>
    ),
  },
};

const HERRAMIENTAS: { id: Herramienta; label: string; preview: React.ReactNode }[] = [
  {
    id: 'EXISTENTE',
    label: 'Existente',
    preview: <span className="inline-block w-4 h-4 rounded-sm bg-red-200 border border-red-400" />,
  },
  {
    id: 'REQUERIDA',
    label: 'Requerida',
    preview: <span className="inline-block w-4 h-4 rounded-sm bg-blue-200 border border-blue-400" />,
  },
  {
    id: 'AUSENTE',
    label: 'Ausente',
    preview: (
      <span className="inline-block relative w-4 h-4 border border-slate-400 bg-slate-100 rounded-sm">
        <svg viewBox="0 0 16 16" className="absolute inset-0" strokeWidth={2}>
          <line x1="2" y1="2" x2="14" y2="14" stroke="#64748b" />
          <line x1="14" y1="2" x2="2" y2="14" stroke="#64748b" />
        </svg>
      </span>
    ),
  },
  {
    id: 'PROTESIS_FIJA',
    label: 'Prótesis fija',
    preview: (
      <span className="inline-block relative w-4 h-4 border border-amber-400 bg-amber-50 rounded-sm">
        <svg viewBox="0 0 16 16" className="absolute inset-0" strokeWidth={2} fill="none">
          <path d="M 2 14 L 2 6 L 14 6 L 14 14" stroke="#d97706" />
        </svg>
      </span>
    ),
  },
  {
    id: 'PROTESIS_REMOVIBLE',
    label: 'Prótesis removible',
    preview: (
      <span className="inline-block relative w-4 h-4 border border-purple-400 bg-purple-50 rounded-sm">
        <svg viewBox="0 0 16 16" className="absolute inset-0" strokeWidth={2} fill="none">
          <rect x="2" y="2" width="12" height="12" stroke="#7c3aed" />
        </svg>
      </span>
    ),
  },
  {
    id: 'CORONA',
    label: 'Corona',
    preview: (
      <span className="inline-block relative w-4 h-4 border border-teal-400 bg-teal-50 rounded-sm">
        <svg viewBox="0 0 16 16" className="absolute inset-0" strokeWidth={2} fill="none">
          <circle cx="8" cy="8" r="5" stroke="#0f766e" />
        </svg>
      </span>
    ),
  },
  {
    id: 'BORRAR',
    label: 'Borrar',
    preview: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    ),
  },
];

// ── Odontograma ──────────────────────────────────────────────────────────────

const DIENTES_ADULTO_SUPERIOR = [[18, 17, 16, 15, 14, 13, 12, 11], [21, 22, 23, 24, 25, 26, 27, 28]];
const DIENTES_ADULTO_INFERIOR = [[48, 47, 46, 45, 44, 43, 42, 41], [31, 32, 33, 34, 35, 36, 37, 38]];
const DIENTES_PRIMARIO_SUPERIOR = [[55, 54, 53, 52, 51], [61, 62, 63, 64, 65]];
const DIENTES_PRIMARIO_INFERIOR = [[85, 84, 83, 82, 81], [71, 72, 73, 74, 75]];

function Diente({
  numero,
  estado,
  onClick,
}: {
  numero: number;
  estado?: EstadoDiente;
  onClick?: () => void;
}) {
  const cfg = estado ? ESTADO_CONFIG[estado] : null;

  return (
    <button
      type="button"
      onClick={onClick}
      title={`Diente ${numero}${estado ? ` — ${ESTADO_CONFIG[estado].label}` : ''}`}
      className={`relative w-9 h-9 border-2 rounded flex flex-col items-center justify-end pb-0.5 overflow-hidden transition-all
        ${cfg ? `${cfg.bg} ${cfg.border}` : 'bg-white border-slate-300 hover:bg-slate-50'}
        ${onClick ? 'cursor-pointer' : 'cursor-default'}
      `}
    >
      {cfg?.symbol}
      <span className={`text-[9px] font-bold z-10 leading-none select-none ${cfg ? cfg.text : 'text-slate-500'}`}>
        {numero}
      </span>
    </button>
  );
}

function FilaDientes({
  grupos,
  estados,
  onDienteClick,
}: {
  grupos: number[][];
  estados: Record<string, EstadoDiente>;
  onDienteClick?: (n: number) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-1">
      {grupos[0].map((n) => (
        <Diente key={n} numero={n} estado={estados[String(n)]} onClick={onDienteClick ? () => onDienteClick(n) : undefined} />
      ))}
      <div className="w-4 shrink-0" />
      {grupos[1].map((n) => (
        <Diente key={n} numero={n} estado={estados[String(n)]} onClick={onDienteClick ? () => onDienteClick(n) : undefined} />
      ))}
    </div>
  );
}

function Odontograma({
  estados,
  herramienta,
  onDienteClick,
}: {
  estados: Record<string, EstadoDiente>;
  herramienta: Herramienta | null;
  onDienteClick: (n: number) => void;
}) {
  return (
    <div className="space-y-2 overflow-x-auto pb-2">
      <FilaDientes grupos={DIENTES_ADULTO_SUPERIOR} estados={estados} onDienteClick={herramienta ? onDienteClick : undefined} />
      <FilaDientes grupos={DIENTES_ADULTO_INFERIOR} estados={estados} onDienteClick={herramienta ? onDienteClick : undefined} />
      <div className="flex justify-between px-10 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">
        <span>Derecha</span>
        <span>Izquierda</span>
      </div>
      <div className="border-t border-dashed border-slate-200 pt-2 space-y-2">
        <p className="text-center text-xs text-slate-400">Dentición primaria</p>
        <FilaDientes grupos={DIENTES_PRIMARIO_SUPERIOR} estados={estados} onDienteClick={herramienta ? onDienteClick : undefined} />
        <FilaDientes grupos={DIENTES_PRIMARIO_INFERIOR} estados={estados} onDienteClick={herramienta ? onDienteClick : undefined} />
      </div>
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────

const TEXTO_CONSENTIMIENTO = `Por la presente reconozco que el/la profesional me ha informado del tipo de tratamiento que debe efectuarse en base al diagnóstico realizado. A su pedido he manifestado todo lo que conozco respecto a mi salud. Se me ha explicado en términos comprensibles para mí y reconozco haber entendido acabadamente la tarea propuesta. De la misma manera se me ha informado de los riesgos y complicaciones que pudieran surgir y, ante la posibilidad de que aparezcan consecuencias no previsibles, dada la capacidad que le reconozco al/la profesional antes mencionado/a, los aceptaré como inherentes a la tarea realizada. También doy mi expresa conformidad; el uso correcto de la aparatología y el cumplimiento de las indicaciones del profesional hacen al éxito del tratamiento y son de mi exclusiva responsabilidad. Además autorizo al/la profesional antes citado/a a proveer los servicios o tratamientos adicionales que considere razonables, incluyendo, aunque no limitados a ello, la administración de anestesia local, prácticas radiológicas y otros métodos de diagnóstico necesarios. También se me han descrito todas las variantes y sus correspondientes posibilidades y riesgos y en ejercicio de mi libertad, considerándome suficientemente informado/a, opto por el tratamiento propuesto que se me ha detallado en esta ficha (codificada) firmando de conformidad este consentimiento.`;

export function RegistroPrestaciones() {
  const { citaId } = useParams<{ citaId: string }>();
  const [cita, setCita] = useState<Cita | null>(null);
  const [registro, setRegistro] = useState<RegistroPrestacion | null>(null);
  const [loading, setLoading] = useState(true);
  const [nuevoItem, setNuevoItem] = useState(false);
  const [formItem, setFormItem] = useState({
    numeroDiente: 11,
    cara: '',
    codigo: '',
    descripcion: '',
    fechaRealizacion: '',
    cantidad: 1,
    conformidadPaciente: false,
  });
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [herramienta, setHerramienta] = useState<Herramienta | null>(null);

  const load = () => {
    if (!citaId) return;
    api.prestaciones
      .getByCita(citaId)
      .then((r) => {
        setCita((r as { cita: Cita }).cita);
        setRegistro((r as { registro: RegistroPrestacion | null }).registro);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [citaId]);

  const handleCrearRegistro = async () => {
    if (!citaId) return;
    try {
      const r = await api.prestaciones.create(citaId) as RegistroPrestacion;
      setRegistro(r);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al crear');
    }
  };

  const handleGuardarRegistro = async (data: Partial<RegistroPrestacion>) => {
    if (!registro) return;
    try {
      const r = await api.prestaciones.updateRegistro(registro.id, data) as RegistroPrestacion;
      setRegistro((prev) => prev ? { ...prev, ...r } : r);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error');
    }
  };

  const handleDienteClick = useCallback(async (numero: number) => {
    if (!herramienta || !registro) return;
    const key = String(numero);
    const actuales = registro.estadosDientes ?? {};
    const nuevo: Record<string, EstadoDiente> = { ...actuales };

    if (herramienta === 'BORRAR') {
      delete nuevo[key];
    } else if (actuales[key] === herramienta) {
      // clic en el mismo estado → borrar
      delete nuevo[key];
    } else {
      nuevo[key] = herramienta;
    }

    // Optimistic update
    setRegistro((prev) => prev ? { ...prev, estadosDientes: nuevo } : null);
    try {
      await api.prestaciones.updateRegistro(registro.id, { estadosDientes: nuevo } as never);
    } catch (err) {
      // revertir en caso de error
      setRegistro((prev) => prev ? { ...prev, estadosDientes: actuales } : null);
      alert(err instanceof Error ? err.message : 'Error al guardar');
    }
  }, [herramienta, registro]);

  const handleAgregarItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registro || !formItem.codigo.trim()) return;
    try {
      await api.prestaciones.addItem(registro.id, {
        ...formItem,
        cara: formItem.cara || undefined,
        descripcion: formItem.descripcion || undefined,
        fechaRealizacion: formItem.fechaRealizacion || undefined,
      });
      setFormItem({ numeroDiente: 11, cara: '', codigo: '', descripcion: '', fechaRealizacion: '', cantidad: 1, conformidadPaciente: false });
      setNuevoItem(false);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error');
    }
  };

  const handleActualizarItem = async (id: string, data: Partial<PrestacionItem>) => {
    try {
      await api.prestaciones.updateItem(id, data);
      setEditandoId(null);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error');
    }
  };

  const handleEliminarItem = async (id: string) => {
    if (!confirm('¿Eliminar esta prestación?')) return;
    try {
      await api.prestaciones.removeItem(id);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error');
    }
  };

  const abrirNuevoItem = (numeroDiente?: number) => {
    setFormItem({
      numeroDiente: numeroDiente ?? 11,
      cara: '',
      codigo: '',
      descripcion: '',
      fechaRealizacion: new Date().toISOString().slice(0, 10),
      cantidad: 1,
      conformidadPaciente: false,
    });
    setNuevoItem(true);
  };

  if (loading) return <div className="text-center py-12 text-slate-500">Cargando...</div>;
  if (!cita) return <div className="text-center py-12 text-slate-500">Cita no encontrada</div>;

  const estadosDientes = registro?.estadosDientes ?? {};
  const fechaCita = new Date(cita.fecha);
  const mes = fechaCita.toLocaleString('es-AR', { month: 'long' }).toUpperCase();
  const anio = fechaCita.getFullYear();

  return (
    <div className="space-y-4">
      <Link to={`/citas/${citaId}`} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Volver a la cita
      </Link>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">

        {/* ── ENCABEZADO ── */}
        <div className="border-b-2 border-[#5fb3b0] p-5 flex flex-col sm:flex-row items-stretch gap-4">
          <div className="flex items-center gap-4 shrink-0">
            <div className="w-16 h-16 rounded-full border-2 border-[#5fb3b0] flex items-center justify-center text-3xl select-none">
              🦷
            </div>
            <div className="border-2 border-[#5fb3b0] px-4 py-2 text-center">
              <p className="text-xs font-bold text-slate-700 leading-tight">REGISTRO DE</p>
              <p className="text-xs font-bold text-slate-700 leading-tight">PRESTACIONES</p>
            </div>
          </div>
          <div className="flex-1 border-2 border-[#5fb3b0] p-3 space-y-2 text-sm">
            <div className="flex items-baseline gap-2">
              <span className="font-bold text-slate-700 whitespace-nowrap">OBRA SOCIAL:</span>
              <span className="text-slate-600 border-b border-dotted border-slate-400 flex-1">
                {cita.paciente.obraSocial?.nombre ?? '—'}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-bold text-slate-700 whitespace-nowrap">CÓDIGO Nº:</span>
              <span className="text-slate-400 border-b border-dotted border-slate-300 flex-1">—</span>
            </div>
          </div>
          <div className="border-2 border-[#5fb3b0] p-3 text-sm text-center flex flex-col justify-center shrink-0">
            <p className="font-bold text-slate-700 uppercase">{mes}</p>
            <p className="text-slate-600">{anio}</p>
          </div>
        </div>

        <div className="p-5 space-y-5">

          {/* ── DATOS DEL PACIENTE ── */}
          <section className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Datos del paciente</p>
            </div>
            <div className="p-4 space-y-3 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <CampoForm label="PACIENTE" value={`${cita.paciente.nombre} ${cita.paciente.apellido}`} />
                </div>
                <CampoForm label="DNI" value={cita.paciente.dni ?? '—'} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <CampoForm label="FECHA CITA" value={formatearFecha(cita.fecha)} />
                <CampoForm label="HORA" value={`${cita.horaInicio} – ${cita.horaFin}`} />
                <div className="sm:col-span-2">
                  <CampoForm label="MOTIVO" value={cita.motivo ?? '—'} />
                </div>
              </div>
              {(cita.paciente.direccion || cita.paciente.telefono) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <CampoForm label="DOMICILIO" value={cita.paciente.direccion ?? '—'} />
                  <CampoForm label="TELÉFONO" value={cita.paciente.telefono ?? '—'} />
                </div>
              )}
            </div>
          </section>

          {/* ── SIN REGISTRO ── */}
          {!registro ? (
            <div className="border-2 border-dashed border-slate-200 rounded-lg py-10 text-center">
              <p className="text-slate-500 mb-4 text-sm">No hay registro de prestaciones para esta sesión.</p>
              <button
                onClick={handleCrearRegistro}
                className="px-5 py-2 bg-[#5fb3b0] text-white rounded-lg hover:bg-[#4a9a97] font-medium text-sm"
              >
                Crear registro de prestaciones
              </button>
            </div>
          ) : (
            <>
              {/* ── TABLA DE PRESTACIONES ── */}
              <section className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Prestaciones realizadas</p>
                  {!nuevoItem && (
                    <button type="button" onClick={() => abrirNuevoItem()} className="text-xs text-[#5fb3b0] hover:underline font-medium">
                      + Agregar prestación
                    </button>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-3 py-2.5 text-center text-xs font-bold text-slate-600 border-r border-slate-200 w-20">DIENTE Nº</th>
                        <th className="px-3 py-2.5 text-center text-xs font-bold text-slate-600 border-r border-slate-200 w-28">CARA</th>
                        <th className="px-3 py-2.5 text-center text-xs font-bold text-slate-600 border-r border-slate-200 w-24">CÓDIGO</th>
                        <th className="px-3 py-2.5 text-center text-xs font-bold text-slate-600 border-r border-slate-200">DESCRIPCIÓN</th>
                        <th className="px-3 py-2.5 text-center text-xs font-bold text-slate-600 border-r border-slate-200 w-32">FECHA REALIZACIÓN</th>
                        <th className="px-3 py-2.5 text-center text-xs font-bold text-slate-600 border-r border-slate-200 w-16">CANT.</th>
                        <th className="px-3 py-2.5 text-center text-xs font-bold text-slate-600 border-r border-slate-200 w-24">CONFORMIDAD</th>
                        <th className="px-3 py-2.5 w-20" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {registro.items.length === 0 && !nuevoItem && (
                        <tr>
                          <td colSpan={8} className="px-4 py-6 text-center text-slate-400 text-xs italic">
                            Sin prestaciones registradas. Haz clic en "+ Agregar prestación" o en un diente del odontograma.
                          </td>
                        </tr>
                      )}
                      {registro.items.map((item) =>
                        editandoId === item.id ? (
                          <tr key={item.id} className="bg-[#5fb3b0]/5">
                            <td className="px-2 py-2 border-r border-slate-100 text-center">
                              <input type="number" min={11} max={85} value={formItem.numeroDiente}
                                onChange={(e) => setFormItem((f) => ({ ...f, numeroDiente: parseInt(e.target.value, 10) || 11 }))}
                                className="w-16 px-1 py-1 border border-slate-300 rounded text-center text-xs" />
                            </td>
                            <td className="px-2 py-2 border-r border-slate-100 text-center">
                              <select value={formItem.cara} onChange={(e) => setFormItem((f) => ({ ...f, cara: e.target.value }))}
                                className="px-1 py-1 border border-slate-300 rounded text-xs w-full">
                                <option value="">—</option>
                                {CARAS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                              </select>
                            </td>
                            <td className="px-2 py-2 border-r border-slate-100 text-center">
                              <input type="text" value={formItem.codigo}
                                onChange={(e) => setFormItem((f) => ({ ...f, codigo: e.target.value }))}
                                className="w-full px-1 py-1 border border-slate-300 rounded text-xs" />
                            </td>
                            <td className="px-2 py-2 border-r border-slate-100">
                              <input type="text" value={formItem.descripcion}
                                onChange={(e) => setFormItem((f) => ({ ...f, descripcion: e.target.value }))}
                                className="w-full px-1 py-1 border border-slate-300 rounded text-xs" />
                            </td>
                            <td className="px-2 py-2 border-r border-slate-100 text-center">
                              <input type="date" value={formItem.fechaRealizacion}
                                onChange={(e) => setFormItem((f) => ({ ...f, fechaRealizacion: e.target.value }))}
                                className="px-1 py-1 border border-slate-300 rounded text-xs" />
                            </td>
                            <td className="px-2 py-2 border-r border-slate-100 text-center">
                              <input type="number" min={1} value={formItem.cantidad}
                                onChange={(e) => setFormItem((f) => ({ ...f, cantidad: parseInt(e.target.value, 10) || 1 }))}
                                className="w-12 px-1 py-1 border border-slate-300 rounded text-center text-xs" />
                            </td>
                            <td className="px-2 py-2 border-r border-slate-100 text-center">
                              <input type="checkbox" checked={formItem.conformidadPaciente}
                                onChange={(e) => setFormItem((f) => ({ ...f, conformidadPaciente: e.target.checked }))}
                                className="accent-[#5fb3b0] w-4 h-4" />
                            </td>
                            <td className="px-2 py-2 text-center">
                              <div className="flex gap-1 justify-center">
                                <button type="button" onClick={() => handleActualizarItem(item.id, formItem)} className="text-[#5fb3b0] hover:underline text-xs font-medium">Guardar</button>
                                <span className="text-slate-300">|</span>
                                <button type="button" onClick={() => setEditandoId(null)} className="text-slate-400 hover:underline text-xs">Cancelar</button>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          <tr key={item.id} className="hover:bg-slate-50 group">
                            <td className="px-3 py-2.5 border-r border-slate-100 text-center font-mono font-bold text-slate-700">{item.numeroDiente}</td>
                            <td className="px-3 py-2.5 border-r border-slate-100 text-center text-slate-600 text-xs">{CARAS.find((c) => c.value === item.cara)?.label ?? '—'}</td>
                            <td className="px-3 py-2.5 border-r border-slate-100 text-center font-mono text-slate-700">{item.codigo}</td>
                            <td className="px-3 py-2.5 border-r border-slate-100 text-slate-600 text-xs">{item.descripcion || '—'}</td>
                            <td className="px-3 py-2.5 border-r border-slate-100 text-center text-slate-600 text-xs">
                              {item.fechaRealizacion ? formatearFecha(item.fechaRealizacion) : '—'}
                            </td>
                            <td className="px-3 py-2.5 border-r border-slate-100 text-center text-slate-700 font-medium">{item.cantidad}</td>
                            <td className="px-3 py-2.5 border-r border-slate-100 text-center">
                              {item.conformidadPaciente ? <span className="text-green-600 font-bold">✓</span> : <span className="text-slate-300">—</span>}
                            </td>
                            <td className="px-2 py-2.5 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="flex gap-1 justify-center">
                                <button type="button" onClick={() => {
                                  setEditandoId(item.id);
                                  setFormItem({
                                    numeroDiente: item.numeroDiente,
                                    cara: item.cara ?? '',
                                    codigo: item.codigo,
                                    descripcion: item.descripcion ?? '',
                                    fechaRealizacion: item.fechaRealizacion ? item.fechaRealizacion.slice(0, 10) : '',
                                    cantidad: item.cantidad,
                                    conformidadPaciente: item.conformidadPaciente,
                                  });
                                }} className="text-[#5fb3b0] hover:underline text-xs">Editar</button>
                                <span className="text-slate-300">|</span>
                                <button type="button" onClick={() => handleEliminarItem(item.id)} className="text-red-500 hover:underline text-xs">Eliminar</button>
                              </div>
                            </td>
                          </tr>
                        )
                      )}
                      {nuevoItem && (
                        <tr className="bg-[#5fb3b0]/5 border-t-2 border-[#5fb3b0]/30">
                          <td className="px-2 py-2 border-r border-slate-100 text-center">
                            <input type="number" min={11} max={85} value={formItem.numeroDiente}
                              onChange={(e) => setFormItem((f) => ({ ...f, numeroDiente: parseInt(e.target.value, 10) || 11 }))}
                              className="w-16 px-1 py-1 border border-[#5fb3b0] rounded text-center text-xs" autoFocus />
                          </td>
                          <td className="px-2 py-2 border-r border-slate-100 text-center">
                            <select value={formItem.cara} onChange={(e) => setFormItem((f) => ({ ...f, cara: e.target.value }))}
                              className="px-1 py-1 border border-slate-300 rounded text-xs w-full">
                              <option value="">—</option>
                              {CARAS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                            </select>
                          </td>
                          <td className="px-2 py-2 border-r border-slate-100 text-center">
                            <input type="text" value={formItem.codigo}
                              onChange={(e) => setFormItem((f) => ({ ...f, codigo: e.target.value }))}
                              placeholder="Código *"
                              className="w-full px-1 py-1 border border-slate-300 rounded text-xs" required />
                          </td>
                          <td className="px-2 py-2 border-r border-slate-100">
                            <input type="text" value={formItem.descripcion}
                              onChange={(e) => setFormItem((f) => ({ ...f, descripcion: e.target.value }))}
                              placeholder="Descripción"
                              className="w-full px-1 py-1 border border-slate-300 rounded text-xs" />
                          </td>
                          <td className="px-2 py-2 border-r border-slate-100 text-center">
                            <input type="date" value={formItem.fechaRealizacion}
                              onChange={(e) => setFormItem((f) => ({ ...f, fechaRealizacion: e.target.value }))}
                              className="px-1 py-1 border border-slate-300 rounded text-xs" />
                          </td>
                          <td className="px-2 py-2 border-r border-slate-100 text-center">
                            <input type="number" min={1} value={formItem.cantidad}
                              onChange={(e) => setFormItem((f) => ({ ...f, cantidad: parseInt(e.target.value, 10) || 1 }))}
                              className="w-12 px-1 py-1 border border-slate-300 rounded text-center text-xs" />
                          </td>
                          <td className="px-2 py-2 border-r border-slate-100 text-center">
                            <input type="checkbox" checked={formItem.conformidadPaciente}
                              onChange={(e) => setFormItem((f) => ({ ...f, conformidadPaciente: e.target.checked }))}
                              className="accent-[#5fb3b0] w-4 h-4" />
                          </td>
                          <td className="px-2 py-2 text-center">
                            <div className="flex gap-1 justify-center">
                              <button type="button" onClick={handleAgregarItem} className="text-[#5fb3b0] hover:underline text-xs font-medium">Agregar</button>
                              <span className="text-slate-300">|</span>
                              <button type="button" onClick={() => setNuevoItem(false)} className="text-slate-400 hover:underline text-xs">✕</button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* ── ODONTOGRAMA ── */}
              <section className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Odontograma</p>
                </div>
                <div className="p-4 space-y-4">
                  {/* Paleta de herramientas */}
                  <div className="flex flex-wrap gap-2">
                    {HERRAMIENTAS.map((h) => (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => setHerramienta((prev) => prev === h.id ? null : h.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all
                          ${herramienta === h.id
                            ? 'bg-[#5fb3b0] border-[#4a9a97] text-white shadow-sm'
                            : 'bg-white border-slate-300 text-slate-600 hover:border-[#5fb3b0] hover:text-[#5fb3b0]'
                          }`}
                      >
                        {h.preview}
                        {h.label}
                      </button>
                    ))}
                  </div>
                  {herramienta ? (
                    <p className="text-xs text-[#5fb3b0] font-medium">
                      Herramienta activa: <strong>{HERRAMIENTAS.find((h) => h.id === herramienta)?.label}</strong>
                      {herramienta !== 'BORRAR' && ' — hacé clic en un diente para marcarlo. Clic nuevamente para desmarcarlo.'}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400">Seleccioná una herramienta para editar el odontograma.</p>
                  )}
                  <Odontograma
                    estados={estadosDientes}
                    herramienta={herramienta}
                    onDienteClick={handleDienteClick}
                  />
                </div>
              </section>

              {/* ── REFERENCIAS Y OPCIONES ── */}
              <section className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Referencias y opciones</p>
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                  {/* Referencias visuales */}
                  <div className="space-y-2">
                    <p className="font-semibold text-slate-700 text-xs uppercase mb-3">Referencias del odontograma</p>
                    {(Object.entries(ESTADO_CONFIG) as [EstadoDiente, typeof ESTADO_CONFIG[EstadoDiente]][]).map(([key, cfg]) => (
                      <div key={key} className="flex items-center gap-2 text-slate-600">
                        <span className={`relative inline-flex w-5 h-5 border-2 rounded-sm shrink-0 ${cfg.bg} ${cfg.border}`}>
                          {cfg.symbol && (
                            <span className="absolute inset-0">
                              {cfg.symbol}
                            </span>
                          )}
                        </span>
                        <span className="text-xs">{cfg.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Checkboxes prótesis */}
                  <div className="space-y-3">
                    <p className="font-semibold text-slate-700 text-xs uppercase mb-3">Prótesis y aparatología</p>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={registro.protesisFija}
                        onChange={(e) => handleGuardarRegistro({ protesisFija: e.target.checked })}
                        className="accent-[#5fb3b0] w-4 h-4" />
                      <span>Prótesis fija</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={registro.protesisRemovible}
                        onChange={(e) => handleGuardarRegistro({ protesisRemovible: e.target.checked })}
                        className="accent-[#5fb3b0] w-4 h-4" />
                      <span>Prótesis removible</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={registro.coronas}
                        onChange={(e) => handleGuardarRegistro({ coronas: e.target.checked })}
                        className="accent-[#5fb3b0] w-4 h-4" />
                      <span>Coronas</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-600">Cantidad de dientes existente:</span>
                      <input type="number" min={0} max={52}
                        value={registro.cantidadDientesExistente ?? ''}
                        onChange={(e) => handleGuardarRegistro({ cantidadDientesExistente: e.target.value ? parseInt(e.target.value, 10) : undefined })}
                        className="w-16 px-2 py-1 border border-slate-300 rounded text-center" />
                    </div>
                  </div>
                </div>
              </section>

              {/* ── OBSERVACIONES ── */}
              <section className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Observaciones</p>
                </div>
                <div className="p-4">
                  <textarea
                    value={registro.observaciones ?? ''}
                    onChange={(e) => setRegistro((r) => r ? { ...r, observaciones: e.target.value } : null)}
                    onBlur={(e) => handleGuardarRegistro({ observaciones: e.target.value })}
                    placeholder="Observaciones adicionales del registro..."
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#5fb3b0]/50"
                  />
                </div>
              </section>

              {/* ── CONSENTIMIENTO ── */}
              <section className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Consentimiento informado</p>
                </div>
                <div className="p-4 space-y-4">
                  <p className="text-xs text-slate-600 leading-relaxed text-justify">{TEXTO_CONSENTIMIENTO}</p>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={registro.consentimientoInformado}
                      onChange={(e) => handleGuardarRegistro({ consentimientoInformado: e.target.checked })}
                      className="accent-[#5fb3b0] w-5 h-5 shrink-0" />
                    <span className="text-sm font-medium text-slate-700">
                      El paciente ha leído y firmado el consentimiento informado
                    </span>
                  </label>
                </div>
              </section>

              {/* ── FIRMAS ── */}
              <div className="grid grid-cols-2 gap-8 pt-6 mt-2">
                <div className="text-center">
                  <div className="h-16" />
                  <div className="border-t border-slate-400 pt-2 text-xs text-slate-500 uppercase tracking-wide">
                    Sello y firma del profesional
                  </div>
                </div>
                <div className="text-center">
                  <div className="h-16" />
                  <div className="border-t border-slate-400 pt-2 text-xs text-slate-500 uppercase tracking-wide">
                    Firma del paciente
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CampoForm({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs font-bold text-slate-500 uppercase">{label}:</span>
      <div className="mt-0.5 pb-0.5 border-b border-dotted border-slate-300 text-sm text-slate-700">{value}</div>
    </div>
  );
}
