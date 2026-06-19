import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/router";
import Sidebar from "../../components/Sidebar";
import {
  apiFetch,
  fetchClientesPorMarca,
  ClienteResumen,
  fetchSegmentosCompra,
  SegmentosCompra,
  limpiarSegmentosCompra,
  limpiarTodosSegmentosCompra,
  asignarClustersClientes,
  asignarClustersTodasMarcas,
} from "../../lib/api";
import {
  PieChart,
  Pie,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

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

interface MarcaResumen {
  idMarca: number;
  nombre: string;
}

type SegmentoTab = "sociodemografico" | "compras";
type Dimension = "edad" | "genero" | "region";

interface SliceDatum {
  name: string;
  value: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatNum(value: number): string {
  if (Math.abs(value) >= 1_000_000)
    return new Intl.NumberFormat("es-CL", { notation: "compact", maximumFractionDigits: 1 }).format(value);
  return new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(value);
}

const EDAD_BUCKETS: { label: string; min: number; max: number }[] = [
  { label: "0-17", min: 0, max: 17 },
  { label: "18-24", min: 18, max: 24 },
  { label: "25-34", min: 25, max: 34 },
  { label: "35-44", min: 35, max: 44 },
  { label: "45-54", min: 45, max: 54 },
  { label: "55-64", min: 55, max: 64 },
  { label: "65+", min: 65, max: Number.POSITIVE_INFINITY },
];

function bucketEdad(edad: number): string {
  const b = EDAD_BUCKETS.find((b) => edad >= b.min && edad <= b.max);
  return b ? b.label : "Sin dato";
}

// Mapeo de comunas chilenas a sus regiones.
const COMUNA_TO_REGION: Record<string, string> = {
  // Región Metropolitana
  "Las Condes": "Metropolitana",
  "Providencia": "Metropolitana",
  "Ñuñoa": "Metropolitana",
  "Nunoa": "Metropolitana",
  "Santiago": "Metropolitana",
  "La Florida": "Metropolitana",
  "Maipú": "Metropolitana",
  "Maipu": "Metropolitana",
  "Puente Alto": "Metropolitana",
  "San Bernardo": "Metropolitana",
  "Vitacura": "Metropolitana",
  "La Reina": "Metropolitana",
  "Peñalolén": "Metropolitana",
  "Penalolen": "Metropolitana",
  "Macul": "Metropolitana",
  "San Miguel": "Metropolitana",
  // Valparaíso
  "Viña del Mar": "Valparaíso",
  "Vina del Mar": "Valparaíso",
  "Valparaíso": "Valparaíso",
  "Valparaiso": "Valparaíso",
  "Quilpué": "Valparaíso",
  "Quilpue": "Valparaíso",
  "Villa Alemana": "Valparaíso",
  // Biobío
  "Concepción": "Biobío",
  "Concepcion": "Biobío",
  "Talcahuano": "Biobío",
  "Los Ángeles": "Biobío",
  "Los Angeles": "Biobío",
  // Antofagasta
  "Antofagasta": "Antofagasta",
  "Calama": "Antofagasta",
  // La Araucanía
  "Temuco": "La Araucanía",
  "Padre Las Casas": "La Araucanía",
  // Otras
  "La Serena": "Coquimbo",
  "Coquimbo": "Coquimbo",
  "Iquique": "Tarapacá",
  "Arica": "Arica y Parinacota",
  "Copiapó": "Atacama",
  "Copiapo": "Atacama",
  "Rancagua": "O'Higgins",
  "Talca": "Maule",
  "Chillán": "Ñuble",
  "Chillan": "Ñuble",
  "Valdivia": "Los Ríos",
  "Puerto Montt": "Los Lagos",
  "Coyhaique": "Aysén",
  "Punta Arenas": "Magallanes",
};

function comunaToRegion(comuna: string | null | undefined): string {
  if (!comuna) return "Sin dato";
  const trimmed = comuna.trim();
  if (!trimmed) return "Sin dato";
  return COMUNA_TO_REGION[trimmed] ?? "Otra";
}

function aggregate(
  clientes: ClienteResumen[],
  dimension: Dimension,
  regionEspecifica: boolean
): SliceDatum[] {
  const counts = new Map<string, number>();

  for (const c of clientes) {
    let key: string;
    if (dimension === "edad") {
      key = c.edad == null ? "Sin dato" : bucketEdad(Number(c.edad));
    } else if (dimension === "genero") {
      key = (c.genero ?? "").trim() || "Sin dato";
    } else if (regionEspecifica) {
      // Si hay región filtrada, mostrar distribución por comuna dentro de esa región.
      key = (c.comuna ?? "").trim() || "Sin dato";
    } else {
      key = comunaToRegion(c.comuna);
    }
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const data: SliceDatum[] = Array.from(counts.entries()).map(([name, value]) => ({
    name,
    value,
  }));

  if (dimension === "edad") {
    const order = [...EDAD_BUCKETS.map((b) => b.label), "Sin dato"];
    data.sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
  } else {
    data.sort((a, b) => b.value - a.value);
  }

  return data;
}

const PIE_COLORS = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
  "#f97316",
  "#3b82f6",
  "#a855f7",
  "#14b8a6",
];

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accent,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  accent?: boolean;
}) {
  return (
    <div className="pd-seg-control">
      {options.map((opt) => (
        <button
          key={opt.value}
          className={`pd-seg-btn${
            value === opt.value
              ? accent
                ? " pd-seg-btn--accent"
                : " pd-seg-btn--active"
              : ""
          }`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="pd-kpi-card">
      <p className="pd-kpi-label">{label}</p>
      <p className="pd-kpi-value">{value}</p>
      {sub && <p className="pd-kpi-sub">{sub}</p>}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SegmentosPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // Selectores
  const [retailers, setRetailers] = useState<RetailerResumen[]>([]);
  const [marcas, setMarcas] = useState<MarcaResumen[]>([]);
  const [retailerSeleccionado, setRetailerSeleccionado] = useState<number | null>(null);
  const [marcaSeleccionada, setMarcaSeleccionada] = useState<number | null>(null);
  const [nombreMarca, setNombreMarca] = useState<string>("");

  // Tab y dimensión
  const [tab, setTab] = useState<SegmentoTab>("sociodemografico");
  const [dimension, setDimension] = useState<Dimension>("edad");
  const [regionFiltro, setRegionFiltro] = useState<string>("__todas__");

  // Datos
  const [clientes, setClientes] = useState<ClienteResumen[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Segmentos de compra
  const [segmentos, setSegmentos] = useState<SegmentosCompra | null>(null);
  const [loadingSeg, setLoadingSeg] = useState(false);
  const [limpiandoSeg, setLimpiandoSeg] = useState(false);
  const [limpiandoTodos, setLimpiandoTodos] = useState(false);
  const [asignandoClusters, setAsignandoClusters] = useState(false);
  const [asignandoTodosClusters, setAsignandoTodosClusters] = useState(false);
  const [toast, setToast] = useState<
    { tipo: "ok" | "info" | "error"; msg: string } | null
  >(null);

  // Layout responsive
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // ── Auth guard ────────────────────────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) {
      router.push("/login");
      return;
    }
    const parsed: User = JSON.parse(stored);
    setUser(parsed);

    if (parsed.rol === "admin_marca" && parsed.idMarca) {
      setMarcaSeleccionada(parsed.idMarca);
    }
  }, [router]);

  // ── Fetch retailers (solo admin global) ───────────────────────────────────
  useEffect(() => {
    if (!user || user.rol !== "admin_global_andesml") return;
    apiFetch("/db/retailers")
      .then((res) => res.json())
      .then((data: RetailerResumen[]) => setRetailers(data))
      .catch(() => setError("No se pudieron cargar los retailers."));
  }, [user]);

  // ── Fetch marcas según el retailer activo ─────────────────────────────────
  useEffect(() => {
    if (!user) return;

    let idRetailer: number | null = null;

    if (user.rol === "admin_global_andesml") {
      idRetailer = retailerSeleccionado;
    } else if (user.rol === "admin_retailer") {
      idRetailer = user.idRetailer;
    } else {
      return;
    }

    if (!idRetailer) return;

    setMarcas([]);
    setMarcaSeleccionada(null);

    apiFetch(`/db/retailers/${idRetailer}/marcas`)
      .then((res) => res.json())
      .then((data: MarcaResumen[]) => setMarcas(data))
      .catch(() => setError("No se pudieron cargar las marcas."));
  }, [user, retailerSeleccionado]);

  const effectiveIdMarca = marcaSeleccionada;
  const effectiveIdRetailer =
    user?.rol === "admin_global_andesml" ? retailerSeleccionado : user?.idRetailer ?? null;

  const hasTarget = Boolean(effectiveIdMarca);

  // ── Fetch clientes por marca ───────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!effectiveIdMarca) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchClientesPorMarca(String(effectiveIdMarca));
      setClientes(data);
    } catch (e) {
      setError((e as Error).message ?? "Error desconocido.");
    } finally {
      setLoading(false);
    }
  }, [effectiveIdMarca]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Fetch segmentos de compra por marca ────────────────────────────────────
  const fetchSegmentos = useCallback(
    async (forceRefresh = false) => {
      if (!effectiveIdMarca) return;
      setLoadingSeg(true);
      setError(null);
      try {
        const data = await fetchSegmentosCompra(String(effectiveIdMarca), forceRefresh);
        setSegmentos(data);
      } catch (e) {
        setError((e as Error).message ?? "Error desconocido.");
      } finally {
        setLoadingSeg(false);
      }
    },
    [effectiveIdMarca]
  );

  useEffect(() => {
    fetchSegmentos();
  }, [fetchSegmentos]);

  // ── Limpiar segmentos (solo admin global y admin_retailer) ─────────────────
  const handleLimpiarSegmentos = useCallback(async () => {
    if (!effectiveIdMarca) return;
    const ok = window.confirm(
      "¿Limpiar todos los segmentos de esta marca?\n\n" +
      "Los clientes quedarán sin segmento asignado (id_cluster = NULL). " +
      "Los segmentos en sí no se eliminan, pero quedarán vacíos hasta " +
      "una nueva recalculación.\n\nEsta acción no se puede deshacer."
    );
    if (!ok) return;

    setLimpiandoSeg(true);
    setError(null);
    try {
      await limpiarSegmentosCompra(String(effectiveIdMarca));
      await fetchSegmentos(true);
    } catch (e) {
      setError((e as Error).message ?? "Error al limpiar segmentos.");
    } finally {
      setLimpiandoSeg(false);
    }
  }, [effectiveIdMarca, fetchSegmentos]);

  // Asignación automática por reglas (admin global, retailer y marca).
  const handleAsignarClusters = useCallback(async () => {
    if (!effectiveIdMarca) return;
    setAsignandoClusters(true);
    setToast(null);
    setError(null);
    try {
      const res = await asignarClustersClientes(String(effectiveIdMarca));
      if (res.clientesAsignados === 0) {
        setToast({ tipo: "info", msg: "Todos los clientes ya tienen cluster asignado." });
      } else {
        const prefix = res.clustersCreados ? "Clusters creados. " : "";
        setToast({
          tipo: "ok",
          msg: `${prefix}${formatNum(res.clientesAsignados)} cliente${
            res.clientesAsignados === 1 ? "" : "s"
          } asignado${res.clientesAsignados === 1 ? "" : "s"} a un cluster.`,
        });
      }
      // Refrescar segmentos para reflejar las nuevas asignaciones.
      await fetchSegmentos(true);
    } catch (e) {
      setToast({ tipo: "error", msg: (e as Error).message ?? "Error al asignar clusters." });
    } finally {
      setAsignandoClusters(false);
    }
  }, [effectiveIdMarca, fetchSegmentos]);

  // Asignación global de clusters a TODAS las marcas (solo admin global).
  const handleAsignarTodosClusters = useCallback(async () => {
    const ok = window.confirm(
      "⚠ ACCIÓN GLOBAL ⚠\n\n" +
      "¿Asignar clusters a TODAS las marcas de TODOS los retailers?\n\n" +
      "Cada cliente sin cluster será evaluado y asignado al segmento que mejor " +
      "describe su comportamiento. Los 6 clusters se crearán por cada marca que " +
      "aún no los tenga. La operación puede tardar varios minutos."
    );
    if (!ok) return;

    setAsignandoTodosClusters(true);
    setToast(null);
    setError(null);
    try {
      const res = await asignarClustersTodasMarcas();
      if (res.clientesAsignados === 0) {
        setToast({
          tipo: "info",
          msg: "Todas las marcas ya tenían sus clientes asignados a algún cluster.",
        });
      } else {
        const prefix = res.clustersCreados ? "Clusters creados en marcas faltantes. " : "";
        setToast({
          tipo: "ok",
          msg: `${prefix}${formatNum(res.clientesAsignados)} cliente${
            res.clientesAsignados === 1 ? "" : "s"
          } asignado${res.clientesAsignados === 1 ? "" : "s"} a un cluster en total.`,
        });
      }
      // Refrescar segmentos si hay una marca en contexto.
      if (effectiveIdMarca) {
        await fetchSegmentos(true);
      }
    } catch (e) {
      setToast({ tipo: "error", msg: (e as Error).message ?? "Error al asignar clusters." });
    } finally {
      setAsignandoTodosClusters(false);
    }
  }, [effectiveIdMarca, fetchSegmentos]);

  // El toast se autocierra a los 6s.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  // Limpieza global (solo admin global de Andes).
  const handleLimpiarTodosSegmentos = useCallback(async () => {
    const ok = window.confirm(
      "⚠ ACCIÓN GLOBAL ⚠\n\n" +
      "¿Limpiar los segmentos de TODAS las marcas de TODOS los retailers?\n\n" +
      "Todos los clientes del sistema quedarán sin segmento asignado " +
      "(id_cluster = NULL). Los segmentos en sí no se eliminan, pero " +
      "quedarán vacíos hasta una nueva recalculación.\n\n" +
      "Esta acción no se puede deshacer."
    );
    if (!ok) return;

    setLimpiandoTodos(true);
    setError(null);
    try {
      await limpiarTodosSegmentosCompra();
      await fetchSegmentos(true);
    } catch (e) {
      setError((e as Error).message ?? "Error al limpiar segmentos.");
    } finally {
      setLimpiandoTodos(false);
    }
  }, [fetchSegmentos]);

  // ── Derivados ──────────────────────────────────────────────────────────────
  const initials = (user?.nombre ?? "U")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const regionesDisponibles = useMemo(() => {
    const set = new Set<string>();
    for (const c of clientes) {
      set.add(comunaToRegion(c.comuna));
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  }, [clientes]);

  const clientesFiltrados = useMemo(() => {
    if (regionFiltro === "__todas__") return clientes;
    return clientes.filter((c) => comunaToRegion(c.comuna) === regionFiltro);
  }, [clientes, regionFiltro]);

  const regionEspecifica = regionFiltro !== "__todas__";

  const sliceData = useMemo(
    () =>
      aggregate(clientesFiltrados, dimension, regionEspecifica).map((d, i) => ({
        ...d,
        fill: PIE_COLORS[i % PIE_COLORS.length],
      })),
    [clientesFiltrados, dimension, regionEspecifica]
  );

  const totalClientes = clientesFiltrados.length;
  const valoresUnicos = sliceData.length;
  const topSegmento = sliceData[0];

  // Cuando la dimensión es "región" pero hay un filtro de región activo,
  // mostramos comunas dentro de esa región.
  const dimensionLabel: Record<Dimension, string> = {
    edad: "Edad",
    genero: "Género",
    region: dimension === "region" && regionEspecifica ? "Comuna" : "Región",
  };

  const SIN_SEGMENTO_COLOR = "#cbd5e1";

  const segChartData = useMemo(() => {
    if (!segmentos) return [];
    const data = segmentos.segmentos
      .filter((s) => s.totalClientes > 0)
      .map((s, i) => ({
        name: s.nombre ?? `Segmento ${s.idCluster}`,
        value: s.totalClientes,
        fill: PIE_COLORS[i % PIE_COLORS.length],
      }));
    if (segmentos.clientesSinSegmento > 0) {
      data.push({
        name: "Sin segmento",
        value: segmentos.clientesSinSegmento,
        fill: SIN_SEGMENTO_COLOR,
      });
    }
    return data;
  }, [segmentos]);

  const totalSeg = segmentos?.totalClientes ?? 0;
  const pct = (n: number) => (totalSeg > 0 ? Math.round((n / totalSeg) * 100) : 0);

  // ── Render ────────────────────────────────────────────────────────────────
  const toastColors = {
    ok: { bg: "#ecfdf5", border: "#10b981", text: "#065f46" },
    info: { bg: "#eff6ff", border: "#3b82f6", text: "#1e3a8a" },
    error: { bg: "#fef2f2", border: "#ef4444", text: "#991b1b" },
  } as const;

  return (
    <div className="home-layout">
      <Sidebar />

      {/* Toast flotante */}
      {toast && (
        <div
          role="status"
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            zIndex: 1000,
            maxWidth: "360px",
            padding: "12px 16px",
            borderRadius: "10px",
            border: `1px solid ${toastColors[toast.tipo].border}`,
            background: toastColors[toast.tipo].bg,
            color: toastColors[toast.tipo].text,
            fontSize: "13px",
            fontWeight: 500,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <span>{toast.msg}</span>
          <button
            onClick={() => setToast(null)}
            aria-label="Cerrar notificación"
            style={{
              background: "transparent",
              border: "none",
              color: toastColors[toast.tipo].text,
              fontSize: "16px",
              fontWeight: 700,
              cursor: "pointer",
              lineHeight: 1,
              padding: 0,
            }}
          >
            ×
          </button>
        </div>
      )}

      <main className="home-main pd-main">
        <header className="home-header">
          <div className="pd-header-left">
            {(marcaSeleccionada || retailerSeleccionado) && user?.rol !== "admin_marca" && (
              <button
                className="pd-back-btn"
                onClick={() => {
                  if (marcaSeleccionada) {
                    setMarcaSeleccionada(null);
                    setNombreMarca("");
                    setClientes([]);
                    setSegmentos(null);
                  } else {
                    setRetailerSeleccionado(null);
                  }
                }}
                aria-label="Volver"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M10 12L6 8L10 4"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            )}
            <div>
              <p className="pd-header-sup">Tableros</p>
              <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
                <p className="home-greeting" style={{ margin: 0 }}>
                  Segmentos de Clientes{nombreMarca ? ` — ${nombreMarca}` : ""}
                </p>
                {hasTarget && (
                  <p style={{ fontSize: "0.75rem", color: "#9ca3af", margin: 0 }}>
                    {effectiveIdMarca ? `ID Marca #${effectiveIdMarca}` : ""}
                    {effectiveIdRetailer ? ` · ID Retailer #${effectiveIdRetailer}` : ""}
                  </p>
                )}
              </div>
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
          {/* Selector de retailer — solo admin global */}
          {user?.rol === "admin_global_andesml" && !retailerSeleccionado && (
            <div className="pl-retailer-selector">
              <p className="pl-retailer-selector-title">Selecciona un retailer</p>
              <div className="pl-retailer-grid">
                {retailers.map((r) => (
                  <button
                    key={r.idRetailer}
                    className="pl-retailer-btn"
                    onClick={() => setRetailerSeleccionado(r.idRetailer)}
                  >
                    {r.nombre}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Selector de marca */}
          {(user?.rol === "admin_global_andesml" || user?.rol === "admin_retailer") &&
            effectiveIdRetailer &&
            !marcaSeleccionada && (
              <div className="pl-retailer-selector">
                <p className="pl-retailer-selector-title">Selecciona una marca</p>
                <div className="pl-retailer-grid">
                  {marcas.map((m) => (
                    <button
                      key={m.idMarca}
                      className="pl-retailer-btn"
                      onClick={() => {
                        setMarcaSeleccionada(m.idMarca);
                        setNombreMarca(m.nombre);
                      }}
                    >
                      {m.nombre}
                    </button>
                  ))}
                </div>
              </div>
            )}

          {/* Contenido principal */}
          {hasTarget && (
            <>
              {/* Tabs principales */}
              <div className="home-tabs">
                <button
                  className={`home-tab${tab === "sociodemografico" ? " active" : ""}`}
                  onClick={() => setTab("sociodemografico")}
                >
                  Sociodemográfico
                </button>
                <button
                  className={`home-tab${tab === "compras" ? " active" : ""}`}
                  onClick={() => setTab("compras")}
                >
                  Compras
                </button>
              </div>

              {error && <div className="pd-error-banner">{error}</div>}

              {tab === "sociodemografico" && (
                <>
                  {/* Filtro de región */}
                  <section className="pd-card" style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                      <label
                        htmlFor="region-filtro"
                        style={{ fontSize: "13px", fontWeight: 600, color: "#374151" }}
                      >
                        Filtrar por región
                      </label>
                      <select
                        id="region-filtro"
                        value={regionFiltro}
                        onChange={(e) => setRegionFiltro(e.target.value)}
                        disabled={loading || regionesDisponibles.length === 0}
                        style={{
                          padding: "8px 12px",
                          borderRadius: "8px",
                          border: "1px solid #d1d5db",
                          background: "#ffffff",
                          fontSize: "13px",
                          color: "#111827",
                          minWidth: "200px",
                          cursor: loading ? "not-allowed" : "pointer",
                        }}
                      >
                        <option value="__todas__">Todas las regiones</option>
                        {regionesDisponibles.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                      {regionFiltro !== "__todas__" && (
                        <button
                          onClick={() => setRegionFiltro("__todas__")}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "6px",
                            border: "1px solid #e5e7eb",
                            background: "#f9fafb",
                            fontSize: "12px",
                            color: "#6b7280",
                            cursor: "pointer",
                          }}
                        >
                          Limpiar filtro
                        </button>
                      )}
                    </div>
                  </section>

                  {/* KPIs */}
                  <section className="pd-kpi-row">
                    <KpiCard
                      label="Total clientes"
                      value={loading ? "—" : formatNum(totalClientes)}
                    />
                    <KpiCard
                      label={`Valores únicos (${dimensionLabel[dimension].toLowerCase()})`}
                      value={loading ? "—" : formatNum(valoresUnicos)}
                    />
                    <KpiCard
                      label="Segmento mayoritario"
                      value={loading || !topSegmento ? "—" : topSegmento.name}
                      sub={
                        loading || !topSegmento
                          ? undefined
                          : `${formatNum(topSegmento.value)} clientes (${
                              totalClientes > 0
                                ? Math.round((topSegmento.value / totalClientes) * 100)
                                : 0
                            }%)`
                      }
                    />
                  </section>

                  {/* Gráfico de torta + tabla de detalle lado a lado */}
                  <div className="ind-two-col">

                    {/* Donut */}
                    <section className="pd-card">
                      <div className="pd-card-header">
                        <div className="pd-card-header-left">
                          <h2 className="pd-card-title">
                            Distribución por {dimensionLabel[dimension].toLowerCase()}
                          </h2>
                        </div>
                        <SegmentedControl<Dimension>
                          options={[
                            { value: "edad", label: "Edad" },
                            { value: "genero", label: "Género" },
                            { value: "region", label: "Región" },
                          ]}
                          value={dimension}
                          onChange={setDimension}
                          accent
                        />
                      </div>

                      <div className="pd-chart-area pd-chart-area--sm" ref={chartContainerRef}>
                        {loading ? (
                          <div className="pd-skeleton" style={{ height: 240 }} />
                        ) : sliceData.length === 0 ? (
                          <div className="pd-empty">
                            <p className="pd-empty-text">
                              No hay clientes disponibles para esta marca.
                            </p>
                          </div>
                        ) : (
                          <ResponsiveContainer width="100%" height={240}>
                            <PieChart>
                              <Pie
                                data={sliceData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={85}
                                innerRadius={42}
                                paddingAngle={2}
                              />
                              <Tooltip
                                formatter={(v, n) => [formatNum(Number(v ?? 0)), String(n)]}
                                contentStyle={{
                                  background: "#ffffff",
                                  border: "1px solid #e5e7eb",
                                  borderRadius: "8px",
                                  fontSize: "13px",
                                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                                }}
                              />
                              <Legend
                                iconType="circle"
                                wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </section>

                    {/* Tabla de detalle */}
                    {!loading && sliceData.length > 0 && (
                      <section className="pd-card">
                        <div className="pd-card-header">
                          <h2 className="pd-card-title">Detalle por segmento</h2>
                          <span className="pd-table-count">{sliceData.length} segmentos</span>
                        </div>
                        <div className="pd-table-wrapper">
                          <table className="pd-table">
                            <thead>
                              <tr>
                                <th className="pd-th">{dimensionLabel[dimension]}</th>
                                <th className="pd-th pd-th--right">Clientes</th>
                                <th className="pd-th pd-th--right">%</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sliceData.map((row, i) => (
                                <tr
                                  key={row.name}
                                  className={`pd-tr${i % 2 !== 0 ? " pd-tr--alt" : ""}`}
                                >
                                  <td className="pd-td">{row.name}</td>
                                  <td className="pd-td pd-td--right">{formatNum(row.value)}</td>
                                  <td className="pd-td pd-td--right">
                                    {totalClientes > 0
                                      ? `${Math.round((row.value / totalClientes) * 100)}%`
                                      : "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </section>
                    )}

                  </div>
                </>
              )}

              {tab === "compras" && (
                <>
                  {/* Asignación automática de clusters (admin global, retailer y marca) */}
                  {user && (
                    <section className="pd-card" style={{ padding: "12px 16px" }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "13px",
                          fontWeight: 600,
                          color: "#374151",
                        }}
                      >
                        Segmentación automática
                      </p>

                      {/* Asignación por marca */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "12px",
                          flexWrap: "wrap",
                          marginTop: "12px",
                        }}
                      >
                        <p
                          style={{
                            margin: 0,
                            fontSize: "12px",
                            color: "#6b7280",
                            flex: 1,
                            minWidth: "200px",
                          }}
                        >
                          Asigna cada cliente sin cluster de esta marca al segmento que
                          mejor describe su comportamiento de compra e interacción.
                        </p>
                        <button
                          onClick={handleAsignarClusters}
                          disabled={
                            asignandoClusters ||
                            asignandoTodosClusters ||
                            limpiandoSeg ||
                            limpiandoTodos
                          }
                          style={{
                            padding: "8px 16px",
                            borderRadius: "8px",
                            border: "1px solid #10b981",
                            background: "#10b981",
                            color: "#ffffff",
                            fontSize: "13px",
                            fontWeight: 600,
                            cursor:
                              asignandoClusters ||
                              asignandoTodosClusters ||
                              limpiandoSeg ||
                              limpiandoTodos
                                ? "not-allowed"
                                : "pointer",
                            opacity: asignandoClusters ? 0.7 : 1,
                          }}
                        >
                          {asignandoClusters ? "Asignando…" : "Asignar Clusters"}
                        </button>
                      </div>

                      {/* Asignación global (solo admin global) */}
                      {user.rol === "admin_global_andesml" && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "12px",
                            flexWrap: "wrap",
                            marginTop: "10px",
                            paddingTop: "10px",
                            borderTop: "1px dashed #e5e7eb",
                          }}
                        >
                          <p
                            style={{
                              margin: 0,
                              fontSize: "12px",
                              color: "#6b7280",
                              flex: 1,
                              minWidth: "200px",
                            }}
                          >
                            <strong style={{ color: "#047857" }}>Acción global:</strong>{" "}
                            asigna clusters a los clientes sin segmento de TODAS las
                            marcas. Puede tardar varios minutos.
                          </p>
                          <button
                            onClick={handleAsignarTodosClusters}
                            disabled={
                              asignandoClusters ||
                              asignandoTodosClusters ||
                              limpiandoSeg ||
                              limpiandoTodos
                            }
                            style={{
                              padding: "8px 16px",
                              borderRadius: "8px",
                              border: "1px solid #047857",
                              background: "#047857",
                              color: "#ffffff",
                              fontSize: "13px",
                              fontWeight: 600,
                              cursor:
                                asignandoClusters ||
                                asignandoTodosClusters ||
                                limpiandoSeg ||
                                limpiandoTodos
                                  ? "not-allowed"
                                  : "pointer",
                              opacity: asignandoTodosClusters ? 0.7 : 1,
                            }}
                          >
                            {asignandoTodosClusters
                              ? "Asignando…"
                              : "Asignar Clusters a todas las marcas"}
                          </button>
                        </div>
                      )}
                    </section>
                  )}

                  {/* Acciones de mantenimiento (los 3 roles; admin_marca solo su marca) */}
                  {user && (
                    <section className="pd-card" style={{ padding: "12px 16px" }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "13px",
                          fontWeight: 600,
                          color: "#374151",
                        }}
                      >
                        Mantenimiento de segmentos
                      </p>

                      {/* Limpieza por marca */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "12px",
                          flexWrap: "wrap",
                          marginTop: "12px",
                        }}
                      >
                        <p
                          style={{
                            margin: 0,
                            fontSize: "12px",
                            color: "#6b7280",
                            flex: 1,
                            minWidth: "200px",
                          }}
                        >
                          Desasigna a los clientes de esta marca de su segmento actual.
                        </p>
                        <button
                          onClick={handleLimpiarSegmentos}
                          disabled={
                            limpiandoSeg ||
                            limpiandoTodos ||
                            loadingSeg ||
                            !segmentos ||
                            segmentos.totalClientes - segmentos.clientesSinSegmento === 0
                          }
                          style={{
                            padding: "8px 16px",
                            borderRadius: "8px",
                            border: "1px solid #ef4444",
                            background: limpiandoSeg ? "#fca5a5" : "#ffffff",
                            color: "#ef4444",
                            fontSize: "13px",
                            fontWeight: 600,
                            cursor:
                              limpiandoSeg || limpiandoTodos || loadingSeg
                                ? "not-allowed"
                                : "pointer",
                            opacity:
                              !segmentos ||
                              segmentos.totalClientes - segmentos.clientesSinSegmento === 0
                                ? 0.5
                                : 1,
                          }}
                        >
                          {limpiandoSeg ? "Limpiando…" : "Limpiar segmentos"}
                        </button>
                      </div>

                      {/* Limpieza global (solo admin global) */}
                      {user?.rol === "admin_global_andesml" && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "12px",
                            flexWrap: "wrap",
                            marginTop: "10px",
                            paddingTop: "10px",
                            borderTop: "1px dashed #e5e7eb",
                          }}
                        >
                          <p
                            style={{
                              margin: 0,
                              fontSize: "12px",
                              color: "#6b7280",
                              flex: 1,
                              minWidth: "200px",
                            }}
                          >
                            <strong style={{ color: "#b91c1c" }}>Acción global:</strong>{" "}
                            desasigna a TODOS los clientes de TODAS las marcas de su
                            segmento actual.
                          </p>
                          <button
                            onClick={handleLimpiarTodosSegmentos}
                            disabled={limpiandoSeg || limpiandoTodos || loadingSeg}
                            style={{
                              padding: "8px 16px",
                              borderRadius: "8px",
                              border: "1px solid #b91c1c",
                              background: limpiandoTodos ? "#b91c1c" : "#b91c1c",
                              color: "#ffffff",
                              fontSize: "13px",
                              fontWeight: 600,
                              cursor:
                                limpiandoSeg || limpiandoTodos || loadingSeg
                                  ? "not-allowed"
                                  : "pointer",
                              opacity: limpiandoTodos ? 0.7 : 1,
                            }}
                          >
                            {limpiandoTodos ? "Limpiando…" : "Limpiar todos los segmentos"}
                          </button>
                        </div>
                      )}
                    </section>
                  )}

                  {/* KPIs */}
                  <section className="pd-kpi-row">
                    <KpiCard
                      label="Total clientes"
                      value={loadingSeg ? "—" : formatNum(totalSeg)}
                    />
                    <KpiCard
                      label="Segmentos definidos"
                      value={
                        loadingSeg || !segmentos
                          ? "—"
                          : formatNum(
                              segmentos.segmentos.filter((s) => s.totalClientes > 0).length
                            )
                      }
                    />
                    <KpiCard
                      label="Clientes sin segmento"
                      value={loadingSeg || !segmentos ? "—" : formatNum(segmentos.clientesSinSegmento)}
                      sub={
                        loadingSeg || !segmentos
                          ? undefined
                          : `${pct(segmentos.clientesSinSegmento)}% del total`
                      }
                    />
                  </section>

                  {/* Gráfico de distribución + tarjetas lado a lado */}
                  <div className="ind-two-col">

                    <section className="pd-card">
                      <div className="pd-card-header">
                        <h2 className="pd-card-title">Distribución por segmento de compra</h2>
                      </div>
                      <div className="pd-chart-area pd-chart-area--sm">
                        {loadingSeg ? (
                          <div className="pd-skeleton" style={{ height: 240 }} />
                        ) : segChartData.length === 0 ? (
                          <div className="pd-empty">
                            <p className="pd-empty-text">
                              No hay segmentos definidos para esta marca.
                            </p>
                          </div>
                        ) : (
                          <ResponsiveContainer width="100%" height={240}>
                            <PieChart>
                              <Pie
                                data={segChartData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={85}
                                innerRadius={42}
                                paddingAngle={2}
                              />
                              <Tooltip
                                formatter={(v, n) => [formatNum(Number(v ?? 0)), String(n)]}
                                contentStyle={{
                                  background: "#ffffff",
                                  border: "1px solid #e5e7eb",
                                  borderRadius: "8px",
                                  fontSize: "13px",
                                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                                }}
                              />
                              <Legend
                                iconType="circle"
                                wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </section>

                  {/* Tarjetas por segmento con descripción (solo segmentos con clientes) */}
                  {!loadingSeg &&
                    segmentos &&
                    segmentos.segmentos.some((s) => s.totalClientes > 0) && (
                    <section className="seg-grid">
                      {segmentos.segmentos
                        .filter((s) => s.totalClientes > 0)
                        .map((s, i) => {
                          const color = PIE_COLORS[i % PIE_COLORS.length];
                          const porcentaje = pct(s.totalClientes);
                          return (
                            <article
                              key={s.idCluster}
                              className="seg-card"
                              style={{ ["--seg-accent" as string]: color }}
                            >
                              <div className="seg-card-head">
                                <h3 className="seg-card-title">
                                  {s.nombre ?? `Segmento ${s.idCluster}`}
                                </h3>
                                {s.definidoIa && <span className="seg-badge">IA</span>}
                              </div>

                              <div className="seg-card-metric">
                                <p className="seg-card-count">{formatNum(s.totalClientes)}</p>
                                <span className="seg-card-count-label">
                                  {s.totalClientes === 1 ? "cliente" : "clientes"}
                                </span>
                              </div>

                              <div className="seg-card-progress">
                                <div className="seg-card-progress-track">
                                  <div
                                    className="seg-card-progress-bar"
                                    style={{ width: `${Math.max(porcentaje, 2)}%` }}
                                  />
                                </div>
                                <span className="seg-card-progress-pct">{porcentaje}%</span>
                              </div>

                              <p className="seg-card-desc">
                                {s.descripcion ?? "Sin descripción."}
                              </p>
                            </article>
                          );
                        })}

                      {segmentos.clientesSinSegmento > 0 && (
                        <article className="seg-card seg-card--muted">
                          <div className="seg-card-head">
                            <h3 className="seg-card-title">Sin segmento</h3>
                          </div>

                          <div className="seg-card-metric">
                            <p className="seg-card-count">
                              {formatNum(segmentos.clientesSinSegmento)}
                            </p>
                            <span className="seg-card-count-label">
                              {segmentos.clientesSinSegmento === 1 ? "cliente" : "clientes"}
                            </span>
                          </div>

                          <div className="seg-card-progress">
                            <div className="seg-card-progress-track">
                              <div
                                className="seg-card-progress-bar"
                                style={{
                                  width: `${Math.max(pct(segmentos.clientesSinSegmento), 2)}%`,
                                }}
                              />
                            </div>
                            <span className="seg-card-progress-pct">
                              {pct(segmentos.clientesSinSegmento)}%
                            </span>
                          </div>

                          <p className="seg-card-desc">
                            Clientes que aún no han sido asignados a un segmento de compra.
                          </p>
                        </article>
                      )}
                    </section>
                  )}

                  </div>{/* /ind-two-col compras */}
                </>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
