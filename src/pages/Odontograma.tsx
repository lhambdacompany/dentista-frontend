import { useEffect, useState } from 'react';
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
}

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
// 1x superior der: 18-11 | 2x superior izq: 21-28
// 3x inferior izq: 31-38 | 4x inferior der: 41-48
// Temporal: 5x 55-51, 6x 61-65, 7x 71-75, 8x 85-81
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
      label: 'Dentición permanente superior',
      izq: Q2_PERMANENTE.filter((n) => numeros.includes(n)),
      der: Q1_PERMANENTE.filter((n) => numeros.includes(n)),
    });
  }

  if (tieneTemporal) {
    const temporalSup = {
      label: 'Dentición temporal (superior)',
      izq: Q6_TEMPORAL.filter((n) => numeros.includes(n)),
      der: Q5_TEMPORAL.filter((n) => numeros.includes(n)),
    };
    const temporalInf = {
      label: 'Dentición temporal (inferior)',
      izq: Q7_TEMPORAL.filter((n) => numeros.includes(n)),
      der: Q8_TEMPORAL.filter((n) => numeros.includes(n)),
    };
    const tieneTemporalSup = temporalSup.izq.length > 0 || temporalSup.der.length > 0;
    const tieneTemporalInf = temporalInf.izq.length > 0 || temporalInf.der.length > 0;
    if (tieneTemporalSup) filas.push(temporalSup);
    if (tieneTemporalInf) filas.push(temporalInf);
  }

  if (tienePermanente) {
    filas.push({
      label: 'Dentición permanente inferior',
      izq: Q3_PERMANENTE.filter((n) => numeros.includes(n)),
      der: Q4_PERMANENTE.filter((n) => numeros.includes(n)),
    });
  }

  if (filas.length === 0) {
    return [
      { label: 'Dentición permanente superior', izq: Q2_PERMANENTE, der: Q1_PERMANENTE },
      { label: 'Dentición permanente inferior', izq: Q3_PERMANENTE, der: Q4_PERMANENTE },
    ];
  }
  return filas;
}

function DienteSVG({
  num,
  estado,
  color,
  isAusente,
  tieneNota,
  onClick,
}: {
  num: number;
  estado: string;
  color: string;
  isAusente: boolean;
  tieneNota: boolean;
  onClick: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      className="flex flex-col items-center relative cursor-pointer select-none group"
      title={estado}
    >
      <div
        className="w-9 h-9 border border-slate-400 group-hover:ring-2 group-hover:ring-[#5fb3b0] transition flex items-center justify-center shrink-0"
        style={{ backgroundColor: isAusente ? '#f1f5f9' : color }}
      >
        {isAusente ? (
          <span className="text-slate-500 font-bold text-sm">✕</span>
        ) : (
          <svg viewBox="0 0 40 40" className="w-full h-full block" preserveAspectRatio="none" style={{ pointerEvents: 'none' }}>
            <rect width="40" height="40" fill={color} stroke="#94a3b8" strokeWidth="0.5" />
            <line x1="0" y1="20" x2="40" y2="20" stroke="#94a3b8" strokeWidth="0.3" opacity={0.6} />
            <line x1="20" y1="0" x2="20" y2="40" stroke="#94a3b8" strokeWidth="0.3" opacity={0.6} />
            <line x1="0" y1="0" x2="40" y2="40" stroke="#94a3b8" strokeWidth="0.3" opacity={0.6} />
            <line x1="40" y1="0" x2="0" y2="40" stroke="#94a3b8" strokeWidth="0.3" opacity={0.6} />
          </svg>
        )}
      </div>
      <span className="text-[9px] font-medium text-slate-600 mt-0.5 flex items-center gap-0.5 pointer-events-none">
        {num}
        {tieneNota && <span className="text-[#5fb3b0]" title="Tiene nota">●</span>}
      </span>
    </div>
  );
}

