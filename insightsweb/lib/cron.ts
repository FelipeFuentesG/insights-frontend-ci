export type Modo = "programado" | "periodico";
export type Repetir = "diario" | "semanal";

export interface Programacion {
  modo: Modo;
  repetir: Repetir;
  hora: string;
  dias: number[];
  cadaHoras: number;
}

export const DIAS: { label: string; num: number }[] = [
  { label: "L", num: 1 },
  { label: "M", num: 2 },
  { label: "X", num: 3 },
  { label: "J", num: 4 },
  { label: "V", num: 5 },
  { label: "S", num: 6 },
  { label: "D", num: 0 },
];

export const NOMBRE_DIA: Record<number, string> = {
  0: "Dom",
  1: "Lun",
  2: "Mar",
  3: "Mié",
  4: "Jue",
  5: "Vie",
  6: "Sáb",
};

export const HORAS_PERIODICO = [1, 2, 3, 4, 6, 8, 12];

export function construirCron(p: Programacion): string {
  if (p.modo === "periodico") return `0 */${p.cadaHoras} * * *`;
  const [h, m] = (p.hora || "06:00").split(":");
  const min = Number(m);
  const hr = Number(h);
  if (p.repetir === "semanal") {
    const dias = p.dias.length ? [...p.dias].sort((a, b) => a - b).join(",") : "*";
    return `${min} ${hr} * * ${dias}`;
  }
  return `${min} ${hr} * * *`;
}

export function describir(p: Programacion): string {
  if (p.modo === "periodico") return `Cada ${p.cadaHoras} ${p.cadaHoras === 1 ? "hora" : "horas"}`;
  if (p.repetir === "semanal") {
    if (!p.dias.length) return "Selecciona al menos un día";
    const dias = [...p.dias].sort((a, b) => a - b).map((n) => NOMBRE_DIA[n]).join(", ");
    return `${dias} a las ${p.hora}`;
  }
  return `Todos los días a las ${p.hora}`;
}

export function desdeCron(cron: string | null): Programacion {
  const def: Programacion = { modo: "programado", repetir: "diario", hora: "06:00", dias: [], cadaHoras: 6 };
  if (!cron) return def;
  const intervalo = cron.match(/^0 \*\/(\d+) \* \* \*$/);
  if (intervalo) return { ...def, modo: "periodico", cadaHoras: Number(intervalo[1]) };
  const p = cron.trim().split(/\s+/);
  if (p.length === 5 && p[2] === "*" && p[3] === "*" && /^\d+$/.test(p[0]) && /^\d+$/.test(p[1])) {
    const hora = `${p[1].padStart(2, "0")}:${p[0].padStart(2, "0")}`;
    if (p[4] === "*") return { ...def, hora };
    const dias = p[4].split(",").map(Number).filter((n) => !isNaN(n));
    return { ...def, repetir: "semanal", hora, dias };
  }
  return def;
}
