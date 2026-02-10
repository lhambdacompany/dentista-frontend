import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { formatearFechaHora } from '../lib/formatDate';

interface TimelineItem {
  tipo: 'cita' | 'nota' | 'imagen' | 'odontograma';
  fecha: string;
  id: string;
  titulo: string;
  detalle?: string;
}

export function PacienteHistorial() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<{ paciente: unknown; timeline: TimelineItem[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError('');
    api.historial(id)
      .then(setData as (d: unknown) => void)
      .catch((e) => setError(e instanceof Error ? e.message : 'Error'))
      .finally(() => setLoading(false));
  }, [id]);

  if (!id) return <div className="p-4">Paciente no encontrado</div>;
  if (loading) return <div className="text-center py-12">Cargando...</div>;
  if (error) return <div className="p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <Link to={`/pacientes/${id}`} className="text-[#5fb3b0] hover:underline">
        ← Volver al paciente
      </Link>
      <h1 className="text-2xl font-bold text-slate-800">Historial clínico</h1>

      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />
        <div className="space-y-6">
          {data.timeline.map((item) => (
            <div key={item.id} className="relative flex gap-4 pl-12">
              <div className="absolute left-2 w-4 h-4 rounded-full bg-[#5fb3b0] -translate-x-1/2" />
              <div className="bg-white rounded-xl shadow p-4 flex-1">
                <h3 className="font-semibold">{item.titulo}</h3>
                {item.detalle && (
                  <p className="text-slate-600 text-sm mt-1">{item.detalle}</p>
                )}
                <p className="text-slate-400 text-xs mt-2">
                  {formatearFechaHora(item.fecha)}
                </p>
                {item.tipo === 'odontograma' && (
                  <Link
                    to={`/odontograma/${item.id}`}
                    className="text-xs text-[#5fb3b0] hover:underline mt-2 inline-block"
                  >
                    Ver odontograma →
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      {data.timeline.length === 0 && (
        <p className="text-center py-12 text-slate-500">No hay registros en el historial.</p>
      )}
    </div>
  );
}
