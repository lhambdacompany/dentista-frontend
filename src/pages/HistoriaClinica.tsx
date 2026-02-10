import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { formatearFecha } from '../lib/formatDate';

const ESTRUCTURA_DEFAULT: Record<string, unknown> = {
  motivoConsulta: '',
  antecedentesQuirurgicos: {
    cirugiaHospitalizacion: false,
    accidentesTrauma: false,
    hemorragias: false,
    transfusiones: false,
    embarazo: false,
    detalles: '',
  },
  problemasMedicos: {
    cardiovascular: { si: false, detalle: '' },
    hipertension: { si: false, detalle: '' },
    hipotension: { si: false, detalle: '' },
    respiratorio: { si: false, detalle: '' },
    digestivo: { si: false, detalle: '' },
    nefrologico: { si: false, detalle: '' },
    hematologico: { si: false, detalle: '' },
    neurologico: { si: false, detalle: '' },
    epilepsia: { si: false, detalle: '' },
    osteoarticular: { si: false, detalle: '' },
    ginecologico: { si: false, detalle: '' },
    endocrinologico: { si: false, detalle: '' },
    diabetes: { si: false, detalle: '' },
    infecciones: { si: false, detalle: '' },
    fiebreReumatica: { si: false, detalle: '' },
    nutricionales: { si: false, detalle: '' },
    protesis: { si: false, detalle: '' },
    discapacidad: { si: false, detalle: '' },
    hiv: { si: false, detalle: '' },
    otro: { si: false, detalle: '' },
  },
  antecedentesFamiliares: {
    padreVive: true,
    padreCausaFallecimiento: '',
    madreVive: true,
    madreCausaFallecimiento: '',
    hemofilia: false,
    diabetes: false,
    cardiacas: false,
    discraciaSanguinea: false,
    tiroides: false,
    colesterol: false,
    cancer: false,
  },
  consentimiento: { firmado: false, fecha: '' },
  examenEstomatologico: {
    labiosSuperior: '',
    labiosInferior: '',
    mucosaLabialSuperior: '',
    mucosaLabialInferior: '',
  },
  examenCavidadBucal: {
    mucosaYugal: '',
    paladarDuro: '',
    paladarBlando: '',
    dorsoLengua: '',
    bordesLengua: '',
    ventralLengua: '',
    pisoBoca: '',
    encias: '',
  },
  adenopatias: '',
  derivacion: false,
  radiografias: {
    panoramic: false,
    panoramicFecha: '',
    bitewing: false,
    bitewingFecha: '',
    seriada: false,
    seriadaFecha: '',
    tomografias: false,
    tomografiasFecha: '',
    otros: false,
    otrosFecha: '',
  },
  factoresEtiologicos: {
    temorOdontologico: false,
    factoresEconomicos: false,
    faltaControlPlaca: false,
    desarmoniasOclusales: false,
    faltaEducacionSalud: false,
    dietaOdontopatica: false,
    iatrogenia: false,
    bruxismo: false,
    empujeLingual: false,
    otro: '',
  },
  estadoPeriodontal: '',
  antecedentesOdontologicos: {
    expectativas: '',
    ultimaConsulta: '',
    terminoTratamiento: null as boolean | null,
    porQue: '',
    cepilladoDesayuno: '',
    cepilladoAlmuerzo: '',
    cepilladoMerienda: '',
    cepilladoCena: '',
    vecesPorDia: '',
    momentosAzucarPorDia: '',
    insatisfechoApariencia: false,
    porQueApariencia: '',
    tratamientoOrtodontico: false,
    respiradorBucal: false,
    bruxismo: false,
  },
  formularioPreclinico: {
    medicoCabecera: '',
    urgenciaParentesco: '',
    urgenciaTelefono: '',
    alergias: '',
    fuma: null as boolean | null,
    cigarrillosPorDia: '',
    tiempoFumando: '',
    alcohol: null as boolean | null,
    vasosPorDia: '',
    tratamientoMedico: false,
    tratamientoMotivo: '',
    medicamentos: '',
  },
  observaciones: '',
};

