# @rslike/iter

Rust-inspired lazy iterator library for JavaScript and TypeScript.

Wraps any `Iterable<T>` and provides chainable adapter and consumer methods modelled after Rust's `Iterator` and `DoubleEndedIterator` traits. Adapter methods are lazy — they return new iterator instances backed by generators and do no work until a consumer is called.

## Features

- Lazy by default — adapters only run when a consumer is called
- Mirrors Rust's `Iterator` and `DoubleEndedIterator` traits
- `Iter.from(source, mapFn?)` — backward-compatible with `Array.from`
- `DoubleEndedIter` — iterate from both front and back
- `Peekable` — look at the next element without consuming it
- `ParIter` — Rayon-inspired concurrent pipelines via `Promise.all` (IO-bound)
- `WorkerParIter` — CPU-parallel pipelines on worker threads (Node.js and browser)
- `AsyncIter` — lazy pull-based async iterator (`for await...of`), Rust's `Stream` analog
- Integrates with `@rslike/std` (`Option`) and `@rslike/cmp` (`Ord`, `Eq`)
- First-class CJS and ESM support
- TypeScript ready — `.d.ts` types included

## Installation

```bash
npm i @rslike/iter
# or
pnpm add @rslike/iter
yarn add @rslike/iter
bun add @rslike/iter
```

## Quick start

```ts
import { iter } from "@rslike/iter";

iter([1, 2, 3, 4, 5])
  .filter(x => x % 2 === 0)
  .map(x => x * 10)
  .collect();
// [20, 40]
```

## API

### Factory functions

#### `iter(source)`

Creates an `Iter<T>` from any iterable.

```ts
import { iter } from "@rslike/iter";

iter([1, 2, 3]).map(x => x * 2).collect();            // [2, 4, 6]
iter("hello").collect();                               // ["h", "e", "l", "l", "o"]
iter(new Set([1, 2, 3])).filter(x => x > 1).collect(); // [2, 3]

function* naturals() { let i = 0; while (true) yield i++; }
iter(naturals()).take(5).collect();                    // [0, 1, 2, 3, 4]
```

#### `doubleEndedIter(array)`

Creates a `DoubleEndedIter<T>` from an array, supporting iteration from both ends.

```ts
import { doubleEndedIter } from "@rslike/iter";

const dei = doubleEndedIter([1, 2, 3, 4]);
dei.next();     // Some(1)
dei.nextBack(); // Some(4)
dei.next();     // Some(2)
dei.nextBack(); // Some(3)
dei.next();     // None
```

---

### `Iter<T>`

#### Static

| Method | Description |
|---|---|
| `Iter.from(source)` | Create from any iterable (like `Array.from`) |
| `Iter.from(source, mapFn)` | Create with a mapping function — `mapFn(value, index)` |

```ts
import { Iter } from "@rslike/iter";

Iter.from([1, 2, 3], x => x * 2).collect();        // [2, 4, 6]
Iter.from("abc", (c, i) => `${i}:${c}`).collect(); // ["0:a", "1:b", "2:c"]
```

#### Adapters (lazy)

