# editor

Owns the headless editing state and behaviour (spec §7): caret positions as
paths, selection, every editing and movement command, single-bracket ghost
semantics, keyboard character interpretation (`type`), undo/redo history and
change notification.

Does not own rendering, DOM events, key bindings or focus
(`@mathinput/element`), notation rules as data (`rules`), or output formats
(`serialize`). Depends on `model` and `rules`.
