import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Sidebar from "../../components/Sidebar";
import { apiFetch } from "../../lib/api";

interface ProductoGapRentabilidad {
  idProducto: number;
  nombre: string;
  precioUnitario: number;
  costoUnitario: number;
  margenPct: number;
  unidadesVendidas: number;
}

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

function getEndpoint(user: User, retailerSeleccionado: number | null, umbral: number): string {
  switch (user.rol) {
    case "admin_global_andesml":
      if (!retailerSeleccionado) throw new Error("Sin retailer");
      return `/db/retailers/${retailerSeleccionado}/productos/gaps-rentabilidad?umbral=${umbral}`;
    case "admin_retailer":
      return `/db/retailers/${user.idRetailer}/productos/gaps-rentabilidad?umbral=${umbral}`;
    case "admin_marca":
      return `/db/marcas/${user.idMarca}/productos/gaps-rentabilidad?umbral=${umbral}`;
  }
}

function formatCLP(v: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(v);
}

function getMargenRowClass(margen: number): string {
  if (margen < 0) return "rend-tr--danger";
  if (margen < 10) return "rend-tr--warning";
  return "";
}

function MargenBadge({ margen }: { margen: number }) {
  const color = margen < 0 ? "#ef4444" : margen < 10 ? "#f59e0b" : "#10b981";
  return (
    <span className="rend-badge" style={{ background: `${color}18`, color }}>
      {margen.toFixed(2)}%
    </span>
  );
}

