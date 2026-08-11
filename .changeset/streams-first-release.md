---
"@rslike/streams": minor
"@rslike/iter": minor
---

streams: first public release — fallible async streams (`Stream<T, E>`) with `Result<Option<T>, E>` pull protocol. Lazy adapters (`map`, `filter`, `take`, `skip`, `stepBy`, `chain`, `zip`, `enumerate`, `inspect`, `throttle`, `buffer`, `fuse`), `Result`-returning terminators, `Channel` (mpsc, both `Stream` and `Sink`), `pipe` with backpressure, `for await...of` support and `.asyncIter()` conversion to `@rslike/iter`. `Duplex` implementations: `duplexPair` (in-memory socket pair), `transform` (fn-based), `fromWebTransform` (Web `TransformStream`), `fromNodeDuplex` (Node.js `Duplex`/`Transform`); runtime adapters for pure/Node/Web; `BufReader`/`BufWriter` byte buffers. Performance: `fromArray` is lazy pull-based (no background pump), `Channel` uses an amortized O(1) ring queue, hot protocol values (`Ok(None())`, `Ok(undefined)`) are shared frozen singletons — see `streams.bench.ts` for Node.js comparisons.

iter: new public `IterLike<T, TNext>` interface — the common `next()` capability shared by all pull-based iterators. `Iter`/`Peekable`/`DoubleEndedIter` satisfy `IterLike<T>` (default `TNext = AnyOption<T>`), `AsyncIter` satisfies `IterLike<T, Promise<AnyOption<T>>>`, and fallible streams map to `IterLike<T, Promise<Result<Option<T>, E>>>`.
