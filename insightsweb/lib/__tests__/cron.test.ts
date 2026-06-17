import { describe, it, expect } from "vitest";
import { construirCron, desdeCron, describir, Programacion } from "../cron";

describe("construirCron", () => {
  it("genera cron diario", () => {
    expect(
      construirCron({ modo: "programado", repetir: "diario", hora: "06:00", dias: [], cadaHoras: 6 })
    ).toBe("0 6 * * *");
  });

  it("genera cron semanal con días seleccionados", () => {
    expect(
      construirCron({ modo: "programado", repetir: "semanal", hora: "21:10", dias: [3, 1], cadaHoras: 6 })
    ).toBe("10 21 * * 1,3");
  });

  it("genera cron periódico", () => {
    expect(
      construirCron({ modo: "periodico", repetir: "diario", hora: "06:00", dias: [], cadaHoras: 12 })
    ).toBe("0 */12 * * *");
  });
});

describe("desdeCron", () => {
  it("parsea cron diario", () => {
    expect(desdeCron("0 6 * * *")).toMatchObject({ modo: "programado", repetir: "diario", hora: "06:00" });
  });

  it("parsea cron semanal con días", () => {
    expect(desdeCron("10 21 * * 1,3")).toMatchObject({
      modo: "programado",
      repetir: "semanal",
      hora: "21:10",
      dias: [1, 3],
    });
  });

  it("parsea cron periódico", () => {
    expect(desdeCron("0 */6 * * *")).toMatchObject({ modo: "periodico", cadaHoras: 6 });
  });

  it("cae al default ante null o cron desconocido", () => {
    expect(desdeCron(null)).toMatchObject({ modo: "programado", repetir: "diario" });
    expect(desdeCron("cualquier cosa")).toMatchObject({ modo: "programado", repetir: "diario" });
  });
});

describe("round-trip construirCron <-> desdeCron", () => {
  const casos: Programacion[] = [
    { modo: "programado", repetir: "diario", hora: "09:00", dias: [], cadaHoras: 6 },
    { modo: "programado", repetir: "semanal", hora: "21:10", dias: [1], cadaHoras: 6 },
    { modo: "periodico", repetir: "diario", hora: "06:00", dias: [], cadaHoras: 12 },
  ];

  it.each(casos)("preserva la programación", (p) => {
    const round = desdeCron(construirCron(p));
    expect(construirCron(round)).toBe(construirCron(p));
  });
});

describe("describir", () => {
  it("describe diario", () => {
    expect(
      describir({ modo: "programado", repetir: "diario", hora: "06:00", dias: [], cadaHoras: 6 })
    ).toBe("Todos los días a las 06:00");
  });

  it("describe semanal con un día", () => {
    expect(
      describir({ modo: "programado", repetir: "semanal", hora: "09:00", dias: [1], cadaHoras: 6 })
    ).toBe("Lun a las 09:00");
  });

  it("describe periódico", () => {
    expect(
      describir({ modo: "periodico", repetir: "diario", hora: "06:00", dias: [], cadaHoras: 6 })
    ).toBe("Cada 6 horas");
  });
});
