import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Sidebar from "../components/Sidebar";

const TABS = ["Indicadores Mensuales", "Recencia", "Perfil"];

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

const ROL_LABEL: Record<Rol, string> = {
  admin_marca: "Admin Marca",
  admin_retailer: "Admin Retailer",
  admin_global_andesml: "Admin Global",
};

export default function Home() {
  const [activeTab, setActiveTab] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<StoredUser | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        // JSON inválido
      }
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    router.push("/login");
  };

  const nombre = user?.nombre ?? "Usuario";
  const initials = nombre
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  // Tenant card: qué mostrar según rol
  const tenantMain =
    user?.rol === "admin_global_andesml"
      ? "AndesML"
      : user?.rol === "admin_retailer"
      ? (user.retailerNombre ?? "Retailer")
      : (user?.marcaNombre ?? "Marca");

  const tenantSub =
    user?.rol === "admin_marca" ? (user.retailerNombre ?? null) : null;

  return (
    <div className="home-layout">
      <Sidebar />

      <main className="home-main">
        <header className="home-header">
          <p className="home-greeting">Hola {nombre}</p>

          {/* Tenant card */}
          <div className="home-tenant-card">
            <span className="home-tenant-main">{tenantMain}</span>
            {tenantSub && (
              <span className="home-tenant-sub">{tenantSub}</span>
            )}
          </div>

          {/* Usuario + avatar */}
          <div className="home-avatar-wrapper" ref={menuRef}>
            <div className="home-user-info">
              <div className="home-user-text">
                <span className="home-user-name">
                  {nombre.split(" ").slice(0, 2).join(" ")}
                </span>
                <span className="home-user-rol">
                  {user ? ROL_LABEL[user.rol] : ""}
                </span>
              </div>
              <button
                className="home-avatar"
                onClick={() => setMenuOpen((o) => !o)}
                aria-label="Menú de usuario"
              >
                {initials}
              </button>
            </div>

            {menuOpen && (
              <div className="home-dropdown">
                <button className="home-dropdown-item" onClick={handleLogout}>
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="home-tabs">
          {TABS.map((tab, i) => (
            <button
              key={tab}
              className={`home-tab${activeTab === i ? " active" : ""}`}
              onClick={() => setActiveTab(i)}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="home-content" />
      </main>
    </div>
  );
}