function SiNo({ value, onChange }: { value: boolean | null | undefined; onChange: (v: boolean | null) => void }) {
  const v = value === true ? true : value === false ? false : null;
  return (
    <span className="flex gap-2">
      <label className="flex items-center gap-1">
        <input type="radio" checked={v === true} onChange={() => onChange(true)} />
        <span>SI</span>
      </label>
      <label className="flex items-center gap-1">
        <input type="radio" checked={v === false} onChange={() => onChange(false)} />
        <span>NO</span>
      </label>
    </span>
  );
}

function mergeDeep(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const out = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      (out as Record<string, unknown>)[key] = mergeDeep(
        (target[key] || {}) as Record<string, unknown>,
        source[key] as Record<string, unknown>,
      );
    } else {
      (out as Record<string, unknown>)[key] = source[key];
    }
  }
  return out;
}

interface Paciente {
  id: string;
  nombre: string;
  apellido: string;
  dni?: string;
  fechaNacimiento?: string;
  telefono?: string;
  direccion?: string;
}

interface Cita {
  id: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  motivo?: string;
  paciente: Paciente;
}

interface HistoriaClinicaItem {
  id: string;
  citaId: string;
  datos: Record<string, unknown>;
  cita?: { id: string; fecha: string; horaInicio: string; horaFin: string };
}

