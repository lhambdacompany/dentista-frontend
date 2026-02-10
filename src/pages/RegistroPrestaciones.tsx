import { useEffect, useState } from 'react';
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

interface Paciente {
  id: string;
  nombre: string;
  apellido: string;
  dni?: string;
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
  items: PrestacionItem[];
}

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
    fechaRealizacion: '',
    cantidad: 1,
    conformidadPaciente: false,
  });
  const [editandoId, setEditandoId] = useState<string | null>(null);

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

  useEffect(() => {
    load();
  }, [citaId]);

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
      setRegistro(r);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error');
    }
  };

  const handleAgregarItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registro || !formItem.codigo.trim()) return;
    try {
      await api.prestaciones.addItem(registro.id, {
        ...formItem,
        cara: formItem.cara || undefined,
        fechaRealizacion: formItem.fechaRealizacion || undefined,
      });
      setFormItem({
        numeroDiente: 11,
        cara: '',
        codigo: '',
        fechaRealizacion: new Date().toISOString().slice(0, 10),
        cantidad: 1,
        conformidadPaciente: false,
      });
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

  if (loading) return <div className="text-center py-12">Cargando...</div>;
  if (!cita) return <div className="text-center py-12">Cita no encontrada</div>;

  return (
    <div className="space-y-6">
      <Link to={`/citas/${citaId}`} className="text-[#5fb3b0] hover:underline">
        ← Volver a la cita
      </Link>

      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Registro de Prestaciones</h1>
            <p className="text-slate-600 mt-1">
              {cita.paciente.nombre} {cita.paciente.apellido}
            </p>
            <p className="text-slate-500 text-sm">
              {formatearFecha(cita.fecha)} · {cita.horaInicio} - {cita.horaFin}
              {cita.motivo && ` · ${cita.motivo}`}
            </p>
          </div>
        </div>

        {!registro ? (
          <div className="py-8 text-center">
            <p className="text-slate-600 mb-4">
              No hay registro de prestaciones para esta sesión.
            </p>
            <button
              onClick={handleCrearRegistro}
              className="px-4 py-2 bg-[#5fb3b0] text-white rounded-lg hover:bg-[#4fa39f]"
            >
              Crear registro de prestaciones
            </button>
          </div>
        ) : (
          <>
            {/* Referencias */}
            <div className="mb-6 p-4 bg-slate-50 rounded-lg flex flex-wrap gap-4 text-sm">
              <span><span className="inline-block w-4 h-4 bg-red-600 align-middle mr-1" /> Rojo: Prestaciones existentes</span>
              <span><span className="inline-block w-4 h-4 bg-blue-600 align-middle mr-1" /> Azul: Prestaciones requeridas</span>
              <span><span className="font-bold">X:</span> Diente ausente o a extraer</span>
            </div>

            {/* Opciones */}
            <div className="mb-6 flex flex-wrap gap-6">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={registro.protesisFija}
                  onChange={(e) => handleGuardarRegistro({ protesisFija: e.target.checked })}
                />
                <span>Prótesis fija</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={registro.protesisRemovible}
                  onChange={(e) => handleGuardarRegistro({ protesisRemovible: e.target.checked })}
                />
                <span>Prótesis removible</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={registro.coronas}
                  onChange={(e) => handleGuardarRegistro({ coronas: e.target.checked })}
                />
                <span>Coronas</span>
              </label>
              <div className="flex items-center gap-2">
                <span>Cantidad dientes existente:</span>
                <input
                  type="number"
                  min={0}
                  max={52}
                  value={registro.cantidadDientesExistente ?? ''}
                  onChange={(e) => handleGuardarRegistro({ cantidadDientesExistente: e.target.value ? parseInt(e.target.value, 10) : undefined })}
                  className="w-16 px-2 py-1 border border-slate-300 rounded"
                />
              </div>
            </div>

            {/* Tabla de prestaciones */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-300 px-2 py-2 text-left">Diente Nº</th>
                    <th className="border border-slate-300 px-2 py-2 text-left">Cara</th>
                    <th className="border border-slate-300 px-2 py-2 text-left">Código</th>
                    <th className="border border-slate-300 px-2 py-2 text-left">Fecha realización</th>
                    <th className="border border-slate-300 px-2 py-2 text-center">Cant.</th>
                    <th className="border border-slate-300 px-2 py-2 text-center">Conformidad</th>
                    <th className="border border-slate-300 px-2 py-2 w-16" />
                  </tr>
                </thead>
                <tbody>
                  {registro.items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="border border-slate-300 px-2 py-2">
                        {editandoId === item.id ? (
                          <input
                            type="number"
                            min={11}
                            max={85}
                            value={formItem.numeroDiente}
                            onChange={(e) => setFormItem((f) => ({ ...f, numeroDiente: parseInt(e.target.value, 10) || 11 }))}
                            className="w-16 px-1 py-0.5 border rounded"
                          />
                        ) : (
                          item.numeroDiente
                        )}
                      </td>
                      <td className="border border-slate-300 px-2 py-2">
                        {editandoId === item.id ? (
                          <select
                            value={formItem.cara}
                            onChange={(e) => setFormItem((f) => ({ ...f, cara: e.target.value }))}
                            className="px-1 py-0.5 border rounded"
                          >
                            <option value="">-</option>
                            {CARAS.map((c) => (
                              <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                          </select>
                        ) : (
                          CARAS.find((c) => c.value === item.cara)?.label ?? '-'
                        )}
                      </td>
                      <td className="border border-slate-300 px-2 py-2">
                        {editandoId === item.id ? (
                          <input
                            type="text"
                            value={formItem.codigo}
                            onChange={(e) => setFormItem((f) => ({ ...f, codigo: e.target.value }))}
                            className="w-full px-1 py-0.5 border rounded"
                          />
                        ) : (
                          item.codigo
                        )}
                      </td>
                      <td className="border border-slate-300 px-2 py-2">
                        {editandoId === item.id ? (
                          <input
                            type="date"
                            value={formItem.fechaRealizacion}
                            onChange={(e) => setFormItem((f) => ({ ...f, fechaRealizacion: e.target.value }))}
                            className="px-1 py-0.5 border rounded"
                          />
                        ) : (
                          item.fechaRealizacion ? formatearFecha(item.fechaRealizacion) : '-'
                        )}
                      </td>
                      <td className="border border-slate-300 px-2 py-2 text-center">
                        {editandoId === item.id ? (
                          <input
                            type="number"
                            min={1}
                            value={formItem.cantidad}
                            onChange={(e) => setFormItem((f) => ({ ...f, cantidad: parseInt(e.target.value, 10) || 1 }))}
                            className="w-12 px-1 py-0.5 border rounded"
                          />
                        ) : (
                          item.cantidad
                        )}
                      </td>
                      <td className="border border-slate-300 px-2 py-2 text-center">
                        {editandoId === item.id ? (
                          <input
                            type="checkbox"
                            checked={formItem.conformidadPaciente}
                            onChange={(e) => setFormItem((f) => ({ ...f, conformidadPaciente: e.target.checked }))}
                          />
                        ) : (
                          item.conformidadPaciente ? '✓' : '-'
                        )}
                      </td>
                      <td className="border border-slate-300 px-2 py-2">
                        {editandoId === item.id ? (
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => handleActualizarItem(item.id, formItem)}
                              className="text-[#5fb3b0] hover:underline text-xs"
                            >
                              Guardar
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditandoId(null)}
                              className="text-slate-500 hover:underline text-xs"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditandoId(item.id);
                                setFormItem({
                                  numeroDiente: item.numeroDiente,
                                  cara: item.cara ?? '',
                                  codigo: item.codigo,
                                  fechaRealizacion: item.fechaRealizacion ? item.fechaRealizacion.slice(0, 10) : '',
                                  cantidad: item.cantidad,
                                  conformidadPaciente: item.conformidadPaciente,
                                });
                              }}
                              className="text-[#5fb3b0] hover:underline text-xs"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEliminarItem(item.id)}
                              className="text-red-600 hover:underline text-xs"
                            >
                              Eliminar
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {nuevoItem ? (
              <form onSubmit={handleAgregarItem} className="mt-4 p-4 bg-slate-50 rounded-lg">
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-3">
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Diente</label>
                    <input
                      type="number"
                      min={11}
                      max={85}
                      value={formItem.numeroDiente}
                      onChange={(e) => setFormItem((f) => ({ ...f, numeroDiente: parseInt(e.target.value, 10) || 11 }))}
                      className="w-full px-2 py-1.5 border rounded"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Cara</label>
                    <select
                      value={formItem.cara}
                      onChange={(e) => setFormItem((f) => ({ ...f, cara: e.target.value }))}
                      className="w-full px-2 py-1.5 border rounded"
                    >
                      <option value="">-</option>
                      {CARAS.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Código *</label>
                    <input
                      type="text"
                      value={formItem.codigo}
                      onChange={(e) => setFormItem((f) => ({ ...f, codigo: e.target.value }))}
                      placeholder="Ej: OBT01"
                      className="w-full px-2 py-1.5 border rounded"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Fecha</label>
                    <input
                      type="date"
                      value={formItem.fechaRealizacion}
                      onChange={(e) => setFormItem((f) => ({ ...f, fechaRealizacion: e.target.value }))}
                      className="w-full px-2 py-1.5 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Cant.</label>
                    <input
                      type="number"
                      min={1}
                      value={formItem.cantidad}
                      onChange={(e) => setFormItem((f) => ({ ...f, cantidad: parseInt(e.target.value, 10) || 1 }))}
                      className="w-full px-2 py-1.5 border rounded"
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formItem.conformidadPaciente}
                        onChange={(e) => setFormItem((f) => ({ ...f, conformidadPaciente: e.target.checked }))}
                      />
                      <span className="text-xs">Conformidad</span>
                    </label>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="px-3 py-1.5 bg-[#5fb3b0] text-white rounded text-sm">
                    Agregar
                  </button>
                  <button
                    type="button"
                    onClick={() => setNuevoItem(false)}
                    className="px-3 py-1.5 bg-slate-200 rounded text-sm"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setNuevoItem(true);
                  setFormItem({
                    ...formItem,
                    fechaRealizacion: new Date().toISOString().slice(0, 10),
                  });
                }}
                className="mt-4 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 rounded text-sm"
              >
                + Agregar prestación
              </button>
            )}

            {/* Observaciones */}
            <div className="mt-6 pt-6 border-t">
              <label className="block text-sm font-medium text-slate-700 mb-2">Observaciones</label>
              <textarea
                value={registro.observaciones ?? ''}
                onChange={(e) => setRegistro((r) => (r ? { ...r, observaciones: e.target.value } : null))}
                onBlur={(e) => handleGuardarRegistro({ observaciones: e.target.value })}
                placeholder="Observaciones del registro..."
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>

            {/* Consentimiento */}
            <div className="mt-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={registro.consentimientoInformado}
                  onChange={(e) => handleGuardarRegistro({ consentimientoInformado: e.target.checked })}
                />
                <span>Consentimiento informado</span>
              </label>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
