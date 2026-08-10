---
"@rslike/streams": major
"@rslike/iter": major
---

streams: promote to a stable major release.

**Breaking:** platform-specific adapters are no longer re-exported from the
root entry. Import them from dedicated runtime subpaths instead:

```ts
import { fromNodeReadable, fromNodeWritable, fromNodeDuplex, nodeAsyncRead } from "@rslike/streams/runtime/node";
import { fromWebReadable, fromWebWritable, fromWebTransform } from "@rslike/streams/runtime/web";
import { Channel, PureDuplex, duplexPair, transform } from "@rslike/streams/runtime/pure"; // also re-exported from the root
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

iter: promote to a stable major release.

iter: new `IntoIterLike<T, TNext>` interface — analog of Rust's
`IntoIterator`: a value that can produce a fresh independent pull-based
iterator via `iter()`. Implemented by all `@rslike/collections` classes.
Together with `IterLike` this fixes the ecosystem contract: containers
implement `IntoIterLike`, cursors implement `IterLike`.
