import "./shared.ts";
import { SKINS, applySkin, skinCss } from "./skins.ts";
import { onThemeChange, pageTheme } from "./shared.ts";

const select = document.getElementById("docs-skin") as HTMLSelectElement;
const preview = document.getElementById("docs-skin-input") as HTMLElement;
const css = document.getElementById("docs-skin-css") as HTMLElement;
for (const s of SKINS) select.add(new Option(s.name, s.id));
preview.dataset.skinned = "";
const show = () => {
  const skin = SKINS.find((s) => s.id === select.value) ?? SKINS[0];
  if (!skin) return;
  applySkin(preview.parentElement as HTMLElement, skin, pageTheme());
  css.textContent = skinCss(skin);
};
select.addEventListener("change", show);
onThemeChange(show);
show();

// Highlight the section in view.
const links = [...document.querySelectorAll<HTMLAnchorElement>("#docs-nav a")];
const observer = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    for (const l of links) l.classList.toggle("active", l.hash === `#${e.target.id}`);
  }
}, { rootMargin: "-20% 0px -70% 0px" });
for (const id of ["getting-started", "api", "theming", "keypad-config", "formats"]) {
  const el = document.getElementById(id);
  if (el) observer.observe(el);
}
