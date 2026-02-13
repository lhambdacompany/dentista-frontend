import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { formatearFecha } from '../lib/formatDate';

interface Nota {
  id: string;
  titulo: string;
  descripcion: string;
  fecha: string;
  profesional: string;
}

export function PacienteNotas() {
  const { id } = useParams<{ id: string }>();
  const [notas, setNotas] = useState<Nota[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ titulo: '', descripcion: '', profesional: 'Micaela Ancarola' });

  const load = () => {
    if (!id) return;
    setLoading(true);
    setError('');
    api.notas.list(id)
      .then(setNotas as (d: unknown) => void)
      .catch((e) => setError(e instanceof Error ? e.message : 'Error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !form.titulo.trim() || !form.descripcion.trim()) return;
    try {
      await api.notas.create({ ...form, pacienteId: id });
      setForm({ titulo: '', descripcion: '', profesional: 'Micaela Ancarola' });
      setShowForm(false);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error');
    }
  };

  const handleDelete = async (notaId: string) => {
    if (!confirm('¿Eliminar esta nota?')) return;
    try {
      await api.notas.delete(notaId);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error');
    }
  };

  if (!id) return <div className="p-4">Paciente no encontrado</div>;

  return (
    <div className="space-y-6">
      <Link to={`/pacientes/${id}`} className="text-[#5fb3b0] hover:underline">
        ← Volver al paciente
      </Link>
      {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>}
      {loading && <p className="text-slate-500">Cargando...</p>}
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Notas clínicas</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-[#5fb3b0] text-white rounded-lg hover:bg-[#4a9a97]"
        >
          {showForm ? 'Cancelar' : 'Nueva nota'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-6 space-y-4">
          <input
            type="text"
            placeholder="Título"
            value={form.titulo}
            onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg"
            required
          />
          <textarea
            placeholder="Descripción"
            value={form.descripcion}
            onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg"
            rows={4}
            required
          />
          <input
            type="text"
            placeholder="Profesional"
            value={form.profesional}
            onChange={(e) => setForm((f) => ({ ...f, profesional: e.target.value }))}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg"
          />
          <button type="submit" className="px-4 py-2 bg-[#5fb3b0] text-white rounded-lg">
            Guardar
          </button>
        </form>
      )}

      {!loading && (
      <div className="space-y-3">
        {notas.map((n) => (
          <div key={n.id} className="bg-white rounded-xl shadow p-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold">{n.titulo}</h3>
                <p className="text-slate-600 text-sm mt-1">{n.descripcion}</p>
                <p className="text-slate-400 text-xs mt-2">
                  {n.profesional} · {formatearFecha(n.fecha)}
                </p>
              </div>
              <button
                onClick={() => handleDelete(n.id)}
                className="text-red-500 text-sm hover:underline"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
        {notas.length === 0 && !showForm && (
          <p className="text-center py-12 text-slate-500">No hay notas. Agrega una.</p>
        )}
      </div>
      )}
    </div>
  );
}
