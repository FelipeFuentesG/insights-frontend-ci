import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/router";
import Sidebar from "../../components/Sidebar";
import InsightsChatWidget from "../../components/InsightsChatWidget";
import { StoredUser } from "../../components/InsightsChat";
import { apiFetch } from "../../lib/api";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

//Types

interface MetricasAgregadas {
  ingresosTotal: number;
  unidadesVendidas: number;
}

interface MetricasPeriodo {
  periodo: string;
  ingresosTotal: number;
  unidadesVendidas: number;
}

interface PalabrasClaveResponse {
  palabrasClave: string[];
}

type AgruparPor = "dia" | "semana" | "mes" | "año";
type MetricaActiva = "ingresosTotal" | "unidadesVendidas";
type TipoGrafico = "line" | "bar";

//Helpers

function formatCLP(value: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNum(value: number): string {
  return new Intl.NumberFormat("es-CL").format(value);
}

function buildQuery(desde: string, hasta: string, agruparPor?: AgruparPor): string {
  const params = new URLSearchParams();
  if (desde) params.set("desde", desde);
  if (hasta) params.set("hasta", hasta);
  if (agruparPor) params.set("agruparPor", agruparPor);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

function getIsoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function getSixMonthsAgo(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 6);
  return d.toISOString().slice(0, 10);
}

// Construye el contexto textual que recibe Gemini. Sólo incluye datos
// realmente disponibles en la vista; nunca inventa valores.
function buildProductoContexto(args: {
  nombreProducto: string;
  idProducto: string;
  idMarca: number | null;
  idRetailer: number | null;
  desde: string;
  hasta: string;
  agruparLabel: string;
  loading: boolean;
  error: string | null;
  metricas: MetricasAgregadas | null;
  serie: MetricasPeriodo[];
  precioProm: number | null;
  promedio: number;
}): string {
  const {
    nombreProducto, idProducto, idMarca, idRetailer, desde, hasta,
    agruparLabel, loading, error, metricas, serie, precioProm, promedio,
  } = args;

  const lineas: string[] = [];

  lineas.push(
    "Eres un asistente de análisis de datos comerciales dentro de un panel de Insights. " +
    "Tu rol es exclusivamente responder preguntas y analizar el desempeño del producto " +
    "descrito a continuación. NO puedes editar, crear, eliminar ni modificar el producto " +
    "ni ningún dato: sólo analizar y responder. Básate únicamente en los datos provistos; " +
    "si un dato no está disponible, dilo claramente y no lo inventes. Responde en español."
  );

  lineas.push("\n=== DATOS DEL PRODUCTO ===");
  lineas.push(`Nombre: ${nombreProducto || `Producto #${idProducto}`}`);
  lineas.push(`ID Producto: ${idProducto}`);
  if (idMarca != null) lineas.push(`ID Marca: ${idMarca}`);
  if (idRetailer != null) lineas.push(`ID Retailer: ${idRetailer}`);
  lineas.push(`Período analizado: ${desde} a ${hasta} (agrupado por ${agruparLabel})`);

  if (loading) {
    lineas.push("\nEstado: los datos aún se están cargando. Indica al usuario que espere un momento.");
    return lineas.join("\n");
  }
  if (error) {
    lineas.push(`\nEstado: ocurrió un error al cargar los datos (${error}). No hay estadísticas disponibles.`);
    return lineas.join("\n");
  }

  const sinMetricas = !metricas || (metricas.ingresosTotal === 0 && metricas.unidadesVendidas === 0);
  const sinSerie = serie.length === 0;

  if (sinMetricas && sinSerie) {
    lineas.push(
      "\nEstado: este producto no tiene información de ventas suficiente en el período " +
      "seleccionado. Indícalo al usuario y sugiere ampliar el rango de fechas; no inventes cifras."
    );
    return lineas.join("\n");
  }

  lineas.push("\n=== MÉTRICAS AGREGADAS ===");
  if (metricas) {
    lineas.push(`Ingresos totales: ${formatCLP(metricas.ingresosTotal)}`);
    lineas.push(`Unidades vendidas: ${formatNum(metricas.unidadesVendidas)}`);
  }
  if (precioProm != null) lineas.push(`Precio promedio por unidad: ${formatCLP(precioProm)}`);
  if (serie.length > 0) {
    lineas.push(`Ingreso promedio por período: ${formatCLP(promedio)}`);
    lineas.push(`Períodos analizados: ${serie.length}`);
  }

  if (serie.length > 0) {
    lineas.push("\n=== DETALLE POR PERÍODO ===");
    lineas.push("Período | Ingresos | Unidades | Precio prom.");
    for (const row of serie) {
      const pp = row.unidadesVendidas > 0
        ? formatCLP(Math.round(row.ingresosTotal / row.unidadesVendidas))
        : "—";
      lineas.push(
        `${row.periodo} | ${formatCLP(row.ingresosTotal)} | ${formatNum(row.unidadesVendidas)} | ${pp}`
      );
    }
  }

  return lineas.join("\n");
}

const PRODUCTO_SUGERENCIAS = [
  "¿Qué conclusiones se pueden obtener de su desempeño?",
  "¿Cómo han evolucionado sus ventas?",
  "¿Qué recomendaciones se pueden obtener a partir de sus datos?",
];

//Sub-componentes

function KpiCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="pd-kpi-card">
      <p className="pd-kpi-label">{label}</p>
      <p className="pd-kpi-value">{value}</p>
      {sub && <p className="pd-kpi-sub">{sub}</p>}
    </div>
  );
}

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accent,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  accent?: boolean;
}) {
  return (
    <div className="pd-seg-control">
      {options.map((opt) => (
        <button
          key={opt.value}
          className={`pd-seg-btn${
            value === opt.value
              ? accent
                ? " pd-seg-btn--accent"
                : " pd-seg-btn--active"
              : ""
          }`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// Pág

export default function ProductoDashboard() {
  const router = useRouter();
  const { idProducto } = router.query;

  // User / tenant
  const [idMarca, setIdMarca] = useState<number | null>(null);
  const [idRetailer, setIdRetailer] = useState<number | null>(null);
  const [userName, setUserName] = useState("Usuario");
  const [chatUser, setChatUser] = useState<StoredUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [nombreProducto, setNombreProducto] = useState("");

  // Filters
  const [desde, setDesde] = useState(getSixMonthsAgo());
  const [hasta, setHasta] = useState(getIsoToday());
  const [agruparPor, setAgruparPor] = useState<AgruparPor>("mes");

  // Chart controls
  const [tipoGrafico, setTipoGrafico] = useState<TipoGrafico>("line");
  const [metricaActiva, setMetricaActiva] = useState<MetricaActiva>("ingresosTotal");

  // Data
  const [metricas, setMetricas] = useState<MetricasAgregadas | null>(null);
  const [serie, setSerie] = useState<MetricasPeriodo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Palabras clave (keywords)
  const [keywordsInput, setKeywordsInput] = useState("");
  const [keywordsLoading, setKeywordsLoading] = useState(false);
  const [keywordsSaving, setKeywordsSaving] = useState(false);
  const [keywordsError, setKeywordsError] = useState<string | null>(null);
  const [keywordsSaved, setKeywordsSaved] = useState(false);

  // Para que se use siempre todo el ancho posible en el gráfico
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [chartContainerWidth, setChartContainerWidth] = useState(600);

  // Para que se use siempre todo el ancho posible en el gráfico
  useEffect(() => {
    if (!chartContainerRef.current) return;
    setChartContainerWidth(chartContainerRef.current.offsetWidth);
    const observer = new ResizeObserver((entries) => {
      setChartContainerWidth(entries[0].contentRect.width);
    });
    observer.observe(chartContainerRef.current);
    return () => observer.disconnect();
  }, [idProducto]);

  // Auth guard + user context
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) {
      router.push("/login");
      return;
    }
    const user = JSON.parse(stored);
    setChatUser(user);
    setUserName(user.nombre ?? "Usuario");
    setIdMarca(user.idMarcaProducto ?? user.idMarca ?? null);
    setIdRetailer(user.idRetailerSeleccionado ?? user.idRetailer ?? null);
    if (user.nombre_producto) setNombreProducto(user.nombre_producto);
  }, [router]);

  // Fetch
  const fetchData = useCallback(async () => {
    if (!idMarca || !idProducto) return;
    setLoading(true);
    setError(null);

    try {
      const base = `/db/marcas/${idMarca}/productos/${idProducto}`;
      const [resM, resS] = await Promise.all([
        apiFetch(`${base}/metricas-ventas${buildQuery(desde, hasta)}`),
        apiFetch(`${base}/metricas-ventas/serie${buildQuery(desde, hasta, agruparPor)}`),
      ]);

      if (!resM.ok || !resS.ok) throw new Error("Error al cargar los datos del producto.");

      const [dataM, dataS]: [MetricasAgregadas, MetricasPeriodo[]] = await Promise.all([
        resM.json(),
        resS.json(),
      ]);

      setMetricas(dataM);
      setSerie(dataS);
    } catch (e) {
      setError((e as Error).message ?? "Error desconocido.");
    } finally {
      setLoading(false);
    }
  }, [idMarca, idProducto, desde, hasta, agruparPor]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Carga de palabras clave del producto (independiente de los filtros de fecha)
  useEffect(() => {
    if (!idMarca || !idProducto) return;
    setKeywordsLoading(true);
    setKeywordsError(null);

    apiFetch(`/db/marcas/${idMarca}/productos/${idProducto}/palabras-clave`)
      .then((r) => {
        if (!r.ok) throw new Error("Error al cargar las palabras clave.");
        return r.json();
      })
      .then((data: PalabrasClaveResponse) => {
        setKeywordsInput((data.palabrasClave ?? []).join(", "));
      })
      .catch((e) => setKeywordsError((e as Error).message ?? "Error desconocido."))
      .finally(() => setKeywordsLoading(false));
  }, [idMarca, idProducto]);

  const handleGuardarKeywords = async () => {
    if (!idMarca || !idProducto) return;
    setKeywordsSaving(true);
    setKeywordsError(null);
    setKeywordsSaved(false);

    const palabrasClave = keywordsInput
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    try {
      const res = await apiFetch(`/db/marcas/${idMarca}/productos/${idProducto}/palabras-clave`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ palabrasClave }),
      });
      if (!res.ok) throw new Error("Error al guardar las palabras clave.");
      setKeywordsInput(palabrasClave.join(", "));
      setKeywordsSaved(true);
    } catch (e) {
      setKeywordsError((e as Error).message ?? "Error desconocido.");
    } finally {
      setKeywordsSaving(false);
    }
  };

  // Derived
  const initials = userName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const promedio =
    serie.length > 0
      ? serie.reduce((acc, p) => acc + p.ingresosTotal, 0) / serie.length
      : 0;

  const precioProm =
    metricas && metricas.unidadesVendidas > 0
      ? metricas.ingresosTotal / metricas.unidadesVendidas
      : null;

  const metricaLabel =
    metricaActiva === "ingresosTotal" ? "Ingresos" : "Unidades vendidas";

  const metricaFormatter = (v: number) =>
    metricaActiva === "ingresosTotal" ? formatCLP(v) : formatNum(v);

  const agruparPorLabel: Record<AgruparPor, string> = {
    dia: "días",
    semana: "semanas",
    mes: "meses",
    año: "años",
  };

  // Contexto para Gemini: se reconstruye cuando cambia el producto, los
  // filtros o los datos, de modo que la IA siempre recibe el estado actual.
  const contextoProducto = useMemo(
    () =>
      buildProductoContexto({
        nombreProducto,
        idProducto: String(idProducto ?? ""),
        idMarca,
        idRetailer,
        desde,
        hasta,
        agruparLabel: agruparPorLabel[agruparPor],
        loading,
        error,
        metricas,
        serie,
        precioProm,
        promedio,
      }),
    [
      nombreProducto, idProducto, idMarca, idRetailer, desde, hasta,
      agruparPor, loading, error, metricas, serie, precioProm, promedio,
    ]
  );

  // Render de la pág
  return (
    <div className="home-layout">
      <Sidebar />

      <main className="home-main pd-main">
        {/* Header — mismo patrón que home.tsx */}
        <header className="home-header">
          <div className="pd-header-left">
            <button
              className="pd-back-btn"
              onClick={() => router.back()}
              aria-label="Volver"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M10 12L6 8L10 4"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <div>
              <p className="pd-header-sup">Dashboard de producto</p>
              <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
                <p className="home-greeting" style={{ margin: 0 }}>
                  {nombreProducto || `Producto #${idProducto}`}
                </p>
                <p style={{ fontSize: "0.75rem", color: "#9ca3af", margin: 0 }}>
                  ID Producto #{idProducto} · ID Marca #{idMarca} {idRetailer ? ` · ID Retailer #${idRetailer}` : ""}
                </p>
              </div>
            </div>
          </div>

          {/* Avatar idéntico a home.tsx */}
          <div className="home-avatar-wrapper">
            <button
              className="home-avatar"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Menú de usuario"
            >
              {initials}
            </button>
            {menuOpen && (
              <div className="home-dropdown">
                <button
                  className="home-dropdown-item"
                  onClick={() => {
                    localStorage.removeItem("user");
                    localStorage.removeItem("token");
                    router.push("/login");
                  }}
                >
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Contenido */}
        <div className="home-content pd-content">

          {/* Filtros */}
          <section className="pd-filters-bar">
            <div className="pd-filter-group">
              <label className="pd-filter-label">Desde</label>
              <input
                type="date"
                className="pd-filter-input"
                value={desde}
                max={hasta}
                onChange={(e) => setDesde(e.target.value)}
              />
            </div>
            <div className="pd-filter-group">
              <label className="pd-filter-label">Hasta</label>
              <input
                type="date"
                className="pd-filter-input"
                value={hasta}
                min={desde}
                max={getIsoToday()}
                onChange={(e) => setHasta(e.target.value)}
              />
            </div>
            <div className="pd-filter-group">
              <label className="pd-filter-label">Agrupar por</label>
              <select
                className="pd-filter-input"
                value={agruparPor}
                onChange={(e) => setAgruparPor(e.target.value as AgruparPor)}
              >
                <option value="dia">Día</option>
                <option value="semana">Semana</option>
                <option value="mes">Mes</option>
                <option value="año">Año</option>
              </select>
            </div>
            <button
              className="pd-apply-btn"
              onClick={fetchData}
              disabled={loading}
            >
              {loading ? "Cargando…" : "Aplicar"}
            </button>
          </section>

          {/* Error */}
          {error && <div className="pd-error-banner">{error}</div>}

          {/* KPIs */}
          <section className="pd-kpi-row">
            <KpiCard
              label="Ingresos totales"
              value={metricas ? formatCLP(metricas.ingresosTotal) : "—"}
              sub={`Promedio por período: ${formatCLP(promedio)}`}
            />
            <KpiCard
              label="Unidades vendidas"
              value={metricas ? `${formatNum(metricas.unidadesVendidas)} u.` : "—"}
              sub={precioProm ? `Precio prom.: ${formatCLP(precioProm)}` : undefined}
            />
            <KpiCard
              label="Períodos analizados"
              value={serie.length > 0 ? String(serie.length) : "—"}
              sub={agruparPorLabel[agruparPor]}
            />
          </section>

          {/* Gráfico */}
          <section className="pd-card">
            <div className="pd-card-header">
              <div className="pd-card-header-left">
                <h2 className="pd-card-title">Evolución de ventas</h2>
                <SegmentedControl<MetricaActiva>
                  options={[
                    { value: "ingresosTotal", label: "Ingresos" },
                    { value: "unidadesVendidas", label: "Unidades" },
                  ]}
                  value={metricaActiva}
                  onChange={setMetricaActiva}
                />
              </div>
              <SegmentedControl<TipoGrafico>
                options={[
                  { value: "line", label: "Línea" },
                  { value: "bar", label: "Barras" },
                ]}
                value={tipoGrafico}
                onChange={setTipoGrafico}
                accent
              />
            </div>

            <div className="pd-chart-area" ref={chartContainerRef}>
              {loading ? (
                <div className="pd-skeleton" />
              ) : serie.length === 0 ? (
                <div className="pd-empty">
                  <p className="pd-empty-text">
                    No hay datos para el período seleccionado.
                  </p>
                </div>
              ) : (
                <div style={{ overflowX: "auto", width: "100%" }}>
                <div style={{ minWidth: Math.max(chartContainerWidth, serie.length * 80) }}>
                  {tipoGrafico === "line" ? (
                    <LineChart
                      width={Math.max(chartContainerWidth, serie.length * 80)}
                      height={300}
                      data={serie}
                      margin={{ top: 4, right: 40, left: 10, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis
                        dataKey="periodo"
                        tick={{ fontSize: 12, fill: "#6b7280" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tickFormatter={metricaFormatter}
                        tick={{ fontSize: 11, fill: "#6b7280" }}
                        axisLine={false}
                        tickLine={false}
                        width={88}
                      />
                      <Tooltip
                        formatter={(v) => [metricaFormatter(Number(v ?? 0)), metricaLabel]}
                        contentStyle={{
                          background: "#ffffff",
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                          fontSize: "13px",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        }}
                      />
                      <Legend
                        formatter={() => metricaLabel}
                        iconType="circle"
                        wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
                      />
                      <Line
                        type="monotone"
                        dataKey={metricaActiva}
                        stroke="#6366f1"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: "#6366f1", strokeWidth: 0 }}
                        activeDot={{ r: 6, fill: "#4f46e5" }}
                        name={metricaLabel}
                      />
                    </LineChart>
                  ) : (
                    <BarChart
                      width={Math.max(chartContainerWidth, serie.length * 80)}
                      height={300}
                      data={serie}
                      margin={{ top: 4, right: 40, left: 10, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis
                        dataKey="periodo"
                        tick={{ fontSize: 12, fill: "#6b7280" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tickFormatter={metricaFormatter}
                        tick={{ fontSize: 11, fill: "#6b7280" }}
                        axisLine={false}
                        tickLine={false}
                        width={88}
                      />
                      <Tooltip
                        formatter={(v) => [metricaFormatter(Number(v ?? 0)), metricaLabel]}
                        contentStyle={{
                          background: "#ffffff",
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                          fontSize: "13px",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        }}
                      />
                      <Legend
                        formatter={() => metricaLabel}
                        wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
                      />
                      <Bar
                        dataKey={metricaActiva}
                        fill="#6366f1"
                        radius={[4, 4, 0, 0]}
                        name={metricaLabel}
                      />
                    </BarChart>
                  )}
                </div>
                </div>
              )}
            </div>
          </section>

          {/* Tabla */}
          {!loading && serie.length > 0 && (
            <section className="pd-card">
              <div className="pd-card-header">
                <h2 className="pd-card-title">Detalle por período</h2>
                <span className="pd-table-count">{serie.length} períodos</span>
              </div>
              <div className="pd-table-wrapper">
                <table className="pd-table">
                  <thead>
                    <tr>
                      <th className="pd-th">Período</th>
                      <th className="pd-th pd-th--right">Ingresos</th>
                      <th className="pd-th pd-th--right">Unidades</th>
                      <th className="pd-th pd-th--right">Precio prom.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {serie.map((row, i) => (
                      <tr
                        key={row.periodo}
                        className={`pd-tr${i % 2 !== 0 ? " pd-tr--alt" : ""}`}
                      >
                        <td className="pd-td pd-td--mono">{row.periodo}</td>
                        <td className="pd-td pd-td--right">{formatCLP(row.ingresosTotal)}</td>
                        <td className="pd-td pd-td--right">{formatNum(row.unidadesVendidas)}</td>
                        <td className="pd-td pd-td--right">
                          {row.unidadesVendidas > 0
                            ? formatCLP(Math.round(row.ingresosTotal / row.unidadesVendidas))
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        {/* Palabras clave */}
          <section className="pd-card">
            <div className="pd-card-header">
              <h2 className="pd-card-title">Palabras clave</h2>
            </div>

            {keywordsError && <div className="pd-error-banner">{keywordsError}</div>}

            {keywordsLoading ? (
              <div className="pd-skeleton" style={{ height: 80 }} />
            ) : (
              <>
                <textarea
                  className="pd-filter-input"
                  style={{ width: "100%", minHeight: 80, resize: "vertical" }}
                  placeholder="Palabras clave separadas por comas, ej: zapatillas, running, deportivo"
                  value={keywordsInput}
                  onChange={(e) => {
                    setKeywordsInput(e.target.value);
                    setKeywordsSaved(false);
                  }}
                />
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "12px" }}>
                  <button
                    className="pd-apply-btn"
                    onClick={handleGuardarKeywords}
                    disabled={keywordsSaving}
                  >
                    {keywordsSaving ? "Guardando…" : "Guardar"}
                  </button>
                  {keywordsSaved && (
                    <span style={{ fontSize: "0.8rem", color: "#16a34a" }}>Guardado ✓</span>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      </main>

      {/* Widget de chat con IA, mismo componente que en Insights, ahora con
          el contexto del producto seleccionado. */}
      <InsightsChatWidget
        user={chatUser}
        contexto={contextoProducto}
        suggestions={PRODUCTO_SUGERENCIAS}
        title={`Asistente IA · ${nombreProducto || `Producto #${idProducto}`}`}
      />
    </div>
  );
}
