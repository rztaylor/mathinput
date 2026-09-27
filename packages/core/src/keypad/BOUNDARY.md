# keypad

Owns keypads as data (spec §8): key, tab and layout types, the preset
layouts per subject and level, host patches, and applying a key's action to
an `Editor`. Key ids are stable public API.

Does not render keys, detect form factors or handle pointers — that is
`@mathinput/element`'s keypad UI. Depends on `model` and `editor`.
