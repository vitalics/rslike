---
"@rslike/collections": minor
---

First public release of the collections package: `Array`, `ReadonlyArray`, `Map`, `ReadonlyMap`, `Set`, `ReadonlySet` with `Option`-based safe access and `@rslike/iter` integration.

Arrays implement the native iterator contract through `Iter` — `keys()`, `values()`, `entries()` — plus `doubleEndedIter()` and `isEmpty()`. All collections expose `iter()` / `parIter()` and can be used with `iter(...).collect(ctor)`.

Fix package metadata: `main`/`types` point to `dist`, fill keywords/author/license, add `mod.ts`.