| Method | Description |
|---|---|
| `.map(fn)` | Transform each element |
| `.filter(fn)` | Keep elements matching predicate |
| `.filter_map(fn)` | Map then keep `Some` results (see `@rslike/std`) |
| `.mapWhile(fn)` | Yield mapped values while `fn` returns `Some`, stop at first `None` |
| `.scan(init, fn)` | Stateful map — `fn(acc, x)` returns `Some([newAcc, output])` or `None` to stop |
| `.flatMap(fn)` | Map each element to an iterable and flatten one level |
| `.flatten()` | Flatten one level of nested iterables |
| `.chunks(n)` | Yield arrays of at most `n` elements |
| `.intersperse(sep)` | Insert `sep` between adjacent elements |
| `.cycle()` | Repeat elements endlessly (buffers the source; pair with `.take()`) |
| `.enumerate()` | Yield `[index, value]` pairs |
| `.take(n)` | Yield at most `n` elements |
| `.skip(n)` | Skip the first `n` elements |
| `.takeWhile(fn)` | Yield while predicate holds, stop at first failure |
| `.skipWhile(fn)` | Skip while predicate holds, yield the rest |
| `.chain(other)` | Append another iterable |
| `.zip(other)` | Pair elements; stops at the shorter iterator |
| `.inspect(fn)` | Call `fn` on each element without changing it (debug) |
| `.stepBy(n)` | Yield every `n`-th element starting from the first |
| `.peekable()` | Wrap in a `Peekable` to look ahead without consuming |
| `.dedup()` | Remove consecutive duplicates (uses `@rslike/cmp` `Eq`) |
| `.dedupBy(fn)` | Remove consecutive duplicates using a custom equality function |
| `.sorted()` | Collect and sort using `@rslike/cmp` `Ord` |
| `.sortBy(fn)` | Collect and sort using a custom comparator |
| `.rev()` | Collect and yield in reverse order |

#### Consumers (eager)

| Method | Description |
|---|---|
| `.collect()` | Gather all elements into an array, or into a constructor — `collect(Set)`, `collect(Map)`, `collect(Iter)` |
| `.toArray()` | Alias for `collect()` |
| `.forEach(fn)` | Call `fn` on each element |
| `.fold(init, fn)` | Reduce with an initial value |
| `.reduce(fn)` | Reduce without initial value, returns `Option<T>` |
| `.count()` | Count remaining elements |
| `.last()` | Return the last element as `Option<T>` |
| `.nth(n)` | Return the `n`-th element (0-indexed) as `Option<T>` |
| `.find(fn)` | First element matching predicate as `Option<T>` |
| `.findMap(fn)` | First `Some` produced by `fn` as `Option<U>` |
| `.partition(fn)` | Split into `[matching[], rest[]]` |
| `.position(fn)` | Index of first match as `Option<number>` |
| `.any(fn)` | `true` if any element matches |
| `.all(fn)` | `true` if all elements match |
| `.sum()` | Sum all numbers |
| `.product()` | Multiply all numbers |
| `.min()` | Minimum using `<` operator, returns `Option<T>` |
| `.max()` | Maximum using `>` operator, returns `Option<T>` |
| `.minBy(fn)` | Minimum using a custom comparator |
| `.maxBy(fn)` | Maximum using a custom comparator |
| `.minCmp()` | Minimum using `@rslike/cmp` `Ord` |
| `.maxCmp()` | Maximum using `@rslike/cmp` `Ord` |
| `.minByKey(fn)` | Minimum by an extracted `Ord` key |
| `.maxByKey(fn)` | Maximum by an extracted `Ord` key |
| `.cmp(other)` | Lexicographic comparison using `@rslike/cmp` |
| `.eqBy(other)` | Element-wise equality using `@rslike/cmp` |
| `.unzip()` | Split `[A, B]` pairs into `[A[], B[]]` |

---

### `Peekable<T>`

Extends `Iter<T>`. Created via `.peekable()`.

| Method | Description |
|---|---|
| `.peek()` | Return `Option<T>` of the next element without consuming it |
| `.next()` | Consume and return the next element as `Option<T>` |

```ts
import { iter } from "@rslike/iter";

const p = iter([1, 2, 3]).peekable();
p.peek(); // Some(1)
p.peek(); // Some(1) — same value, not consumed
p.next(); // Some(1) — consumed
p.peek(); // Some(2)
```

---

### `DoubleEndedIter<T>`

Extends `Iter<T>`. Created via `doubleEndedIter(array)` or `DoubleEndedIter.from(array)`. Backed by an array with front and back cursors that share state, so `next()` and `nextBack()` can be freely interleaved.

Adapters (`map`, `filter`, `take`, `skip`, `filter_map`) on `DoubleEndedIter` eagerly evaluate the remaining slice to preserve double-ended capability and return a new `DoubleEndedIter`.

#### Additional methods

