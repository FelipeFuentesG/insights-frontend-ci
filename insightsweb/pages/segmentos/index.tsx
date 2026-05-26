import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/router";
import Sidebar from "../../components/Sidebar";
import { apiFetch, fetchClientesRaw, ClienteRaw } from "../../lib/api";
import {
  PieChart,
  Pie,
  Tooltip,
  Legend,
  ResponsiveContainer,
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

type SegmentoTab = "sociodemografico" | "compras";
type Dimension = "edad" | "genero" | "comuna";

interface SliceDatum {
  name: string;
  value: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatNum(value: number): string {
  return new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(value);
}

const EDAD_BUCKETS: { label: string; min: number; max: number }[] = [
  { label: "0-17", min: 0, max: 17 },
  { label: "18-24", min: 18, max: 24 },
  { label: "25-34", min: 25, max: 34 },
  { label: "35-44", min: 35, max: 44 },
  { label: "45-54", min: 45, max: 54 },
  { label: "55-64", min: 55, max: 64 },
  { label: "65+", min: 65, max: Number.POSITIVE_INFINITY },
];

function bucketEdad(edad: number): string {
  const b = EDAD_BUCKETS.find((b) => edad >= b.min && edad <= b.max);
  return b ? b.label : "Sin dato";
}

function aggregate(
  clientes: ClienteRaw[],
  dimension: Dimension
): SliceDatum[] {
  const counts = new Map<string, number>();

  for (const c of clientes) {
    let key: string;
    if (dimension === "edad") {
      key = c.edad == null ? "Sin dato" : bucketEdad(Number(c.edad));
    } else if (dimension === "genero") {
      key = (c.genero ?? "").trim() || "Sin dato";
    } else {
      key = (c.comuna ?? "").trim() || "Sin dato";
    }
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const data: SliceDatum[] = Array.from(counts.entries()).map(([name, value]) => ({
    name,
    value,
  }));

  if (dimension === "edad") {
    const order = [...EDAD_BUCKETS.map((b) => b.label), "Sin dato"];
    data.sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
  } else {
    data.sort((a, b) => b.value - a.value);
  }

  return data;
}

const PIE_COLORS = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
  "#f97316",
  "#3b82f6",
  "#a855f7",
  "#14b8a6",
];

// ─── Sub-componentes ──────────────────────────────────────────────────────────

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

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="pd-kpi-card">
      <p className="pd-kpi-label">{label}</p>
      <p className="pd-kpi-value">{value}</p>
      {sub && <p className="pd-kpi-sub">{sub}</p>}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SegmentosPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // Selectores
  const [retailers, setRetailers] = useState<RetailerResumen[]>([]);
  const [marcas, setMarcas] = useState<MarcaResumen[]>([]);
  const [retailerSeleccionado, setRetailerSeleccionado] = useState<number | null>(null);
  const [marcaSeleccionada, setMarcaSeleccionada] = useState<number | null>(null);
  const [nombreMarca, setNombreMarca] = useState<string>("");

  // Tab y dimensión
  const [tab, setTab] = useState<SegmentoTab>("sociodemografico");
  const [dimension, setDimension] = useState<Dimension>("edad");

  // Datos
  const [clientes, setClientes] = useState<ClienteRaw[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Layout responsive
  const chartContainerRef = useRef<HTMLDivElement>(null);

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

  const effectiveIdMarca = marcaSeleccionada;
  const effectiveIdRetailer =
    user?.rol === "admin_global_andesml" ? retailerSeleccionado : user?.idRetailer ?? null;

  const hasTarget = Boolean(effectiveIdMarca);

  // ── Fetch clientes (raw) y filtrar en frontend por marca ──────────────────
  const fetchData = useCallback(async () => {
    if (!effectiveIdMarca) return;
    setLoading(true);
    setError(null);
    try {
      const raw = await fetchClientesRaw();
      const filtrados = raw.filter((c) => Number(c.id_marca) === Number(effectiveIdMarca));
      setClientes(filtrados);
    } catch (e) {
      setError((e as Error).message ?? "Error desconocido.");
    } finally {
      setLoading(false);
    }
  }, [effectiveIdMarca]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Derivados ──────────────────────────────────────────────────────────────
  const initials = (user?.nombre ?? "U")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const sliceData = useMemo(
    () =>
      aggregate(clientes, dimension).map((d, i) => ({
        ...d,
        fill: PIE_COLORS[i % PIE_COLORS.length],
      })),
    [clientes, dimension]
  );

  const totalClientes = clientes.length;
  const valoresUnicos = sliceData.length;
  const topSegmento = sliceData[0];

  const dimensionLabel: Record<Dimension, string> = {
    edad: "Edad",
    genero: "Género",
    comuna: "Comuna",
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
                    setClientes([]);
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
                  Segmentos de Clientes{nombreMarca ? ` — ${nombreMarca}` : ""}
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

          {/* Selector de marca */}
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
          {hasTarget && (
            <>
              {/* Tabs principales */}
              <div className="home-tabs">
                <button
                  className={`home-tab${tab === "sociodemografico" ? " active" : ""}`}
                  onClick={() => setTab("sociodemografico")}
                >
                  Sociodemográfico
                </button>
                <button
                  className={`home-tab${tab === "compras" ? " active" : ""}`}
                  onClick={() => setTab("compras")}
                >
                  Compras
                </button>
              </div>

              {error && <div className="pd-error-banner">{error}</div>}

              {tab === "sociodemografico" && (
                <>
                  {/* KPIs */}
                  <section className="pd-kpi-row">
                    <KpiCard
                      label="Total clientes"
                      value={loading ? "—" : formatNum(totalClientes)}
                    />
                    <KpiCard
                      label={`Valores únicos (${dimensionLabel[dimension].toLowerCase()})`}
                      value={loading ? "—" : formatNum(valoresUnicos)}
                    />
                    <KpiCard
                      label="Segmento mayoritario"
                      value={loading || !topSegmento ? "—" : topSegmento.name}
                      sub={
                        loading || !topSegmento
                          ? undefined
                          : `${formatNum(topSegmento.value)} clientes (${
                              totalClientes > 0
                                ? Math.round((topSegmento.value / totalClientes) * 100)
                                : 0
                            }%)`
                      }
                    />
                  </section>

                  {/* Gráfico de torta */}
                  <section className="pd-card">
                    <div className="pd-card-header">
                      <div className="pd-card-header-left">
                        <h2 className="pd-card-title">
                          Distribución por {dimensionLabel[dimension].toLowerCase()}
                        </h2>
                      </div>
                      <SegmentedControl<Dimension>
                        options={[
                          { value: "edad", label: "Edad" },
                          { value: "genero", label: "Género" },
                          { value: "comuna", label: "Comuna" },
                        ]}
                        value={dimension}
                        onChange={setDimension}
                        accent
                      />
                    </div>

                    <div className="pd-chart-area" ref={chartContainerRef}>
                      {loading ? (
                        <div className="pd-skeleton" />
                      ) : sliceData.length === 0 ? (
                        <div className="pd-empty">
                          <p className="pd-empty-text">
                            No hay clientes disponibles para esta marca.
                          </p>
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height={360}>
                          <PieChart>
                            <Pie
                              data={sliceData}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius={120}
                              innerRadius={60}
                              paddingAngle={2}
                              label={({ name, percent }) =>
                                `${name} (${Math.round((percent ?? 0) * 100)}%)`
                              }
                              labelLine={false}
                            />
                            <Tooltip
                              formatter={(v, n) => [formatNum(Number(v ?? 0)), String(n)]}
                              contentStyle={{
                                background: "#ffffff",
                                border: "1px solid #e5e7eb",
                                borderRadius: "8px",
                                fontSize: "13px",
                                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                              }}
                            />
                            <Legend
                              iconType="circle"
                              wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </section>

                  {/* Tabla de detalle */}
                  {!loading && sliceData.length > 0 && (
                    <section className="pd-card">
                      <div className="pd-card-header">
                        <h2 className="pd-card-title">Detalle por segmento</h2>
                        <span className="pd-table-count">{sliceData.length} segmentos</span>
                      </div>
                      <div className="pd-table-wrapper">
                        <table className="pd-table">
                          <thead>
                            <tr>
                              <th className="pd-th">{dimensionLabel[dimension]}</th>
                              <th className="pd-th pd-th--right">Clientes</th>
                              <th className="pd-th pd-th--right">%</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sliceData.map((row, i) => (
                              <tr
                                key={row.name}
                                className={`pd-tr${i % 2 !== 0 ? " pd-tr--alt" : ""}`}
                              >
                                <td className="pd-td">{row.name}</td>
                                <td className="pd-td pd-td--right">{formatNum(row.value)}</td>
                                <td className="pd-td pd-td--right">
                                  {totalClientes > 0
                                    ? `${Math.round((row.value / totalClientes) * 100)}%`
                                    : "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  )}
                </>
              )}

              {tab === "compras" && (
                <section className="pd-card">
                  <div className="pd-empty">
                    <p className="pd-empty-text">
                      Segmentación por compras en construcción.
                    </p>
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
