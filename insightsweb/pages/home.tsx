import { useState } from "react";
import Sidebar from "../components/Sidebar";

const TABS = ["Indicadores Mensuales", "Recencia", "Perfil"];

export default function Home() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="home-layout">
      <Sidebar />

      <main className="home-main">
        <header className="home-header">
          <p className="home-greeting">Hola Acme</p>
          <div className="home-avatar">AC</div>
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
