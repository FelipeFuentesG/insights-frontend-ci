import { useState, useEffect, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  apiFetch,
  fetchMetricasInteraccion,
  fetchMetricasInteraccionSerie,
  fetchTendenciaInteracciones,
  MetricasInteraccion,
  MetricasInteraccionPeriodo,
  TendenciaInteracciones,
} from "../lib/api";

// ─── Types ───────────────────────────────────────────────────────────────────

type Rol = "admin_marca" | "admin_retailer" | "admin_global_andesml";

interface StoredUser {
  idUsuario: number;
  idRetailer: number | null;
  idMarca: number | null;
  nombre: string;
  email: string;
  rol: Rol;
  marcaNombre?: string;
  retailerNombre?: string;
}

interface RetailerResumen { idRetailer: number; nombre: string; }
interface MarcaResumen    { idMarca: number;   nombre: string; idRetailer: number; }

type AgruparPor = "dia" | "semana" | "mes" | "año";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getIsoToday() { return new Date().toISOString().slice(0, 10); }
function getSixMonthsAgo() {
  const d = new Date(); d.setMonth(d.getMonth() - 6); return d.toISOString().slice(0, 10);
}
function formatNum(v: number) {
  return new Intl.NumberFormat("es-CL").format(v);
}
function formatTiempo(segundos: number): string {
  if (segundos <= 0) return "N/A";
  const m = Math.floor(segundos / 60);
  const s = Math.round(segundos % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}
// ─── Sub-componentes ─────────────────────────────────────────────────────────

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="ind-kpi-card">
      <p className="ind-kpi-label">{label}</p>
      <p className="ind-kpi-value">{value}</p>
    </div>
  );
}

