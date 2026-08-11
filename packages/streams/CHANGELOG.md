# @rslike/streams

## 1.0.0

### Major Changes

- a36f2e3: streams: promote to a stable major release.

  **Breaking:** platform-specific adapters are no longer re-exported from the
  root entry. Import them from dedicated runtime subpaths instead:

  ```ts
  import {
    fromNodeReadable,
    fromNodeWritable,
    fromNodeDuplex,
    nodeAsyncRead,
  } from "@rslike/streams/runtime/node";
  import {
    fromWebReadable,
    fromWebWritable,
    fromWebTransform,
  } from "@rslike/streams/runtime/web";
  import {
    Channel,
    PureDuplex,
    duplexPair,
    transform,
  } from "@rslike/streams/runtime/pure"; // also re-exported from the root
  ```

  The root entry stays runtime-agnostic (interfaces, `Channel`/`duplexPair`/`transform`,
  `fromArray`/`fromIterable`, `pipe`, `BufReader`/`BufWriter`), so web bundlers no
  longer pull Node-flavored code. The build output mirrors this layout
  (`dist/runtime/node`, `dist/runtime/web`, `dist/runtime/pure`).

  streams: `pipe(source, sink, { batchSize })` — batched piping: one `ready()`
  backpressure check per batch, sends inside a batch initiated without awaiting
  each one individually (order preserved, results checked at the batch
  boundary). Default `batchSize: 1` keeps the strict sequential protocol.

  streams: `pollNext()` — optional synchronous fast path on the `Stream`
  protocol (analog of Rust's `Poll::Ready`/`Pending`). Returns the value when
  it is synchronously available, or `undefined` to fall back to `await next()`.
  Implemented by `fromArray` (always ready) and `Channel` (buffered / closed /
  errored states), propagated through every adapter (`map`, `filter`, `take`,
  `skip`, `stepBy`, `chain`, `zip`, `enumerate`, `inspect`, `buffer`, `fuse`;
  `throttle` is time-based and stays async-only) and used by all terminators
  and `pipe`. In-memory chains run with zero per-item microtasks:
  `fromArray().collect()` is ~27x faster than `Readable.from` + `for await`,
  adapter chains outperform equivalent Node.js `Transform` pipelines
  (see `streams.bench.ts`).

  streams: `NodeSinkAdapter` swallows the `'error'` event it already reports
  as `Err` from `send()`/`close()` — write failures no longer crash the
  process with an unhandled `'error'`.

  iter: new `IntoIterLike<T, TNext>` interface — analog of Rust's
  `IntoIterator`: a value that can produce a fresh independent pull-based
  iterator via `iter()`. Implemented by all `@rslike/collections` classes.
  Together with `IterLike` this fixes the ecosystem contract: containers
  implement `IntoIterLike`, cursors implement `IterLike`.

### Minor Changes

- a36f2e3: streams: first public release — fallible async streams (`Stream<T, E>`) with `Result<Option<T>, E>` pull protocol. Lazy adapters (`map`, `filter`, `take`, `skip`, `stepBy`, `chain`, `zip`, `enumerate`, `inspect`, `throttle`, `buffer`, `fuse`), `Result`-returning terminators, `Channel` (mpsc, both `Stream` and `Sink`), `pipe` with backpressure, `for await...of` support and `.asyncIter()` conversion to `@rslike/iter`. `Duplex` implementations: `duplexPair` (in-memory socket pair), `transform` (fn-based), `fromWebTransform` (Web `TransformStream`), `fromNodeDuplex` (Node.js `Duplex`/`Transform`); runtime adapters for pure/Node/Web; `BufReader`/`BufWriter` byte buffers. Performance: `fromArray` is lazy pull-based (no background pump), `Channel` uses an amortized O(1) ring queue, hot protocol values (`Ok(None())`, `Ok(undefined)`) are shared frozen singletons — see `streams.bench.ts` for Node.js comparisons.

  iter: new public `IterLike<T, TNext>` interface — the common `next()` capability shared by all pull-based iterators. `Iter`/`Peekable`/`DoubleEndedIter` satisfy `IterLike<T>` (default `TNext = AnyOption<T>`), `AsyncIter` satisfies `IterLike<T, Promise<AnyOption<T>>>`, and fallible streams map to `IterLike<T, Promise<Result<Option<T>, E>>>`.

### Patch Changes

- Updated dependencies [a36f2e3]
- Updated dependencies [a36f2e3]
- Updated dependencies [a36f2e3]
  - @rslike/iter@1.1.0
  - @rslike/std@3.4.0
