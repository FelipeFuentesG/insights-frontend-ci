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

export interface EstadoCarga {
  fechaHoraCarga: string | null;
  estado: string | null;
}

export interface EstadoCargaResumen {
  ultimaCargaExitosa: string | null;
  ultimaEjecucion: EstadoCarga | null;
  historial: EstadoCarga[];
}

export async function fetchEstadoCarga(): Promise<EstadoCargaResumen> {
  const res = await apiFetch("/db/estado-carga");
  if (!res.ok) throw new Error("Error al cargar el estado de carga de datos.");
  return res.json();
}

export interface EtlSchedulerEstado {
  estado: string | null;
  schedule: string | null;
  timeZone: string | null;
}

async function errorDeRespuesta(res: Response, fallback: string): Promise<Error> {
  const body = await res.text().catch(() => "");
  return new Error(body ? `${fallback} (${body})` : fallback);
}

export async function fetchEtlScheduler(): Promise<EtlSchedulerEstado> {
  const res = await apiFetch("/db/admin/etl/scheduler");
  if (!res.ok) throw await errorDeRespuesta(res, "Error al cargar la configuración del ETL.");
  return res.json();
}

export async function pauseEtlScheduler(): Promise<EtlSchedulerEstado> {
  const res = await apiFetch("/db/admin/etl/scheduler/pause", { method: "POST" });
  if (!res.ok) throw await errorDeRespuesta(res, "Error al pausar la carga automática.");
  return res.json();
}

export async function resumeEtlScheduler(): Promise<EtlSchedulerEstado> {
  const res = await apiFetch("/db/admin/etl/scheduler/resume", { method: "POST" });
  if (!res.ok) throw await errorDeRespuesta(res, "Error al reanudar la carga automática.");
  return res.json();
}

export async function updateEtlScheduler(schedule: string): Promise<EtlSchedulerEstado> {
  const res = await apiFetch("/db/admin/etl/scheduler/schedule", {
    method: "POST",
    body: JSON.stringify({ schedule }),
  });
  if (!res.ok) throw await errorDeRespuesta(res, "Error al actualizar la programación.");
  return res.json();
}
