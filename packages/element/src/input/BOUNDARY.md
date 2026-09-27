# input

Owns the mapping from hardware keyboard events to editor commands
(`keyboard.ts`, spec §7.5). Printable text, IME, dictation and clipboard
arrive through the receiver's input and clipboard events in `math-input.ts`.

Does not decide what a character means; `Editor.type()` in core does.
