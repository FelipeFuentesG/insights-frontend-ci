import { useState, useEffect, useCallback } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  apiFetch,
  fetchComportamientoCompra,
  fetchComportamientoCompraSerie,
  RfmMetrics,
  RfmPeriodo,
} from "../lib/api";

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

interface RetailerResumen { idRetailer: number; nombre: string; }
interface MarcaResumen { idMarca: number; nombre: string; idRetailer: number; }

type AgruparPor = "dia" | "semana" | "mes" | "año";

function getIsoToday() { return new Date().toISOString().slice(0, 10); }
function getSixMonthsAgo() {
  const d = new Date();
  d.setMonth(d.getMonth() - 6);
  return d.toISOString().slice(0, 10);
}
function formatDias(v: number) {
  return new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(v);
}
function formatFrecuencia(v: number) {
  return new Intl.NumberFormat("es-CL", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(v);
}
function formatCLP(v: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(v);
}
function formatCLPCompact(v: number) {
  return "$" + new Intl.NumberFormat("es-CL", { notation: "compact", maximumFractionDigits: 1 }).format(v);
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="ind-kpi-card">
      <p className="ind-kpi-label">{label}</p>
      <p className="ind-kpi-value">{value}</p>
    </div>
  );
}

function Select({ label, value, onChange, children }: {
  label: string; value: string; onChange: (v: string) => void; children: React.ReactNode;
}) {
  return (
    <div className="ind-filter-group">
      <label className="ind-filter-label">{label}</label>
      <select className="ind-filter-input" value={value} onChange={e => onChange(e.target.value)}>
        {children}
      </select>
    </div>
  );
}

