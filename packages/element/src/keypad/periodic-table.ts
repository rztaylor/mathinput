/** The periodic table sheet (spec §8.5). */
import { ELEMENTS } from "@mathinput/core";

/** [period row, group column] for each element in atomic-number order; f-block on rows 9–10. */
function position(z: number): [number, number] {
  if (z === 1) return [1, 1];
  if (z === 2) return [1, 18];
  const periods: [number, number, number][] = [[3, 10, 2], [11, 18, 3], [19, 36, 4], [37, 54, 5], [55, 86, 6], [87, 118, 7]];
  for (const [from, to, row] of periods) {
    if (z < from || z > to) continue;
    const i = z - from;
    if (row <= 3) return [row, i < 2 ? i + 1 : i + 11];
    if (row <= 5) return [row, i + 1];
    // Periods 6 and 7: La/Ac in group 3, then f-block rows, then groups 4–18.
    if (i < 3) return [row, i + 1];
    if (i < 17) return [row + 3, i + 1];
    return [row, i - 13];
  }
  return [1, 1];
}

const NON_METALS = new Set("H He C N O F Ne P S Cl Ar Se Br Kr I Xe Rn".split(" "));

export function periodicTable(onPick: (symbol: string) => void, onClose: () => void): HTMLElement {
  const sheet = document.createElement("div");
  sheet.className = "mi-sheet";
  sheet.setAttribute("role", "dialog");
  sheet.setAttribute("aria-label", "Periodic table");
  const head = document.createElement("div");
  head.className = "mi-sheet__head";
  const title = document.createElement("span");
  title.className = "mi-sheet__title";
  title.textContent = "Periodic table";
  const close = document.createElement("button");
  close.type = "button";
  close.className = "mi-sheet__close";
  close.textContent = "Close";
  close.addEventListener("pointerdown", (e) => e.preventDefault());
  close.addEventListener("click", onClose);
  head.append(title, close);
  const scroll = document.createElement("div");
  scroll.className = "mi-sheet__scroll";
  const grid = document.createElement("div");
  grid.className = "mi-periodic";
  ELEMENTS.forEach((symbol, idx) => {
    const [r, c] = position(idx + 1);
    const b = document.createElement("button");
    b.type = "button";
    b.className = "mi-periodic__cell";
    if (NON_METALS.has(symbol)) b.dataset.nonmetal = "";
    b.textContent = symbol;
    b.style.gridRow = String(r);
    b.style.gridColumn = String(c);
    b.addEventListener("pointerdown", (e) => e.preventDefault());
    b.addEventListener("click", () => onPick(symbol));
    grid.append(b);
  });
  scroll.append(grid);
  sheet.append(head, scroll);
  sheet.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.preventDefault(); onClose(); } });
  return sheet;
}
