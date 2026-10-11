import { test, expect } from "@playwright/test";
test("motor real, tablero, errores, variantes y cancelación", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("./");
  await expect(page.locator(".square")).toHaveCount(64);
  await expect(page.locator(".piece")).toHaveCount(32);
  const boxes = await page.locator(".square").evaluateAll((s) =>
    s.map((el) => {
      const r = el.getBoundingClientRect();
      return Math.abs(r.width - r.height);
    }),
  );
  expect(Math.max(...boxes)).toBeLessThan(1);
  await page.locator("#example").click();
  await page.locator("#engine-mode").selectOption("lite");
  await page.locator('input[value="3"]').check();
  await page.locator("#analyze").click();
  await expect(page.locator("#status")).toHaveText("Análisis completo", {
    timeout: 20000,
  });
  await expect(page.locator("#san")).toHaveText(/#/);
  await expect(page.locator("#score")).toHaveText("M1");
  await expect(page.locator("#arrows polygon")).toHaveCount(1);
  await page.locator("#variation button").first().click();
  await expect(page.locator("#board-caption")).toHaveText(/Después/);
  await page.locator("#flip").click();
  await page.locator("#original").click();
  await page.locator("#fen").fill("FEN incorrecto");
  await page.locator("#analyze").click();
  await expect(page.locator("#error")).toHaveText(/seis campos/);
  await expect(page.locator("#san")).toHaveText("—");
  await page
    .locator("#fen")
    .fill("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
  await page.locator('input[value="45"]').check();
  await page.locator("#analyze").click();
  await expect(page.locator("#san")).not.toHaveText("—", { timeout: 15000 });
  await page.locator("#stop").click();
  await expect(page.locator("#status")).toHaveText("Detenido");
  await expect(page.locator("#analyze")).toBeEnabled();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
test("Stockfish completo encuentra mate sin servicios externos", async ({
  page,
}) => {
  await page.goto("./");
  await page.locator("#example").click();
  await page.locator('input[value="3"]').check();
  await page.locator("#analyze").click();
  await expect(page.locator("#status")).toHaveText("Análisis completo", {
    timeout: 45000,
  });
  await expect(page.locator("#description")).toHaveText(/Jaque mate/);
  await expect(page.locator("#score")).toHaveText("M1");
});
test("ahogado y metadatos legibles sin analizar", async ({ page }) => {
  await page.goto("./");
  await expect(page).toHaveTitle(/Stockfish 19/);
  await expect(page.locator("h1")).toHaveCount(1);
  await page.locator("#fen").fill("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1");
  await page.locator("#analyze").click();
  await expect(page.locator("#description")).toHaveText(/ahogado/);
  await expect(page.locator("#status")).toHaveText("Partida terminada");
});