export default function PerfilTab({ user }: { user: StoredUser | null }) {
  const [retailers, setRetailers] = useState<RetailerResumen[]>([]);
  const [marcas, setMarcas] = useState<MarcaResumen[]>([]);
  const [selectedRetailer, setSelectedRetailer] = useState<string>("");
  const [selectedMarca, setSelectedMarca] = useState<string>("");

  const [desde, setDesde] = useState(getSixMonthsAgo());
  const [hasta, setHasta] = useState(getIsoToday());
  const [agruparPor, setAgruparPor] = useState<AgruparPor>("mes");

  const [datos, setDatos] = useState<RfmMetrics | null>(null);
  const [serie, setSerie] = useState<RfmPeriodo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rol = user?.rol;

  useEffect(() => {
    if (rol !== "admin_global_andesml") return;
    apiFetch("/db/retailers")
      .then(r => r.json())
      .then((data: RetailerResumen[]) => {
        setRetailers(data);
        if (data.length > 0) setSelectedRetailer(String(data[0].idRetailer));
      })
      .catch(() => {});
  }, [rol]);

  useEffect(() => {
    const idR =
      rol === "admin_global_andesml" ? selectedRetailer :
      rol === "admin_retailer" ? String(user?.idRetailer ?? "") :
      null;

    if (!idR) { setMarcas([]); return; }

    apiFetch(`/db/retailers/${idR}/marcas`)
      .then(r => r.json())
      .then((data: MarcaResumen[]) => {
        setMarcas(data);
        setSelectedMarca("");
      })
      .catch(() => setMarcas([]));
  }, [rol, selectedRetailer, user?.idRetailer]);

  const effectiveIdRetailer: string | null =
    rol === "admin_global_andesml" ? (selectedRetailer || null) :
    rol === "admin_retailer" ? String(user?.idRetailer ?? "") :
    null;

  const effectiveIdMarca: string | null =
    rol === "admin_marca" ? String(user?.idMarca ?? "") :
    selectedMarca ? selectedMarca :
    null;

  const fetchDatos = useCallback(async () => {
    if (!effectiveIdRetailer && !effectiveIdMarca) return;
    setLoading(true);
    setError(null);

    const tipo: "marca" | "retailer" = effectiveIdMarca ? "marca" : "retailer";
    const id = effectiveIdMarca ?? effectiveIdRetailer!;

    try {
      const [rMetricas, rSerie] = await Promise.allSettled([
        fetchComportamientoCompra(tipo, id, desde, hasta),
        fetchComportamientoCompraSerie(tipo, id, desde, hasta, agruparPor),
      ]);

      if (rMetricas.status === "rejected") {
        throw new Error((rMetricas.reason as Error).message ?? "Error al cargar métricas.");
      }
      setDatos(rMetricas.value);
      setSerie(rSerie.status === "fulfilled" ? rSerie.value : []);
    } catch (e) {
      setError((e as Error).message ?? "Error desconocido.");
    } finally {
      setLoading(false);
    }
  }, [effectiveIdMarca, effectiveIdRetailer, desde, hasta, agruparPor]);

  useEffect(() => { fetchDatos(); }, [fetchDatos]);

  const retailerNombre =
    rol === "admin_global_andesml"
      ? retailers.find(r => String(r.idRetailer) === selectedRetailer)?.nombre
      : user?.retailerNombre;

  const marcaNombreCtx =
    rol === "admin_marca"
      ? user?.marcaNombre
      : marcas.find(m => String(m.idMarca) === effectiveIdMarca)?.nombre;

  const contextoLabel =
    marcaNombreCtx && retailerNombre ? `${marcaNombreCtx} de ${retailerNombre}` :
    marcaNombreCtx ? marcaNombreCtx :
    retailerNombre ? retailerNombre :
    "";

  return (
    <div className="ind-root">
      <section className="ind-filters-bar">
        {rol === "admin_global_andesml" && (
          <Select label="Retailer" value={selectedRetailer}
            onChange={v => { setSelectedRetailer(v); setSelectedMarca(""); }}>
            {retailers.map(r => (
              <option key={r.idRetailer} value={r.idRetailer}>{r.nombre}</option>
            ))}
          </Select>
        )}

        {(rol === "admin_global_andesml" || rol === "admin_retailer") && (
          <Select label="Marca" value={selectedMarca} onChange={setSelectedMarca}>
            <option value="">Todas las marcas</option>
            {marcas.map(m => (
              <option key={m.idMarca} value={m.idMarca}>{m.nombre}</option>
            ))}
          </Select>
        )}

        <div className="ind-filter-group">
          <label className="ind-filter-label">Desde</label>
          <input type="date" className="ind-filter-input" value={desde} max={hasta}
            onChange={e => setDesde(e.target.value)} />
        </div>
        <div className="ind-filter-group">
          <label className="ind-filter-label">Hasta</label>
          <input type="date" className="ind-filter-input" value={hasta} min={desde} max={getIsoToday()}
            onChange={e => setHasta(e.target.value)} />
        </div>

        <div className="ind-filter-group">
          <label className="ind-filter-label">Agrupar por</label>
          <select className="ind-filter-input" value={agruparPor}
            onChange={e => setAgruparPor(e.target.value as AgruparPor)}>
            <option value="dia">Día</option>
            <option value="semana">Semana</option>
            <option value="mes">Mes</option>
            <option value="año">Año</option>
          </select>
        </div>

        <button className="ind-apply-btn" onClick={fetchDatos} disabled={loading}>
          {loading ? "Cargando…" : "Aplicar"}
        </button>
      </section>

      {contextoLabel && (
        <p className="ind-context-label">
          Mostrando datos de: <strong>{contextoLabel}</strong>
        </p>
      )}

      {error && <div className="ind-error-banner">{error}</div>}

      <section className="ind-kpi-row">
        <KpiCard
          label="Recencia promedio (días)"
          value={datos ? formatDias(datos.recenciaPromedioDias) : "—"}
        />
        <KpiCard
          label="Frecuencia promedio (compras/cliente)"
          value={datos ? formatFrecuencia(datos.frecuenciaPromedio) : "—"}
        />
        <KpiCard
          label="Ticket promedio"
          value={datos ? formatCLP(datos.ticketPromedio) : "—"}
        />
      </section>

      {loading && <div className="ind-skeleton" style={{ height: 80 }} />}

      {!loading && serie.length > 0 && (
        <section className="ind-card">
          <div className="ind-card-header">
            <h2 className="ind-card-title">Evolución del ticket promedio</h2>
          </div>
          <div className="ind-chart-area">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={serie} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="periodo" tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={formatCLPCompact} tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} width={72} />
                <Tooltip
                  formatter={(val) => [formatCLP(Number(val ?? 0)), "Ticket promedio"]}
                  contentStyle={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "13px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                />
                <Line type="monotone" dataKey="ticketPromedio" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: "#10b981", strokeWidth: 0 }} activeDot={{ r: 6, fill: "#059669" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {!loading && serie.length > 0 && (
        <section className="ind-card">
          <div className="ind-card-header">
            <h2 className="ind-card-title">Evolución de la frecuencia de compra</h2>
          </div>
          <div className="ind-chart-area">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={serie} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="periodo" tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={formatFrecuencia} tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} width={56} />
                <Tooltip
                  formatter={(val) => [formatFrecuencia(Number(val ?? 0)), "Compras por cliente"]}
                  contentStyle={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "13px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                />
                <Line type="monotone" dataKey="frecuenciaPromedio" stroke="#4f46e5" strokeWidth={2.5} dot={{ r: 4, fill: "#4f46e5", strokeWidth: 0 }} activeDot={{ r: 6, fill: "#4338ca" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
    </div>
  );
}
