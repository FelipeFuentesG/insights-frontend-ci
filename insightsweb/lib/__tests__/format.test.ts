import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { frescura, tiempoRelativo, estadoProgramacion } from "../format";

describe("frescura", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-16T12:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("verde si la última carga fue hace menos de 6h", () => {
    expect(frescura("2026-06-16T09:00:00Z", false).color).toBe("#10b981");
  });

  it("ámbar si fue entre 6 y 24h", () => {
    expect(frescura("2026-06-15T20:00:00Z", false).color).toBe("#f59e0b");
  });

  it("rojo si fue hace más de 24h", () => {
    expect(frescura("2026-06-10T12:00:00Z", false).color).toBe("#dc2626");
  });

  it("rojo y mensaje de fallo si la última ejecución falló", () => {
    const r = frescura("2026-06-16T11:59:00Z", true);
    expect(r.color).toBe("#dc2626");
    expect(r.label).toBe("Última ejecución falló");
  });

  it("gris si no hay fecha", () => {
    expect(frescura(null, false).color).toBe("#9ca3af");
  });
});

describe("tiempoRelativo", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-16T12:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("muestra horas", () => {
    expect(tiempoRelativo("2026-06-16T09:00:00Z")).toBe("hace 3 h");
  });

  it("muestra días", () => {
    expect(tiempoRelativo("2026-06-14T12:00:00Z")).toBe("hace 2 d");
  });

  it("'—' si no hay fecha", () => {
    expect(tiempoRelativo(null)).toBe("—");
  });
});

describe("estadoProgramacion", () => {
  it("traduce los estados del scheduler", () => {
    expect(estadoProgramacion("ENABLED")).toBe("Activa");
    expect(estadoProgramacion("PAUSED")).toBe("Pausada");
    expect(estadoProgramacion(null)).toBe("—");
  });
});
