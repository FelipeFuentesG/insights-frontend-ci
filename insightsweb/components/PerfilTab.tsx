import { useState, useEffect, useCallback } from "react";
import { apiFetch, fetchComportamientoCompra, RfmMetrics } from "../lib/api";

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

  const [datos, setDatos] = useState<RfmMetrics | null>(null);
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
      const data = await fetchComportamientoCompra(tipo, id, desde, hasta);
      setDatos(data);
    } catch (e) {
      setError((e as Error).message ?? "Error desconocido.");
    } finally {
      setLoading(false);
    }
  }, [effectiveIdMarca, effectiveIdRetailer, desde, hasta]);

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
    </div>
  );
}
