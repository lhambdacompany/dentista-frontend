import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

interface Paciente {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  fechaNacimiento?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  nota?: string;
  alergias?: string;
  obraSocial?: { id: string; nombre: string };
  obraSocialId?: string;
  _count?: { citas: number; odontogramas: number };
}

export function Pacientes() {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [obras, setObras] = useState<{ id: string; nombre: string }[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editandoPaciente, setEditandoPaciente] = useState<Paciente | null>(null);
  const [editForm, setEditForm] = useState<Partial<Paciente>>({});
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
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

  const abrirEdicion = async (p: Paciente) => {
    // Cargar datos completos del paciente para tener todos los campos
    const completo = await api.pacientes.get(p.id) as Paciente;
    setEditForm({
      nombre: completo.nombre,
      apellido: completo.apellido,
      dni: completo.dni,
      fechaNacimiento: completo.fechaNacimiento?.slice(0, 10) ?? '',
      telefono: completo.telefono ?? '',
      email: completo.email ?? '',
      direccion: completo.direccion ?? '',
      nota: completo.nota ?? '',
      alergias: completo.alergias ?? '',
      obraSocialId: completo.obraSocial?.id ?? '',
    });
    setEditandoPaciente(completo);
  };

  const handleGuardarEdicion = async () => {
    if (!editandoPaciente) return;
    setGuardandoEdicion(true);
    try {
      const actualizado = await api.pacientes.update(editandoPaciente.id, {
        ...editForm,
        obraSocialId: editForm.obraSocialId || null,
      }) as Paciente;
      setPacientes((prev) => prev.map((p) => p.id === actualizado.id ? { ...p, ...actualizado } : p));
      setEditandoPaciente(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setGuardandoEdicion(false);
    }
  };

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
                    <div className="flex items-center gap-3 flex-wrap">
                      <Link
                        to={`/pacientes/${p.id}`}
                        className="text-sm text-[#5fb3b0] hover:underline"
                      >
                        Ver ficha
                      </Link>
                      <button
                        type="button"
                        onClick={() => abrirEdicion(p)}
                        className="text-sm text-slate-500 hover:text-slate-700 hover:underline"
                      >
                        Editar
                      </button>
                      {p.telefono && (() => {
                        const tel = p.telefono.replace(/\D/g, '');
                        if (!tel) return null;
                        const msg = encodeURIComponent(`Hola ${p.nombre}, te contactamos desde el consultorio dental.`);
                        return (
                          <a
                            href={`https://wa.me/${tel}?text=${msg}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 transition-colors"
                          >
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                            WhatsApp
                          </a>
                        );
                      })()}
                    </div>
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

      {/* ── MODAL EDITAR PACIENTE ── */}
      {editandoPaciente && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setEditandoPaciente(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">
                Editar — {editandoPaciente.nombre} {editandoPaciente.apellido}
              </h2>
              <button
                type="button"
                onClick={() => setEditandoPaciente(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Nombre</label>
                  <input type="text" value={editForm.nombre ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, nombre: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5fb3b0]/50" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Apellido</label>
                  <input type="text" value={editForm.apellido ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, apellido: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5fb3b0]/50" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">DNI</label>
                  <input type="text" value={editForm.dni ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, dni: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5fb3b0]/50" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Fecha de nacimiento</label>
                  <input type="date" value={editForm.fechaNacimiento ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, fechaNacimiento: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5fb3b0]/50" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Teléfono</label>
                  <input type="tel" value={editForm.telefono ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, telefono: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5fb3b0]/50" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Email</label>
                  <input type="email" value={editForm.email ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5fb3b0]/50" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Domicilio</label>
                  <input type="text" value={editForm.direccion ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, direccion: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5fb3b0]/50" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Obra social</label>
                  <select value={editForm.obraSocialId ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, obraSocialId: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5fb3b0]/50">
                    <option value="">Sin obra social</option>
                    {obras.map((o) => (
                      <option key={o.id} value={o.id}>{o.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Alergias</label>
                  <input type="text" value={editForm.alergias ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, alergias: e.target.value }))}
                    placeholder="Dejar vacío si no hay alergias conocidas"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5fb3b0]/50" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Nota interna</label>
                  <textarea value={editForm.nota ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, nota: e.target.value }))}
                    rows={2} placeholder="Observaciones internas sobre el paciente"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#5fb3b0]/50" />
                </div>
              </div>
            </div>

            <div className="flex gap-2 px-6 py-4 border-t border-slate-200">
              <button type="button" onClick={handleGuardarEdicion} disabled={guardandoEdicion}
                className="px-5 py-2 bg-[#5fb3b0] text-white rounded-lg hover:bg-[#4a9a97] text-sm font-medium disabled:opacity-60">
                {guardandoEdicion ? 'Guardando...' : 'Guardar cambios'}
              </button>
              <button type="button" onClick={() => setEditandoPaciente(null)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 text-sm">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
