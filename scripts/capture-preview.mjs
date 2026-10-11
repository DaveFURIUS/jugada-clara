import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
await mkdir(".qa", { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
    deviceScaleFactor: 1,
  });
  await page.goto("http://127.0.0.1:4173/jugada-clara/");
  await page.locator("#engine-mode").selectOption("lite");
  await page.locator('input[value="3"]').check();
  await page.locator("#analyze").click();
  await page.waitForFunction(
    () => document.getElementById("status").textContent === "Análisis completo",
  );
  await page.screenshot({ path: ".qa/desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: ".qa/mobile.png", fullPage: true });
  console.log("Capturas de escritorio y móvil guardadas.");
} finally {
  await browser.close();
}
