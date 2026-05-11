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