function Select({ label, value, onChange, children }: {
  label: string; value: string; onChange: (v: string) => void; children: React.ReactNode;
}) {
  return (
    <div className="ind-filter-group">
      <label className="ind-filter-label">{label}</label>
      <select className="ind-filter-input" value={value} onChange={e => onChange(e.target.value)}>
        {children}
      </select>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function InteraccionesTab({ user }: { user: StoredUser | null }) {
  const [retailers, setRetailers]               = useState<RetailerResumen[]>([]);
  const [marcas, setMarcas]                     = useState<MarcaResumen[]>([]);
  const [selectedRetailer, setSelectedRetailer] = useState<string>("");
  const [selectedMarca, setSelectedMarca]       = useState<string>("");

  const [desde, setDesde]       = useState(getSixMonthsAgo());
  const [hasta, setHasta]       = useState(getIsoToday());
  const [agruparPor, setAgruparPor] = useState<AgruparPor>("mes");

  const [datos, setDatos]   = useState<MetricasInteraccion | null>(null);
  const [serie, setSerie]   = useState<MetricasInteraccionPeriodo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const [tendencia, setTendencia]             = useState<TendenciaInteracciones | null>(null);
  const [loadingTendencia, setLoadingTendencia] = useState(false);

  const rol = user?.rol;

  // ── Carga inicial de retailers (solo admin_global) ─────────────────────────
  useEffect(() => {
    if (rol !== "admin_global_andesml") return;
    apiFetch("/db/retailers")
      .then(r => r.json())
      .then((data: RetailerResumen[]) => {
        setRetailers(data);
        if (data.length > 0) setSelectedRetailer(String(data[0].idRetailer));
      })
      .catch(() => {});
  }, [rol]);

  // ── Carga de marcas cuando cambia el retailer seleccionado ────────────────
  useEffect(() => {
    const idR =
      rol === "admin_global_andesml" ? selectedRetailer :
      rol === "admin_retailer"       ? String(user?.idRetailer ?? "") :
      null;

    if (!idR) { setMarcas([]); return; }

    apiFetch(`/db/retailers/${idR}/marcas`)
      .then(r => r.json())
      .then((data: MarcaResumen[]) => {
        setMarcas(data);
        setSelectedMarca("");
      })
      .catch(() => setMarcas([]));
  }, [rol, selectedRetailer, user?.idRetailer]);

  // ── Derivar IDs efectivos para los queries ────────────────────────────────
  const effectiveIdRetailer: string | null =
    rol === "admin_global_andesml" ? (selectedRetailer || null) :
    rol === "admin_retailer"       ? String(user?.idRetailer ?? "") :
    null;

  const effectiveIdMarca: string | null =
    rol === "admin_marca" ? String(user?.idMarca ?? "") :
    selectedMarca         ? selectedMarca :
    null;

  // ── Fetch de métricas + serie en paralelo ─────────────────────────────────
  const fetchDatos = useCallback(async () => {
    if (!effectiveIdRetailer && !effectiveIdMarca) return;
    setLoading(true);
    setError(null);

    const tipo: "marca" | "retailer" = effectiveIdMarca ? "marca" : "retailer";
    const id = effectiveIdMarca ?? effectiveIdRetailer!;

    try {
      // Las métricas principales son críticas; la serie es opcional (puede no existir aún en el backend)
      const [rMetricas, rSerie] = await Promise.allSettled([
        fetchMetricasInteraccion(tipo, id, desde, hasta),
        fetchMetricasInteraccionSerie(tipo, id, desde, hasta, agruparPor),
      ]);

      if (rMetricas.status === "rejected") {
        throw new Error((rMetricas.reason as Error).message ?? "Error al cargar métricas.");
      }
      setDatos(rMetricas.value);
      setSerie(rSerie.status === "fulfilled" ? rSerie.value : []);
    } catch (e) {
      setError((e as Error).message ?? "Error desconocido.");
    } finally {
      setLoading(false);
    }
  }, [effectiveIdMarca, effectiveIdRetailer, desde, hasta, agruparPor]);

  useEffect(() => { fetchDatos(); }, [fetchDatos]);

  // ── Fetch de tendencia temporal ───────────────────────────────────────────
  const fetchTendencia = useCallback(async () => {
    if (!effectiveIdRetailer && !effectiveIdMarca) return;
    const tipo: "marca" | "retailer" = effectiveIdMarca ? "marca" : "retailer";
    const id = effectiveIdMarca ?? effectiveIdRetailer!;
    setLoadingTendencia(true);
    fetchTendenciaInteracciones(tipo, id, desde, hasta)
      .then(setTendencia)
      .catch(() => setTendencia(null))
      .finally(() => setLoadingTendencia(false));
  }, [effectiveIdMarca, effectiveIdRetailer, desde, hasta]);

  useEffect(() => { fetchTendencia(); }, [fetchTendencia]);

  // ── Etiqueta de contexto ──────────────────────────────────────────────────
  const retailerNombre =
    rol === "admin_global_andesml"
      ? retailers.find(r => String(r.idRetailer) === selectedRetailer)?.nombre
      : user?.retailerNombre;

  const marcaNombreCtx =
    rol === "admin_marca"
      ? user?.marcaNombre
      : marcas.find(m => String(m.idMarca) === effectiveIdMarca)?.nombre;

  const contextoLabel =
    marcaNombreCtx && retailerNombre ? `${marcaNombreCtx} de ${retailerNombre}` :
    marcaNombreCtx                   ? marcaNombreCtx :
    retailerNombre                   ? retailerNombre :
    "";

  // ── Datos para gráficos de tendencia ─────────────────────────────────────
  // BigQuery: 1=Dom, 2=Lun … 7=Sáb → mostramos Lun-Dom
  const DIAS_ORDEN   = [2, 3, 4, 5, 6, 7, 1];
  const NOMBRES_DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  const dataDias = DIAS_ORDEN.map((numDia, i) => {
    const encontrado = tendencia?.porDiaSemana.find(d => d.diaSemana === numDia);
    return { nombre: NOMBRES_DIAS[i], total: encontrado?.totalInteracciones ?? 0 };
  });

  const dataHoras = Array.from({ length: 24 }, (_, h) => {
    const encontrado = tendencia?.porHoraDia.find(d => d.hora === h);
    return { hora: `${h}:00`, total: encontrado?.totalInteracciones ?? 0 };
  });

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="ind-root">

      {/* ── Barra de filtros ───────────────────────────────────────────────── */}
      <section className="ind-filters-bar">

        {rol === "admin_global_andesml" && (
          <Select label="Retailer" value={selectedRetailer}
            onChange={v => { setSelectedRetailer(v); setSelectedMarca(""); }}>
            {retailers.map(r => (
              <option key={r.idRetailer} value={r.idRetailer}>{r.nombre}</option>
            ))}
          </Select>
        )}

        {(rol === "admin_global_andesml" || rol === "admin_retailer") && (
          <Select label="Marca" value={selectedMarca} onChange={setSelectedMarca}>
            <option value="">Todas las marcas</option>
            {marcas.map(m => (
              <option key={m.idMarca} value={m.idMarca}>{m.nombre}</option>
            ))}
          </Select>
        )}

        <div className="ind-filter-group">
          <label className="ind-filter-label">Desde</label>
          <input type="date" className="ind-filter-input" value={desde} max={hasta}
            onChange={e => setDesde(e.target.value)} />
        </div>
        <div className="ind-filter-group">
          <label className="ind-filter-label">Hasta</label>
          <input type="date" className="ind-filter-input" value={hasta} min={desde} max={getIsoToday()}
            onChange={e => setHasta(e.target.value)} />
        </div>

        <div className="ind-filter-group">
          <label className="ind-filter-label">Agrupar por</label>
          <select className="ind-filter-input" value={agruparPor}
            onChange={e => setAgruparPor(e.target.value as AgruparPor)}>
            <option value="dia">Día</option>
            <option value="semana">Semana</option>
            <option value="mes">Mes</option>
            <option value="año">Año</option>
          </select>
        </div>

        <button className="ind-apply-btn" onClick={fetchDatos} disabled={loading}>
          {loading ? "Cargando…" : "Aplicar"}
        </button>
      </section>

      {contextoLabel && (
        <p className="ind-context-label">
          Mostrando datos de: <strong>{contextoLabel}</strong>
        </p>
      )}

      {error && <div className="ind-error-banner">{error}</div>}

      {/* ── KPIs de interacción ────────────────────────────────────────────── */}
      <section className="ind-kpi-row">
        <KpiCard
          label="Clics"
          value={datos ? formatNum(datos.clics) : "—"}
        />
        <KpiCard
          label="Visitas"
          value={datos ? formatNum(datos.visitas) : "—"}
        />
        <KpiCard
          label="Tiempo prom. visualización"
          value={datos
            ? (datos.tiempoPromedioVisualizacion > 0
                ? formatTiempo(datos.tiempoPromedioVisualizacion)
                : "N/A")
            : "—"}
        />
      </section>

      {loading && <div className="ind-skeleton" style={{ height: 80 }} />}

      {/* ── Detalle por período ────────────────────────────────────────────── */}
      {!loading && serie.length > 0 && (
        <section className="ind-card">
          <div className="ind-card-header">
            <h2 className="ind-card-title">Detalle por período</h2>
            <span className="ind-badge">{serie.length} períodos</span>
          </div>
          <div className="ind-table-wrapper">
            <table className="ind-table">
              <thead>
                <tr>
                  <th className="ind-th">Período</th>
                  <th className="ind-th ind-th--right">Clics</th>
                  <th className="ind-th ind-th--right">Visitas</th>
                  <th className="ind-th ind-th--right">Tiempo prom. viz.</th>
                </tr>
              </thead>
              <tbody>
                {serie.map((row, i) => (
                  <tr key={row.periodo} className={`ind-tr${i % 2 !== 0 ? " ind-tr--alt" : ""}`}>
                    <td className="ind-td ind-td--mono">{row.periodo}</td>
                    <td className="ind-td ind-td--right">{formatNum(row.clics)}</td>
                    <td className="ind-td ind-td--right">{formatNum(row.visitas)}</td>
                    <td className="ind-td ind-td--right">
                      {row.tiempoPromedioVisualizacion > 0
                        ? formatTiempo(row.tiempoPromedioVisualizacion)
                        : "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── Tendencia por día de la semana ────────────────────────────────── */}
      <section className="ind-card">
        <div className="ind-card-header">
          <h2 className="ind-card-title">Tendencia por día de la semana</h2>
        </div>
        <div className="ind-chart-area">
          {loadingTendencia ? (
            <div className="ind-skeleton" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={dataDias} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="nombre" tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(val) => [Number(val).toLocaleString("es-CL"), "Interacciones"]}
                  contentStyle={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "13px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                />
                <Bar dataKey="total" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* ── Tendencia por hora del día ─────────────────────────────────────── */}
      <section className="ind-card">
        <div className="ind-card-header">
          <h2 className="ind-card-title">Tendencia por hora del día</h2>
        </div>
        <div className="ind-chart-area">
          {loadingTendencia ? (
            <div className="ind-skeleton" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={dataHoras} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="hora" interval={2} tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(val) => [Number(val).toLocaleString("es-CL"), "Interacciones"]}
                  contentStyle={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "13px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                />
                <Bar dataKey="total" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

    </div>
  );
}
