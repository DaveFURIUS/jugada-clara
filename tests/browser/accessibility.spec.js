import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("sin infracciones automáticas WCAG 2.1 AA en escritorio y móvil", async ({
  page,
}) => {
  await page.goto("./");
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    const scan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(scan.violations).toEqual([]);
  }
});
