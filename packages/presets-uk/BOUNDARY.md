# @mathinput/presets-uk

Owns the optional UK curriculum keypads: which preset keys suit GCSE
Foundation, GCSE Higher and A-level, expressed as `KeypadPatch`es over the
core presets (`removeTags`).

Does not define keys, change typing rules or render anything; it uses only
the public keypad API of `@mathinput/core`, so any host can build an
equivalent package for another curriculum. Depends on `@mathinput/core`;
nothing depends on it.
