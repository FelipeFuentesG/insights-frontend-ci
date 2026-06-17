export function parseFecha(iso: string | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

export function tiempoRelativo(iso: string | null): string {
  const d = parseFecha(iso);
  if (!d) return "—";
  const diffMs = Date.now() - d.getTime();
  const horas = Math.floor(diffMs / 3_600_000);
  if (horas < 1) {
    const min = Math.max(1, Math.floor(diffMs / 60_000));
    return `hace ${min} min`;
  }
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  return `hace ${dias} d`;
}

export function fechaLegible(iso: string | null): string {
  const d = parseFecha(iso);
  if (!d) return "Sin registros";
  return d.toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short" });
}

export function frescura(iso: string | null, ultimaFallida: boolean): { color: string; label: string } {
  const d = parseFecha(iso);
  if (!d) return { color: "#9ca3af", label: "Sin datos" };
  if (ultimaFallida) return { color: "#dc2626", label: "Última ejecución falló" };
  const horas = (Date.now() - d.getTime()) / 3_600_000;
  if (horas < 6) return { color: "#10b981", label: "Datos al día" };
  if (horas < 24) return { color: "#f59e0b", label: "Datos algo atrasados" };
  return { color: "#dc2626", label: "Datos desactualizados" };
}

export function estadoProgramacion(estado: string | null): string {
  if (estado === "ENABLED") return "Activa";
  if (estado === "PAUSED") return "Pausada";
  return "—";
}
