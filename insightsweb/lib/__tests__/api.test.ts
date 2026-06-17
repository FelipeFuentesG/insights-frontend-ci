import { describe, it, expect, vi, afterEach } from "vitest";
import {
  fetchComportamientoCompra,
  fetchEstadoCarga,
  fetchEtlScheduler,
  updateEtlScheduler,
} from "../api";

function fetchOk(body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: async () => body,
    text: async () => JSON.stringify(body),
  });
}

describe("lib/api", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("fetchComportamientoCompra usa el endpoint de marca con los filtros", async () => {
    const f = fetchOk({ recenciaPromedioDias: 1, frecuenciaPromedio: 2, ticketPromedio: 3 });
    vi.stubGlobal("fetch", f);

    await fetchComportamientoCompra("marca", "3", "2026-01-01", "2026-12-31");

    expect(f).toHaveBeenCalledWith(
      expect.stringContaining("/db/marcas/3/comportamiento-compra/metricas?desde=2026-01-01&hasta=2026-12-31"),
      expect.anything()
    );
  });

  it("fetchComportamientoCompra usa el endpoint de retailer", async () => {
    const f = fetchOk({});
    vi.stubGlobal("fetch", f);

    await fetchComportamientoCompra("retailer", "1", "a", "b");

    expect(f).toHaveBeenCalledWith(
      expect.stringContaining("/db/retailers/1/comportamiento-compra/metricas"),
      expect.anything()
    );
  });

  it("fetchEstadoCarga pega a /db/estado-carga", async () => {
    const f = fetchOk({ ultimaCargaExitosa: null, ultimaEjecucion: null, historial: [] });
    vi.stubGlobal("fetch", f);

    await fetchEstadoCarga();

    expect(f).toHaveBeenCalledWith(expect.stringContaining("/db/estado-carga"), expect.anything());
  });

  it("updateEtlScheduler manda POST con el schedule en el body", async () => {
    const f = fetchOk({ estado: "ENABLED", schedule: "0 6 * * *", timeZone: "America/Santiago" });
    vi.stubGlobal("fetch", f);

    await updateEtlScheduler("0 6 * * *");

    const opciones = f.mock.calls[0][1];
    expect(opciones.method).toBe("POST");
    expect(opciones.body).toBe(JSON.stringify({ schedule: "0 6 * * *" }));
  });

  it("propaga el mensaje de error del backend cuando la respuesta no es ok", async () => {
    const f = vi.fn().mockResolvedValue({ ok: false, text: async () => "403 PERMISSION_DENIED" });
    vi.stubGlobal("fetch", f);

    await expect(fetchEtlScheduler()).rejects.toThrow("403 PERMISSION_DENIED");
  });
});
