const API_BASE = '/api';

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text.trim()) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Respuesta inválida del servidor. ¿Está el backend corriendo en http://localhost:3001?`);
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  } catch (err) {
    throw new Error('No se pudo conectar al servidor. Verifica que el backend esté corriendo en http://localhost:3001');
  }
  if (res.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login';
    throw new Error('No autorizado');
  }
  if (!res.ok) {
    const text = await res.text();
    try {
      const err = JSON.parse(text) as { message?: string | string[] };
      const msg = Array.isArray(err?.message) ? err.message[0] : err?.message;
      throw new Error(msg || `Error ${res.status}`);
    } catch (e) {
      throw new Error(e instanceof Error && !(e instanceof SyntaxError) ? e.message : text || `Error ${res.status}`);
    }
  }
  if (res.status === 204) return {} as T;
  return parseJson<T>(res);
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ access_token: string; admin: { nombre: string; email: string } }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    me: () => request<{ id: string; email: string; nombre: string }>('/auth/me', { method: 'POST' }),
  },
  dashboard: () => request<{ citasDelDia: unknown[]; pacientesRecientes: unknown[]; alertas: unknown[] }>('/dashboard'),
  pacientes: {
    list: (search?: string) =>
      request<unknown[]>(`/pacientes${search ? `?search=${encodeURIComponent(search)}` : ''}`),
    get: (id: string) => request<unknown>(`/pacientes/${id}`),
    create: (data: unknown) =>
      request<unknown>('/pacientes', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: unknown) =>
      request<unknown>(`/pacientes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<unknown>(`/pacientes/${id}`, { method: 'DELETE' }),
  },
  citas: {
    list: (start?: string, end?: string, pacienteId?: string) => {
      const params = new URLSearchParams();
      if (start) params.set('start', start);
      if (end) params.set('end', end);
      if (pacienteId) params.set('pacienteId', pacienteId);
      return request<unknown[]>(`/citas${params.toString() ? `?${params}` : ''}`);
    },
    get: (id: string) => request<unknown>(`/citas/${id}`),
    enviarRecordatorio: (id: string, mensaje?: string) =>
      request<{ enviado: boolean; mensaje: string }>(`/citas/${id}/enviar-recordatorio`, {
        method: 'POST',
        body: JSON.stringify({ mensaje: mensaje || undefined }),
      }),
    create: (data: unknown) =>
      request<unknown>('/citas', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: unknown) =>
      request<unknown>(`/citas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<unknown>(`/citas/${id}`, { method: 'DELETE' }),
  },
  obrasSociales: {
    list: () => request<unknown[]>('/obras-sociales'),
    get: (id: string) => request<unknown>(`/obras-sociales/${id}`),
    create: (data: unknown) =>
      request<unknown>('/obras-sociales', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: unknown) =>
      request<unknown>(`/obras-sociales/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<unknown>(`/obras-sociales/${id}`, { method: 'DELETE' }),
  },
  odontograma: {
    list: (pacienteId: string) =>
      request<unknown[]>(`/odontograma/paciente/${pacienteId}`),
    create: (pacienteId: string, titulo?: string, citaId?: string, numerosDientes?: number[]) =>
      request<unknown>(`/odontograma/paciente/${pacienteId}`, {
        method: 'POST',
        body: JSON.stringify({ titulo, citaId, numerosDientes }),
      }),
    get: (id: string) => request<unknown>(`/odontograma/${id}`),
    update: (id: string, data: { titulo?: string; observaciones?: string; numerosDientes?: number[] }) =>
      request<unknown>(`/odontograma/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    getDientes: (id: string) => request<unknown[]>(`/odontograma/${id}/dientes`),
    initDientes: (id: string) =>
      request<unknown[]>(`/odontograma/${id}/init`, { method: 'POST' }),
    createDiente: (data: { odontogramaId: string; numeroDiente: number; estado?: string }) =>
      request<unknown>('/odontograma/diente', { method: 'POST', body: JSON.stringify(data) }),
    updateDiente: (id: string, data: unknown) =>
      request<unknown>(`/odontograma/diente/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<unknown>(`/odontograma/${id}`, { method: 'DELETE' }),
  },
  notas: {
    list: (pacienteId: string) =>
      request<unknown[]>(`/notas/paciente/${pacienteId}`),
    create: (data: unknown) =>
      request<unknown>('/notas', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: unknown) =>
      request<unknown>(`/notas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<unknown>(`/notas/${id}`, { method: 'DELETE' }),
  },
  imagenes: {
    list: (pacienteId: string) =>
      request<unknown[]>(`/imagenes/paciente/${pacienteId}`),
    upload: (pacienteId: string, file: File, descripcion?: string, tipo?: string, citaId?: string) => {
      const form = new FormData();
      form.append('file', file);
      form.append('pacienteId', pacienteId);
      if (descripcion) form.append('descripcion', descripcion);
      form.append('tipo', tipo || 'FOTO_CLINICA');
      if (citaId) form.append('citaId', citaId);
      const token = localStorage.getItem('token');
      return fetch(`${API_BASE}/imagenes/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      }).then((r) => {
        if (!r.ok) return r.text().then((t) => {
          try {
            const e = JSON.parse(t);
            throw new Error(e?.message || 'Error subiendo imagen');
          } catch {
            throw new Error(t || 'Error subiendo imagen');
          }
        });
        return r.json();
      });
    },
    delete: (id: string) =>
      request<unknown>(`/imagenes/${id}`, { method: 'DELETE' }),
  },
  historial: (pacienteId: string) =>
    request<{ paciente: unknown; timeline: unknown[] }>(`/historial/paciente/${pacienteId}`),
  prestaciones: {
    getByCita: (citaId: string) =>
      request<{ cita: unknown; registro: unknown }>(`/prestaciones/cita/${citaId}`),
    create: (citaId: string) =>
      request<unknown>(`/prestaciones/cita/${citaId}`, { method: 'POST' }),
    updateRegistro: (id: string, data: unknown) =>
      request<unknown>(`/prestaciones/registro/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    addItem: (registroId: string, data: unknown) =>
      request<unknown>(`/prestaciones/registro/${registroId}/items`, { method: 'POST', body: JSON.stringify(data) }),
    updateItem: (id: string, data: unknown) =>
      request<unknown>(`/prestaciones/items/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    removeItem: (id: string) =>
      request<unknown>(`/prestaciones/items/${id}`, { method: 'DELETE' }),
    removeRegistro: (id: string) =>
      request<unknown>(`/prestaciones/registro/${id}`, { method: 'DELETE' }),
  },
  historiaClinica: {
    getByPaciente: (pacienteId: string) =>
      request<unknown[]>(`/historia-clinica/paciente/${pacienteId}`),
    getByCita: (citaId: string) =>
      request<{ cita: unknown; historiaClinica: unknown }>(`/historia-clinica/cita/${citaId}`),
    upsertByCita: (citaId: string, datos: Record<string, unknown>) =>
      request<unknown>(`/historia-clinica/cita/${citaId}`, {
        method: 'PUT',
        body: JSON.stringify({ datos }),
      }),
    update: (id: string, data: { datos?: Record<string, unknown> }) =>
      request<unknown>(`/historia-clinica/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },
  estadosDiente: {
    list: () => request<{ id: string; clave: string; nombre: string; color: string; orden: number }[]>('/estados-diente'),
    create: (data: { clave: string; nombre: string; color?: string; orden?: number }) =>
      request<unknown>('/estados-diente', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: { clave?: string; nombre?: string; color?: string; orden?: number }) =>
      request<unknown>(`/estados-diente/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<unknown>(`/estados-diente/${id}`, { method: 'DELETE' }),
  },
};
