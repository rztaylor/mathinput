import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const latex = (page: Page, id: string) =>
  page.locator(`math-input[data-testid=${id}]`).evaluate((el) => (el as unknown as { latex: string }).latex);

async function openKeypad(page: Page, id: string) {
  const host = page.locator(`math-input[data-testid=${id}]`);
  if ((await host.getAttribute("data-keypad")) !== "open") await host.locator(".mi-keypad-toggle").click();
  await expect(host.locator(".mi-keypad")).toBeVisible();
  return host;
}

async function clear(page: Page, id: string) {
  await page.locator(`math-input[data-testid=${id}]`).evaluate((el) => (el as unknown as { clear(): void }).clear());
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("math-input[data-testid=maths] .mi-frac");
});

test("keypad opens automatically only on touch devices", async ({ page }, info) => {
  const host = page.locator("math-input[data-testid=maths]");
  const expected = info.project.name.startsWith("desktop") ? "closed" : "open";
  await expect(host).toHaveAttribute("data-keypad", expected);
});

test("keys build an expression, including bracketing existing work", async ({ page }) => {
  const host = await openKeypad(page, "maths");
  await clear(page, "maths");
  const key = (id: string) => host.locator(`.mi-key[data-key-id="${id}"]`).first();
  for (const id of ["digit-2", "nav-variable", "op-plus", "digit-3"]) await key(id).click();
  await key("left").click();
  await key("left").click();
  await key("left").click();
  await key("left").click();
  await key("open-bracket").click();
  for (let i = 0; i < 4; i++) await key("right").click();
  await key("close-bracket").click();
  await key("power").click();
  await key("digit-2").click();
  expect(await latex(page, "maths")).toBe("(2x+3)^{2}");
});

test("long press opens the variants and release picks one", async ({ page }) => {
  const host = await openKeypad(page, "maths");
  await clear(page, "maths");
  await host.locator('.mi-key[data-key-id="digit-5"]').first().click();
  const power = host.locator('.mi-key[data-key-id="power"]').first();
  const box = await power.boundingBox();
  if (!box) throw new Error("no power key");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(550);
  const menu = host.locator(".mi-variants");
  await expect(menu).toBeVisible();
  const cube = menu.locator('[data-key-id="cube"]');
  const cb = await cube.boundingBox();
  if (!cb) throw new Error("no cube variant");
  await page.mouse.move(cb.x + cb.width / 2, cb.y + cb.height / 2);
  await page.mouse.up();
  await expect(menu).toHaveCount(0);
  expect(await latex(page, "maths")).toBe("5^{3}");
});

test("chemistry keys and periodic table", async ({ page }) => {
  const host = await openKeypad(page, "chemistry");
  await clear(page, "chemistry");
  const key = (id: string) => host.locator(`.mi-key[data-key-id="${id}"]`).first();
  if (!(await key("element-Na").isVisible())) await host.locator(".mi-tab", { hasText: "Elements" }).click();
  await key("element-Na").click();
  await key("element-Cl").click();
  await key("periodic-table").click();
  await host.locator(".mi-periodic__cell", { hasText: /^Xe$/ }).click();
  expect(await latex(page, "chemistry")).toBe("\\ce{NaClXe}");
});

for (const theme of ["light", "dark"]) {
  test(`keypad has no accessibility violations (${theme})`, async ({ page }) => {
    await page.selectOption("#theme", theme);
    await openKeypad(page, "maths");
    await openKeypad(page, "chemistry");
    const results = await new AxeBuilder({ page }).include(".demo-fields").analyze();
    expect(results.violations).toEqual([]);
  });
}

test("keypad screenshots", async ({ page }, info) => {
  for (const theme of ["light", "dark"]) {
    await page.selectOption("#theme", theme);
    for (const id of ["maths", "chemistry", "physics"]) {
      const host = await openKeypad(page, id);
      await host.screenshot({ path: info.outputPath(`${id}-${theme}.png`) });
    }
  }
  const host = page.locator("math-input[data-testid=maths]");
  await host.locator('.mi-key[data-key-id="power"]').first().click({ button: "right" });
  await host.screenshot({ path: info.outputPath("maths-variants.png") });
});

test("skin screenshots", async ({ page }, info) => {
  test.skip(info.project.name !== "tablet", "one form factor is enough for skins");
  for (const skin of ["contrast", "paper", "midnight", "rounded"]) {
    await page.selectOption("#skin", skin);
    const host = await openKeypad(page, "maths");
    await host.screenshot({ path: info.outputPath(`skin-${skin}.png`) });
  }
});

test("a light skin re-skins the keypad tabs even when the page is dark", async ({ page }) => {
  await page.selectOption("#theme", "dark");
  await page.selectOption("#skin", "paper");
  const host = await openKeypad(page, "maths");
  const selected = host.locator(".mi-tab--selected");
  await expect(selected).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(host.locator(".mi-tab:not(.mi-tab--selected)").first()).toHaveCSS("color", "rgb(107, 90, 71)");
  await expect(host).toHaveAttribute("theme", "light");
});
