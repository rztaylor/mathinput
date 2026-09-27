# keypad

Owns keypads as data (spec §8): key, tab and layout types, the full preset
layout per subject, topic tags on keys, host patches (including removal by
tag), and applying a key's action to an `Editor`. Key ids and preset tags are
stable public API.

Does not know about curricula or levels — those are optional packages built
on patches (for example `@mathinput/presets-uk`). Does not render keys,
detect form factors or handle pointers — that is `@mathinput/element`'s
keypad UI. Depends on `model` and `editor`.
