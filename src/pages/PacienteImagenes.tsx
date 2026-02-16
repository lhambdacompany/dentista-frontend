import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, getUploadUrl } from '../lib/api';
import { formatearFecha } from '../lib/formatDate';

interface Imagen {
  id: string;
  url: string;
  descripcion?: string;
  fecha: string;
  tipo: string;
}

export function PacienteImagenes() {
  const { id } = useParams<{ id: string }>();
  const [imagenes, setImagenes] = useState<Imagen[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [lightboxImg, setLightboxImg] = useState<Imagen | null>(null);

  const load = () => {
    if (!id) return;
    setLoading(true);
    setError('');
    api.imagenes.list(id)
      .then(setImagenes as (d: unknown) => void)
      .catch((e) => setError(e instanceof Error ? e.message : 'Error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [id]);

  useEffect(() => {
    if (lightboxImg) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [lightboxImg]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setUploading(true);
    setError('');
    try {
      await api.imagenes.upload(id, file, undefined, 'FOTO_CLINICA');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (imgId: string) => {
    if (!confirm('¿Eliminar esta imagen?')) return;
    try {
      await api.imagenes.delete(imgId);
      if (lightboxImg?.id === imgId) setLightboxImg(null);
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
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-800">Imágenes</h1>
        <label className={`px-4 py-2 rounded-lg cursor-pointer shrink-0 ${uploading ? 'bg-slate-300 cursor-not-allowed' : 'bg-[#5fb3b0] hover:bg-[#4a9a97] text-white'}`}>
          {uploading ? 'Subiendo...' : 'Subir imagen'}
          <input type="file" accept="image/*" onChange={handleUpload} className="hidden" disabled={uploading} />
        </label>
      </div>

      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
          {imagenes.map((img) => (
            <div key={img.id} className="bg-white rounded-xl shadow overflow-hidden group">
              <button
                type="button"
                onClick={() => setLightboxImg(img)}
                className="w-full block text-left focus:outline-none focus:ring-2 focus:ring-[#5fb3b0] rounded-t-xl overflow-hidden"
              >
                <img
                  src={getUploadUrl(img.url)}
                  alt={img.descripcion || 'Imagen'}
                  className="w-full h-32 sm:h-36 object-cover cursor-zoom-in hover:opacity-90 transition"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=Imagen';
                  }}
                />
              </button>
              <div className="p-2 sm:p-3">
                <p className="text-sm text-slate-600 truncate">{img.descripcion || img.tipo}</p>
                <p className="text-xs text-slate-400">{formatearFecha(img.fecha)}</p>
                <button
                  onClick={() => handleDelete(img.id)}
                  className="text-red-500 text-xs mt-1 hover:underline"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
          {imagenes.length === 0 && (
            <p className="col-span-full text-center py-12 text-slate-500">No hay imágenes. Sube una.</p>
          )}
        </div>
      )}

      {/* Lightbox */}
      {lightboxImg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightboxImg(null)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Escape' && setLightboxImg(null)}
          aria-label="Cerrar"
        >
          <button
            type="button"
            onClick={() => setLightboxImg(null)}
            className="absolute top-4 right-4 text-white hover:text-slate-300 text-3xl z-10"
            aria-label="Cerrar"
          >
            ×
          </button>
          <div
            className="max-w-[90vw] max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={getUploadUrl(lightboxImg.url)}
              alt={lightboxImg.descripcion || 'Imagen ampliada'}
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
            <p className="text-white mt-2 text-sm text-center">
              {lightboxImg.descripcion || lightboxImg.tipo} · {formatearFecha(lightboxImg.fecha)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
