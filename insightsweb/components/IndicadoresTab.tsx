import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../lib/api";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";

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
interface MainMetrics     { ingresosTotal: number; totalTransacciones: number; presenciaCarritos: number; }
interface MetricasPeriodo { periodo: string; ingresosTotal: number; totalTransacciones: number; presenciaCarritos: number; }
interface TopProducto     { idProducto: number; nombre: string; ingresosTotal: number; unidadesVendidas: number; }

type AgruparPor    = "dia" | "semana" | "mes" | "año";
type MetricaActiva = "ingresosTotal" | "totalTransacciones" | "presenciaCarritos";
type TipoGrafico   = "line" | "bar";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCLP(v: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(v);
}
function formatNum(v: number) {
  return new Intl.NumberFormat("es-CL").format(v);
}
function formatPct(v: number) {
  return `${(v * 100).toFixed(1)}%`;
}
function getIsoToday() { return new Date().toISOString().slice(0, 10); }
function getSixMonthsAgo() {
  const d = new Date(); d.setMonth(d.getMonth() - 6); return d.toISOString().slice(0, 10);
}
function buildQS(params: Record<string, string | undefined>) {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) p.set(k, v); });
  const s = p.toString(); return s ? `?${s}` : "";
}

// ─── Sub-componentes ─────────────────────────────────────────────────────────

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="ind-kpi-card">
      <p className="ind-kpi-label">{label}</p>
      <p className="ind-kpi-value">{value}</p>
      {sub && <p className="ind-kpi-sub">{sub}</p>}
    </div>
  );
}

