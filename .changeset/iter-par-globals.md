---
"@rslike/iter": minor
"@rslike/std": minor
---

iter: add `ParIter` (concurrent pipelines via `Promise.all`) and `WorkerParIter` (CPU-parallel pipelines on worker threads) with dedicated `./par-iter` and `./worker-par-iter` subpath exports.

iter: add `AsyncIter` — lazy pull-based async iterator (Rust's `Stream` analog) over `AsyncIterable`/`Iterable` sources, with async-capable adapters, `for await...of` and sync `for...of` (`Iterable<PromiseLike<T>>`) support, and `./async-iter` subpath export.

iter: new `Iter` methods — `mapWhile`, `scan`, `intersperse`, `cycle`, `chunks`, `findMap`, `partition`.

iter: `collect(ctor)` — collect into a specific constructor (`Array`, `Set`, `Map` for `[K, V]` pairs, `Iter`, `DoubleEndedIter`, `@rslike/collections` classes). Supported by `Iter`, `DoubleEndedIter`, `ParIter` and `WorkerParIter`.

iter: fix `./globals` export — add the missing `src/globals.ts` entry attaching `iter`, `doubleEndedIter`, `parIter`, `workerParIter` (and their classes) to `globalThis`.

std: fast-path `Some`/`None` constructors that bypass executor machinery (performance).

std: `Cloneable<T>` interface, `WELL_KNOWN_CLONE_API` well-known symbol and standalone `clone(value)` function (Rust's `Clone` trait). `Option` and `Result` implement `Cloneable` — `opt.clone()` / `res.clone()` deep-clone the contained value (or error) via the `Cloneable` trait, `structuredClone`, or identity for primitives.

std: fix `./globals` export bundling (dropped broken `external: ["./index"]` from tsup config).
