import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface EstadoDiente {
  id: string;
  clave: string;
  nombre: string;
  color: string;
  orden: number;
  simbolo?: string;
}

// ── Color de borde/símbolo calculado desde el color de fondo ─────────────────

function accentColor(hex: string): string {
  if (!hex || hex.length < 7) return '#94a3b8';
  try {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return '#94a3b8';
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h = 0;
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
    const ns = Math.min(1, s + 0.4);
    const nl = 0.45;
    const q = nl < 0.5 ? nl * (1 + ns) : nl + ns - nl * ns;
    const p = 2 * nl - q;
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const nr = Math.round(hue2rgb(p, q, h + 1/3) * 255);
    const ng = Math.round(hue2rgb(p, q, h) * 255);
    const nb = Math.round(hue2rgb(p, q, h - 1/3) * 255);
    return `#${nr.toString(16).padStart(2,'0')}${ng.toString(16).padStart(2,'0')}${nb.toString(16).padStart(2,'0')}`;
  } catch { return '#94a3b8'; }
}

// ── Símbolos disponibles ──────────────────────────────────────────────────────

export const SIMBOLOS_DISPONIBLES: {
  id: string;
  label: string;
  svg: React.ReactNode;
}[] = [
  {
    id: 'NINGUNO',
    label: 'Ninguno',
    svg: null,
  },
  {
    id: 'X',
    label: 'X (ausente)',
    svg: (
      <svg viewBox="0 0 32 32" className="w-full h-full" strokeWidth={2.5}>
        <line x1="4" y1="4" x2="28" y2="28" stroke="currentColor" />
        <line x1="28" y1="4" x2="4" y2="28" stroke="currentColor" />
      </svg>
    ),
  },
  {
    id: 'ARCO',
    label: 'Arco (prótesis fija)',
    svg: (
      <svg viewBox="0 0 32 32" className="w-full h-full" strokeWidth={2.5} fill="none">
        <path d="M 5 26 L 5 10 L 27 10 L 27 26" stroke="currentColor" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'RECTANGULO',
    label: 'Rectángulo (prótesis removible)',
    svg: (
      <svg viewBox="0 0 32 32" className="w-full h-full" strokeWidth={2.5} fill="none">
        <rect x="5" y="5" width="22" height="22" rx="1" stroke="currentColor" />
      </svg>
    ),
  },
  {
    id: 'CIRCULO',
    label: 'Círculo (corona)',
    svg: (
      <svg viewBox="0 0 32 32" className="w-full h-full" strokeWidth={2.5} fill="none">
        <circle cx="16" cy="16" r="11" stroke="currentColor" />
      </svg>
    ),
  },
  {
    id: 'PUNTO',
    label: 'Punto (caries)',
    svg: (
      <svg viewBox="0 0 32 32" className="w-full h-full" fill="currentColor">
        <circle cx="16" cy="16" r="6" />
      </svg>
    ),
  },
];

function SimboloPreview({
  simbolo,
  color,
  size = 'md',
}: {
  simbolo?: string;
  color: string;
  size?: 'sm' | 'md';
}) {
  const cfg = SIMBOLOS_DISPONIBLES.find((s) => s.id === simbolo);
  const dim = size === 'sm' ? 'w-6 h-6' : 'w-8 h-8';
  const accent = accentColor(color);
  return (
    <div
      className={`relative inline-flex ${dim} rounded border-2 shrink-0 overflow-hidden`}
      style={{ backgroundColor: color, borderColor: accent, color: accent }}
    >
      {cfg?.svg && (
        <span className="absolute inset-0 pointer-events-none">
          {cfg.svg}
        </span>
      )}
    </div>
  );
}

function SimboloPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {SIMBOLOS_DISPONIBLES.map((s) => (
        <button
          key={s.id}
          type="button"
          title={s.label}
          onClick={() => onChange(s.id)}
          className={`relative w-8 h-8 rounded border-2 shrink-0 overflow-hidden transition-all bg-white
            ${value === s.id
              ? 'border-[#5fb3b0] ring-2 ring-[#5fb3b0]/30'
              : 'border-slate-300 hover:border-slate-400'
            }`}
          style={{ color: '#475569' }}
        >
          {s.svg ? (
            <span className="absolute inset-0 pointer-events-none">{s.svg}</span>
          ) : (
            <span className="text-slate-400 text-xs font-medium leading-none flex items-center justify-center w-full h-full">—</span>
          )}
        </button>
      ))}
    </div>
  );
}

