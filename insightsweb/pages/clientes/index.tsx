import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/router";
import Sidebar from "../../components/Sidebar";
import { fetchClientesSerie, ClientesPeriodo } from "../../lib/api";
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

type AgruparPor = "dia" | "semana" | "mes" | "año";
type TipoGrafico = "line" | "bar";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatNum(value: number): string {
  return new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(value);
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

export default function ClientesPage() {
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

  // Datos
  const [serie, setSerie] = useState<ClientesPeriodo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  }, [marcaSeleccionada]);

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
      return;
    }

    if (!idRetailer) return;

    setMarcas([]);
    setMarcaSeleccionada(null);

    apiFetch(`/db/retailers/${idRetailer}/marcas`)
      .then((res) => res.json())
      .then((data: MarcaResumen[]) => setMarcas(data))
      .catch(() => setError("No se pudieron cargar las marcas."));
  }, [user, retailerSeleccionado]);

  // ── Derived: effective IDs ─────────────────────────────────────────────────
  const effectiveIdMarca = marcaSeleccionada;
  const effectiveIdRetailer =
    user?.rol === "admin_global_andesml" ? retailerSeleccionado : user?.idRetailer ?? null;

  const hasTarget = Boolean(effectiveIdMarca || effectiveIdRetailer);

  // ── Fetch clientes ─────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!effectiveIdMarca && !effectiveIdRetailer) return;
    setLoading(true);
    setError(null);

    try {
      let data: ClientesPeriodo[];
      if (effectiveIdMarca) {
        data = await fetchClientesSerie("marca", String(effectiveIdMarca), desde, hasta, agruparPor);
      } else {
        data = await fetchClientesSerie("retailer", String(effectiveIdRetailer!), desde, hasta, agruparPor);
      }
      setSerie(data);
    } catch (e) {
      setError((e as Error).message ?? "Error desconocido.");
    } finally {
      setLoading(false);
    }
  }, [effectiveIdMarca, effectiveIdRetailer, desde, hasta, agruparPor]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Derived stats ─────────────────────────────────────────────────────────
  const initials = (user?.nombre ?? "U")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const totalClientes = serie.reduce((acc, p) => acc + p.totalClientes, 0);
  const promedio = serie.length > 0 ? totalClientes / serie.length : 0;

  const agruparPorLabel: Record<AgruparPor, string> = {
    dia: "días",
    semana: "semanas",
    mes: "meses",
    año: "años",
  };

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
                  Dashboard de Clientes{nombreMarca ? ` — ${nombreMarca}` : ""}
                </p>
                {hasTarget && (
                  <p style={{ fontSize: "0.75rem", color: "#9ca3af", margin: 0 }}>
                    {effectiveIdMarca ? `ID Marca #${effectiveIdMarca}` : ""}
                    {effectiveIdRetailer ? ` · ID Retailer #${effectiveIdRetailer}` : ""}
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

          {/* Selector de marca — admin global (ya tiene retailer) o admin_retailer */}
          {(user?.rol === "admin_global_andesml" || user?.rol === "admin_retailer") &&
            effectiveIdRetailer &&
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

          {/* Contenido principal */}
          {hasTarget && (effectiveIdMarca || user?.rol === "admin_retailer") && (
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
                  label="Total clientes únicos"
                  value={serie.length > 0 ? formatNum(totalClientes) : "—"}
                />
                <KpiCard
                  label="Promedio por período"
                  value={serie.length > 0 ? formatNum(Math.round(promedio)) : "—"}
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
                    <h2 className="pd-card-title">Evolución de clientes totales</h2>
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
                      <p className="pd-empty-text">No hay datos para el período seleccionado.</p>
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
                          <XAxis dataKey="periodo" tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                          <YAxis tickFormatter={formatNum} tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} width={72} />
                          <Tooltip
                            formatter={(v) => [formatNum(Number(v ?? 0)), "Clientes únicos"]}
                            contentStyle={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "13px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                          />
                          <Legend formatter={() => "Clientes únicos"} iconType="circle" wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }} />
                          <Line type="monotone" dataKey="totalClientes" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: "#10b981", strokeWidth: 0 }} activeDot={{ r: 6, fill: "#059669" }} name="Clientes únicos" />
                        </LineChart>
                      ) : (
                        <BarChart 
                          width={Math.max(chartContainerWidth, serie.length * 80)}
                          height={300}
                          data={serie}
                          margin={{ top: 4, right: 40, left: 10, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="periodo" tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                          <YAxis tickFormatter={formatNum} tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} width={72} />
                          <Tooltip
                            formatter={(v) => [formatNum(Number(v ?? 0)), "Clientes únicos"]}
                            contentStyle={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "13px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                          />
                          <Legend formatter={() => "Clientes únicos"} wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }} />
                          <Bar dataKey="totalClientes" fill="#10b981" radius={[4, 4, 0, 0]} name="Clientes únicos" />
                        </BarChart>
                      )}
                    </div>
                    </div>
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
                          <th className="pd-th pd-th--right">Clientes únicos</th>
                        </tr>
                      </thead>
                      <tbody>
                        {serie.map((row, i) => (
                          <tr key={row.periodo} className={`pd-tr${i % 2 !== 0 ? " pd-tr--alt" : ""}`}>
                            <td className="pd-td pd-td--mono">{row.periodo}</td>
                            <td className="pd-td pd-td--right">{formatNum(row.totalClientes)}</td>
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
