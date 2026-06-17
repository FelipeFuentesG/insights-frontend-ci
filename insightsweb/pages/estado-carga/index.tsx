import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Sidebar from "../../components/Sidebar";
import {
  fetchEstadoCarga,
  EstadoCargaResumen,
  fetchEtlScheduler,
  pauseEtlScheduler,
  resumeEtlScheduler,
  updateEtlScheduler,
  EtlSchedulerEstado,
} from "../../lib/api";
import {
  Programacion,
  Modo,
  Repetir,
  DIAS,
  HORAS_PERIODICO,
  construirCron,
  describir,
  desdeCron,
} from "../../lib/cron";
import { tiempoRelativo, fechaLegible, frescura, estadoProgramacion } from "../../lib/format";

type Rol = "admin_global_andesml" | "admin_retailer" | "admin_marca";

interface User {
  idUsuario: number;
  idRetailer: number | null;
  idMarca: number | null;
  nombre: string;
  email: string;
  rol: Rol;
}

export default function EstadoCargaPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [datos, setDatos] = useState<EstadoCargaResumen | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [scheduler, setScheduler] = useState<EtlSchedulerEstado | null>(null);
  const [prog, setProg] = useState<Programacion>({ modo: "programado", repetir: "diario", hora: "06:00", dias: [], cadaHoras: 6 });
  const [adminBusy, setAdminBusy] = useState(false);

  const esAdmin = user?.rol === "admin_global_andesml";

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) {
      router.push("/login");
      return;
    }
    setUser(JSON.parse(stored));
  }, [router]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetchEstadoCarga()
      .then(setDatos)
      .catch((e) => setError((e as Error).message ?? "Error desconocido."))
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (user?.rol !== "admin_global_andesml") return;
    fetchEtlScheduler()
      .then((s) => {
        setScheduler(s);
        setProg(desdeCron(s.schedule));
      })
      .catch(() => setScheduler(null));
  }, [user]);

  const initials = (user?.nombre ?? "U")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const ultimaFallida = datos?.ultimaEjecucion?.estado === "fallido";
  const estadoFrescura = frescura(datos?.ultimaCargaExitosa ?? null, ultimaFallida);

  const setProgField = (patch: Partial<Programacion>) => setProg((prev) => ({ ...prev, ...patch }));

  const toggleDia = (num: number) =>
    setProg((prev) => ({
      ...prev,
      dias: prev.dias.includes(num) ? prev.dias.filter((d) => d !== num) : [...prev.dias, num],
    }));

  const handlePause = async () => {
    if (!window.confirm("¿Pausar la carga automática de datos? No se ejecutarán cargas programadas hasta reanudar.")) return;
    setAdminBusy(true);
    try {
      setScheduler(await pauseEtlScheduler());
    } catch (e) {
      setError((e as Error).message ?? "Error desconocido.");
    } finally {
      setAdminBusy(false);
    }
  };

  const handleResume = async () => {
    if (!window.confirm("¿Reanudar la carga automática de datos?")) return;
    setAdminBusy(true);
    try {
      setScheduler(await resumeEtlScheduler());
    } catch (e) {
      setError((e as Error).message ?? "Error desconocido.");
    } finally {
      setAdminBusy(false);
    }
  };

  const handleGuardar = async () => {
    if (prog.modo === "programado" && prog.repetir === "semanal" && prog.dias.length === 0) {
      setError("Selecciona al menos un día para la programación semanal.");
      return;
    }
    if (!window.confirm(`¿Programar la carga: ${describir(prog)}?`)) return;
    setAdminBusy(true);
    setError(null);
    try {
      const s = await updateEtlScheduler(construirCron(prog));
      setScheduler(s);
      setProg(desdeCron(s.schedule));
    } catch (e) {
      setError((e as Error).message ?? "Error desconocido.");
    } finally {
      setAdminBusy(false);
    }
  };

  const tabStyle = (activo: boolean): React.CSSProperties => ({
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "8px 4px",
    borderBottom: activo ? "2px solid #6366f1" : "2px solid transparent",
    color: activo ? "#6366f1" : "#6b7280",
    fontWeight: 600,
    fontSize: "0.9rem",
  });

  return (
    <div className="home-layout">
      <Sidebar />

      <main className="home-main pd-main">
        <header className="home-header">
          <div className="pd-header-left">
            <div>
              <p className="pd-header-sup">Plataforma</p>
              <p className="home-greeting" style={{ margin: 0 }}>
                Estado de Carga de Datos
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
          {error && <div className="pd-error-banner">{error}</div>}

          {loading ? (
            <div className="pd-skeleton" style={{ height: 120 }} />
          ) : (
            <>
              <section className="pd-kpi-row">
                <div className="pd-kpi-card">
                  <p className="pd-kpi-label">Última actualización exitosa</p>
                  <p className="pd-kpi-value">{tiempoRelativo(datos?.ultimaCargaExitosa ?? null)}</p>
                  <p className="pd-kpi-sub">{fechaLegible(datos?.ultimaCargaExitosa ?? null)}</p>
                </div>
                <div className="pd-kpi-card">
                  <p className="pd-kpi-label">Estado de la última ejecución</p>
                  <p className="pd-kpi-value" style={{ color: ultimaFallida ? "#dc2626" : "#10b981" }}>
                    {datos?.ultimaEjecucion?.estado ?? "—"}
                  </p>
                  <p className="pd-kpi-sub">{fechaLegible(datos?.ultimaEjecucion?.fechaHoraCarga ?? null)}</p>
                </div>
                <div className="pd-kpi-card">
                  <p className="pd-kpi-label">Frescura</p>
                  <p className="pd-kpi-value" style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "1.05rem" }}>
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        background: estadoFrescura.color,
                        display: "inline-block",
                        flexShrink: 0,
                      }}
                    />
                    {estadoFrescura.label}
                  </p>
                </div>
              </section>

              {esAdmin && (
                <section className="pd-card">
                  <div className="pd-card-header">
                    <h2 className="pd-card-title">Programación de la carga (admin)</h2>
                    <span
                      className="pd-table-count"
                      style={{ color: scheduler?.estado === "PAUSED" ? "#9ca3af" : "#10b981", fontWeight: 600 }}
                    >
                      {estadoProgramacion(scheduler?.estado ?? null)}
                    </span>
                  </div>

                  <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "18px" }}>
                    <div style={{ display: "flex", gap: "24px", borderBottom: "1px solid #e5e7eb" }}>
                      <button style={tabStyle(prog.modo === "programado")} onClick={() => setProgField({ modo: "programado" })} disabled={adminBusy}>
                        Programado
                      </button>
                      <button style={tabStyle(prog.modo === "periodico")} onClick={() => setProgField({ modo: "periodico" })} disabled={adminBusy}>
                        Periódico
                      </button>
                    </div>

                    {prog.modo === "programado" ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "flex-end" }}>
                          <div className="pd-filter-group">
                            <label className="pd-filter-label">Repetir</label>
                            <select
                              className="pd-filter-input"
                              value={prog.repetir}
                              disabled={adminBusy}
                              onChange={(e) => setProgField({ repetir: e.target.value as Repetir })}
                            >
                              <option value="diario">Diario</option>
                              <option value="semanal">Semanal</option>
                            </select>
                          </div>
                          <div className="pd-filter-group">
                            <label className="pd-filter-label">A las</label>
                            <input
                              type="time"
                              className="pd-filter-input"
                              value={prog.hora}
                              disabled={adminBusy}
                              onChange={(e) => setProgField({ hora: e.target.value })}
                            />
                          </div>
                        </div>

                        {prog.repetir === "semanal" && (
                          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                            {DIAS.map((d) => {
                              const sel = prog.dias.includes(d.num);
                              return (
                                <button
                                  key={d.num}
                                  onClick={() => toggleDia(d.num)}
                                  disabled={adminBusy}
                                  aria-pressed={sel}
                                  style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 8,
                                    cursor: "pointer",
                                    fontWeight: 600,
                                    border: sel ? "1px solid #6366f1" : "1px solid #e5e7eb",
                                    background: sel ? "#6366f1" : "#fafafa",
                                    color: sel ? "#ffffff" : "#6b7280",
                                  }}
                                >
                                  {d.label}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="pd-filter-group">
                        <label className="pd-filter-label">Cada</label>
                        <select
                          className="pd-filter-input"
                          value={prog.cadaHoras}
                          disabled={adminBusy}
                          onChange={(e) => setProgField({ cadaHoras: Number(e.target.value) })}
                        >
                          {HORAS_PERIODICO.map((n) => (
                            <option key={n} value={n}>
                              {n} {n === 1 ? "hora" : "horas"}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
                      <p style={{ margin: 0, fontSize: "0.85rem", color: "#374151" }}>
                        Se ejecutará: <strong>{describir(prog)}</strong>
                      </p>
                      <div style={{ display: "flex", gap: "10px" }}>
                        {scheduler?.estado === "PAUSED" ? (
                          <button className="pd-apply-btn" disabled={adminBusy} onClick={handleResume}>
                            Reanudar
                          </button>
                        ) : (
                          <button className="pd-apply-btn" disabled={adminBusy} onClick={handlePause}>
                            Pausar
                          </button>
                        )}
                        <button className="pd-apply-btn" disabled={adminBusy} onClick={handleGuardar}>
                          {adminBusy ? "Guardando…" : "Guardar programación"}
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {datos && datos.historial.length > 0 && (
                <section className="pd-card">
                  <div className="pd-card-header">
                    <h2 className="pd-card-title">Historial de cargas</h2>
                    <span className="pd-table-count">{datos.historial.length} registros</span>
                  </div>
                  <div className="pd-table-wrapper">
                    <table className="pd-table">
                      <thead>
                        <tr>
                          <th className="pd-th">Fecha y hora</th>
                          <th className="pd-th">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {datos.historial.map((row, i) => (
                          <tr key={`${row.fechaHoraCarga}-${i}`} className={`pd-tr${i % 2 !== 0 ? " pd-tr--alt" : ""}`}>
                            <td className="pd-td pd-td--mono">{fechaLegible(row.fechaHoraCarga)}</td>
                            <td className="pd-td" style={{ color: row.estado === "fallido" ? "#dc2626" : "#10b981", fontWeight: 600 }}>
                              {row.estado ?? "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {datos && datos.historial.length === 0 && !error && (
                <div className="pd-empty">
                  <p className="pd-empty-text">Aún no hay registros de carga de datos.</p>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
