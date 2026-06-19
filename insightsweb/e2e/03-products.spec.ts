import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/login";

test.describe("Dashboard de Productos", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("Página /productos carga con el título y sidebar correcto", async ({ page }) => {
    await page.goto("/productos");
    await expect(page.locator("h1.pl-title")).toContainText("Productos");
    await expect(page.locator("aside.home-sidebar")).toBeVisible();
  });

  test("Página /productos muestra el selector de retailers para admin global", async ({ page }) => {
    await page.goto("/productos");

    const retailerBtn = page.locator(".pl-retailer-btn").first();
    await expect(retailerBtn).toBeVisible({ timeout: 15_000 });

    const retailerName = await retailerBtn.textContent();
    expect(retailerName?.trim().length).toBeGreaterThan(0);
  });

  test("Página /productos permite seleccionar un retailer y cargar la grilla de productos", async ({ page }) => {
    await page.goto("/productos");

    const retailerBtn = page.locator(".pl-retailer-btn").first(); // Primer producto
    await expect(retailerBtn).toBeVisible({ timeout: 15_000 });
    await retailerBtn.click();

    const productCard = page.locator(".pl-card").first();
    await expect(productCard).toBeVisible({ timeout: 20_000 });

    await expect(page.locator(".pl-card-name").first()).toBeVisible();
    const productName = await page.locator(".pl-card-name").first().textContent();
    expect(productName?.trim().length).toBeGreaterThan(0);
  });

  test("Página /productos permite acceder al detalle de un producto", async ({ page }) => {
    await page.goto("/productos");

    // Selecciona retailer
    const retailerBtn = page.locator(".pl-retailer-btn").first();
    await expect(retailerBtn).toBeVisible({ timeout: 15_000 });
    await retailerBtn.click();

    // Hace clic en el primer producto
    const productCard = page.locator(".pl-card").first();
    await expect(productCard).toBeVisible({ timeout: 20_000 });

    const productName = await page.locator(".pl-card-name").first().textContent();
    await productCard.click();

    // Verifica navegación a la ruta dinámica
    await page.waitForURL(/\/productos\/\d+/, { timeout: 10_000 });

    // Header identifica la sección
    await expect(page.locator(".pd-header-sup")).toContainText("Dashboard de producto");

    // El nombre del producto aparece en el header
    await expect(page.locator(".home-greeting")).toContainText(productName!.trim());

    // KPI cards están presentes (Ingresos totales, Unidades vendidas, Períodos)
    await expect(page.locator(".pd-kpi-card").first()).toBeVisible({ timeout: 20_000 });
    const kpiCount = await page.locator(".pd-kpi-card").count();
    expect(kpiCount).toBe(3);

    // El título del gráfico de ventas es visible
    await expect(
      page.locator(".pd-card-title").filter({ hasText: "Evolución de ventas" })
    ).toBeVisible({ timeout: 10_000 });

    // La sección de palabras clave existe
    await expect(
      page.locator(".pd-card-title").filter({ hasText: "Palabras clave" })
    ).toBeVisible();
  });
});
