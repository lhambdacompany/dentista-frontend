import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { formatearFecha } from '../lib/formatDate';

interface Paciente {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  telefono?: string;
  obraSocial?: { nombre: string };
  _count?: { citas: number };
}

interface Cita {
  id: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  motivo?: string;
  estado: string;
  paciente: { id: string; nombre: string; apellido: string };
  registroPrestacion?: { _count?: { items: number } };
}

export function PrestacionesList() {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [search, setSearch] = useState('');
  const [loadingPacientes, setLoadingPacientes] = useState(true);

  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<Paciente | null>(null);
  const [citas, setCitas] = useState<Cita[]>([]);
  const [loadingCitas, setLoadingCitas] = useState(false);

  // Cargar pacientes
  useEffect(() => {
    setLoadingPacientes(true);
    api.pacientes
      .list(search)
      .then((d) => setPacientes((d as Paciente[]) || []))
      .catch(console.error)
      .finally(() => setLoadingPacientes(false));
  }, [search]);

  // Cargar citas del paciente seleccionado
  const seleccionarPaciente = (paciente: Paciente) => {
    setPacienteSeleccionado(paciente);
    setCitas([]);
    setLoadingCitas(true);
    api.citas
      .list(undefined, undefined, paciente.id)
      .then((d) => setCitas((d as Cita[]) || []))
      .catch(console.error)
      .finally(() => setLoadingCitas(false));
  };

  const volverALista = () => {
    setPacienteSeleccionado(null);
    setCitas([]);
  };

  // Vista: citas del paciente seleccionado
  if (pacienteSeleccionado) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={volverALista}
            className="text-slate-500 hover:text-slate-700 flex items-center gap-1 text-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver a pacientes
          </button>
        </div>

        <div>
          <h1 className="text-xl font-semibold text-slate-800">
            Citas de {pacienteSeleccionado.nombre} {pacienteSeleccionado.apellido}
          </h1>
          <p className="text-sm text-slate-500">DNI: {pacienteSeleccionado.dni}</p>
        </div>

        <p className="text-sm text-slate-600">
          Selecciona una cita para registrar las prestaciones realizadas.
        </p>

        <div className="bg-white rounded-xl shadow overflow-hidden">
          {loadingCitas ? (
            <div className="text-center py-12 text-slate-500">Cargando citas...</div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-100 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Fecha</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Hora</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Motivo</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Estado</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Prestaciones</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-slate-700">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {citas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      Este paciente no tiene citas registradas
                    </td>
                  </tr>
                ) : (
                  citas.map((cita) => (
                    <tr key={cita.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-800">
                        {formatearFecha(cita.fecha)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {cita.horaInicio} - {cita.horaFin}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {cita.motivo || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <EstadoBadge estado={cita.estado} />
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
          )}
        </div>
      </div>
    );
  }

  // Vista: lista de pacientes
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-800">Registro de prestaciones</h1>
      <p className="text-sm text-slate-600">
        Selecciona un paciente para ver sus citas y registrar prestaciones.
      </p>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Buscar paciente por nombre, apellido o DNI..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5fb3b0]"
        />
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        {loadingPacientes ? (
          <div className="text-center py-12 text-slate-500">Cargando pacientes...</div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-100 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Paciente</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">DNI</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Obra Social</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Teléfono</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Citas</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-700">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {pacientes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    {search ? 'No se encontraron pacientes con esa búsqueda' : 'No hay pacientes registrados'}
                  </td>
                </tr>
              ) : (
                pacientes.map((paciente) => (
                  <tr key={paciente.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => seleccionarPaciente(paciente)}>
                    <td className="px-4 py-3 text-sm font-medium text-slate-800">
                      {paciente.nombre} {paciente.apellido}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{paciente.dni}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {paciente.obraSocial?.nombre ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {paciente.telefono ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {paciente._count?.citas ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); seleccionarPaciente(paciente); }}
                        className="text-[#5fb3b0] hover:underline text-sm font-medium"
                      >
                        Ver citas
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  const estilos: Record<string, string> = {
    PENDIENTE: 'bg-yellow-100 text-yellow-700',
    CONFIRMADO: 'bg-blue-100 text-blue-700',
    ATENDIDO: 'bg-green-100 text-green-700',
    CANCELADO: 'bg-red-100 text-red-700',
  };
  const etiquetas: Record<string, string> = {
    PENDIENTE: 'Pendiente',
    CONFIRMADO: 'Confirmado',
    ATENDIDO: 'Atendido',
    CANCELADO: 'Cancelado',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${estilos[estado] ?? 'bg-slate-100 text-slate-600'}`}>
      {etiquetas[estado] ?? estado}
    </span>
  );
}
