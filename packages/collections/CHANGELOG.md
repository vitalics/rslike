# @rslike/collections

## 0.1.0

### Minor Changes

- a36f2e3: First public release of the collections package: `Array`, `ReadonlyArray`, `Map`, `ReadonlyMap`, `Set`, `ReadonlySet` with `Option`-based safe access and `@rslike/iter` integration.

  Arrays implement the native iterator contract through `Iter` — `keys()`, `values()`, `entries()` — plus `doubleEndedIter()` and `isEmpty()`. All collections expose `iter()` / `parIter()` and can be used with `iter(...).collect(ctor)`.

  Fix package metadata: `main`/`types` point to `dist`, fill keywords/author/license, add `mod.ts`.

### Patch Changes

- Updated dependencies [a36f2e3]
- Updated dependencies [a36f2e3]
- Updated dependencies [a36f2e3]
  - @rslike/iter@1.1.0
  - @rslike/std@3.4.0
