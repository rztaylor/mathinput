# model

Owns the tree types (spec §3), closed vocabularies (operators, relations,
functions, units, elements, Greek letters), builders, generic slot access and
walking, validation of untrusted JSON, and cloning.

Does not own output formats (`serialize`), editing (`editor`), or input rules
(`rules`). Imports nothing outside this folder.
