import { Page } from "@playwright/test";

export async function loginAsAdmin(page: Page) {
  await page.goto("/login");
  await page.fill('input[type="email"]', "admin@andesml.com");
  await page.fill('input[type="number"]', "1");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/home/, { timeout: 20_000 });
}