export function Odontograma() {
  const { id } = useParams<{ id: string }>();
  const [odontograma, setOdontograma] = useState<OdontogramaData | null>(null);
  const [dientes, setDientes] = useState<Diente[]>([]);
  const [estados, setEstados] = useState<EstadoConfig[]>([]);
  const [modalDiente, setModalDiente] = useState<Diente | null>(null);
  const [notaEdit, setNotaEdit] = useState('');
  const [observacionesGen, setObservacionesGen] = useState('');
  const [editandoObs, setEditandoObs] = useState(false);
  const [editandoCantidad, setEditandoCantidad] = useState(false);
  const [cantidadInput, setCantidadInput] = useState(32);

  useEffect(() => {
    api.estadosDiente.list().then(setEstados).catch(() => setEstados([]));
  }, []);

  const load = () => {
    if (!id) return;
    api.odontograma.get(id).then((d) => {
        const od = d as OdontogramaData & { dientes?: Diente[] };
        setOdontograma(od);
        const dientesData = od?.dientes;
        if (od?.observaciones != null) setObservacionesGen(od.observaciones || '');
        if (od?.numerosDientes && Array.isArray(od.numerosDientes)) {
          const n = (od.numerosDientes as number[]).length;
          setCantidadInput(n >= 52 ? 52 : n >= 32 ? 32 : n >= 16 ? 16 : n >= 8 ? 8 : 32);
        }
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
  };

  useEffect(() => {
    load();
  }, [id]);

  const getEstadoColor = (clave: string) => {
    const e = estados.find((x) => x.clave === clave);
    return e?.color ?? '#e2e8f0';
  };

  const getEstadoNombre = (clave: string) => {
    const e = estados.find((x) => x.clave === clave);
    return e?.nombre ?? clave;
  };

  const getDiente = (num: number) => dientes.find((d) => d.numeroDiente === num);

  const filas =
    odontograma?.numerosDientes && Array.isArray(odontograma.numerosDientes) && odontograma.numerosDientes.length > 0
      ? organizarEnCuadrantes(odontograma.numerosDientes as number[])
      : [
          { label: 'Dentición permanente superior', izq: Q2_PERMANENTE, der: Q1_PERMANENTE },
          { label: 'Dentición permanente inferior', izq: Q3_PERMANENTE, der: Q4_PERMANENTE },
        ];

  const handleClick = (diente: Diente) => {
    setModalDiente(diente);
    setNotaEdit(diente.observaciones ?? '');
  };

  const handleCerrarModal = () => {
    setModalDiente(null);
    setNotaEdit('');
  };

  const handleCambiarEstado = (nuevoEstado: string) => {
    if (!modalDiente) return;
    api.odontograma.updateDiente(modalDiente.id, { estado: nuevoEstado }).then(() => {
      setDientes((prev) =>
        prev.map((d) => (d.id === modalDiente.id ? { ...d, estado: nuevoEstado } : d))
      );
      setModalDiente((m) => (m ? { ...m, estado: nuevoEstado } : null));
    });
  };

  const handleGuardarNota = () => {
    if (!modalDiente) return;
    api.odontograma.updateDiente(modalDiente.id, { observaciones: notaEdit }).then(() => {
      setDientes((prev) =>
        prev.map((d) => (d.id === modalDiente.id ? { ...d, observaciones: notaEdit } : d))
      );
      setModalDiente((m) => (m ? { ...m, observaciones: notaEdit } : null));
    });
  };

  const handleClickDienteOcrear = (num: number) => {
    const d = getDiente(num);
    if (d) {
      handleClick(d);
    } else if (id) {
      api.odontograma
        .createDiente({ odontogramaId: id, numeroDiente: num, estado: 'SANO' })
        .then((nuevo) => {
          const diente = nuevo as Diente;
          setDientes((prev) => [...prev, diente]);
          setModalDiente(diente);
          setNotaEdit(diente.observaciones || '');
        })
        .catch(() => {
          // El diente ya existe en BD (unique constraint) pero no en estado: refrescar y abrir
          api.odontograma.getDientes(id!).then((list) => {
            const arr = list as Diente[];
            setDientes(arr);
            const existente = arr.find((x) => x.numeroDiente === num);
            if (existente) {
              setModalDiente(existente);
              setNotaEdit(existente.observaciones || '');
            }
          });
        });
    }
  };

  const renderFila = (nums: number[]) => (
    <div className="flex gap-0.5 justify-center flex-wrap">
      {nums.map((num) => {
        const d = getDiente(num);
        if (!d)
          return (
            <DienteSVG
              key={num}
              num={num}
              estado="Sano"
              color="#e2e8f0"
              isAusente={false}
              tieneNota={false}
              onClick={() => handleClickDienteOcrear(num)}
            />
          );
        const color = getEstadoColor(d.estado);
        const isAusente = d.estado === 'AUSENTE';
        return (
          <DienteSVG
            key={num}
            num={num}
            estado={getEstadoNombre(d.estado)}
            color={color}
            isAusente={isAusente}
            tieneNota={!!d.observaciones?.trim()}
            onClick={() => handleClick(d)}
          />
        );
      })}
    </div>
  );

  if (!odontograma) return <div className="text-center py-12">Cargando...</div>;

  const pacienteId = odontograma.paciente?.id;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link
          to={pacienteId ? `/pacientes/${pacienteId}` : '/pacientes'}
          className="inline-flex items-center text-[#5fb3b0] hover:underline"
        >
          ← Odontograma de: {odontograma.paciente?.nombre} {odontograma.paciente?.apellido}
        </Link>
        <span className="text-sm text-slate-500">
          {odontograma.titulo || formatearFecha(odontograma.fecha)}
        </span>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Odontograma principal */}
        <div className="flex-1 bg-white rounded-xl shadow p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <h2 className="text-lg font-semibold text-slate-800">Odontograma</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">Cantidad de dientes:</span>
              {editandoCantidad ? (
                <div className="flex items-center gap-2">
                  <select
                    value={cantidadInput}
                    onChange={(e) => setCantidadInput(Number(e.target.value))}
                    className="px-2 py-1 border border-slate-300 rounded text-sm"
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
                    className="px-2 py-1 bg-[#5fb3b0] text-white rounded text-sm"
                  >
                    Aplicar
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditandoCantidad(false)}
                    className="px-2 py-1 bg-slate-200 rounded text-sm"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditandoCantidad(true)}
                  className="text-sm text-[#5fb3b0] hover:underline"
                >
                  {odontograma?.numerosDientes && Array.isArray(odontograma.numerosDientes)
                    ? (odontograma.numerosDientes as number[]).length
                    : 32}{' '}
                  dientes · Editar
                </button>
              )}
            </div>
          </div>

          <div className="flex items-start gap-4">
            <span className="text-xs font-medium text-slate-500 w-12 text-center shrink-0 pt-8">IZQ.</span>
            <div className="flex-1 min-w-0 relative z-20 isolate" style={{ pointerEvents: 'auto' }}>
              {filas.map((fila, idx) => (
                <div key={idx} className="mb-4">
                  {fila.label && (
                    <div className="text-center text-xs text-slate-500 font-medium mb-2">
                      {fila.label}
                    </div>
                  )}
                  <div className="flex gap-6 justify-center items-start">
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-slate-400 mb-1">Izq</span>
                      {renderFila(fila.izq)}
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-slate-400 mb-1">Der</span>
                      {renderFila(fila.der)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <span className="text-xs font-medium text-slate-500 w-12 text-center shrink-0 pt-8">DER.</span>
          </div>

          {dientes.length === 0 && (
            <p className="text-center mt-4 text-slate-500 text-sm">Inicializando odontograma...</p>
          )}

          <p className="text-xs text-slate-400 mt-4 text-center">
            Clic en cada diente para cambiar estado o agregar nota
          </p>
        </div>

        {/* Panel Referencias - sin sticky en móvil para no tapar dientes inferiores */}
        <div className="w-full lg:w-64 shrink-0">
          <div className="bg-white rounded-xl shadow p-4 lg:sticky lg:top-4">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Referencias</h3>
            <ul className="space-y-2 text-sm">
              {estados.map((e) => (
                <li key={e.id} className="flex items-center gap-2">
                  <span
                    className="w-5 h-5 rounded border border-slate-300 shrink-0"
                    style={{ backgroundColor: e.color }}
                  />
                  <span className="text-slate-700">{e.nombre}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 pt-3 border-t border-slate-200 text-xs text-slate-500">
              <p>Rojo: Tratamientos existentes</p>
              <p>Azul: Patología / requerido</p>
              <p>X: Diente ausente</p>
            </div>
          </div>
        </div>
      </div>

      {/* Observaciones generales - en tarjeta separada para no interferir con clics del odontograma */}
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-sm font-semibold text-slate-800 mb-2">Observaciones</h3>
        {editandoObs ? (
          <div>
            <textarea
              value={observacionesGen}
              onChange={(e) => setObservacionesGen(e.target.value)}
              placeholder="Ej: Hacer limpieza en el próximo control..."
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg resize-none focus:ring-2 focus:ring-[#5fb3b0] focus:border-transparent"
            />
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  api.odontograma.update(id!, { observaciones: observacionesGen }).then(() => {
                    setEditandoObs(false);
                    setOdontograma((o) => (o ? { ...o, observaciones: observacionesGen } : null));
                  });
                }}
                className="px-3 py-1.5 bg-[#5fb3b0] text-white rounded-lg text-sm hover:bg-[#4fa39f]"
              >
                Guardar
              </button>
              <button
                type="button"
                onClick={() => { setObservacionesGen(odontograma?.observaciones ?? ''); setEditandoObs(false); }}
                className="px-3 py-1.5 bg-slate-200 rounded-lg text-sm hover:bg-slate-300"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-2">
            <p className="text-slate-600 text-sm whitespace-pre-wrap flex-1 min-w-0">
              {observacionesGen || 'Sin observaciones'}
            </p>
            <button
              type="button"
              onClick={() => setEditandoObs(true)}
              className="text-[#5fb3b0] hover:underline text-sm shrink-0"
            >
              Editar
            </button>
          </div>
        )}
      </div>

      {modalDiente && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={handleCerrarModal}
        >
          <div
            className="bg-white rounded-xl shadow-lg max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-slate-800 mb-4">
              Diente {modalDiente.numeroDiente}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Estado</label>
                <div className="flex flex-wrap gap-2">
                  {estados.map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => handleCambiarEstado(e.clave)}
                      className={`px-3 py-1.5 rounded text-sm transition ${
                        modalDiente.estado === e.clave
                          ? 'ring-2 ring-[#5fb3b0] ring-offset-1'
                          : 'hover:opacity-90'
                      }`}
                      style={{ backgroundColor: e.color }}
                    >
                      {e.nombre}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Nota / Observaciones</label>
                <textarea
                  value={notaEdit}
                  onChange={(e) => setNotaEdit(e.target.value)}
                  onBlur={handleGuardarNota}
                  placeholder="Observaciones para este diente..."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg resize-none focus:ring-2 focus:ring-[#5fb3b0] focus:border-transparent"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={handleCerrarModal}
                className="px-4 py-2 bg-slate-200 rounded-lg hover:bg-slate-300"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
