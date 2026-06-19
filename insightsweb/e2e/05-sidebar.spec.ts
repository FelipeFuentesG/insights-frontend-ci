import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/login";

test.describe("Navegación por Sidebar", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page.locator("aside.home-sidebar")).toBeVisible({ timeout: 10_000 });
  });

  test("Sidebar muestra el logo y los ítems de navegación principales", async ({ page }) => {
    await expect(page.locator(".home-sidebar-logo-text")).toContainText("Andes ML");

    // Ítems raíz del menú
    await expect(page.locator(".home-sidebar-item").filter({ hasText: "Inicio" })).toBeVisible();
    await expect(page.locator(".home-sidebar-item").filter({ hasText: "Tableros" })).toBeVisible();
    await expect(
      page.locator(".home-sidebar-item").filter({ hasText: "Análisis de Catálogo" })
    ).toBeVisible();
  });

  test("Se despliega el submenú de Tableros y navega a Dashboard de Clientes correctamente", async ({ page }) => {
    // Hace clic en "Tableros" para abrir el submenú
    await page.locator(".home-sidebar-item").filter({ hasText: "Tableros" }).click();

    // Los ítems del submenú son visibles
    await expect(
      page.locator(".home-sidebar-subitem").filter({ hasText: "Dashboard de Productos" })
    ).toBeVisible();
    await expect(
      page.locator(".home-sidebar-subitem").filter({ hasText: "Dashboard de Ventas Totales" })
    ).toBeVisible();
    await expect(
      page.locator(".home-sidebar-subitem").filter({ hasText: "Dashboard de Clientes" })
    ).toBeVisible();

    // Navega a Dashboard de Clientes
    await page.locator(".home-sidebar-subitem").filter({ hasText: "Dashboard de Clientes" }).click();
    await page.waitForURL("/clientes", { timeout: 10_000 });
    await expect(page).toHaveURL("/clientes");
    await expect(page.locator(".home-greeting")).toContainText("Dashboard de Clientes");
  });
});
