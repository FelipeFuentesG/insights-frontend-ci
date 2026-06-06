import { useState, useEffect } from "react";
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getIsoToday() {
  return new Date().toISOString().slice(0, 10);
}

function getSixMonthsAgo() {
  const d = new Date();
  d.setMonth(d.getMonth() - 6);
  return d.toISOString().slice(0, 10);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RetailerGlobalPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // Retailers (solo admin_global_andesml)
  const [retailers, setRetailers] = useState<RetailerResumen[]>([]);
  const [retailerSeleccionado, setRetailerSeleccionado] = useState<number | null>(null);

  // Filtros de fecha
  const [desde, setDesde] = useState(getSixMonthsAgo());
  const [hasta, setHasta] = useState(getIsoToday());

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

  // ── Derived ───────────────────────────────────────────────────────────────
  const initials = (user?.nombre ?? "U")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const idRetailerActivo =
    user?.rol === "admin_global_andesml" ? retailerSeleccionado : user?.idRetailer ?? null;

  const nombreRetailerActivo =
    user?.rol === "admin_global_andesml"
      ? retailers.find((r) => r.idRetailer === retailerSeleccionado)?.nombre ?? ""
      : user?.retailerNombre ?? "";

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

            {/* Selector de retailer — solo admin_global_andesml */}
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
                    <option key={r.idRetailer} value={r.idRetailer}>
                      {r.nombre}
                    </option>
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
          </section>

          {/* Contenido — vacío hasta parte 2 */}
          {!idRetailerActivo ? (
            <div className="pd-empty" style={{ marginTop: "3rem" }}>
              <p className="pd-empty-text">
                Selecciona un retailer para ver el dashboard global.
              </p>
            </div>
          ) : (
            <div className="pd-empty" style={{ marginTop: "3rem" }}>
              <p className="pd-empty-text">
                Retailer seleccionado: <strong>{nombreRetailerActivo || `#${idRetailerActivo}`}</strong>
                <br />
                Período: {desde} → {hasta}
                <br />
                <span style={{ color: "#6b7280" }}>Métricas en construcción (Parte 2).</span>
              </p>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