export default function GapsRentabilidadPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [retailers, setRetailers] = useState<RetailerResumen[]>([]);
  const [retailerSeleccionado, setRetailerSeleccionado] = useState<number | null>(null);
  const [umbral, setUmbral] = useState("10");
  const [productos, setProductos] = useState<ProductoGapRentabilidad[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const PAGE_SIZE = 20;

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) { router.push("/login"); return; }
    setUser(JSON.parse(stored));
  }, [router]);

  useEffect(() => {
    if (!user || user.rol !== "admin_global_andesml") return;
    apiFetch("/db/retailers")
      .then((r) => r.json())
      .then((data: RetailerResumen[]) => setRetailers(data))
      .catch(() => setError("No se pudieron cargar los retailers."));
  }, [user]);

  const buscar = async () => {
    if (!user) return;

    const umbralNum = parseFloat(umbral);
    if (isNaN(umbralNum) || umbralNum < -100 || umbralNum > 100) {
      setError("El umbral debe ser un número entre -100 y 100.");
      return;
    }

    let endpoint: string;
    try {
      endpoint = getEndpoint(user, retailerSeleccionado, umbralNum);
    } catch {
      setError("Selecciona un retailer antes de buscar.");
      return;
    }

    setLoading(true);
    setError(null);
    setProductos(null);
    setCurrentPage(0);

    try {
      const res = await apiFetch(endpoint);
      if (!res.ok) throw new Error("No se pudieron cargar los datos.");
      const data: ProductoGapRentabilidad[] = await res.json();
      setProductos(data);
    } catch (e) {
      setError((e as Error).message ?? "Error desconocido.");
    } finally {
      setLoading(false);
    }
  };

  const initials = (user?.nombre ?? "U")
    .split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  const umbralNum = parseFloat(umbral);
  const buscarDeshabilitado =
    loading ||
    isNaN(umbralNum) ||
    (user?.rol === "admin_global_andesml" && !retailerSeleccionado);

  const totalPages = productos ? Math.ceil(productos.length / PAGE_SIZE) : 0;
  const productosPagina = productos ? productos.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE) : [];

  return (
    <div className="home-layout">
      <Sidebar />

      <main className="home-main">
        <header className="home-header">
          <div>
            <p className="pl-header-sup">Análisis de Catálogo</p>
            <p className="home-greeting">Gaps de Rentabilidad</p>
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

        <div className="home-content pl-content">
          {user?.rol === "admin_global_andesml" && (
            <div className="pl-retailer-selector">
              <p className="pl-retailer-selector-title">
                Selecciona un retailer para analizar sus productos
              </p>
              <div className="pl-retailer-grid">
                {retailers.map((r) => (
                  <button
                    key={r.idRetailer}
                    className={`pl-retailer-btn${retailerSeleccionado === r.idRetailer ? " pl-retailer-btn--active" : ""}`}
                    onClick={() => setRetailerSeleccionado(r.idRetailer)}
                  >
                    {r.nombre}
                  </button>
                ))}
              </div>
            </div>
          )}

          <section className="rend-filters-bar">
            <div className="rend-filter-group">
              <label className="rend-filter-label">Umbral de margen (%)</label>
              <input
                type="number"
                min="-100"
                max="100"
                step="1"
                className="rend-filter-input"
                value={umbral}
                onChange={(e) => setUmbral(e.target.value)}
                placeholder="Ej: 10"
              />
            </div>
            <button
              className="rend-apply-btn"
              onClick={buscar}
              disabled={buscarDeshabilitado}
            >
              {loading ? "Buscando…" : "Buscar"}
            </button>
            <p className="rend-hint">
              Muestra productos cuyo margen de ganancia está por debajo del umbral. Valores negativos indican venta a pérdida.
            </p>
          </section>

          {error && <div className="rend-error-banner">{error}</div>}

          {loading && (
            <section className="rend-card">
              <div className="rend-card-header">
                <h2 className="rend-card-title">Productos con gaps de rentabilidad</h2>
              </div>
              <div className="rend-table-wrapper">
                <table className="rend-table">
                  <thead>
                    <tr>
                      <th className="rend-th">Producto</th>
                      <th className="rend-th rend-th--right">Precio venta</th>
                      <th className="rend-th rend-th--right">Costo</th>
                      <th className="rend-th rend-th--right">Unidades vendidas</th>
                      <th className="rend-th rend-th--right">Margen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className={`rend-tr${i % 2 !== 0 ? " rend-tr--alt" : ""}`}>
                        <td className="rend-td">
                          <div className="rend-skeleton-line" style={{ width: "60%" }} />
                        </td>
                        <td className="rend-td rend-td--right">
                          <div className="rend-skeleton-line rend-skeleton-right" />
                        </td>
                        <td className="rend-td rend-td--right">
                          <div className="rend-skeleton-line rend-skeleton-right" />
                        </td>
                        <td className="rend-td rend-td--right">
                          <div className="rend-skeleton-line rend-skeleton-right" style={{ width: 60 }} />
                        </td>
                        <td className="rend-td rend-td--right">
                          <div className="rend-skeleton-line rend-skeleton-right" style={{ width: 50 }} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {!loading && productos !== null && (
            <section className="rend-card">
              <div className="rend-card-header">
                <h2 className="rend-card-title">Productos con gaps de rentabilidad</h2>
                <span className="rend-table-count">
                  {productos.length === 0
                    ? "Sin resultados"
                    : `${productos.length} producto${productos.length !== 1 ? "s" : ""}`}
                </span>
              </div>

              {productos.length === 0 ? (
                <div className="rend-empty">
                  <p className="rend-empty-text">
                    No hay productos con margen por debajo del {umbralNum.toFixed(0)}%.
                  </p>
                </div>
              ) : (
                <>
                  <div className="rend-table-wrapper">
                    <table className="rend-table">
                      <thead>
                        <tr>
                          <th className="rend-th">Producto</th>
                          <th className="rend-th rend-th--right">Precio venta</th>
                          <th className="rend-th rend-th--right">Costo</th>
                          <th className="rend-th rend-th--right">Unidades vendidas</th>
                          <th className="rend-th rend-th--right">Margen</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productosPagina.map((p, i) => {
                          const margenClass = getMargenRowClass(p.margenPct);
                          const unidades = p.unidadesVendidas ?? 0;
                          return (
                            <tr
                              key={p.idProducto}
                              className={`rend-tr${i % 2 !== 0 && !margenClass ? " rend-tr--alt" : ""} ${margenClass}`}
                            >
                              <td className="rend-td">
                                <span style={{ fontWeight: 500 }}>{p.nombre}</span>
                                <span className="rend-td-id">#{p.idProducto}</span>
                              </td>
                              <td className="rend-td rend-td--right">{formatCLP(p.precioUnitario)}</td>
                              <td className="rend-td rend-td--right">{formatCLP(p.costoUnitario)}</td>
                              <td className="rend-td rend-td--right">{unidades.toLocaleString("es-CL")}</td>
                              <td className="rend-td rend-td--right">
                                <MargenBadge margen={p.margenPct} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {totalPages > 1 && (
                    <div className="pl-pagination" style={{ paddingTop: 16 }}>
                      <button className="pl-pagination-btn" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 0}>←</button>
                      {Array.from({ length: totalPages }, (_, i) => {
                        const showPage = i === 0 || i === totalPages - 1 || Math.abs(i - currentPage) <= 1;
                        const showEllipsisBefore = i === 1 && currentPage > 3;
                        const showEllipsisAfter = i === totalPages - 2 && currentPage < totalPages - 4;

                        if (showEllipsisBefore || showEllipsisAfter) {
                          return <span key={i} className="pl-pagination-ellipsis">…</span>;
                        }
                        if (!showPage) return null;
                        return (
                          <button
                            key={i}
                            className={`pl-pagination-num${currentPage === i ? " pl-pagination-num--active" : ""}`}
                            onClick={() => setCurrentPage(i)}
                          >
                            {i + 1}
                          </button>
                        );
                      })}
                      <button className="pl-pagination-btn" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage >= totalPages - 1}>→</button>
                    </div>
                  )}
                </>
              )}

              <div style={{ marginTop: 14, display: "flex", gap: 16, flexWrap: "wrap" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.75rem", color: "#6b7280" }}>
                  <span style={{ width: 12, height: 12, borderRadius: 3, background: "#fef2f2", border: "1px solid #fecaca", display: "inline-block" }} />
                  Pérdida (margen negativo)
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.75rem", color: "#6b7280" }}>
                  <span style={{ width: 12, height: 12, borderRadius: 3, background: "#fffbeb", border: "1px solid #fde68a", display: "inline-block" }} />
                  Margen muy bajo (&lt; 10%)
                </span>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
