import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("math-input[data-testid=maths] .mi-frac");
});

test("renders the sample expressions", async ({ page }) => {
  const maths = page.locator("math-input[data-testid=maths]");
  await expect(maths.locator(".mi-field .mi-radical")).toBeVisible();
  await expect(page.locator("math-input[data-testid=chemistry] .mi-field .mi-atom[data-kind=state]")).toHaveCount(4);
  await expect(page.locator("math-input[data-testid=physics] .mi-field .mi-atom[data-kind=unit]")).toHaveCount(2);
});

test("typing with a keyboard builds the expression", async ({ page }) => {
  const field = page.locator("math-input[data-testid=maths]");
  await field.locator(".mi-field").click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Backspace");
  await page.keyboard.type("x^2");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.type("+3/4");
  await expect.poll(() => field.evaluate((el) => (el as unknown as { latex: string }).latex)).toBe("x^{2}+\\frac{3}{4}");
  await expect(field.locator(".mi-caret")).toBeVisible();
});

test("clicking places the caret inside a fraction", async ({ page }) => {
  const field = page.locator("math-input[data-testid=maths]");
  const den = field.locator(".mi-field .mi-frac__den");
  const box = await den.boundingBox();
  if (!box) throw new Error("no denominator");
  await page.mouse.click(box.x + box.width - 2, box.y + box.height / 2);
  await expect(den).toHaveClass(/mi-row--active/);
  await page.keyboard.type("b");
  await expect.poll(() => field.evaluate((el) => (el as unknown as { latex: string }).latex)).toContain("{2ab}");
});

test("has no accessibility violations", async ({ page }) => {
  const results = await new AxeBuilder({ page }).include(".demo-fields").analyze();
  expect(results.violations).toEqual([]);
});

test("screenshot of the fields", async ({ page }, info) => {
  await page.locator(".demo-fields").screenshot({ path: info.outputPath("fields.png") });
  await page.locator(".demo-gallery").screenshot({ path: info.outputPath("gallery.png") });
});