| Method | Description |
|---|---|
| `.nextBack()` | Advance from the back, returns `Option<T>` |
| `.rfold(init, fn)` | Fold from the back |
| `.rfind(fn)` | Find from the back, returns `Option<T>` |
| `.rposition(fn)` | Index of first match from the back, returns `Option<number>` |
| `.rev()` | Return remaining elements as a new `DoubleEndedIter` in reverse |

```ts
import { doubleEndedIter } from "@rslike/iter";

doubleEndedIter([1, 2, 3]).rfold("", (acc, x) => acc + x); // "321"
doubleEndedIter([1, 2, 3, 4]).rfind(x => x < 3);           // Some(2)
doubleEndedIter([1, 2, 3, 2, 1]).rposition(x => x === 2);  // Some(3)
```

---

### `ParIter<T>`

Rayon-inspired **concurrent** iterator for IO-bound workloads. Adapters (`map`, `filter`, `chunks`) are lazy — they return a new `ParIter` without executing anything. Only terminal operations (`collect`, `forEach`, `fold`) materialize the source and run all pipeline stages concurrently via `Promise.all`.

Available from the main entry or the dedicated subpath:

```ts
import { parIter } from "@rslike/iter";
// or
import { parIter } from "@rslike/iter/par-iter";
```

#### Adapters (lazy)

| Method | Description |
|---|---|
| `.map(fn)` | Concurrent map — all `fn` calls run via `Promise.all` (supports async) |
| `.filter(fn)` | Concurrent filter — all predicates run via `Promise.all` (supports async) |
| `.chunks(n)` | Split items into batches of `n` for controlled concurrency |

#### Consumers (terminal)

| Method | Description |
|---|---|
| `.collect()` | Run the pipeline, returns `Promise<T[]>` |
| `.forEach(fn)` | Collect, then call `fn` on each item concurrently |
| `.fold(init, fn)` | Collect, then sequentially fold into an accumulator |
| `.iter()` | Convert the **source** (pipeline not applied) to `Iter<T>` |

```ts
import { parIter } from "@rslike/iter";

// Concurrent async map
const doubled = await parIter([1, 2, 3])
  .map(async v => v * 2)
  .collect();
// [2, 4, 6]

// Chained filter + map
const result = await parIter([1, 2, 3, 4, 5, 6])
  .filter(v => v % 2 === 0)
  .map(v => v * 10)
  .collect();
// [20, 40, 60]

// Controlled concurrency with chunks
await parIter(urls)
  .chunks(3)
  .forEach(async batch => Promise.all(batch.map(fetch)));

// Reduction
const sum = await parIter([1, 2, 3, 4]).fold(0, (acc, v) => acc + v); // 10
```

---

### `WorkerParIter<T>`

CPU-parallel iterator backed by **worker threads** (Node.js `worker_threads` or browser Web Workers, detected at runtime). Adapters (`map`, `filter`) are lazy; only `collect` / `forEach` spawn workers. The whole pipeline is serialized and sent to each worker in one shot — no intermediate round-trips.

Available from the main entry or the dedicated subpath:

```ts
import { workerParIter } from "@rslike/iter";
// or
import { workerParIter } from "@rslike/iter/worker-par-iter";
```

**Constraints on callbacks:**
- Must be **pure** — no external variables, imports, or closures (they are serialized via `fn.toString()` and re-created inside the worker)
- Data must be **structuredClone-able** (plain objects, arrays, primitives)
- For IO-bound concurrency, prefer `ParIter` instead

#### API

| Method | Description |
|---|---|
| `.map(fn)` | Lazy map stage executed inside workers |
| `.filter(fn)` | Lazy filter stage executed inside workers |
| `.collect()` | Distribute chunks across workers, returns `Promise<T[]>` |
| `.forEach(fn)` | Collect via workers, then call `fn` on the **main thread** (closures allowed) |
| `.iter()` | Convert the **source** (pipeline not applied) to `Iter<T>` |
| `.parIter()` | Convert the **source** (pipeline not applied) to `ParIter<T>` |

