import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import Sidebar from "../../components/Sidebar";
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

// ─── Types ────────────────────────────────────────────────────────────────────

type Rol = "admin_global_andesml" | "admin_retailer" | "admin_marca";

interface User {
  idUsuario: number;
  idRetailer: number | null;
  idMarca: number | null;
  nombre: string;
  email: string;
  rol: Rol;
}

interface RetailerResumen {
  idRetailer: number;
  nombre: string;
}

interface MarcaResumen {
  idMarca: number;
  nombre: string;
}

interface MetricasAgregadas {
  ingresosTotal: number;
  unidadesVendidas: number;
}

interface MetricasPeriodo {
  periodo: string;
  ingresosTotal: number;
  unidadesVendidas: number;
}

type AgruparPor = "dia" | "semana" | "mes" | "año";
type MetricaActiva = "ingresosTotal" | "unidadesVendidas";
type TipoGrafico = "line" | "bar";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VentasTotalesPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // Selectores
  const [retailers, setRetailers] = useState<RetailerResumen[]>([]);
  const [marcas, setMarcas] = useState<MarcaResumen[]>([]);
  const [retailerSeleccionado, setRetailerSeleccionado] = useState<number | null>(null);
  const [marcaSeleccionada, setMarcaSeleccionada] = useState<number | null>(null);
  const [nombreMarca, setNombreMarca] = useState<string>("");

  // Filtros
  const [desde, setDesde] = useState(getSixMonthsAgo());
  const [hasta, setHasta] = useState(getIsoToday());
  const [agruparPor, setAgruparPor] = useState<AgruparPor>("mes");

  // Controles de gráfico
  const [tipoGrafico, setTipoGrafico] = useState<TipoGrafico>("line");
  const [metricaActiva, setMetricaActiva] = useState<MetricaActiva>("ingresosTotal");

  // Datos
  const [metricas, setMetricas] = useState<MetricasAgregadas | null>(null);
  const [serie, setSerie] = useState<MetricasPeriodo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Auth guard ────────────────────────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) {
      router.push("/login");
      return;
    }
    const parsed: User = JSON.parse(stored);
    setUser(parsed);

    if (parsed.rol === "admin_marca" && parsed.idMarca) {
      setMarcaSeleccionada(parsed.idMarca);
    }
  }, [router]);

  // ── Fetch retailers (solo admin global) ───────────────────────────────────
  useEffect(() => {
    if (!user || user.rol !== "admin_global_andesml") return;
    apiFetch("/db/retailers")
      .then((res) => res.json())
      .then((data: RetailerResumen[]) => setRetailers(data))
      .catch(() => setError("No se pudieron cargar los retailers."));
  }, [user]);

  // ── Fetch marcas según el retailer activo ─────────────────────────────────
  useEffect(() => {
    if (!user) return;

    let idRetailer: number | null = null;

    if (user.rol === "admin_global_andesml") {
      idRetailer = retailerSeleccionado;
    } else if (user.rol === "admin_retailer") {
      idRetailer = user.idRetailer;
    } else {
      return; // admin_marca no necesita este fetch
    }

    if (!idRetailer) return;

    setMarcas([]);
    setMarcaSeleccionada(null);

    apiFetch(`/db/retailers/${idRetailer}/marcas`)
      .then((res) => res.json())
      .then((data: MarcaResumen[]) => setMarcas(data))
      .catch(() => setError("No se pudieron cargar las marcas."));
  }, [user, retailerSeleccionado]);

  // ── Fetch ventas ──────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!marcaSeleccionada) return;
    setLoading(true);
    setError(null);

    try {
      const base = `/db/marcas/${marcaSeleccionada}/ventas`;
      const [resM, resS] = await Promise.all([
        apiFetch(`${base}/metricas${buildQuery(desde, hasta)}`),
        apiFetch(`${base}/serie${buildQuery(desde, hasta, agruparPor)}`),
      ]);

      if (!resM.ok || !resS.ok) throw new Error("Error al cargar los datos de ventas.");

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
  }, [marcaSeleccionada, desde, hasta, agruparPor]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const initials = (user?.nombre ?? "U")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const promedio =
    serie.length > 0
      ? serie.reduce((acc, p) => acc + p.ingresosTotal, 0) / serie.length
      : 0;

  const metricaLabel = metricaActiva === "ingresosTotal" ? "Ingresos" : "Unidades vendidas";
  const metricaFormatter = (v: number) =>
    metricaActiva === "ingresosTotal" ? formatCLP(v) : formatNum(v);

  const agruparPorLabel: Record<AgruparPor, string> = {
    dia: "días",
    semana: "semanas",
    mes: "meses",
    año: "años",
  };

  const idRetailerActivo =
    user?.rol === "admin_global_andesml" ? retailerSeleccionado : user?.idRetailer ?? null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="home-layout">
      <Sidebar />

      <main className="home-main pd-main">
        <header className="home-header">
          <div className="pd-header-left">
            {(marcaSeleccionada || retailerSeleccionado) && user?.rol !== "admin_marca" && (

              <button
                className="pd-back-btn"
                onClick={() => {
                  if (marcaSeleccionada) {
                    setMarcaSeleccionada(null);
                    setNombreMarca("");
                    setMetricas(null);
                    setSerie([]);
                  } else {
                    setRetailerSeleccionado(null);
                  }
                }}

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
            )}
            <div>
              <p className="pd-header-sup">Tableros</p>
              <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
                <p className="home-greeting" style={{ margin: 0 }}>
                  Ventas Totales{nombreMarca ? ` — ${nombreMarca}` : ""}
                </p>
                {marcaSeleccionada && (
                  <p style={{ fontSize: "0.75rem", color: "#9ca3af", margin: 0 }}>
                    ID Marca #{marcaSeleccionada}
                    {idRetailerActivo ? ` · ID Retailer #${idRetailerActivo}` : ""}
                  </p>
                )}
              </div>
            </div>
          </div>

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
                    router.push("/login");
                  }}
                >
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="home-content pd-content">

          {/* Selector de retailer — solo admin global */}
          {user?.rol === "admin_global_andesml" && !retailerSeleccionado && (
            <div className="pl-retailer-selector">
              <p className="pl-retailer-selector-title">Selecciona un retailer</p>
              <div className="pl-retailer-grid">
                {retailers.map((r) => (
                  <button
                    key={r.idRetailer}
                    className="pl-retailer-btn"
                    onClick={() => setRetailerSeleccionado(r.idRetailer)}
                  >
                    {r.nombre}
                  </button>
                ))}
              </div>
            </div>
          )}

          {(user?.rol === "admin_global_andesml" || user?.rol === "admin_retailer") &&
            idRetailerActivo &&
            !marcaSeleccionada && (
              <div className="pl-retailer-selector">
                <p className="pl-retailer-selector-title">Selecciona una marca</p>
                <div className="pl-retailer-grid">
                  {marcas.map((m) => (
                    <button
                      key={m.idMarca}
                      className="pl-retailer-btn"
                      onClick={() => {
                        setMarcaSeleccionada(m.idMarca);
                        setNombreMarca(m.nombre);
                      }}
                    >
                      {m.nombre}
                    </button>
                  ))}
                </div>
              </div>
            )}

          {/* Contenido principal — solo cuando hay marca seleccionada */}
          {marcaSeleccionada && (
            <>
              

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

                <div className="pd-chart-area">
                  {loading ? (
                    <div className="pd-skeleton" />
                  ) : serie.length === 0 ? (
                    <div className="pd-empty">
                      <p className="pd-empty-text">No hay datos para el período seleccionado.</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      {tipoGrafico === "line" ? (
                        <LineChart data={serie} margin={{ top: 4, right: 40, left: 10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="periodo" tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                          <YAxis tickFormatter={metricaFormatter} tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} width={88} />
                          <Tooltip
                            formatter={(v) => [metricaFormatter(Number(v ?? 0)), metricaLabel]}
                            contentStyle={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "13px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                          />
                          <Legend formatter={() => metricaLabel} iconType="circle" wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }} />
                          <Line type="monotone" dataKey={metricaActiva} stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4, fill: "#6366f1", strokeWidth: 0 }} activeDot={{ r: 6, fill: "#4f46e5" }} name={metricaLabel} />
                        </LineChart>
                      ) : (
                        <BarChart data={serie} margin={{ top: 4, right: 40, left: 10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="periodo" tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                          <YAxis tickFormatter={metricaFormatter} tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} width={88} />
                          <Tooltip
                            formatter={(v) => [metricaFormatter(Number(v ?? 0)), metricaLabel]}
                            contentStyle={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "13px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                          />
                          <Legend formatter={() => metricaLabel} wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }} />
                          <Bar dataKey={metricaActiva} fill="#6366f1" radius={[4, 4, 0, 0]} name={metricaLabel} />
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  )}
                </div>
              </section>

              {/* Tabla de detalle */}
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
                        </tr>
                      </thead>
                      <tbody>
                        {serie.map((row, i) => (
                          <tr key={row.periodo} className={`pd-tr${i % 2 !== 0 ? " pd-tr--alt" : ""}`}>
                            <td className="pd-td pd-td--mono">{row.periodo}</td>
                            <td className="pd-td pd-td--right">{formatCLP(row.ingresosTotal)}</td>
                            <td className="pd-td pd-td--right">{formatNum(row.unidadesVendidas)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </>
          )}

        </div>
      </main>
    </div>
  );
}
