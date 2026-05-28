import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Sidebar from "../../components/Sidebar";

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

export default function InsightsPage() {
  const [user, setUser] = useState<StoredUser | null>(null);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) { router.push("/login"); return; }
    try { setUser(JSON.parse(stored)); } catch { router.push("/login"); }
  }, [router]);

  return (
    <div className="home-layout">
      <Sidebar />
      <main className="home-main">
        <header className="home-header">
          <p className="home-greeting">Insights</p>
        </header>
        <div className="home-content">
          <h1 style={{ fontSize: "22px", fontWeight: 600, color: "#111827", margin: "24px 0 12px" }}>
            Bienvenido a Insights{user ? `, ${user.nombre.split(" ")[0]}` : ""}
          </h1>
          <p style={{ color: "#6b7280", fontSize: "15px", margin: 0 }}>
            Usa el asistente abajo a la derecha para hacer preguntas a la IA.
          </p>
        </div>
      </main>
    </div>
  );
}
