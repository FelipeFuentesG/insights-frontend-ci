import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/login";

test.describe("Página principal se visualiza correctamente (/home)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page.locator(".home-greeting")).toBeVisible({ timeout: 10_000 });
  });

  test("Se muestra el saludo al usuario y el sidebar con sus componentes correctas", async ({ page }) => {
    await expect(page.locator(".home-greeting")).toBeVisible();
    await expect(page.locator("aside.home-sidebar")).toBeVisible();
    // El saludo incluye el nombre del usuario
    const greeting = await page.locator(".home-greeting").textContent();
    expect(greeting).toMatch(/Hola/i);
  });

  test("En Inicio, se muestran las tres secciones: Indicadores, Interacciones y Perfil", async ({ page }) => {
    await expect(page.locator(".home-tab").filter({ hasText: "Indicadores" })).toBeVisible();
    await expect(page.locator(".home-tab").filter({ hasText: "Interacciones" })).toBeVisible();
    await expect(page.locator(".home-tab").filter({ hasText: "Perfil" })).toBeVisible();
  });

  test("Sección Indicadores está activa por defecto y muestra contenido", async ({ page }) => {
    const indicadoresTab = page.locator(".home-tab").filter({ hasText: "Indicadores" });
    await expect(indicadoresTab).toHaveClass(/active/);
    await expect(page.locator(".home-content")).toBeVisible();
  });

  test("Sección Interacciones es seleccionable y carga su contenido", async ({ page }) => {
    await page.locator(".home-tab").filter({ hasText: "Interacciones" }).click();
    await expect(page.locator(".home-content")).toBeVisible();
    await expect(
      page.locator(".home-tab").filter({ hasText: "Interacciones" })
    ).toHaveClass(/active/);
  });

  test("Sección Perfil muestra KPIs de comportamiento de compra de clientes", async ({ page }) => {
    await page.locator(".home-tab").filter({ hasText: "Perfil" }).click();
    await expect(page.locator(".ind-kpi-card").first()).toBeVisible({ timeout: 15_000 });
    const kpiCards = page.locator(".ind-kpi-card");
    await expect(kpiCards).toHaveCount(3);
  });
});