function SegBtn<T extends string>({
  options, value, onChange, accent,
}: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; accent?: boolean }) {
  return (
    <div className="ind-seg">
      {options.map(o => (
        <button
          key={o.value}
          className={`ind-seg-btn${value === o.value ? (accent ? " ind-seg-btn--accent" : " ind-seg-btn--active") : ""}`}
          onClick={() => onChange(o.value)}
        >{o.label}</button>
      ))}
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

export default function IndicadoresTab({ user }: { user: StoredUser | null }) {
  // Selectors dinámicos
  const [retailers, setRetailers]       = useState<RetailerResumen[]>([]);
  const [marcas, setMarcas]             = useState<MarcaResumen[]>([]);
  const [selectedRetailer, setSelectedRetailer] = useState<string>("");
  const [selectedMarca, setSelectedMarca]       = useState<string>("");

  // Filtros fecha
  const [desde, setDesde]       = useState(getSixMonthsAgo());
  const [hasta, setHasta]       = useState(getIsoToday());
  const [agruparPor, setAgruparPor] = useState<AgruparPor>("mes");

  // Chart controls
  const [metricaActiva, setMetricaActiva] = useState<MetricaActiva>("ingresosTotal");
  const [tipoGrafico, setTipoGrafico]     = useState<TipoGrafico>("line");

  // Data
  const [metricas, setMetricas] = useState<MainMetrics | null>(null);
  const [serie, setSerie]       = useState<MetricasPeriodo[]>([]);
  const [topProductos, setTopProductos] = useState<TopProducto[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const rol = user?.rol;

  // ── Carga inicial de retailers (solo admin_global) ──────────────────────────
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

  // ── Carga de marcas cuando cambia el retailer seleccionado ─────────────────
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
        setSelectedMarca(""); // reset marca al cambiar retailer
      })
      .catch(() => setMarcas([]));
  }, [rol, selectedRetailer, user?.idRetailer]);

  // ── Derivar idMarca e idRetailer efectivos para queries ────────────────────
  const effectiveIdRetailer: string | null =
    rol === "admin_global_andesml" ? (selectedRetailer || null) :
    rol === "admin_retailer"       ? String(user?.idRetailer ?? "") :
    null;

  const effectiveIdMarca: string | null =
    rol === "admin_marca"          ? String(user?.idMarca ?? "") :
    selectedMarca                  ? selectedMarca :
    null;

  // ── Fetch de métricas ──────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!effectiveIdRetailer && !effectiveIdMarca) return;
    setLoading(true);
    setError(null);

    try {
      const qs     = buildQS({ desde, hasta });
      const qsSerie = buildQS({ desde, hasta, agruparPor });
      const qsTop  = buildQS({ desde, hasta, topN: "10" });

      let urlMetricas: string;
      let urlSerie: string;
      let urlTop: string;

      if (effectiveIdMarca) {
        urlMetricas = `/db/marcas/${effectiveIdMarca}/metricas-principales${qs}`;
        urlSerie    = `/db/marcas/${effectiveIdMarca}/metricas-principales/serie${qsSerie}`;
        urlTop      = `/db/marcas/${effectiveIdMarca}/top-productos${qsTop}`;
      } else {
        urlMetricas = `/db/retailers/${effectiveIdRetailer}/metricas-principales${qs}`;
        urlSerie    = `/db/retailers/${effectiveIdRetailer}/metricas-principales/serie${qsSerie}`;
        urlTop      = `/db/retailers/${effectiveIdRetailer}/top-productos${qsTop}`;
      }

      const [rM, rS, rT] = await Promise.all([
        apiFetch(urlMetricas),
        apiFetch(urlSerie),
        apiFetch(urlTop),
      ]);

      if (!rM.ok || !rS.ok || !rT.ok) throw new Error("Error al cargar los datos.");

      const [dataM, dataS, dataT]: [MainMetrics, MetricasPeriodo[], TopProducto[]] =
        await Promise.all([rM.json(), rS.json(), rT.json()]);

      setMetricas(dataM);
      setSerie(dataS);
      setTopProductos(dataT);
    } catch (e) {
      setError((e as Error).message ?? "Error desconocido.");
    } finally {
      setLoading(false);
    }
  }, [effectiveIdMarca, effectiveIdRetailer, desde, hasta, agruparPor]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Labels y formatters ────────────────────────────────────────────────────
  const metricaOpts: { value: MetricaActiva; label: string }[] = [
    { value: "ingresosTotal",       label: "Ingresos" },
    { value: "totalTransacciones",  label: "Transacciones" },
    { value: "presenciaCarritos",   label: "Presencia carrito" },
  ];
  const metricaLabel = metricaOpts.find(o => o.value === metricaActiva)?.label ?? "";
  const metricaFormatter = (v: number) =>
    metricaActiva === "ingresosTotal"      ? formatCLP(v) :
    metricaActiva === "presenciaCarritos"  ? formatPct(v) :
    formatNum(v);

  // Título contextual de qué estamos viendo
  // Derivar nombres para el contexto
  const retailerNombre =
    rol === "admin_global_andesml"
      ? retailers.find(r => String(r.idRetailer) === selectedRetailer)?.nombre
      : user?.retailerNombre;

  const marcaNombreCtx =
    rol === "admin_marca"
      ? user?.marcaNombre
      : marcas.find(m => String(m.idMarca) === effectiveIdMarca)?.nombre;

  const contextoLabel =
    marcaNombreCtx && retailerNombre
      ? `${marcaNombreCtx} de ${retailerNombre}`
      : marcaNombreCtx
      ? marcaNombreCtx
      : retailerNombre
      ? retailerNombre
      : "";

  const maxTopIngresos = topProductos[0]?.ingresosTotal ?? 1;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="ind-root">

      {/* ── Barra de filtros ─────────────────────────────────────────────── */}
      <section className="ind-filters-bar">

        {/* Selector Retailer — solo admin_global */}
        {rol === "admin_global_andesml" && (
          <Select label="Retailer" value={selectedRetailer} onChange={v => { setSelectedRetailer(v); setSelectedMarca(""); }}>
            {retailers.map(r => (
              <option key={r.idRetailer} value={r.idRetailer}>{r.nombre}</option>
            ))}
          </Select>
        )}

        {/* Selector Marca — admin_global y admin_retailer */}
        {(rol === "admin_global_andesml" || rol === "admin_retailer") && (
          <Select label="Marca" value={selectedMarca} onChange={setSelectedMarca}>
            <option value="">Todas las marcas</option>
            {marcas.map(m => (
              <option key={m.idMarca} value={m.idMarca}>{m.nombre}</option>
            ))}
          </Select>
        )}

        {/* Fechas */}
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

        <button className="ind-apply-btn" onClick={fetchData} disabled={loading}>
          {loading ? "Cargando…" : "Aplicar"}
        </button>
      </section>

      {/* Contexto activo */}
      {contextoLabel && (
        <p className="ind-context-label">
          Mostrando datos de: <strong>{contextoLabel}</strong>
        </p>
      )}

      {error && <div className="ind-error-banner">{error}</div>}

      {/* ── KPIs ─────────────────────────────────────────────────────────── */}
      <section className="ind-kpi-row">
        <KpiCard
          label="Ingresos totales"
          value={metricas ? formatCLP(metricas.ingresosTotal) : "—"}
          sub={serie.length > 0
            ? `Prom. por período: ${formatCLP(serie.reduce((a, p) => a + p.ingresosTotal, 0) / serie.length)}`
            : undefined}
        />
        <KpiCard
          label="Transacciones"
          value={metricas ? formatNum(metricas.totalTransacciones) : "—"}
          sub={serie.length > 0
            ? `Prom. por período: ${formatNum(Math.round(serie.reduce((a, p) => a + p.totalTransacciones, 0) / serie.length))}`
            : undefined}
        />
        <KpiCard
          label="Presencia en carrito"
          value={metricas ? formatPct(metricas.presenciaCarritos) : "—"}
          sub="vs. total de eventos agregar_carro"
        />
        <KpiCard
          label="Ticket promedio"
          value={metricas && metricas.totalTransacciones > 0
            ? formatCLP(metricas.ingresosTotal / metricas.totalTransacciones)
            : "—"}
          sub="Ingreso por transacción"
        />
      </section>

      {/* ── Gráfico de evolución ──────────────────────────────────────────── */}
      <section className="ind-card">
        <div className="ind-card-header">
          <div className="ind-card-header-left">
            <h2 className="ind-card-title">Evolución temporal</h2>
            <SegBtn<MetricaActiva>
              options={metricaOpts}
              value={metricaActiva}
              onChange={setMetricaActiva}
            />
          </div>
          <SegBtn<TipoGrafico>
            options={[{ value: "line", label: "Línea" }, { value: "bar", label: "Barras" }]}
            value={tipoGrafico}
            onChange={setTipoGrafico}
            accent
          />
        </div>

        <div className="ind-chart-area">
          {loading ? (
            <div className="ind-skeleton" />
          ) : serie.length === 0 ? (
            <div className="ind-empty"><p className="ind-empty-text">No hay datos para el período seleccionado.</p></div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              {tipoGrafico === "line" ? (
                <LineChart data={serie} margin={{ top: 4, right: 40, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="periodo" tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={metricaFormatter} tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} width={90} />
                  <Tooltip
                    formatter={(v) => [metricaFormatter(Number(v ?? 0)), metricaLabel]}
                    contentStyle={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "13px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                  />
                  <Legend formatter={() => metricaLabel} iconType="circle" wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }} />
                  <Line type="monotone" dataKey={metricaActiva} stroke="#6366f1" strokeWidth={2.5}
                    dot={{ r: 4, fill: "#6366f1", strokeWidth: 0 }} activeDot={{ r: 6, fill: "#4f46e5" }} name={metricaLabel} />
                </LineChart>
              ) : (
                <BarChart data={serie} margin={{ top: 4, right: 40, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="periodo" tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={metricaFormatter} tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} width={90} />
                  <Tooltip
                    formatter={(v) => [metricaFormatter(Number(v ?? 0)), metricaLabel]}
                    contentStyle={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "13px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                  />
                  <Legend formatter={() => metricaLabel} wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }} />
                  <Bar dataKey={metricaActiva} fill="#6366f1" radius={[4, 4, 0, 0]} name={metricaLabel} />
                </BarChart>
              )}
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* ── Top productos ─────────────────────────────────────────────────── */}
      <section className="ind-card">
        <div className="ind-card-header">
          <h2 className="ind-card-title">Top 10 productos</h2>
          <span className="ind-badge">{topProductos.length} productos</span>
        </div>

        {loading ? (
          <div className="ind-skeleton" style={{ height: 200 }} />
        ) : topProductos.length === 0 ? (
          <div className="ind-empty"><p className="ind-empty-text">No hay datos de productos para el período.</p></div>
        ) : (
          <div className="ind-top-list">
            {topProductos.map((p, i) => {
              const pct = (p.ingresosTotal / maxTopIngresos) * 100;
              return (
                <div key={p.idProducto} className="ind-top-row">
                  <span className="ind-top-rank">#{i + 1}</span>
                  <div className="ind-top-info">
                    <span className="ind-top-nombre">{p.nombre ?? `Producto #${p.idProducto}`}</span>
                    <div className="ind-top-bar-wrap">
                      <div className="ind-top-bar" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="ind-top-nums">
                    <span className="ind-top-ingresos">{formatCLP(p.ingresosTotal)}</span>
                    <span className="ind-top-unidades">{formatNum(p.unidadesVendidas)} u.</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Tabla de detalle por período ─────────────────────────────────── */}
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
                  <th className="ind-th ind-th--right">Ingresos</th>
                  <th className="ind-th ind-th--right">Transacciones</th>
                  <th className="ind-th ind-th--right">Ticket prom.</th>
                  <th className="ind-th ind-th--right">Presencia carrito</th>
                </tr>
              </thead>
              <tbody>
                {serie.map((row, i) => (
                  <tr key={row.periodo} className={`ind-tr${i % 2 !== 0 ? " ind-tr--alt" : ""}`}>
                    <td className="ind-td ind-td--mono">{row.periodo}</td>
                    <td className="ind-td ind-td--right">{formatCLP(row.ingresosTotal)}</td>
                    <td className="ind-td ind-td--right">{formatNum(row.totalTransacciones)}</td>
                    <td className="ind-td ind-td--right">
                      {row.totalTransacciones > 0 ? formatCLP(Math.round(row.ingresosTotal / row.totalTransacciones)) : "—"}
                    </td>
                    <td className="ind-td ind-td--right">{formatPct(row.presenciaCarritos)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

    </div>
  );
}