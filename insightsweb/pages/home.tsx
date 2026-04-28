import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Sidebar from "../components/Sidebar";

const TABS = ["Indicadores Mensuales", "Recencia", "Perfil"];

export default function Home() {
  const [activeTab, setActiveTab] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userName, setUserName] = useState("Usuario");
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      const user = JSON.parse(stored);
      setUserName(user.nombre ?? "Usuario");
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

  const initials = userName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div className="home-layout">
      <Sidebar />

      <main className="home-main">
        <header className="home-header">
          <p className="home-greeting">Hola {userName.split(" ")[0]}</p>
          <div className="home-avatar-wrapper" ref={menuRef}>
            <button
              className="home-avatar"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Menú de usuario"
            >
              {initials}
            </button>
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
