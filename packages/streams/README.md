# @rslike/streams

Rust-inspired **fallible async streams** for JavaScript and TypeScript — modeled after `futures::Stream` / `StreamExt` and `tokio`'s `mpsc` channel.

Unlike `AsyncIter` from `@rslike/iter` (infallible), a `Stream` pulls `Result<Option<T>, E>`: every pull can fail, and errors propagate through adapters and terminators without exceptions.

## Features

- Fallible pull protocol — `next(): Promise<Result<Option<T>, E>>`
  - `Ok(Some(v))` — value, `Ok(None())` — end of stream, `Err(e)` — error
- Lazy adapters — `map`, `filter`, `take`, `skip`, `stepBy`, `chain`, `zip`, `enumerate`, `inspect`, `throttle`, `buffer`, `fuse`
- Terminators — `collect`, `fold`, `forEach`, `find`, `any`, `all`, `count` — all `Result`-returning
- `Channel<T>` — unbounded mpsc channel, both `Stream` and `Sink` (like `tokio::sync::mpsc`)
- `Sink` interface — `ready`, `send`, `sendAll`, `flush`, `close`
- `pipe(source, sink)` — move a stream into a sink with backpressure
- Interop — `for await...of`, `.asyncIter()` conversion to `@rslike/iter`'s `AsyncIter`
- Runtime adapters — pure (any runtime), Node.js, Web Streams

## Installation

```bash
npm i @rslike/streams
# or
pnpm add @rslike/streams
yarn add @rslike/streams
bun add @rslike/streams
```

## Quick start

```ts
import { fromArray, Channel, pipe } from "@rslike/streams";

const result = await fromArray([1, 2, 3, 4])
  .filter(v => v % 2 === 0)
  .map(v => v * 10)
  .collect();
// Ok([20, 40])
result.unwrap(); // [20, 40]

// Channel — Stream + Sink in one
const ch = new Channel<number>();
await ch.send(1);
await ch.send(2);
await ch.close();
await ch.collect(); // Ok([1, 2])

// pipe with backpressure
await pipe(fromArray([1, 2, 3]), ch);
```

## Error handling

Errors are values — they short-circuit terminators and are preserved by adapters:

```ts
const r = await failingStream.map(v => v * 2).collect();
r.isErr(); // true — the map stage is skipped, error propagates

// buffer() yields the partial chunk first, then surfaces the error
// fuse() guarantees Ok(None()) forever after the first Err/None
```

## Interop with `@rslike/iter`

```ts
import { fromIterable } from "@rslike/streams";

// any Iterable/AsyncIterable becomes a Stream (Iter, AsyncIter, arrays, generators)
const stream = fromIterable(asyncIter([1, 2, 3]));

// and a Stream converts back to AsyncIter (errors are thrown)
const ai = fromArray([1, 2, 3]).asyncIter();
await ai.map(async v => v * 2).collect(); // [2, 4, 6]
```

## API

### Creating streams

| Function | Description |
|---|---|
| `fromArray(arr)` | Stream from an array |
| `fromIterable(it)` | Stream from any `Iterable`/`AsyncIterable` |
| `new Channel()` | mpsc channel — both `Stream` and `Sink` |
| `StreamBase.fromNext(fn)` | Stream from a raw `next` function |

### Adapters (lazy)

| Method | Description |
|---|---|
| `.map(f)` | Transform each item |
| `.filter(pred)` | Keep matching items |
| `.take(n)` / `.skip(n)` | First `n` / skip first `n` |
| `.stepBy(step)` | Every `step`-th item |
| `.chain(other)` | Append another stream |
| `.zip(other)` | Pair items; stops at the shorter side |
| `.enumerate()` | `[index, item]` pairs |
| `.inspect(f)` | Call `f` per item without changing it |
| `.throttle(ms)` | At most one item per `ms` |
| `.buffer(size)` | Accumulate into `T[]` chunks |
| `.fuse()` | `Ok(None())` forever after first end/error |

### Terminators

All return `Promise<Result<_, E>>` — `collect`, `fold`, `forEach`, `find`, `any`, `all`, `count`.

### Sink

```ts
interface Sink<T, E> {
  ready(): Promise<Result<void, E>>;
  send(item: T): Promise<Result<void, E>>;
  sendAll(source: Stream<T, E>): Promise<Result<void, E>>;
  flush(): Promise<Result<void, E>>;
  close(): Promise<Result<void, E>>;
}
```

### Duplex & Transform

A `Duplex<I, O>` pairs a `Sink<I>` with a `Stream<O>` — like a socket or a `TransformStream`.

| Function | Description |
|---|---|
| `duplexPair<I, O>()` | Two connected in-memory ends: `a.sink.send(x)` → `b.source.next()` and vice versa |
| `transform(fn)` | In-process transform: values sent to the sink are mapped through `fn` into the source |
| `fromWebTransform(ts)` | Wraps a Web `TransformStream` into a `Duplex` |
| `fromNodeDuplex(s)` | Wraps a Node.js `Duplex`/`Transform` (`ReadWriteStream`) into a `Duplex` |

```ts
import { duplexPair, transform } from "@rslike/streams";
import { fromNodeDuplex } from "@rslike/streams/runtime/node";

// socket pair
const [a, b] = duplexPair<number>();
await a.sink.send(1);
await b.source.next(); // Ok(Some(1))

// fn-based transform
const d = transform((n: number) => n * 2);
await d.sink.send(21);
await d.source.next(); // Ok(Some(42))
```

### Runtime adapters

Platform-specific adapters live in dedicated subpath entries, so bundlers
only pick up the runtime you target:

```ts
import { fromNodeReadable, fromNodeWritable } from "@rslike/streams/runtime/node";
import { fromWebReadable, fromWebWritable } from "@rslike/streams/runtime/web";
import { Channel, duplexPair } from "@rslike/streams/runtime/pure"; // also re-exported from the root
```

| Entry | Function | Description |
|---|---|---|
| `runtime/web` | `fromWebReadable(rs)` / `fromWebWritable(ws)` | Web `ReadableStream` → `Stream`, `WritableStream` → `Sink` |
| `runtime/web` | `fromWebTransform(ts)` | Web `TransformStream` → `Duplex` |
| `runtime/node` | `fromNodeReadable(s)` / `fromNodeWritable(s)` | Node Readable → `Stream`, Node Writable → `Sink` |
| `runtime/node` | `fromNodeDuplex(s)` | Node `Duplex`/`Transform` → `Duplex` |
| `runtime/node` | `nodeAsyncRead(s)` | Node Readable → `AsyncRead` (byte API) |
| `runtime/pure` | `Channel` / `PureDuplex` / `duplexPair` / `transform` | Runtime-agnostic in-memory primitives |
| root | `BufReader` / `BufWriter` | Buffered `AsyncRead`/`AsyncWrite` wrappers |

## Related packages

- [@rslike/iter](https://www.npmjs.com/package/@rslike/iter) — lazy iterators (`Iter`, `AsyncIter`, `ParIter`, `WorkerParIter`)
- [@rslike/std](https://www.npmjs.com/package/@rslike/std) — `Option<T>`, `Result<T, E>` and utilities
- [@rslike/collections](https://www.npmjs.com/package/@rslike/collections) — Rust-inspired collections

## License

MIT © Vitali Haradkou
