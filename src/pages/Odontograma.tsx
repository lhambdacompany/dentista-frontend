import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { formatearFecha } from '../lib/formatDate';
import { numerosDesdeCantidad } from '../lib/odontogramaUtils';

interface EstadoConfig {
  id: string;
  clave: string;
  nombre: string;
  color: string;
  orden: number;
  simbolo?: string;
}

// ── Color del borde/símbolo calculado desde el color de fondo ────────────────

function accentColor(hex: string): string {
  if (!hex || hex.length < 7) return '#94a3b8';
  try {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return '#94a3b8';
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h = 0;
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
    const ns = Math.min(1, s + 0.4);
    const nl = 0.45;
    const q = nl < 0.5 ? nl * (1 + ns) : nl + ns - nl * ns;
    const p = 2 * nl - q;
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const nr = Math.round(hue2rgb(p, q, h + 1/3) * 255);
    const ng = Math.round(hue2rgb(p, q, h) * 255);
    const nb = Math.round(hue2rgb(p, q, h - 1/3) * 255);
    return `#${nr.toString(16).padStart(2,'0')}${ng.toString(16).padStart(2,'0')}${nb.toString(16).padStart(2,'0')}`;
  } catch { return '#94a3b8'; }
}

// ── SVGs por símbolo (usan currentColor para heredar el accentColor) ──────────

const SIMBOLO_SVG: Record<string, React.ReactNode> = {
  X: (
    <svg viewBox="0 0 32 32" className="absolute inset-0 w-full h-full pointer-events-none" strokeWidth={2.5}>
      <line x1="4" y1="4" x2="28" y2="28" stroke="currentColor" />
      <line x1="28" y1="4" x2="4" y2="28" stroke="currentColor" />
    </svg>
  ),
  ARCO: (
    <svg viewBox="0 0 32 32" className="absolute inset-0 w-full h-full pointer-events-none" strokeWidth={2.5} fill="none">
      <path d="M 5 26 L 5 10 L 27 10 L 27 26" stroke="currentColor" strokeLinejoin="round" />
    </svg>
  ),
  RECTANGULO: (
    <svg viewBox="0 0 32 32" className="absolute inset-0 w-full h-full pointer-events-none" strokeWidth={2.5} fill="none">
      <rect x="5" y="5" width="22" height="22" rx="1" stroke="currentColor" />
    </svg>
  ),
  CIRCULO: (
    <svg viewBox="0 0 32 32" className="absolute inset-0 w-full h-full pointer-events-none" strokeWidth={2.5} fill="none">
      <circle cx="16" cy="16" r="11" stroke="currentColor" />
    </svg>
  ),
  PUNTO: (
    <svg viewBox="0 0 32 32" className="absolute inset-0 w-full h-full pointer-events-none">
      <circle cx="16" cy="16" r="6" fill="currentColor" />
    </svg>
  ),
};

interface Diente {
  id: string;
  numeroDiente: number;
  estado: string;
  observaciones?: string;
}

interface OdontogramaData {
  id: string;
  fecha: string;
  titulo?: string;
  paciente: { id: string; nombre: string; apellido: string };
  numerosDientes?: number[] | null;
  observaciones?: string | null;
}

// FDI: cuadrantes desde perspectiva del paciente
const Q1_PERMANENTE = [18, 17, 16, 15, 14, 13, 12, 11];
const Q2_PERMANENTE = [21, 22, 23, 24, 25, 26, 27, 28];
const Q3_PERMANENTE = [31, 32, 33, 34, 35, 36, 37, 38];
const Q4_PERMANENTE = [48, 47, 46, 45, 44, 43, 42, 41];
const Q5_TEMPORAL = [55, 54, 53, 52, 51];
const Q6_TEMPORAL = [61, 62, 63, 64, 65];
const Q7_TEMPORAL = [71, 72, 73, 74, 75];
const Q8_TEMPORAL = [85, 84, 83, 82, 81];

type FilaOdonto = { label: string; izq: number[]; der: number[] };

