import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

interface Paciente {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  telefono?: string;
  email?: string;
  obraSocial?: { nombre: string };
  _count?: { citas: number; odontogramas: number };
}

export function Pacientes() {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [obras, setObras] = useState<{ id: string; nombre: string }[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    dni: '',
    fechaNacimiento: '',
    telefono: '',
    email: '',
    direccion: '',
    obraSocialId: '',
    nota: '',
    alergias: '',
  });

  useEffect(() => {
    api.pacientes.list(search).then(setPacientes as (d: unknown) => void);
  }, [search]);

  useEffect(() => {
    api.obrasSociales.list().then((d) => setObras((d as { id: string; nombre: string }[]) || []));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim() || !form.apellido.trim() || !form.dni.trim() || !form.fechaNacimiento)
      return;
    try {
      await api.pacientes.create({
        ...form,
        obraSocialId: form.obraSocialId || undefined,
        telefono: form.telefono || undefined,
        email: form.email || undefined,
        direccion: form.direccion || undefined,
        nota: form.nota || undefined,
        alergias: form.alergias || undefined,
      });
      setForm({
        nombre: '',
        apellido: '',
        dni: '',
        fechaNacimiento: '',
        telefono: '',
        email: '',
        direccion: '',
        obraSocialId: '',
        nota: '',
        alergias: '',
      });
      setShowForm(false);
      api.pacientes.list(search).then(setPacientes as (d: unknown) => void);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold text-slate-800">Pacientes</h1>
        <div className="flex gap-2">
          <input
            type="search"
            placeholder="Buscar por nombre, DNI, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg w-full sm:w-48"
          />
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-[#5fb3b0] text-white rounded-lg hover:bg-[#4a9a97] font-medium whitespace-nowrap"
          >
            {showForm ? 'Cancelar' : 'Nuevo paciente'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Nuevo paciente</h2>
          <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
              <input
                type="text"
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Apellido *</label>
              <input
                type="text"
                value={form.apellido}
                onChange={(e) => setForm((f) => ({ ...f, apellido: e.target.value }))}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">DNI *</label>
              <input
                type="text"
                value={form.dni}
                onChange={(e) => setForm((f) => ({ ...f, dni: e.target.value }))}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Fecha nacimiento *
              </label>
              <input
                type="date"
                value={form.fechaNacimiento}
                onChange={(e) => setForm((f) => ({ ...f, fechaNacimiento: e.target.value }))}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
              <input
                type="text"
                value={form.telefono}
                onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Obra social
                <Link to="/obras-sociales" className="ml-2 text-xs text-[#5fb3b0] hover:underline">
                  (cargar manualmente)
                </Link>
              </label>
              <select
                value={form.obraSocialId}
                onChange={(e) => setForm((f) => ({ ...f, obraSocialId: e.target.value }))}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg"
              >
                <option value="">Sin obra social</option>
                {obras.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Nota</label>
              <textarea
                value={form.nota}
                onChange={(e) => setForm((f) => ({ ...f, nota: e.target.value }))}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                rows={2}
                placeholder="Nota principal del paciente"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Alergias</label>
              <input
                type="text"
                value={form.alergias}
                onChange={(e) => setForm((f) => ({ ...f, alergias: e.target.value }))}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                placeholder="Ej: Penicilina"
              />
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                className="px-4 py-2 bg-[#5fb3b0] text-white rounded-lg hover:bg-[#4a9a97]"
              >
                Crear paciente
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
                <th className="text-left px-4 py-3 text-slate-600">DNI</th>
                <th className="text-left px-4 py-3 text-slate-600">Obra social</th>
                <th className="text-left px-4 py-3 text-slate-600">Contacto</th>
                <th className="text-left px-4 py-3 text-slate-600">Citas</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pacientes.map((p) => (
                <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      to={`/pacientes/${p.id}`}
                      className="font-medium text-[#5fb3b0] hover:underline"
                    >
                      {p.nombre} {p.apellido}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{p.dni}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {p.obraSocial?.nombre || '-'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {p.telefono || p.email || '-'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{p._count?.citas ?? 0}</td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/pacientes/${p.id}`}
                      className="text-sm text-[#5fb3b0] hover:underline"
                    >
                      Ver ficha
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pacientes.length === 0 && !showForm && (
          <p className="text-center py-12 text-slate-500">
            No hay pacientes. Crea uno para comenzar.
          </p>
        )}
      </div>
    </div>
  );
}
