import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Sidebar from "../../components/Sidebar";
import { apiFetch } from "../../lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProductoResumen {
  idProducto: number;
  nombre: string;
  urlImagen: string | null;
}

type Rol = "admin" | "retailer" | "marca";

interface User {
  idUsuario: number;
  idRetailer: number | null;
  idMarca: number | null;
  nombre: string;
  email: string;
  rol: Rol;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getEndpoint(user: User): string {
  switch (user.rol) {
    case "admin":
      // Admin global: usa retailer 1 como punto de entrada o
      // en el futuro tendrá su propio endpoint. Por ahora
      // se puede extender cuando exista el endpoint de admin.
      throw new Error("El admin global debe seleccionar un retailer primero.");
    case "retailer":
      return `/db/retailers/${user.idRetailer}/productos`;
    case "marca":
      return `/db/marcas/${user.idMarca}/productos`;
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProductoCard({
  producto,
  onClick,
}: {
  producto: ProductoResumen;
  onClick: () => void;
}) {
  return (
    <button className="pl-card" onClick={onClick}>
      <div className="pl-card-img-wrapper">
        {producto.urlImagen ? (
          <img
            src={producto.urlImagen}
            alt={producto.nombre}
            className="pl-card-img"
          />
        ) : (
          <div className="pl-card-img-placeholder">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="3" stroke="#d1d5db" strokeWidth="1.5" />
              <circle cx="8.5" cy="8.5" r="1.5" stroke="#d1d5db" strokeWidth="1.5" />
              <path d="M3 15l5-4 4 3 3-2.5 6 5" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
      </div>
      <div className="pl-card-body">
        <p className="pl-card-name">{producto.nombre}</p>
        <p className="pl-card-id">ID #{producto.idProducto}</p>
      </div>
      <div className="pl-card-arrow">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </button>
  );
}

function SkeletonCard() {
  return (
    <div className="pl-card pl-card--skeleton">
      <div className="pl-card-img-wrapper pl-skeleton-box" />
      <div className="pl-card-body">
        <div className="pl-skeleton-line pl-skeleton-line--lg" />
        <div className="pl-skeleton-line pl-skeleton-line--sm" />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProductosPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [productos, setProductos] = useState<ProductoResumen[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");

  // ── Auth guard ────────────────────────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) {
      router.push("/login");
      return;
    }
    const parsed: User = JSON.parse(stored);
    setUser(parsed);
  }, [router]);

  // ── Fetch productos ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    let endpoint: string;
    try {
      endpoint = getEndpoint(user);
    } catch {
      // Admin global: de momento no tiene endpoint propio
      setError("El administrador global debe seleccionar un retailer para ver sus productos.");
      return;
    }

    setLoading(true);
    setError(null);

    apiFetch(endpoint)
      .then((res) => {
        if (!res.ok) throw new Error("No se pudieron cargar los productos.");
        return res.json();
      })
      .then((data: ProductoResumen[]) => setProductos(data))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user]);

  // ── Navegación hacia el dashboard de producto ─────────────────────────────
  const irAProducto = (producto: ProductoResumen) => {
    if (!user) return;
    // Guardamos el nombre del producto en el user para mostrarlo en el dashboard
    const userActualizado = { ...user, nombre_producto: producto.nombre };
    localStorage.setItem("user", JSON.stringify(userActualizado));
    router.push(`/productos/${producto.idProducto}`);
  };

  // ── Filtro local por búsqueda ─────────────────────────────────────────────
  const productosFiltrados = productos.filter((p) =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  // ── Derived ───────────────────────────────────────────────────────────────
  const initials = (user?.nombre ?? "U")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const subtitulo: Record<Rol, string> = {
    admin: "Todos los productos de la plataforma",
    retailer: "Todos los productos de tu retailer",
    marca: "Productos de tu marca",
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="home-layout">
      <Sidebar />

      <main className="home-main">
        {/* Header — idéntico al patrón de home.tsx */}
        <header className="home-header">
          <div>
            <p className="pl-header-sup">Tableros</p>
            <p className="home-greeting">Dashboard de Productos</p>
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

        {/* Contenido */}
        <div className="home-content pl-content">

          {/* Título + búsqueda */}
          <div className="pl-top-row">
            <div>
              <h1 className="pl-title">Productos</h1>
              {user && (
                <p className="pl-subtitle">{subtitulo[user.rol]}</p>
              )}
            </div>
            <div className="pl-search-wrapper">
              <svg className="pl-search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="7" cy="7" r="4.5" stroke="#9ca3af" strokeWidth="1.5" />
                <path d="M10.5 10.5L13 13" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                placeholder="Buscar producto…"
                className="pl-search-input"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
          </div>

          {/* Error */}
          {error && <div className="pd-error-banner">{error}</div>}

          {/* Grid */}
          <div className="pl-grid">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
            ) : productosFiltrados.length === 0 && !error ? (
              <div className="pl-empty">
                <p className="pl-empty-text">
                  {busqueda
                    ? `No se encontraron productos para "${busqueda}".`
                    : "No hay productos disponibles."}
                </p>
              </div>
            ) : (
              productosFiltrados.map((p) => (
                <ProductoCard
                  key={p.idProducto}
                  producto={p}
                  onClick={() => irAProducto(p)}
                />
              ))
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
