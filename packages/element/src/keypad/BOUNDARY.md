# keypad (element)

Owns the keypad UI (spec §8): form-factor layouts, tabs, key buttons with
rendered-expression labels, the hold-for-options indicator and variants
menu, roving keyboard focus, shift, and the periodic table sheet.

Does not define which keys exist or what they do — layouts and actions come
from `@mathinput/core` (`keypadPreset`, `applyKey`). Visibility, placement
(`keypad-container`) and form detection are decided by `math-input.ts`.
