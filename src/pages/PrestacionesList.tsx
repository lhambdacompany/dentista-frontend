import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { formatearFecha } from '../lib/formatDate';

interface Cita {
  id: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  motivo?: string;
  paciente: { id: string; nombre: string; apellido: string };
  registroPrestacion?: { _count?: { items: number } };
}

export function PrestacionesList() {
  const [citas, setCitas] = useState<Cita[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const hoy = new Date();
    const inicio = new Date(hoy);
    inicio.setDate(inicio.getDate() - 7);
    inicio.setHours(0, 0, 0, 0);
    const fin = new Date(hoy);
    fin.setDate(fin.getDate() + 30);
    fin.setHours(23, 59, 59, 999);
    api.citas
      .list(inicio.toISOString(), fin.toISOString())
      .then((d) => setCitas((d as Cita[]) || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12">Cargando...</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-800">Registro de prestaciones</h1>
      <p className="text-sm text-slate-600">
        Selecciona una cita para registrar las prestaciones realizadas.
      </p>
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-100 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Fecha</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Paciente</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Hora</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Prestaciones</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-slate-700">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {citas.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No hay citas en este período
                </td>
              </tr>
            ) : (
              citas.map((cita) => (
                <tr key={cita.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm text-slate-800">
                    {formatearFecha(cita.fecha)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {cita.paciente.nombre} {cita.paciente.apellido}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {cita.horaInicio} - {cita.horaFin}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {cita.registroPrestacion?._count?.items ?? '-'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/citas/${cita.id}/prestaciones`}
                      className="text-[#5fb3b0] hover:underline text-sm font-medium"
                    >
                      Registrar
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