function organizarEnCuadrantes(numeros: number[]): FilaOdonto[] {
  const tienePermanente = numeros.some((n) => n >= 11 && n <= 48);
  const tieneTemporal = numeros.some((n) => n >= 51 && n <= 85);
  const filas: FilaOdonto[] = [];

  if (tienePermanente) {
    filas.push({
      label: 'Permanente superior',
      izq: Q2_PERMANENTE.filter((n) => numeros.includes(n)),
      der: Q1_PERMANENTE.filter((n) => numeros.includes(n)),
    });
  }
  if (tieneTemporal) {
    const ts = { label: 'Temporal superior', izq: Q6_TEMPORAL.filter((n) => numeros.includes(n)), der: Q5_TEMPORAL.filter((n) => numeros.includes(n)) };
    const ti = { label: 'Temporal inferior', izq: Q7_TEMPORAL.filter((n) => numeros.includes(n)), der: Q8_TEMPORAL.filter((n) => numeros.includes(n)) };
    if (ts.izq.length || ts.der.length) filas.push(ts);
    if (ti.izq.length || ti.der.length) filas.push(ti);
  }
  if (tienePermanente) {
    filas.push({
      label: 'Permanente inferior',
      izq: Q3_PERMANENTE.filter((n) => numeros.includes(n)),
      der: Q4_PERMANENTE.filter((n) => numeros.includes(n)),
    });
  }
  if (filas.length === 0) {
    return [
      { label: 'Permanente superior', izq: Q2_PERMANENTE, der: Q1_PERMANENTE },
      { label: 'Permanente inferior', izq: Q3_PERMANENTE, der: Q4_PERMANENTE },
    ];
  }
  return filas;
}

// ── Componente diente ─────────────────────────────────────────────────────────

