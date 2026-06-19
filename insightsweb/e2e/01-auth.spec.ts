import { test, expect } from "@playwright/test";

test.describe("Autenticación", () => {
  test("Página de login carga con sus elementos correctos", async ({ page }) => {
    await page.goto("/login");

    await expect(page.locator("h1")).toContainText("Bienvenido");
    await expect(page.locator('label').filter({ hasText: "Email" })).toBeVisible();
    await expect(page.locator('label').filter({ hasText: "ID de usuario" })).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText("Iniciar sesión");
  });

  test("Al intentar acceder a /home sin sesión, se redirige a /login", async ({ page }) => {
    await page.goto("/home");
    await page.waitForURL(/\/login/);
    await expect(page).toHaveURL(/\/login/);
  });

  test("Al ocurrir login exitoso, se navega a /home y almacena el token JWT", async ({ page }) => {
    await page.goto("/login");

    await page.fill('input[type="email"]', "admin@andesml.com");
    await page.fill('input[type="number"]', "1");
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/home/, { timeout: 20_000 });
    await expect(page).toHaveURL(/\/home/);

    // Verifica que el token JWT fue guardado en localStorage
    const token = await page.evaluate(() => localStorage.getItem("token"));
    expect(token).toBeTruthy();

    // Verifica que el usuario fue guardado correctamente
    const userRaw = await page.evaluate(() => localStorage.getItem("user"));
    expect(userRaw).toBeTruthy();
    const user = JSON.parse(userRaw!);
    expect(user.email).toBe("admin@andesml.com");
  });
});