`workerParIter(source, workerCount?)` — `workerCount` defaults to auto-detected parallelism (`os.availableParallelism()` / `navigator.hardwareConcurrency`).

```ts
import { workerParIter } from "@rslike/iter";

// CPU-bound: filter primes then square them — runs across OS threads
const result = await workerParIter([2, 3, 4, 5, 6, 7, 8, 9])
  .filter(n => { for (let i = 2; i * i <= n; i++) if (n % i === 0) return false; return true; })
  .map(n => n ** 2)
  .collect();
// [4, 9, 25, 49]
```

A `ParIter` can be used as the source — it is collected first, then the worker pipeline runs on its results:

```ts
import { parIter, workerParIter } from "@rslike/iter";

const par = parIter([1, 2, 3, 4]).map(async v => v * 2);
const out = await workerParIter(par).map(v => v ** 2).collect();
// [4, 16, 36, 64]
```

---

### `AsyncIter<T>`

Lazy **pull-based** async iterator — mirrors `Iter<T>` for asynchronous sources, modeled after Rust's `Stream` trait. Unlike `ParIter` (which materializes everything and runs `Promise.all`), `AsyncIter` produces and transforms elements **one at a time**, preserving laziness and backpressure for infinite or IO-bound sources.

Wraps any `AsyncIterable<T>` (async generators, streams) or plain `Iterable<T>`; adapter callbacks may be async. Implements both `AsyncIterable<T>` (`for await...of`) and `Iterable<PromiseLike<T>>` (sync `for...of` yielding promises).

Available from the main entry or the dedicated subpath:

```ts
import { asyncIter } from "@rslike/iter";
// or
import { asyncIter } from "@rslike/iter/async-iter";
```

#### Adapters (lazy)

| Method | Description |
|---|---|
| `.map(fn)` | Transform each element — `fn` may be async |
| `.filter(fn)` | Keep elements matching a **sync** predicate (supports type guards) |
| `.filterAsync(fn)` | Keep elements matching an **async** predicate |
| `.filterMap(fn)` | Sync `fn` returning `Option<U>`; yield unwrapped `Some` values |
| `.flatMap(fn)` | Map to a sync iterable and flatten one level |
| `.flatten()` | Flatten one level of nested sync iterables |
| `.enumerate()` | Yield `[index, value]` pairs |
| `.take(n)` / `.skip(n)` | Yield at most `n` / skip first `n` elements |
| `.takeWhile(fn)` / `.skipWhile(fn)` | Sync predicate variants |
| `.chain(other)` | Append a sync iterable |
| `.zip(other)` | Pair with a sync iterable; stops at the shorter side |
| `.inspect(fn)` | Call `fn` on each element without changing it |
| `.stepBy(n)` | Yield every `n`-th element |

#### Consumers (async)

| Method | Description |
|---|---|
| `.next()` | `Promise<Option<T>>` for the next value |
| `.collect()` / `.collect(ctor)` | `Promise<T[]>`, or collect into a constructor like `Iter.collect` |
| `.forEach(fn)` | Call `fn` (may be async) sequentially per element |
| `.fold(init, fn)` / `.reduce(fn)` | Async reduction; `reduce` returns `Promise<Option<T>>` |
| `.count()` / `.last()` / `.nth(n)` | Element access |
| `.find(fn)` / `.findMap(fn)` / `.position(fn)` | Predicates may be async |
| `.any(fn)` / `.all(fn)` | Predicates may be async |
| `.sum()` / `.product()` | Numeric reductions |
| `.min()` / `.max()` / `.minBy(fn)` / `.maxBy(fn)` | Extremes |
| `.partition(fn)` | Split into `[matching[], rest[]]` |
| `.unzip()` | Split `[A, B]` pairs into `[A[], B[]]` |

