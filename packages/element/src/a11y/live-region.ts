/**
 * The spoken description of the expression (spec §11), referenced by the
 * receiver's aria-describedby and updated with a short debounce.
 */
export class LiveRegion {
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly el: HTMLElement, private readonly delay = 300) {
    el.setAttribute("aria-live", "polite");
    el.setAttribute("aria-atomic", "true");
  }

  update(text: string): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      if (this.el.textContent !== text) this.el.textContent = text;
    }, this.delay);
  }

  cancel(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}
