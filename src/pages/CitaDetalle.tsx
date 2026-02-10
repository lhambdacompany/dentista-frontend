import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { formatearFecha } from '../lib/formatDate';

function RecordatorioBtn({ citaId }: { citaId: string }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const handleClick = async () => {
    setLoading(true);
    setMsg('');
    try {
      const res = await api.citas.enviarRecordatorio(citaId) as { enviado: boolean; mensaje: string };
      setMsg(res.enviado ? '✓ Enviado' : res.mensaje);
      if (!res.enviado) setTimeout(() => setMsg(''), 4000);
    } catch {
      setMsg('Error');
      setTimeout(() => setMsg(''), 3000);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-white/20 backdrop-blur border border-white/30 rounded-xl hover:bg-white/30 transition-all disabled:opacity-50"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        {loading ? 'Enviando...' : 'Enviar recordatorio'}
      </button>
      {msg && <span className="text-sm text-slate-600">{msg}</span>}
    </div>
  );
}

interface Odontograma {
  id: string;
  fecha: string;
  titulo?: string;
  _count?: { dientes: number };
}

interface Nota {
  id: string;
  titulo: string;
  descripcion: string;
  fecha: string;
  profesional: string;
}

interface Imagen {
  id: string;
  url: string;
  descripcion?: string;
  fecha: string;
  tipo: string;
}

interface RegistroPrestacion {
  id: string;
  _count?: { items: number };
}

interface Cita {
  id: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  motivo?: string;
  estado: string;
  paciente: { id: string; nombre: string; apellido: string; email?: string };
  odontogramas: Odontograma[];
  notasClinicas: Nota[];
  imagenes: Imagen[];
  registroPrestacion?: RegistroPrestacion | null;
}

export function CitaDetalle() {
  const { id } = useParams<{ id: string }>();
  const [cita, setCita] = useState<Cita | null>(null);
  const [nuevoOdonto, setNuevoOdonto] = useState(false);
  const [nuevaNota, setNuevaNota] = useState(false);
  const [tituloOdonto, setTituloOdonto] = useState('');
  const [formNota, setFormNota] = useState({ titulo: '', descripcion: '', profesional: 'Admin' });
  const [lightboxImg, setLightboxImg] = useState<Imagen | null>(null);

  const load = () => {
    if (!id) return;
    api.citas.get(id).then(setCita as (d: unknown) => void);
  };

  useEffect(() => {
    load();
  }, [id]);

  const handleCrearOdontograma = async () => {
    if (!cita || !id) return;
    try {
      const od = await api.odontograma.create(cita.paciente.id, tituloOdonto || undefined, id) as { id: string };
      setNuevoOdonto(false);
      setTituloOdonto('');
      window.location.href = `/odontograma/${od.id}`;
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error');
    }
  };

  const handleCrearNota = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cita || !formNota.titulo.trim() || !formNota.descripcion.trim()) return;
    try {
      await api.notas.create({ ...formNota, pacienteId: cita.paciente.id, citaId: id! });
      setFormNota({ titulo: '', descripcion: '', profesional: 'Admin' });
      setNuevaNota(false);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error');
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !cita || !id) return;
    try {
      await api.imagenes.upload(cita.paciente.id, file, undefined, 'FOTO_CLINICA', id);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al subir');
    }
    e.target.value = '';
  };

  if (!cita) return <div className="text-center py-16 text-slate-500">Cargando...</div>;

  const pacienteId = cita.paciente.id;
  const fechaStr = formatearFecha(cita.fecha);

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <Link
        to="/calendario"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-[#5fb3b0] transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Volver al calendario
      </Link>

      {/* Header principal */}
      <div className="bg-gradient-to-br from-[#5fb3b0] to-[#4a9a97] rounded-2xl shadow-lg p-8 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <p className="text-white/80 text-sm font-medium uppercase tracking-wider">{fechaStr}</p>
            <h1 className="text-3xl font-bold mt-1">
              {cita.horaInicio} – {cita.horaFin}
            </h1>
            <Link
              to={`/pacientes/${pacienteId}`}
              className="inline-flex items-center gap-2 mt-3 text-white/95 hover:text-white font-medium transition-colors"
            >
              {cita.paciente.nombre} {cita.paciente.apellido}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            {cita.motivo && (
              <p className="mt-2 text-white/85 text-sm">{cita.motivo}</p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium bg-white/20 backdrop-blur border border-white/30">
              {cita.estado}
            </span>
            <RecordatorioBtn citaId={id!} />
          </div>
        </div>
      </div>

      {/* Acciones rápidas - Registro y Historia Clínica */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          to={`/citas/${id}/prestaciones`}
          className="group flex items-center gap-4 p-6 bg-white rounded-2xl shadow-sm border border-slate-200 hover:border-[#5fb3b0]/30 hover:shadow-md transition-all"
        >
          <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-[#5fb3b0]/10 flex items-center justify-center group-hover:bg-[#5fb3b0]/20 transition-colors">
            <svg className="w-7 h-7 text-[#5fb3b0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-800 group-hover:text-[#5fb3b0] transition-colors">
              Registro de prestaciones
            </h3>
            <p className="text-sm text-slate-500 mt-0.5">
              {cita.registroPrestacion
                ? `${cita.registroPrestacion._count?.items ?? 0} prestaciones registradas`
                : 'Crear registro para esta sesión'}
            </p>
          </div>
          <svg className="w-5 h-5 text-slate-400 group-hover:text-[#5fb3b0] group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>

        <Link
          to={`/citas/${id}/historia-clinica`}
          className="group flex items-center gap-4 p-6 bg-white rounded-2xl shadow-sm border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all"
        >
          <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center group-hover:bg-slate-200 transition-colors">
            <svg className="w-7 h-7 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-800 group-hover:text-slate-600 transition-colors">
              Historia clínica
            </h3>
            <p className="text-sm text-slate-500 mt-0.5">
              Formulario completo de esta sesión
            </p>
          </div>
          <svg className="w-5 h-5 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {/* Contenido en tarjetas */}
      <div className="space-y-8">
        {/* Odontogramas */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-[#5fb3b0]/10 flex items-center justify-center">
                <svg className="w-4 h-4 text-[#5fb3b0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z" />
                </svg>
              </span>
              Odontogramas
            </h2>
            <button
              onClick={() => setNuevoOdonto(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#5fb3b0] rounded-xl hover:bg-[#4a9a97] transition-colors shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nuevo odontograma
            </button>
          </div>
          <div className="p-6">
            {nuevoOdonto && (
              <div className="mb-6 p-5 bg-slate-50 rounded-xl flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex-1 min-w-0">
                  <label className="block text-sm font-medium text-slate-600 mb-2">Título (opcional)</label>
                  <input
                    type="text"
                    value={tituloOdonto}
                    onChange={(e) => setTituloOdonto(e.target.value)}
                    placeholder={`Odontograma ${fechaStr}`}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#5fb3b0]/30 focus:border-[#5fb3b0]"
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleCrearOdontograma} className="px-5 py-2.5 bg-[#5fb3b0] text-white rounded-xl font-medium hover:bg-[#4a9a97] transition-colors">
                    Crear y abrir
                  </button>
                  <button onClick={() => { setNuevoOdonto(false); setTituloOdonto(''); }} className="px-5 py-2.5 bg-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-300 transition-colors">
                    Cancelar
                  </button>
                </div>
              </div>
            )}
            {cita.odontogramas.length > 0 ? (
              <div className="space-y-3">
                {cita.odontogramas.map((o) => (
                  <Link
                    key={o.id}
                    to={`/odontograma/${o.id}`}
                    className="flex items-center justify-between p-4 rounded-xl bg-slate-50 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all group"
                  >
                    <span className="font-medium text-slate-800 group-hover:text-[#5fb3b0] transition-colors">
                      {o.titulo || `Odontograma ${formatearFecha(o.fecha)}`}
                    </span>
                    <span className="text-sm text-slate-500 flex items-center gap-2">
                      {o._count?.dientes ?? 0} dientes
                      <svg className="w-4 h-4 text-slate-400 group-hover:text-[#5fb3b0] group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-center py-8">No hay odontogramas en esta cita.</p>
            )}
          </div>
        </div>

        {/* Notas clínicas */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </span>
              Notas clínicas
            </h2>
            <button
              onClick={() => setNuevaNota(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#5fb3b0] border border-[#5fb3b0] rounded-xl hover:bg-[#5fb3b0]/5 transition-colors shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nueva nota
            </button>
          </div>
          <div className="p-6">
            {nuevaNota && (
              <form onSubmit={handleCrearNota} className="mb-6 p-5 bg-slate-50 rounded-xl space-y-4">
                <input
                  type="text"
                  placeholder="Título"
                  value={formNota.titulo}
                  onChange={(e) => setFormNota((f) => ({ ...f, titulo: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#5fb3b0]/30 focus:border-[#5fb3b0]"
                  required
                />
                <textarea
                  placeholder="Descripción"
                  value={formNota.descripcion}
                  onChange={(e) => setFormNota((f) => ({ ...f, descripcion: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#5fb3b0]/30 focus:border-[#5fb3b0] resize-none"
                  rows={3}
                  required
                />
                <input
                  type="text"
                  placeholder="Profesional"
                  value={formNota.profesional}
                  onChange={(e) => setFormNota((f) => ({ ...f, profesional: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#5fb3b0]/30 focus:border-[#5fb3b0]"
                />
                <div className="flex gap-2">
                  <button type="submit" className="px-5 py-2.5 bg-[#5fb3b0] text-white rounded-xl font-medium hover:bg-[#4a9a97] transition-colors">Guardar</button>
                  <button type="button" onClick={() => setNuevaNota(false)} className="px-5 py-2.5 bg-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-300 transition-colors">Cancelar</button>
                </div>
              </form>
            )}
            {cita.notasClinicas.length > 0 ? (
              <div className="space-y-4">
                {cita.notasClinicas.map((n) => (
                  <div key={n.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                    <h3 className="font-semibold text-slate-800">{n.titulo}</h3>
                    <p className="text-slate-600 text-sm mt-2 leading-relaxed">{n.descripcion}</p>
                    <p className="text-slate-400 text-xs mt-3">{n.profesional} · {formatearFecha(n.fecha)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-center py-8">No hay notas en esta cita.</p>
            )}
          </div>
        </div>

        {/* Imágenes */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </span>
              Imágenes
            </h2>
            <label className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#5fb3b0] rounded-xl hover:bg-[#4a9a97] cursor-pointer transition-colors shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Subir imagen
              <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
            </label>
          </div>
          <div className="p-6">
            {cita.imagenes.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {cita.imagenes.map((img) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setLightboxImg(img)}
                    className="group block text-left rounded-xl overflow-hidden border border-slate-200 hover:border-[#5fb3b0]/50 hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-[#5fb3b0]/30"
                  >
                    <div className="aspect-square overflow-hidden bg-slate-100">
                      <img
                        src={img.url}
                        alt={img.descripcion || 'Imagen'}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <p className="p-3 text-sm text-slate-600 truncate">{img.descripcion || img.tipo}</p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-center py-8">No hay imágenes en esta cita.</p>
            )}
          </div>
        </div>
      </div>

      {lightboxImg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightboxImg(null)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Escape' && setLightboxImg(null)}
        >
          <button onClick={() => setLightboxImg(null)} className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white text-2xl transition-colors">
            ×
          </button>
          <img src={lightboxImg.url} alt="" className="max-w-full max-h-[90vh] object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