```ts
import { asyncIter } from "@rslike/iter";

// async generator source, infinite stream
async function* naturals() { let i = 0; while (true) yield i++; }
await asyncIter(naturals()).take(3).collect(); // [0, 1, 2]

// async callbacks
await asyncIter([1, 2, 3, 4])
  .filterAsync(async v => v % 2 === 0)
  .map(async v => v * 10)
  .collect(); // [20, 40]

// for await...of
for await (const v of asyncIter(fetchUrls()).map(fetch)) { ... }

// sync for...of yielding promises (sync source + sync chain)
for (const p of asyncIter([1, 2, 3]).map(async v => v * 2)) {
  console.log(await p); // 2, 4, 6
}
```

**Sync iteration rules:** `for...of` (sync) works while the chain is synchronously pullable — a sync source plus sync/structural adapters. `map` with an async fn is fine (promises are chained per element). Truly-async pipelines (async source, `filterAsync`, ...) throw `UndefinedBehaviorError` on sync iteration — use `for await...of` instead.

---

### Globals

All factories and classes can be attached to `globalThis` (useful for REPLs and scripts):

```ts
import "@rslike/iter/globals";

iter([1, 2, 3]).collect();          // no import needed
doubleEndedIter([1, 2]).nextBack(); // Some(2)
```

---

## Integration with `@rslike/std`

Consumer methods that may return no value (`find`, `reduce`, `last`, `min`, `max`, etc.) return `Option<T>` from `@rslike/std` instead of `T | undefined`.

```ts
import { iter } from "@rslike/iter";

iter([1, 2, 3]).find(x => x > 5); // None
iter([1, 2, 3]).find(x => x > 1); // Some(2)

iter([1, 2, 3]).reduce((a, b) => a + b); // Some(6)
iter<number>([]).reduce((a, b) => a + b); // None
```

The `.filter_map(fn)` adapter accepts a function returning `Option<U>` and only yields the unwrapped `Some` values:

```ts
import { iter } from "@rslike/iter";
import { Some, None } from "@rslike/std";

iter([1, 2, 3, 4, 5])
  .filter_map(x => x > 3 ? Some(x * 10) : None())
  .collect();
// [40, 50]
```

---

## Collecting into collections

Like Rust's `collect`, `.collect()` accepts a constructor to build a specific collection type. Any class constructible from `T[]` works — native `Set`/`Map`/`WeakSet`, `Iter`, `DoubleEndedIter`, or the [@rslike/collections](https://www.npmjs.com/package/@rslike/collections) classes (`Array`, `ReadonlyArray`, `Map`, `ReadonlyMap`, `Set`, `ReadonlySet`):

```ts
import { iter, doubleEndedIter, Iter } from "@rslike/iter";
import { ReadonlyArray } from "@rslike/collections";

iter([1, 2, 3]).collect();        // [1, 2, 3] (default)
iter([1, 2, 3]).collect(Array);   // [1, 2, 3]
iter([1, 2, 2]).collect(Set);     // Set(2) { 1, 2 }

// Map — requires an iterator of [K, V] pairs
iter([["a", 1]] as ["a" | "b", number][]).collect(Map); // Map { "a" => 1 }
iter(["a", "b"]).zip(iter([1, 2])).collect(Map);        // Map { "a" => 1, "b" => 2 }

// Back into an iterator
iter([1, 2, 3]).map(x => x * 2).collect(Iter); // Iter<number>

// Read-only wrapper from @rslike/collections
iter([1, 2, 3]).collect(ReadonlyArray);
```

`collect(ctor)` is supported by `Iter`, `DoubleEndedIter`, `ParIter` (`Promise`-based) and `WorkerParIter` (`Promise`-based).

---

## Related packages

- [@rslike/std](https://www.npmjs.com/package/@rslike/std) — `Option<T>`, `Result<T, E>` and utilities
- [@rslike/cmp](https://www.npmjs.com/package/@rslike/cmp) — `Ord` / `Eq` traits for structural comparison
- [@rslike/dbg](https://www.npmjs.com/package/@rslike/dbg) — `dbg!`-style debug macro

## License

MIT © Vitali Haradkou
