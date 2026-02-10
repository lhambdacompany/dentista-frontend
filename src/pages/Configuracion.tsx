import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface EstadoDiente {
  id: string;
  clave: string;
  nombre: string;
  color: string;
  orden: number;
}

export function Configuracion() {
  const [estados, setEstados] = useState<EstadoDiente[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ nombre: '', color: '#e2e8f0' });
  const [form, setForm] = useState({ clave: '', nombre: '', color: '#e2e8f0' });
  const [error, setError] = useState('');

  useEffect(() => {
    api.estadosDiente.list().then(setEstados).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const nuevo = await api.estadosDiente.create(form) as EstadoDiente;
      setEstados((prev) => [...prev, nuevo].sort((a, b) => a.orden - b.orden));
      setForm({ clave: '', nombre: '', color: '#e2e8f0' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear');
    }
  };

  const handleUpdate = async (id: string, data: Partial<EstadoDiente>) => {
    setError('');
    try {
      const actualizado = await api.estadosDiente.update(id, data) as EstadoDiente;
      setEstados((prev) =>
        prev.map((e) => (e.id === id ? actualizado : e)).sort((a, b) => a.orden - b.orden)
      );
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar');
    }
  };

  const iniciarEdicion = (e: EstadoDiente) => {
    setEditing(e.id);
    setEditForm({ nombre: e.nombre, color: e.color });
  };

  const guardarEdicion = (id: string) => {
    handleUpdate(id, editForm);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este estado? Los dientes que lo usen quedarán con clave inválida.')) return;
    setError('');
    try {
      await api.estadosDiente.delete(id);
      setEstados((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar');
    }
  };

  if (loading) return <div className="text-center py-12">Cargando...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Configuración</h1>

      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Estados de dientes</h2>
        <p className="text-slate-600 text-sm mb-4">
          Define los estados que puedes asignar a cada diente en el odontograma. Cada estado tiene un color distintivo.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleCreate} className="flex flex-wrap gap-4 mb-6">
          <input
            type="text"
            placeholder="Clave (ej: CARIES)"
            value={form.clave}
            onChange={(e) => setForm((f) => ({ ...f, clave: e.target.value.toUpperCase().replace(/\s+/g, '_') }))}
            className="px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-[#5fb3b0] focus:border-transparent"
          />
          <input
            type="text"
            placeholder="Nombre (ej: Caries)"
            value={form.nombre}
            onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
            className="px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-[#5fb3b0] focus:border-transparent"
          />
          <input
            type="color"
            value={form.color}
            onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
            className="w-10 h-10 p-0 border border-slate-300 rounded cursor-pointer"
          />
          <button
            type="submit"
            disabled={!form.clave || !form.nombre}
            className="px-4 py-2 bg-[#5fb3b0] text-white rounded hover:bg-[#4fa39f] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Agregar estado
          </button>
        </form>

        <ul className="space-y-2">
          {estados.map((e) => (
            <li
              key={e.id}
              className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg"
            >
              <div
                className="w-8 h-8 rounded border border-slate-300 shrink-0"
                style={{ backgroundColor: e.color }}
              />
              {editing === e.id ? (
                <>
                  <input
                    type="text"
                    value={editForm.nombre}
                    onChange={(ev) => setEditForm((f) => ({ ...f, nombre: ev.target.value }))}
                    className="flex-1 px-2 py-1 border rounded"
                  />
                  <input
                    type="color"
                    value={editForm.color}
                    onChange={(ev) => setEditForm((f) => ({ ...f, color: ev.target.value }))}
                    className="w-8 h-8 p-0 border rounded cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => guardarEdicion(e.id)}
                    className="px-2 py-1 bg-[#5fb3b0] text-white rounded text-sm"
                  >
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(null)}
                    className="text-slate-500 hover:text-slate-700"
                  >
                    Cancelar
                  </button>
                </>
              ) : (
                <>
                  <span className="font-medium text-slate-700">{e.nombre}</span>
                  <span className="text-slate-500 text-sm">{e.clave}</span>
                  <button
                    type="button"
                    onClick={() => iniciarEdicion(e)}
                    className="text-[#5fb3b0] hover:underline text-sm"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(e.id)}
                    className="text-red-600 hover:underline text-sm ml-auto"
                  >
                    Eliminar
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