function DienteBtn({
  num,
  estadoClave,
  estados,
  herramientaActiva,
  tieneNota,
  onClick,
  onNotaClick,
}: {
  num: number;
  estadoClave: string;
  estados: EstadoConfig[];
  herramientaActiva: string | null;
  tieneNota: boolean;
  onClick: () => void;
  onNotaClick: (e: React.MouseEvent) => void;
}) {
  const cfg = estados.find((e) => e.clave === estadoClave);
  const color = cfg?.color ?? '#e2e8f0';
  const accent = accentColor(color);
  const simboloSvg = cfg?.simbolo ? SIMBOLO_SVG[cfg.simbolo] : null;

  return (
    <div className="relative group">
      <button
        type="button"
        onClick={onClick}
        title={`Diente ${num}${cfg ? ` — ${cfg.nombre}` : ''}${herramientaActiva ? '' : ' (seleccioná una herramienta)'}`}
        className={`relative w-9 h-9 border-2 rounded flex flex-col items-center justify-end pb-0.5 overflow-hidden transition-all
          ${herramientaActiva ? 'cursor-pointer hover:opacity-80 hover:scale-105' : 'cursor-default'}`}
        style={{ backgroundColor: color, borderColor: accent, color: accent }}
      >
        {simboloSvg}
        {tieneNota && (
          <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-[#5fb3b0] z-10" />
        )}
        <span className="text-[9px] font-bold z-10 leading-none select-none" style={{ color: accent }}>
          {num}
        </span>
      </button>
      {/* Botón de nota — aparece en hover */}
      <button
        type="button"
        onClick={onNotaClick}
        title="Agregar / ver nota"
        className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-[#5fb3b0] text-white text-[8px] items-center justify-center hidden group-hover:flex z-20 shadow"
      >
        ✎
      </button>
    </div>
  );
}

function FilaDientes({
  grupos,
  dientes,
  estados,
  herramienta,
  onDienteClick,
  onNotaClick,
}: {
  grupos: number[][];
  dientes: Diente[];
  estados: EstadoConfig[];
  herramienta: string | null;
  onDienteClick: (num: number) => void;
  onNotaClick: (num: number) => void;
}) {
  const getDiente = (num: number) => dientes.find((d) => d.numeroDiente === num);
  const renderGroup = (nums: number[]) =>
    nums.map((num) => {
      const d = getDiente(num);
      return (
        <DienteBtn
          key={num}
          num={num}
          estadoClave={d?.estado ?? 'SANO'}
          estados={estados}
          herramientaActiva={herramienta}
          tieneNota={!!d?.observaciones?.trim()}
          onClick={() => onDienteClick(num)}
          onNotaClick={(e) => { e.stopPropagation(); onNotaClick(num); }}
        />
      );
    });

  return (
    <div className="flex items-center justify-center gap-1">
      {renderGroup(grupos[0])}
      <div className="w-4 shrink-0" />
      {renderGroup(grupos[1])}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export function Odontograma() {
  const { id } = useParams<{ id: string }>();
  const [odontograma, setOdontograma] = useState<OdontogramaData | null>(null);
  const [dientes, setDientes] = useState<Diente[]>([]);
  const [estados, setEstados] = useState<EstadoConfig[]>([]);
  const [herramienta, setHerramienta] = useState<string | null>(null); // clave del estado activo, o 'BORRAR'
  const [modalDiente, setModalDiente] = useState<{ num: number; diente?: Diente } | null>(null);
  const [notaEdit, setNotaEdit] = useState('');
  const [observacionesGen, setObservacionesGen] = useState('');
  const [editandoCantidad, setEditandoCantidad] = useState(false);
  const [cantidadInput, setCantidadInput] = useState(32);

  useEffect(() => {
    api.estadosDiente.list().then(setEstados).catch(() => setEstados([]));
  }, []);

  const load = useCallback(() => {
    if (!id) return;
    api.odontograma.get(id).then((d) => {
      const od = d as OdontogramaData & { dientes?: Diente[] };
      setOdontograma(od);
      if (od?.observaciones != null) setObservacionesGen(od.observaciones || '');
      if (od?.numerosDientes && Array.isArray(od.numerosDientes)) {
        const n = (od.numerosDientes as number[]).length;
        setCantidadInput(n >= 52 ? 52 : n >= 32 ? 32 : n >= 16 ? 16 : n >= 8 ? 8 : 32);
      }
      const dientesData = od?.dientes;
      if (Array.isArray(dientesData) && dientesData.length > 0) {
        setDientes(dientesData);
      } else if (Array.isArray(dientesData) && dientesData.length === 0) {
        api.odontograma.initDientes(id).then((list) => setDientes(list as Diente[]));
      } else {
        api.odontograma.getDientes(id).then((list) => {
          const arr = list as Diente[];
          if (arr.length === 0) {
            api.odontograma.initDientes(id).then((list2) => setDientes(list2 as Diente[]));
          } else {
            setDientes(arr);
          }
        });
      }
    });
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Asegurar que el diente exista en BD antes de operar
  const asegurarDiente = async (num: number): Promise<Diente> => {
    const existing = dientes.find((d) => d.numeroDiente === num);
    if (existing) return existing;
    try {
      const nuevo = await api.odontograma.createDiente({ odontogramaId: id!, numeroDiente: num, estado: 'SANO' }) as Diente;
      setDientes((prev) => [...prev, nuevo]);
      return nuevo;
    } catch {
      // Ya existe en BD pero no en estado local
      const list = await api.odontograma.getDientes(id!) as Diente[];
      setDientes(list);
      const found = list.find((d) => d.numeroDiente === num);
      if (found) return found;
      throw new Error('No se pudo obtener el diente');
    }
  };

  const handleDienteClick = useCallback(async (num: number) => {
    if (!herramienta) return;

    const estadoAnterior = dientes.find((d) => d.numeroDiente === num)?.estado ?? 'SANO';

    if (herramienta === 'BORRAR') {
      // Revertir a SANO (primer estado configurado o 'SANO')
      const estadoDefault = estados[0]?.clave ?? 'SANO';
      setDientes((prev) =>
        prev.map((d) => d.numeroDiente === num ? { ...d, estado: estadoDefault } : d)
      );
      try {
        const diente = await asegurarDiente(num);
        await api.odontograma.updateDiente(diente.id, { estado: estadoDefault });
      } catch {
        setDientes((prev) => prev.map((d) => d.numeroDiente === num ? { ...d, estado: estadoAnterior } : d));
      }
      return;
    }

    // Toggle: si ya tiene ese estado, volver al primero
    const nuevoEstado = estadoAnterior === herramienta
      ? (estados[0]?.clave ?? 'SANO')
      : herramienta;

    // Optimistic update
    setDientes((prev) =>
      prev.map((d) => d.numeroDiente === num ? { ...d, estado: nuevoEstado } : d)
    );

    try {
      const diente = await asegurarDiente(num);
      await api.odontograma.updateDiente(diente.id, { estado: nuevoEstado });
    } catch {
      // Revertir
      setDientes((prev) => prev.map((d) => d.numeroDiente === num ? { ...d, estado: estadoAnterior } : d));
    }
  }, [herramienta, dientes, estados, id]);

  const handleNotaClick = (num: number) => {
    const diente = dientes.find((d) => d.numeroDiente === num);
    setModalDiente({ num, diente });
    setNotaEdit(diente?.observaciones ?? '');
  };

  const handleGuardarNota = async () => {
    if (!modalDiente) return;
    try {
      const diente = await asegurarDiente(modalDiente.num);
      await api.odontograma.updateDiente(diente.id, { observaciones: notaEdit });
      setDientes((prev) =>
        prev.map((d) => d.numeroDiente === modalDiente.num ? { ...d, observaciones: notaEdit } : d)
      );
      setModalDiente(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al guardar nota');
    }
  };

  const filas =
    odontograma?.numerosDientes && Array.isArray(odontograma.numerosDientes) && odontograma.numerosDientes.length > 0
      ? organizarEnCuadrantes(odontograma.numerosDientes as number[])
      : [
          { label: 'Permanente superior', izq: Q2_PERMANENTE, der: Q1_PERMANENTE },
          { label: 'Permanente inferior', izq: Q3_PERMANENTE, der: Q4_PERMANENTE },
        ];

  if (!odontograma) return <div className="text-center py-12 text-slate-500">Cargando...</div>;

  const pacienteId = odontograma.paciente?.id;
  const fechaOdonto = new Date(odontograma.fecha);
  const mes = fechaOdonto.toLocaleString('es-AR', { month: 'long' }).toUpperCase();
  const anio = fechaOdonto.getFullYear();

  return (
    <div className="space-y-4">
      <Link
        to={pacienteId ? `/pacientes/${pacienteId}` : '/pacientes'}
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Volver al paciente
      </Link>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">

        {/* ── ENCABEZADO ── */}
        <div className="border-b-2 border-[#5fb3b0] p-5 flex flex-col sm:flex-row items-stretch gap-4">
          <div className="flex items-center gap-4 shrink-0">
            <div className="w-16 h-16 rounded-full border-2 border-[#5fb3b0] flex items-center justify-center text-3xl select-none">
              🦷
            </div>
            <div className="border-2 border-[#5fb3b0] px-4 py-2 text-center">
              <p className="text-xs font-bold text-slate-700 leading-tight">ODONTOGRAMA</p>
            </div>
          </div>
          <div className="flex-1 border-2 border-[#5fb3b0] p-3 flex items-center text-sm">
            <div>
              <p className="font-bold text-slate-700">
                {odontograma.paciente?.nombre} {odontograma.paciente?.apellido}
              </p>
              <p className="text-slate-500 text-xs mt-0.5">
                {odontograma.titulo || formatearFecha(odontograma.fecha)}
              </p>
            </div>
          </div>
          <div className="border-2 border-[#5fb3b0] p-3 text-sm text-center flex flex-col justify-center shrink-0">
            <p className="font-bold text-slate-700 uppercase">{mes}</p>
            <p className="text-slate-600">{anio}</p>
          </div>
        </div>

        <div className="p-5 space-y-5">

          {/* ── PALETA DE HERRAMIENTAS ── */}
          <section className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Herramienta activa</p>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                {estados.map((e) => (
                  <button
                    key={e.clave}
                    type="button"
                    onClick={() => setHerramienta((prev) => prev === e.clave ? null : e.clave)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all
                      ${herramienta === e.clave
                        ? 'bg-[#5fb3b0] border-[#4a9a97] text-white shadow-sm'
                        : 'bg-white border-slate-300 text-slate-600 hover:border-[#5fb3b0] hover:text-[#5fb3b0]'
                      }`}
                  >
                    <span
                      className="relative inline-block w-4 h-4 rounded-sm border shrink-0 overflow-hidden"
                      style={{ backgroundColor: e.color, borderColor: accentColor(e.color), color: accentColor(e.color) }}
                    >
                      {e.simbolo && SIMBOLO_SVG[e.simbolo]}
                    </span>
                    {e.nombre}
                  </button>
                ))}
                {/* Borrar */}
                <button
                  type="button"
                  onClick={() => setHerramienta((prev) => prev === 'BORRAR' ? null : 'BORRAR')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all
                    ${herramienta === 'BORRAR'
                      ? 'bg-[#5fb3b0] border-[#4a9a97] text-white shadow-sm'
                      : 'bg-white border-slate-300 text-slate-600 hover:border-[#5fb3b0] hover:text-[#5fb3b0]'
                    }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Borrar
                </button>
              </div>
              {herramienta ? (
                <p className="text-xs text-[#5fb3b0] font-medium">
                  Herramienta activa: <strong>
                    {herramienta === 'BORRAR' ? 'Borrar' : estados.find((e) => e.clave === herramienta)?.nombre}
                  </strong> — hacé clic en un diente para marcarlo. Clic nuevamente para desmarcarlo.
                </p>
              ) : (
                <p className="text-xs text-slate-400">Seleccioná una herramienta para editar el odontograma. Pasá el cursor sobre un diente para agregar una nota.</p>
              )}
            </div>
          </section>

          {/* ── ODONTOGRAMA ── */}
          <section className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Odontograma</p>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>
                  {odontograma?.numerosDientes && Array.isArray(odontograma.numerosDientes)
                    ? (odontograma.numerosDientes as number[]).length
                    : 32}{' '}
                  dientes
                </span>
                {!editandoCantidad ? (
                  <button
                    type="button"
                    onClick={() => setEditandoCantidad(true)}
                    className="text-[#5fb3b0] hover:underline"
                  >
                    · Editar
                  </button>
                ) : (
                  <div className="flex items-center gap-1">
                    <select
                      value={cantidadInput}
                      onChange={(e) => setCantidadInput(Number(e.target.value))}
                      className="px-1 py-0.5 border border-slate-300 rounded text-xs"
                    >
                      <option value={8}>8</option>
                      <option value={16}>16</option>
                      <option value={32}>32</option>
                      <option value={52}>52</option>
                    </select>
                    <button
                      type="button"
                      onClick={async () => {
                        const nums = numerosDesdeCantidad(cantidadInput);
                        await api.odontograma.update(id!, { numerosDientes: nums });
                        setOdontograma((o) => (o ? { ...o, numerosDientes: nums } : null));
                        setEditandoCantidad(false);
                        load();
                      }}
                      className="px-2 py-0.5 bg-[#5fb3b0] text-white rounded text-xs"
                    >
                      Aplicar
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditandoCantidad(false)}
                      className="px-2 py-0.5 bg-slate-200 rounded text-xs"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 space-y-2 overflow-x-auto pb-4">
              {filas.map((fila, idx) => (
                <div key={idx} className="space-y-1">
                  <p className="text-center text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    {fila.label}
                  </p>
                  <FilaDientes
                    grupos={[fila.der, fila.izq]}
                    dientes={dientes}
                    estados={estados}
                    herramienta={herramienta}
                    onDienteClick={handleDienteClick}
                    onNotaClick={handleNotaClick}
                  />
                  {idx === 0 && (
                    <div className="flex justify-between px-10 py-0.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      <span>Derecha</span>
                      <span>Izquierda</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* ── REFERENCIAS ── */}
          <section className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Referencias</p>
            </div>
            <div className="p-4 flex flex-wrap gap-x-6 gap-y-2">
              {estados.map((e) => (
                <div key={e.id} className="flex items-center gap-2">
                  <span
                    className="relative inline-flex w-5 h-5 rounded-sm border-2 shrink-0 overflow-hidden"
                    style={{ backgroundColor: e.color, borderColor: accentColor(e.color), color: accentColor(e.color) }}
                  >
                    {e.simbolo && SIMBOLO_SVG[e.simbolo]}
                  </span>
                  <span className="text-xs text-slate-600">{e.nombre}</span>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#5fb3b0] shrink-0" />
                <span className="text-xs text-slate-600">Tiene nota</span>
              </div>
            </div>
          </section>

          {/* ── OBSERVACIONES GENERALES ── */}
          <section className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Observaciones generales</p>
            </div>
            <div className="p-4">
              <textarea
                value={observacionesGen}
                onChange={(e) => setObservacionesGen(e.target.value)}
                onBlur={() => {
                  api.odontograma.update(id!, { observaciones: observacionesGen }).catch(console.error);
                }}
                placeholder="Observaciones generales del odontograma..."
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#5fb3b0]/50"
              />
            </div>
          </section>

        </div>
      </div>

      {/* ── MODAL NOTA POR DIENTE ── */}
      {modalDiente && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setModalDiente(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-800">
                Nota — Diente {modalDiente.num}
              </h3>
              <button
                type="button"
                onClick={() => setModalDiente(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <textarea
              value={notaEdit}
              onChange={(e) => setNotaEdit(e.target.value)}
              placeholder="Observaciones para este diente..."
              rows={4}
              autoFocus
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#5fb3b0]/50"
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setModalDiente(null)}
                className="px-4 py-2 bg-slate-100 rounded-lg text-sm hover:bg-slate-200"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleGuardarNota}
                className="px-4 py-2 bg-[#5fb3b0] text-white rounded-lg text-sm hover:bg-[#4a9a97] font-medium"
              >
                Guardar nota
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
