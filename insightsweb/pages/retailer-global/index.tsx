import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import Sidebar from "../../components/Sidebar";
import { apiFetch } from "../../lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type Rol = "admin_global_andesml" | "admin_retailer" | "admin_marca";

interface User {
  idUsuario: number;
  idRetailer: number | null;
  idMarca: number | null;
  nombre: string;
  email: string;
  rol: Rol;
  retailerNombre?: string;
}

interface RetailerResumen {
  idRetailer: number;
  nombre: string;
}

interface MarcaComparativo {
  idMarca: number;
  nombre: string;
  ingresosTotal: number;
  totalTransacciones: number;
  clientesUnicos: number;
  presenciaCarritos: number;
}

type MetricaComparativo = "ingresosTotal" | "totalTransacciones" | "presenciaCarritos";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getIsoToday() {
  return new Date().toISOString().slice(0, 10);
}

function getSixMonthsAgo() {
  const d = new Date();
  d.setMonth(d.getMonth() - 6);
  return d.toISOString().slice(0, 10);
}

function formatCLP(v: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(v);
}

function formatNum(v: number) {
  return new Intl.NumberFormat("es-CL").format(v);
}

function formatPct(v: number) {
  return `${(v * 100).toFixed(1)}%`;
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

function BrandRankList({
  marcas,
  metrica,
  formatter,
  maxVal,
  accent,
}: {
  marcas: MarcaComparativo[];
  metrica: MetricaComparativo;
  formatter: (v: number) => string;
  maxVal: number;
  accent: string;
}) {
  if (marcas.length === 0) {
    return <p className="pd-empty-text" style={{ padding: "1rem 0" }}>Sin datos.</p>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
      {marcas.map((m, i) => {
        const val = m[metrica] as number;
        const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
        return (
          <div key={m.idMarca} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ width: "1.4rem", fontSize: "0.75rem", color: "#9ca3af", flexShrink: 0, textAlign: "right" }}>
              #{i + 1}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: 500, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {m.nombre ?? `Marca #${m.idMarca}`}
                </span>
                <span style={{ fontSize: "0.8rem", color: "#374151", flexShrink: 0, marginLeft: "0.5rem" }}>
                  {formatter(val)}
                </span>
              </div>
              <div style={{ height: "5px", background: "#f3f4f6", borderRadius: "3px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: accent, borderRadius: "3px", transition: "width 0.4s ease" }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RetailerGlobalPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const [retailers, setRetailers] = useState<RetailerResumen[]>([]);
  const [retailerSeleccionado, setRetailerSeleccionado] = useState<number | null>(null);

  const [desde, setDesde] = useState(getSixMonthsAgo());
  const [hasta, setHasta] = useState(getIsoToday());

  const [comparativo, setComparativo] = useState<MarcaComparativo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metrica, setMetrica] = useState<MetricaComparativo>("ingresosTotal");

  // ── Auth guard ────────────────────────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) { router.push("/login"); return; }

    const parsed: User = JSON.parse(stored);
    if (parsed.rol === "admin_marca") { router.push("/home"); return; }

    setUser(parsed);

    if (parsed.rol === "admin_retailer" && parsed.idRetailer) {
      setRetailerSeleccionado(parsed.idRetailer);
    }
  }, [router]);

  // ── Fetch retailers (solo admin_global_andesml) ───────────────────────────
  useEffect(() => {
    if (!user || user.rol !== "admin_global_andesml") return;
    apiFetch("/db/retailers")
      .then((r) => r.json())
      .then((data: RetailerResumen[]) => setRetailers(data))
      .catch(() => {});
  }, [user]);

  // ── Derived (antes del callback para poder usarlo) ────────────────────────
  const idRetailerActivo =
    user?.rol === "admin_global_andesml" ? retailerSeleccionado : user?.idRetailer ?? null;

  const nombreRetailerActivo =
    user?.rol === "admin_global_andesml"
      ? retailers.find((r) => r.idRetailer === retailerSeleccionado)?.nombre ?? ""
      : user?.retailerNombre ?? "";

  // ── Fetch comparativo ─────────────────────────────────────────────────────
  const fetchComparativo = useCallback(async () => {
    if (!idRetailerActivo) return;
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (desde) qs.set("desde", desde);
      if (hasta) qs.set("hasta", hasta);
      const res = await apiFetch(`/db/retailers/${idRetailerActivo}/marcas/comparativo?${qs}`);
      if (!res.ok) throw new Error("Error al cargar los datos.");
      const data: MarcaComparativo[] = await res.json();
      setComparativo(data);
    } catch (e) {
      setError((e as Error).message ?? "Error desconocido.");
    } finally {
      setLoading(false);
    }
  }, [idRetailerActivo, desde, hasta]);

  useEffect(() => { fetchComparativo(); }, [fetchComparativo]);

  // ── KPIs derivados del comparativo ───────────────────────────────────────
  const ingresosCanal = comparativo.reduce((s, m) => s + m.ingresosTotal, 0);
  const transaccionesCanal = comparativo.reduce((s, m) => s + m.totalTransacciones, 0);
  const marcasActivasCount = comparativo.filter((m) => m.totalTransacciones > 0).length;
  const ticketPromedio = transaccionesCanal > 0 ? ingresosCanal / transaccionesCanal : 0;
  const clientesCanal = comparativo.reduce((s, m) => s + m.clientesUnicos, 0);

  // ── Top 10 / Bottom 10 ───────────────────────────────────────────────────
  const sorted = [...comparativo].sort((a, b) => b[metrica] - a[metrica]);
  const top10 = sorted.slice(0, 10);
  const marcasConActividad = comparativo.filter((m) => m.totalTransacciones > 0);
  const bottom10 = [...marcasConActividad].sort((a, b) => a[metrica] - b[metrica]).slice(0, 10);

  const metricaOpts: { value: MetricaComparativo; label: string }[] = [
    { value: "ingresosTotal",      label: "Ingresos" },
    { value: "totalTransacciones", label: "Transacciones" },
    { value: "presenciaCarritos",  label: "Presencia en carrito" },
  ];
  const metricaFormatter = (v: number) =>
    metrica === "ingresosTotal"      ? formatCLP(v) :
    metrica === "presenciaCarritos"  ? formatPct(v) :
    formatNum(v);
  const maxTop    = top10[0]?.[metrica]    as number ?? 1;
  const maxBottom = bottom10[0]?.[metrica] as number ?? 1;

  const initials = (user?.nombre ?? "U")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="home-layout">
      <Sidebar />

      <main className="home-main pd-main">
        <header className="home-header">
          <div className="pd-header-left">
            <div>
              <p className="pd-header-sup">Tableros</p>
              <p className="home-greeting" style={{ margin: 0 }}>
                Dashboard Global de Retailer
                {nombreRetailerActivo ? ` — ${nombreRetailerActivo}` : ""}
              </p>
              <p style={{ fontSize: "0.8rem", color: "#9ca3af", margin: "2px 0 0 0" }}>
                Comparativo de desempeño entre marcas del canal
              </p>
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

          {/* Barra de filtros */}
          <section className="pd-filters-bar">
            {user?.rol === "admin_global_andesml" && (
              <div className="pd-filter-group">
                <label className="pd-filter-label">Retailer</label>
                <select
                  className="pd-filter-input"
                  value={retailerSeleccionado ?? ""}
                  onChange={(e) =>
                    setRetailerSeleccionado(e.target.value ? Number(e.target.value) : null)
                  }
                >
                  <option value="">Selecciona un retailer</option>
                  {retailers.map((r) => (
                    <option key={r.idRetailer} value={r.idRetailer}>{r.nombre}</option>
                  ))}
                </select>
              </div>
            )}

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

            {idRetailerActivo && (
              <button className="pd-apply-btn" onClick={fetchComparativo} disabled={loading}>
                {loading ? "Cargando…" : "Aplicar"}
              </button>
            )}
          </section>

          {/* Sin retailer seleccionado */}
          {!idRetailerActivo && (
            <div className="pd-empty" style={{ marginTop: "3rem" }}>
              <p className="pd-empty-text">Selecciona un retailer para ver el dashboard global.</p>
            </div>
          )}

          {/* Contenido principal */}
          {idRetailerActivo && (
            <>
              {error && <div className="pd-error-banner">{error}</div>}

              {/* KPIs totales del canal */}
              <section className="pd-kpi-row">
                <KpiCard
                  label="Ingresos totales del canal"
                  value={loading ? "—" : formatCLP(ingresosCanal)}
                />
                <KpiCard
                  label="Transacciones totales"
                  value={loading ? "—" : formatNum(transaccionesCanal)}
                />
                <KpiCard
                  label="Marcas activas"
                  value={loading ? "—" : String(marcasActivasCount)}
                  sub={`de ${comparativo.length} marcas`}
                />
                <KpiCard
                  label="Ticket promedio del canal"
                  value={loading ? "—" : formatCLP(ticketPromedio)}
                />
                <KpiCard
                  label="Clientes únicos del canal"
                  value={loading ? "—" : formatNum(clientesCanal)}
                />
              </section>

              {loading && <div className="pd-skeleton" style={{ marginTop: "1.5rem", height: 80 }} />}

              {/* Selector de métrica para los rankings */}
              {!loading && comparativo.length > 0 && (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: "2rem", marginBottom: "1rem" }}>
                    <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "#111827", margin: 0 }}>
                      Ranking de marcas
                    </h2>
                    <select
                      className="pd-filter-input"
                      style={{ width: "auto" }}
                      value={metrica}
                      onChange={(e) => setMetrica(e.target.value as MetricaComparativo)}
                    >
                      {metricaOpts.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>

                    {/* Top 10 mejores */}
                    <section className="pd-card">
                      <div className="pd-card-header">
                        <h2 className="pd-card-title">Top 10 mejores</h2>
                        <span className="pd-table-count">{top10.length} marcas</span>
                      </div>
                      <BrandRankList
                        marcas={top10}
                        metrica={metrica}
                        formatter={metricaFormatter}
                        maxVal={maxTop}
                        accent="#6366f1"
                      />
                    </section>

                    {/* Top 10 peores */}
                    <section className="pd-card">
                      <div className="pd-card-header">
                        <h2 className="pd-card-title">Top 10 con menor desempeño</h2>
                        <span className="pd-table-count">{bottom10.length} marcas</span>
                      </div>
                      <BrandRankList
                        marcas={bottom10}
                        metrica={metrica}
                        formatter={metricaFormatter}
                        maxVal={maxBottom}
                        accent="#f59e0b"
                      />
                    </section>

                  </div>
                </>
              )}
            </>
          )}

        </div>
      </main>
    </div>
  );
}