export function Configuracion() {
  const [estados, setEstados] = useState<EstadoDiente[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ nombre: '', color: '#e2e8f0', simbolo: 'NINGUNO' });
  const [form, setForm] = useState({ clave: '', nombre: '', color: '#e2e8f0', simbolo: 'NINGUNO' });
  const [error, setError] = useState('');

  useEffect(() => {
    api.estadosDiente.list().then(setEstados).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        ...form,
        simbolo: form.simbolo === 'NINGUNO' ? undefined : form.simbolo,
      };
      const nuevo = await api.estadosDiente.create(payload) as EstadoDiente;
      setEstados((prev) => [...prev, nuevo].sort((a, b) => a.orden - b.orden));
      setForm({ clave: '', nombre: '', color: '#e2e8f0', simbolo: 'NINGUNO' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear');
    }
  };

  const handleUpdate = async (id: string) => {
    setError('');
    try {
      const payload = {
        nombre: editForm.nombre,
        color: editForm.color,
        simbolo: editForm.simbolo === 'NINGUNO' ? null : editForm.simbolo,
      };
      const actualizado = await api.estadosDiente.update(id, payload) as EstadoDiente;
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
    setEditForm({ nombre: e.nombre, color: e.color, simbolo: e.simbolo ?? 'NINGUNO' });
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
        <h2 className="text-lg font-semibold text-slate-800 mb-1">Estados de dientes</h2>
        <p className="text-slate-600 text-sm mb-6">
          Define los estados que se pueden asignar a cada diente en el odontograma. Cada estado tiene un color y un símbolo opcional.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Formulario crear */}
        <form onSubmit={handleCreate} className="border border-slate-200 rounded-lg p-4 mb-6 space-y-4 bg-slate-50">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nuevo estado</p>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <label className="text-xs text-slate-500">Clave</label>
              <input
                type="text"
                placeholder="Ej: CARIES"
                value={form.clave}
                onChange={(e) => setForm((f) => ({ ...f, clave: e.target.value.toUpperCase().replace(/\s+/g, '_') }))}
                className="px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-[#5fb3b0] focus:border-transparent text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-500">Nombre</label>
              <input
                type="text"
                placeholder="Ej: Caries"
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                className="px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-[#5fb3b0] focus:border-transparent text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-500">Color</label>
              <input
                type="color"
                value={form.color}
                onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                className="w-10 h-10 p-0.5 border border-slate-300 rounded cursor-pointer"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs text-slate-500">Símbolo</label>
            <SimboloPicker value={form.simbolo} onChange={(v) => setForm((f) => ({ ...f, simbolo: v }))} />
            <p className="text-xs text-slate-400">
              {SIMBOLOS_DISPONIBLES.find((s) => s.id === form.simbolo)?.label}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <SimboloPreview simbolo={form.simbolo !== 'NINGUNO' ? form.simbolo : undefined} color={form.color} />
            <span className="text-xs text-slate-500">Vista previa</span>
            <button
              type="submit"
              disabled={!form.clave || !form.nombre}
              className="ml-auto px-4 py-2 bg-[#5fb3b0] text-white rounded hover:bg-[#4fa39f] disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              Agregar estado
            </button>
          </div>
        </form>

        {/* Lista de estados */}
        <ul className="space-y-2">
          {estados.map((e) => (
            <li key={e.id} className="border border-slate-200 rounded-lg p-4 bg-white">
              {editing === e.id ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-3 items-end">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500">Nombre</label>
                      <input
                        type="text"
                        value={editForm.nombre}
                        onChange={(ev) => setEditForm((f) => ({ ...f, nombre: ev.target.value }))}
                        className="px-3 py-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-[#5fb3b0]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500">Color</label>
                      <input
                        type="color"
                        value={editForm.color}
                        onChange={(ev) => setEditForm((f) => ({ ...f, color: ev.target.value }))}
                        className="w-10 h-10 p-0.5 border border-slate-300 rounded cursor-pointer"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-slate-500">Símbolo</label>
                    <SimboloPicker value={editForm.simbolo} onChange={(v) => setEditForm((f) => ({ ...f, simbolo: v }))} />
                  </div>
                  <div className="flex items-center gap-3">
                    <SimboloPreview simbolo={editForm.simbolo !== 'NINGUNO' ? editForm.simbolo : undefined} color={editForm.color} />
                    <span className="text-xs text-slate-500">Vista previa</span>
                    <div className="flex gap-2 ml-auto">
                      <button
                        type="button"
                        onClick={() => handleUpdate(e.id)}
                        className="px-3 py-1.5 bg-[#5fb3b0] text-white rounded text-sm font-medium"
                      >
                        Guardar
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing(null)}
                        className="px-3 py-1.5 bg-slate-100 rounded text-sm text-slate-600 hover:bg-slate-200"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <SimboloPreview simbolo={e.simbolo || 'NINGUNO'} color={e.color} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 text-sm">{e.nombre}</p>
                    <p className="text-xs text-slate-400">
                      {e.clave}
                      {e.simbolo && e.simbolo !== 'NINGUNO' && (
                        <span className="ml-2 text-slate-500">
                          · {SIMBOLOS_DISPONIBLES.find((s) => s.id === e.simbolo)?.label}
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => iniciarEdicion(e)}
                    className="text-[#5fb3b0] hover:underline text-sm shrink-0"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(e.id)}
                    className="text-red-500 hover:underline text-sm shrink-0"
                  >
                    Eliminar
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