export function HistoriaClinica() {
  const { citaId, id: pacienteIdParam } = useParams<{ citaId?: string; id?: string }>();
  const [cita, setCita] = useState<Cita | null>(null);
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [listadoHistoria, setListadoHistoria] = useState<HistoriaClinicaItem[]>([]);
  const [datos, setDatos] = useState<Record<string, unknown>>(ESTRUCTURA_DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [section, setSection] = useState(1);

  useEffect(() => {
    if (citaId) {
      api.citas.get(citaId).then((d) => {
        const c = d as Cita;
        setCita(c);
        setPaciente(c.paciente);
      }).catch(() => setLoading(false));
    } else if (pacienteIdParam) {
      api.pacientes.get(pacienteIdParam).then((d) => {
        const p = d as Paciente;
        setPaciente(p);
        setCita(null);
      }).catch(() => setLoading(false));
    }
  }, [citaId, pacienteIdParam]);

  useEffect(() => {
    if (citaId) {
      api.historiaClinica.getByCita(citaId).then((res) => {
        const hc = res.historiaClinica as { id: string; datos: Record<string, unknown> } | null;
        if (hc?.datos) {
          setDatos(mergeDeep(ESTRUCTURA_DEFAULT as Record<string, unknown>, (hc.datos || {}) as Record<string, unknown>));
        } else {
          setDatos(ESTRUCTURA_DEFAULT);
        }
      }).catch(() => setDatos(ESTRUCTURA_DEFAULT as Record<string, unknown>)).finally(() => setLoading(false));
    } else if (pacienteIdParam) {
      api.historiaClinica.getByPaciente(pacienteIdParam).then((list) => {
        const arr = Array.isArray(list) ? list : [];
        setListadoHistoria(arr as HistoriaClinicaItem[]);
      }).catch(() => setListadoHistoria([])).finally(() => setLoading(false));
    }
  }, [citaId, pacienteIdParam]);

  const updateDatos = (path: string, value: unknown) => {
    const parts = path.split('.');
    setDatos((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      let cur: Record<string, unknown> = next;
      for (let i = 0; i < parts.length - 1; i++) {
        const p = parts[i];
        if (!(p in cur) || typeof cur[p] !== 'object') cur[p] = {};
        cur = cur[p] as Record<string, unknown>;
      }
      cur[parts[parts.length - 1]] = value;
      return next;
    });
  };

  const getDatos = (path: string): unknown => {
    const parts = path.split('.');
    let cur: unknown = datos;
    for (const p of parts) {
      cur = (cur as Record<string, unknown>)?.[p];
    }
    return cur;
  };

  const handleGuardar = async () => {
    if (!citaId) return;
    setSaving(true);
    try {
      await api.historiaClinica.upsertByCita(citaId, datos);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const p = (path: string) => getDatos(path) as string | boolean | null | undefined;
  const pm = (path: string) => getDatos(path) as Record<string, unknown> | undefined;

  if (loading && !paciente) return <div className="text-center py-12">Cargando...</div>;
  if (!paciente && !citaId && !pacienteIdParam) return <div className="text-center py-12">Paciente no encontrado</div>;
  if (citaId && !cita && !paciente) return <div className="text-center py-12">Cargando...</div>;

  const backLink = citaId ? `/citas/${citaId}` : `/pacientes/${paciente?.id}`;

  // Vista desde paciente: listado de historias (una por sesión)
  if (pacienteIdParam && !citaId) {
    return (
      <div className="space-y-6">
        <Link to={backLink} className="text-[#5fb3b0] hover:underline">
          ← Volver
        </Link>
        <div className="bg-white rounded-xl shadow p-6">
          <h1 className="text-2xl font-bold text-slate-800">Historia Clínica</h1>
          <p className="text-slate-600 mt-1">
            {paciente?.nombre} {paciente?.apellido}
          </p>
          <p className="text-sm text-slate-500 mt-2">
            Una historia clínica por sesión. Para crear o editar, entra desde una cita.
          </p>
          {loading ? (
            <p className="mt-6 text-slate-500">Cargando...</p>
          ) : !Array.isArray(listadoHistoria) || listadoHistoria.length === 0 ? (
            <p className="mt-6 text-slate-500">No hay historias clínicas registradas.</p>
          ) : (
            <div className="mt-6 space-y-2">
              {(listadoHistoria as HistoriaClinicaItem[]).map((h) => (
                <Link
                  key={h.id}
                  to={`/citas/${h.citaId}/historia-clinica`}
                  className="flex justify-between items-center p-3 bg-slate-50 rounded-lg hover:bg-slate-100"
                >
                  <span>
                    {h.cita?.fecha ? formatearFecha(h.cita.fecha) : 'Sesión'} · {h.cita?.horaInicio || ''} - {h.cita?.horaFin || ''}
                  </span>
                  <span className="text-[#5fb3b0] text-sm">Ver / Editar</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link to={backLink} className="text-[#5fb3b0] hover:underline">
          ← Volver
        </Link>
        <button
          type="button"
          onClick={handleGuardar}
          disabled={saving}
          className="px-4 py-2 bg-[#5fb3b0] text-white rounded-lg hover:bg-[#4a9a97] disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        <h1 className="text-2xl font-bold text-slate-800">Historia Clínica</h1>
        <p className="text-slate-600 mt-1">
          {paciente?.nombre} {paciente?.apellido}
          {cita && (
            <> · {formatearFecha(cita.fecha)} {cita.horaInicio} - {cita.horaFin}</>
          )}
        </p>

        {/* Tabs */}
        <div className="flex gap-2 mt-6 border-b border-slate-200">
          {[1, 2, 3].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSection(s)}
              className={`px-4 py-2 text-sm font-medium ${section === s ? 'border-b-2 border-[#5fb3b0] text-[#5fb3b0]' : 'text-slate-600 hover:text-slate-800'}`}
            >
              {s === 1 ? 'Identificación y antecedentes' : s === 2 ? 'Antecedentes médicos' : 'Examen clínico'}
            </button>
          ))}
        </div>

        {/* Sección 1: Imagen 3 */}
        {section === 1 && (
          <div className="space-y-6 mt-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-800 mb-3">Motivo de la consulta</h2>
              <input
                type="text"
                value={(p('motivoConsulta') as string) || ''}
                onChange={(e) => updateDatos('motivoConsulta', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                placeholder="Motivo de la consulta..."
              />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-800 mb-3">Antecedentes odontológicos</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Expectativas del paciente</label>
                  <input
                    type="text"
                    value={(pm('antecedentesOdontologicos')?.expectativas as string) || ''}
                    onChange={(e) => updateDatos('antecedentesOdontologicos.expectativas', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Fecha última consulta odontológica</label>
                  <input
                    type="text"
                    value={(pm('antecedentesOdontologicos')?.ultimaConsulta as string) || ''}
                    onChange={(e) => updateDatos('antecedentesOdontologicos.ultimaConsulta', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    placeholder="Ej: 2023"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm">¿Terminó el tratamiento?</span>
                  <SiNo
                    value={pm('antecedentesOdontologicos')?.terminoTratamiento as boolean | null}
                    onChange={(v) => updateDatos('antecedentesOdontologicos.terminoTratamiento', v)}
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">¿Por qué?</label>
                  <input
                    type="text"
                    value={(pm('antecedentesOdontologicos')?.porQue as string) || ''}
                    onChange={(e) => updateDatos('antecedentesOdontologicos.porQue', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div className="flex gap-4 flex-wrap">
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">¿Cuándo se cepilla? (veces/día)</label>
                    <input
                      type="text"
                      value={(pm('antecedentesOdontologicos')?.vecesPorDia as string) || ''}
                      onChange={(e) => updateDatos('antecedentesOdontologicos.vecesPorDia', e.target.value)}
                      className="w-24 px-2 py-1 border border-slate-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">Momentos de azúcar por día</label>
                    <input
                      type="text"
                      value={(pm('antecedentesOdontologicos')?.momentosAzucarPorDia as string) || ''}
                      onChange={(e) => updateDatos('antecedentesOdontologicos.momentosAzucarPorDia', e.target.value)}
                      className="w-24 px-2 py-1 border border-slate-300 rounded"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!pm('antecedentesOdontologicos')?.insatisfechoApariencia}
                      onChange={(e) => updateDatos('antecedentesOdontologicos.insatisfechoApariencia', e.target.checked)}
                    />
                    <span>¿Insatisfecho con apariencia de dientes?</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!pm('antecedentesOdontologicos')?.tratamientoOrtodontico}
                      onChange={(e) => updateDatos('antecedentesOdontologicos.tratamientoOrtodontico', e.target.checked)}
                    />
                    <span>¿Tratamiento ortodóntico?</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!pm('antecedentesOdontologicos')?.respiradorBucal}
                      onChange={(e) => updateDatos('antecedentesOdontologicos.respiradorBucal', e.target.checked)}
                    />
                    <span>Respirador bucal</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!pm('antecedentesOdontologicos')?.bruxismo}
                      onChange={(e) => updateDatos('antecedentesOdontologicos.bruxismo', e.target.checked)}
                    />
                    <span>Bruxismo</span>
                  </label>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-800 mb-3">Formulario preclínico</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Médico de cabecera</label>
                  <input
                    type="text"
                    value={(pm('formularioPreclinico')?.medicoCabecera as string) || ''}
                    onChange={(e) => updateDatos('formularioPreclinico.medicoCabecera', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    placeholder="Dr. / Dra."
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Urgencia: parentesco y nombre</label>
                  <input
                    type="text"
                    value={(pm('formularioPreclinico')?.urgenciaParentesco as string) || ''}
                    onChange={(e) => updateDatos('formularioPreclinico.urgenciaParentesco', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Tel. urgencia</label>
                  <input
                    type="text"
                    value={(pm('formularioPreclinico')?.urgenciaTelefono as string) || ''}
                    onChange={(e) => updateDatos('formularioPreclinico.urgenciaTelefono', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Hipersensibilidad / alergias a drogas (aspirinas, penicilina, yodo, sulfamidas, otros)</label>
                  <input
                    type="text"
                    value={(pm('formularioPreclinico')?.alergias as string) || ''}
                    onChange={(e) => updateDatos('formularioPreclinico.alergias', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <span>¿Fuma?</span>
                  <SiNo
                    value={pm('formularioPreclinico')?.fuma as boolean | null}
                    onChange={(v) => updateDatos('formularioPreclinico.fuma', v)}
                  />
                  <input
                    type="text"
                    placeholder="Cigarrillos/día"
                    value={(pm('formularioPreclinico')?.cigarrillosPorDia as string) || ''}
                    onChange={(e) => updateDatos('formularioPreclinico.cigarrillosPorDia', e.target.value)}
                    className="w-28 px-2 py-1 border border-slate-300 rounded"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <span>¿Toma alcohol?</span>
                  <SiNo
                    value={pm('formularioPreclinico')?.alcohol as boolean | null}
                    onChange={(v) => updateDatos('formularioPreclinico.alcohol', v)}
                  />
                  <input
                    type="text"
                    placeholder="Vasos/día"
                    value={(pm('formularioPreclinico')?.vasosPorDia as string) || ''}
                    onChange={(e) => updateDatos('formularioPreclinico.vasosPorDia', e.target.value)}
                    className="w-28 px-2 py-1 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">¿Tratamiento médico actual o pasado? ¿Por qué?</label>
                  <input
                    type="text"
                    value={(pm('formularioPreclinico')?.tratamientoMotivo as string) || ''}
                    onChange={(e) => updateDatos('formularioPreclinico.tratamientoMotivo', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">¿Toma medicamentos? (anticoagulantes, antidepresivos, aspirinas, anticonceptivos)</label>
                  <input
                    type="text"
                    value={(pm('formularioPreclinico')?.medicamentos as string) || ''}
                    onChange={(e) => updateDatos('formularioPreclinico.medicamentos', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sección 2: Imagen 1 */}
        {section === 2 && (
          <div className="space-y-6 mt-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-800 mb-3">Antecedentes quirúrgicos / internación</h2>
              <div className="space-y-2">
                {['cirugiaHospitalizacion', 'accidentesTrauma', 'hemorragias', 'transfusiones', 'embarazo'].map((k) => (
                  <label key={k} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!(pm('antecedentesQuirurgicos') as Record<string, unknown>)?.[k]}
                      onChange={(e) => updateDatos(`antecedentesQuirurgicos.${k}`, e.target.checked)}
                    />
                    <span>{k === 'cirugiaHospitalizacion' ? 'Cirugía / hospitalización' : k === 'accidentesTrauma' ? 'Accidentes con trauma' : k === 'hemorragias' ? 'Hemorragias' : k === 'transfusiones' ? 'Transfusiones / inyecciones prolongadas' : 'Embarazo'}</span>
                  </label>
                ))}
                <textarea
                  placeholder="Detalles..."
                  value={(pm('antecedentesQuirurgicos')?.detalles as string) || ''}
                  onChange={(e) => updateDatos('antecedentesQuirurgicos.detalles', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg mt-2"
                  rows={2}
                />
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-800 mb-3">Problemas médicos actuales o pasados</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  ['cardiovascular', 'Cardiovascular'],
                  ['hipertension', 'Hipertensión'],
                  ['hipotension', 'Hipotensión'],
                  ['respiratorio', 'Respiratorio'],
                  ['digestivo', 'Digestivo'],
                  ['nefrologico', 'Nefrológico/diálisis'],
                  ['hematologico', 'Hematológico'],
                  ['neurologico', 'Neurológico'],
                  ['epilepsia', 'Epilepsia, convulsiones'],
                  ['osteoarticular', 'Osteoarticular'],
                  ['ginecologico', 'Ginecológico'],
                  ['endocrinologico', 'Endocrinológico'],
                  ['diabetes', 'Diabetes'],
                  ['infecciones', 'Infecciones'],
                  ['fiebreReumatica', 'Fiebre reumática'],
                  ['nutricionales', 'Nutricionales'],
                  ['protesis', 'Prótesis'],
                  ['discapacidad', 'Discapacidad'],
                  ['hiv', 'HIV'],
                  ['otro', 'Otro'],
                ].map(([key, label]) => (
                  <div key={key} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!(pm('problemasMedicos') as Record<string, { si?: boolean; detalle?: string }>)?.[key]?.si}
                      onChange={(e) =>
                        updateDatos(`problemasMedicos.${key}`, {
                          ...((pm('problemasMedicos') as Record<string, Record<string, unknown>>)?.[key] as object || { si: false, detalle: '' }),
                          si: e.target.checked,
                        })
                      }
                    />
                    <span className="text-sm">{label}</span>
                    <input
                      type="text"
                      placeholder="Detalle"
                      value={(((pm('problemasMedicos') as Record<string, Record<string, unknown>>)?.[key])?.detalle as string) || ''}
                      onChange={(e) =>
                        updateDatos(`problemasMedicos.${key}`, {
                          ...((pm('problemasMedicos') as Record<string, Record<string, unknown>>)?.[key] as object || { si: false, detalle: '' }),
                          detalle: e.target.value,
                        })
                      }
                      className="flex-1 px-2 py-1 border border-slate-300 rounded text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-800 mb-3">Antecedentes familiares</h2>
              <div className="space-y-2">
                <div className="flex items-center gap-4">
                  <span>¿Vive su padre?</span>
                  <SiNo
                    value={pm('antecedentesFamiliares')?.padreVive as boolean | null}
                    onChange={(v) => updateDatos('antecedentesFamiliares.padreVive', v)}
                  />
                  <input
                    type="text"
                    placeholder="Causa fallecimiento"
                    value={(pm('antecedentesFamiliares')?.padreCausaFallecimiento as string) || ''}
                    onChange={(e) => updateDatos('antecedentesFamiliares.padreCausaFallecimiento', e.target.value)}
                    className="flex-1 px-2 py-1 border border-slate-300 rounded"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <span>¿Vive su madre?</span>
                  <SiNo
                    value={pm('antecedentesFamiliares')?.madreVive as boolean | null}
                    onChange={(v) => updateDatos('antecedentesFamiliares.madreVive', v)}
                  />
                  <input
                    type="text"
                    placeholder="Causa fallecimiento"
                    value={(pm('antecedentesFamiliares')?.madreCausaFallecimiento as string) || ''}
                    onChange={(e) => updateDatos('antecedentesFamiliares.madreCausaFallecimiento', e.target.value)}
                    className="flex-1 px-2 py-1 border border-slate-300 rounded"
                  />
                </div>
                <div className="flex flex-wrap gap-4 mt-3">
                  {[
                    ['hemofilia', 'Hemofilia'],
                    ['diabetes', 'Diabetes'],
                    ['cardiacas', 'Cardíacas'],
                    ['discraciaSanguinea', 'Discrasia sanguínea'],
                    ['tiroides', 'Tiroides'],
                    ['colesterol', 'Colesterol'],
                    ['cancer', 'Cáncer'],
                  ].map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!!(pm('antecedentesFamiliares') as Record<string, unknown>)?.[key]}
                        onChange={(e) => updateDatos(`antecedentesFamiliares.${key}`, e.target.checked)}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-800 mb-3">Consentimiento informado</h2>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!pm('consentimiento')?.firmado}
                  onChange={(e) => updateDatos('consentimiento.firmado', e.target.checked)}
                />
                <span>Firmado</span>
              </label>
              <input
                type="date"
                value={(pm('consentimiento')?.fecha as string) || ''}
                onChange={(e) => updateDatos('consentimiento.fecha', e.target.value)}
                className="ml-4 px-2 py-1 border border-slate-300 rounded"
              />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-800 mb-3">Examen estomatológico</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  ['labiosSuperior', 'Labios superior'],
                  ['labiosInferior', 'Labios inferior'],
                  ['mucosaLabialSuperior', 'Mucosa labial superior'],
                  ['mucosaLabialInferior', 'Mucosa labial inferior'],
                ].map(([key, label]) => (
                  <div key={key}>
                    <label className="block text-sm text-slate-600 mb-1">{label}</label>
                    <input
                      type="text"
                      value={(pm('examenEstomatologico') as Record<string, string>)?.[key] || ''}
                      onChange={(e) => updateDatos(`examenEstomatologico.${key}`, e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      placeholder="Descripción lesión..."
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Sección 3: Imagen 2 */}
        {section === 3 && (
          <div className="space-y-6 mt-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-800 mb-3">Examen de cavidad bucal</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  ['mucosaYugal', 'Mucosa yugal'],
                  ['paladarDuro', 'Paladar duro'],
                  ['paladarBlando', 'Paladar blando'],
                  ['dorsoLengua', 'Dorso de lengua'],
                  ['bordesLengua', 'Bordes de lengua'],
                  ['ventralLengua', 'Cara ventral lengua'],
                  ['pisoBoca', 'Piso de boca'],
                  ['encias', 'Encías'],
                ].map(([key, label]) => (
                  <div key={key}>
                    <label className="block text-sm text-slate-600 mb-1">{label}</label>
                    <input
                      type="text"
                      value={(pm('examenCavidadBucal') as Record<string, string>)?.[key] || ''}
                      onChange={(e) => updateDatos(`examenCavidadBucal.${key}`, e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Adenopatías</label>
              <input
                type="text"
                value={(p('adenopatias') as string) || ''}
                onChange={(e) => updateDatos('adenopatias', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div className="flex items-center gap-4">
              <span>¿Derivación?</span>
              <SiNo
                value={p('derivacion') === true ? true : p('derivacion') === false ? false : null}
                onChange={(v) => updateDatos('derivacion', v)}
              />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-800 mb-3">Radiografías</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  ['panoramic', 'panoramicFecha', 'Panorámica'],
                  ['bitewing', 'bitewingFecha', 'Bite-wing'],
                  ['seriada', 'seriadaFecha', 'Seriada'],
                  ['tomografias', 'tomografiasFecha', 'Tomografías'],
                  ['otros', 'otrosFecha', 'Otros estudios'],
                ].map(([chk, fecha, label]) => (
                  <div key={chk} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!(pm('radiografias') as Record<string, unknown>)?.[chk]}
                      onChange={(e) => updateDatos(`radiografias.${chk}`, e.target.checked)}
                    />
                    <span>{label}</span>
                    <input
                      type="date"
                      value={(pm('radiografias') as Record<string, string>)?.[fecha] || ''}
                      onChange={(e) => updateDatos(`radiografias.${fecha}`, e.target.value)}
                      className="px-2 py-1 border border-slate-300 rounded text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-800 mb-3">Factores etiológicos y coadyuvantes</h2>
              <div className="flex flex-wrap gap-4">
                {[
                  ['temorOdontologico', 'Temor situación odontológica'],
                  ['factoresEconomicos', 'Factores económicos'],
                  ['faltaControlPlaca', 'Falta control de placa'],
                  ['desarmoniasOclusales', 'Desarmonías oclusales'],
                  ['faltaEducacionSalud', 'Falta educación para la salud'],
                  ['dietaOdontopatica', 'Dieta odontopática'],
                  ['iatrogenia', 'Iatrogenia odontológica'],
                  ['bruxismo', 'Bruxismo'],
                  ['empujeLingual', 'Empuje lingual'],
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!(pm('factoresEtiologicos') as Record<string, unknown>)?.[key]}
                      onChange={(e) => updateDatos(`factoresEtiologicos.${key}`, e.target.checked)}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
              <input
                type="text"
                placeholder="Otro..."
                value={(pm('factoresEtiologicos')?.otro as string) || ''}
                onChange={(e) => updateDatos('factoresEtiologicos.otro', e.target.value)}
                className="w-full mt-2 px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">7. Estado gingivo-periodontal</label>
              <textarea
                value={(p('estadoPeriodontal') as string) || ''}
                onChange={(e) => updateDatos('estadoPeriodontal', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                rows={3}
                placeholder="Diagrama del margen gingival, observaciones..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Observaciones</label>
              <textarea
                value={(p('observaciones') as string) || ''}
                onChange={(e) => updateDatos('observaciones', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                rows={3}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
