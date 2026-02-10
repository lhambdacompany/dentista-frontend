import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface ObraSocial {
  id: string;
  nombre: string;
  codigo?: string;
  _count?: { pacientes: number };
}

export function ObrasSociales() {
  const [obras, setObras] = useState<ObraSocial[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ObraSocial | null>(null);
  const [form, setForm] = useState({ nombre: '', codigo: '' });
  const [error, setError] = useState('');

  const load = () => api.obrasSociales.list().then(setObras as (d: unknown) => void);

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim()) return;
    setError('');
    try {
      if (editing) {
        await api.obrasSociales.update(editing.id, { nombre: form.nombre.trim(), codigo: form.codigo?.trim() || undefined });
        setEditing(null);
      } else {
        await api.obrasSociales.create({ nombre: form.nombre.trim(), codigo: form.codigo?.trim() || undefined });
      }
      setForm({ nombre: '', codigo: '' });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    }
  };

  const handleEdit = (o: ObraSocial) => {
    setEditing(o);
    setForm({ nombre: o.nombre, codigo: o.codigo || '' });
    setShowForm(true);
    setError('');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta obra social?')) return;
    setError('');
    try {
      await api.obrasSociales.delete(id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-100 rounded-lg p-4 text-slate-700">
        <p className="font-medium">Carga manual de obras sociales</p>
        <p className="text-sm mt-1">Agrega aquí las obras sociales que usas. Luego podrás asignarlas a cada paciente al crearlo o editarlo.</p>
      </div>
      {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-800">Obras sociales</h1>
        <button
          onClick={() => {
            setEditing(null);
            setForm({ nombre: '', codigo: '' });
            setShowForm(!showForm);
            setError('');
          }}
          className="px-4 py-2 bg-[#5fb3b0] text-white rounded-lg hover:bg-[#4a9a97] font-medium"
        >
          {showForm ? 'Cancelar' : 'Nueva obra social'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold mb-4">
            {editing ? 'Editar' : 'Nueva'} obra social
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nombre
              </label>
              <input
                type="text"
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                required
                placeholder="Ej: OSDE"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Código (opcional)
              </label>
              <input
                type="text"
                value={form.codigo}
                onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                placeholder="Ej: 310"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-[#5fb3b0] text-white rounded-lg hover:bg-[#4a9a97]"
              >
                {editing ? 'Guardar' : 'Crear'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditing(null);
                }}
                className="px-4 py-2 bg-slate-200 rounded-lg hover:bg-slate-300"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3 text-slate-600">Nombre</th>
                <th className="text-left px-4 py-3 text-slate-600">Código</th>
                <th className="text-left px-4 py-3 text-slate-600">Pacientes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {obras.map((o) => (
                <tr key={o.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{o.nombre}</td>
                  <td className="px-4 py-3 text-slate-600">{o.codigo || '-'}</td>
                  <td className="px-4 py-3 text-slate-600">{o._count?.pacientes ?? 0}</td>
                  <td className="px-4 py-3 flex gap-2">
                    <button
                      onClick={() => handleEdit(o)}
                      className="text-sm text-[#5fb3b0] hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(o.id)}
                      className="text-sm text-red-500 hover:underline"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {obras.length === 0 && !showForm && (
          <p className="text-center py-12 text-slate-500">
            No hay obras sociales. Crea una para asignar a pacientes.
          </p>
        )}
      </div>
    </div>
  );
}
