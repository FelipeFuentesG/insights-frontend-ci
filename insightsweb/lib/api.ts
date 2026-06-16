const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  return res;
}

export interface MetricasInteraccion {
  clics: number;
  visitas: number;
  tiempoPromedioVisualizacion: number;
}

export interface MetricasInteraccionPeriodo {
  periodo: string;
  clics: number;
  visitas: number;
  tiempoPromedioVisualizacion: number;
}

export async function fetchMetricasInteraccion(
  tipo: "marca" | "retailer",
  id: string,
  desde: string,
  hasta: string
): Promise<MetricasInteraccion> {
  const path =
    tipo === "marca"
      ? `/db/marcas/${id}/interacciones/metricas`
      : `/db/retailers/${id}/interacciones/metricas`;
  const res = await apiFetch(`${path}?desde=${desde}&hasta=${hasta}`);
  if (!res.ok) throw new Error("Error al cargar las métricas de interacción.");
  return res.json();
}

export async function fetchMetricasInteraccionSerie(
  tipo: "marca" | "retailer",
  id: string,
  desde: string,
  hasta: string,
  agruparPor: string
): Promise<MetricasInteraccionPeriodo[]> {
  const path =
    tipo === "marca"
      ? `/db/marcas/${id}/interacciones/metricas/serie`
      : `/db/retailers/${id}/interacciones/metricas/serie`;
  const res = await apiFetch(`${path}?desde=${desde}&hasta=${hasta}&agruparPor=${agruparPor}`);
  if (!res.ok) throw new Error("Error al cargar la serie de interacciones.");
  return res.json();
}

export interface InteraccionPorDia {
  diaSemana: number;
  nombreDia: string;
  totalInteracciones: number;
}

export interface InteraccionPorHora {
  hora: number;
  totalInteracciones: number;
}

export interface TendenciaInteracciones {
  porDiaSemana: InteraccionPorDia[];
  porHoraDia: InteraccionPorHora[];
}

export async function fetchTendenciaInteracciones(
  tipo: "marca" | "retailer",
  id: string,
  desde: string,
  hasta: string
): Promise<TendenciaInteracciones> {
  const path =
    tipo === "marca"
      ? `/db/marcas/${id}/interacciones/tendencia`
      : `/db/retailers/${id}/interacciones/tendencia`;
  const res = await apiFetch(`${path}?desde=${desde}&hasta=${hasta}`);
  if (!res.ok) throw new Error("Error al cargar la tendencia de interacciones.");
  return res.json();
}

export interface ClientesPeriodo {
  periodo: string;
  totalClientes: number;
}

export async function fetchClientesSerie(
  tipo: "marca" | "retailer",
  id: string,
  desde: string,
  hasta: string,
  agruparPor: string
): Promise<ClientesPeriodo[]> {
  const path =
    tipo === "marca"
      ? `/db/marcas/${id}/clientes/serie`
      : `/db/retailers/${id}/clientes/serie`;
  const res = await apiFetch(`${path}?desde=${desde}&hasta=${hasta}&agruparPor=${agruparPor}`);
  if (!res.ok) throw new Error("Error al cargar la serie de clientes.");
  return res.json();
}

export interface ClienteResumen {
  idCliente: number;
  nombre: string | null;
  edad: number | null;
  genero: string | null;
  comuna: string | null;
}

export async function fetchClientesPorMarca(idMarca: string): Promise<ClienteResumen[]> {
  const res = await apiFetch(`/db/marcas/${idMarca}/clientes`);
  if (!res.ok) throw new Error("Error al cargar los clientes.");
  return res.json();
}

export interface SegmentoCompra {
  idCluster: number;
  nombre: string | null;
  descripcion: string | null;
  definidoIa: boolean;
  totalClientes: number;
}

export interface SegmentosCompra {
  segmentos: SegmentoCompra[];
  clientesSinSegmento: number;
  totalClientes: number;
}

export async function fetchSegmentosCompra(
  idMarca: string,
  refresh = false
): Promise<SegmentosCompra> {
  const path = `/db/marcas/${idMarca}/segmentos-compra${refresh ? "?refresh=true" : ""}`;
  const res = await apiFetch(path);
  if (!res.ok) throw new Error("Error al cargar los segmentos de compra.");
  return res.json();
}

export async function limpiarSegmentosCompra(
  idMarca: string
): Promise<{ clientesActualizados: number }> {
  const res = await apiFetch(`/db/marcas/${idMarca}/segmentos-compra/asignaciones`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(body || "Error al limpiar los segmentos.");
  }
  return res.json();
}

export async function limpiarTodosSegmentosCompra(): Promise<{ clientesActualizados: number }> {
  const res = await apiFetch(`/db/segmentos-compra/asignaciones`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(body || "Error al limpiar todos los segmentos.");
  }
  return res.json();
}

export interface AsignacionClustersResultado {
  clustersCreados: boolean;
  clientesAsignados: number;
}

export async function asignarClustersClientes(
  idMarca: string
): Promise<AsignacionClustersResultado> {
  const res = await apiFetch(`/db/marcas/${idMarca}/clientes/asignar-clusters`, {
    method: "POST",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(body || "Error al asignar clusters.");
  }
  return res.json();
}

export async function asignarClustersTodasMarcas(): Promise<AsignacionClustersResultado> {
  const res = await apiFetch(`/db/clientes/asignar-clusters`, {
    method: "POST",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(body || "Error al asignar clusters globalmente.");
  }
  return res.json();
}

export interface RfmMetrics {
  recenciaPromedioDias: number;
  frecuenciaPromedio: number;
  ticketPromedio: number;
}

export async function fetchComportamientoCompra(
  tipo: "marca" | "retailer",
  id: string,
  desde: string,
  hasta: string
): Promise<RfmMetrics> {
  const path =
    tipo === "marca"
      ? `/db/marcas/${id}/comportamiento-compra/metricas`
      : `/db/retailers/${id}/comportamiento-compra/metricas`;
  const res = await apiFetch(`${path}?desde=${desde}&hasta=${hasta}`);
  if (!res.ok) throw new Error("Error al cargar el comportamiento de compra.");
  return res.json();
}

export interface RfmPeriodo {
  periodo: string;
  frecuenciaPromedio: number;
  ticketPromedio: number;
}

export interface UltimaActualizacion {
  ultimaActualizacion: string;
}

export async function fetchUltimaActualizacion(): Promise<UltimaActualizacion> {
  const res = await apiFetch("/db/ultima-actualizacion");
  if (!res.ok) throw new Error("Error al cargar la última actualización.");
  return res.json();
}

export async function fetchComportamientoCompraSerie(
  tipo: "marca" | "retailer",
  id: string,
  desde: string,
  hasta: string,
  agruparPor: string
): Promise<RfmPeriodo[]> {
  const path =
    tipo === "marca"
      ? `/db/marcas/${id}/comportamiento-compra/serie`
      : `/db/retailers/${id}/comportamiento-compra/serie`;
  const res = await apiFetch(`${path}?desde=${desde}&hasta=${hasta}&agruparPor=${agruparPor}`);
  if (!res.ok) throw new Error("Error al cargar la serie de comportamiento de compra.");
  return res.json();
}
