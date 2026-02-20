# @rslike/iter

Rust-inspired lazy iterator library for JavaScript and TypeScript.

Wraps any `Iterable<T>` and provides chainable adapter and consumer methods modelled after Rust's `Iterator` and `DoubleEndedIterator` traits. Adapter methods are lazy — they return new iterator instances backed by generators and do no work until a consumer is called.

## Features

- Lazy by default — adapters only run when a consumer is called
- Mirrors Rust's `Iterator` and `DoubleEndedIterator` traits
- `Iter.from(source, mapFn?)` — backward-compatible with `Array.from`
- `DoubleEndedIter` — iterate from both front and back
- `Peekable` — look at the next element without consuming it
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
| `.flatMap(fn)` | Map each element to an iterable and flatten one level |
| `.flatten()` | Flatten one level of nested iterables |
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
| `.collect()` | Gather all elements into an array |
| `.toArray()` | Alias for `collect()` |
| `.forEach(fn)` | Call `fn` on each element |
| `.fold(init, fn)` | Reduce with an initial value |
| `.reduce(fn)` | Reduce without initial value, returns `Option<T>` |
| `.count()` | Count remaining elements |
| `.last()` | Return the last element as `Option<T>` |
| `.nth(n)` | Return the `n`-th element (0-indexed) as `Option<T>` |
| `.find(fn)` | First element matching predicate as `Option<T>` |
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

## Related packages

- [@rslike/std](https://www.npmjs.com/package/@rslike/std) — `Option<T>`, `Result<T, E>` and utilities
- [@rslike/cmp](https://www.npmjs.com/package/@rslike/cmp) — `Ord` / `Eq` traits for structural comparison
- [@rslike/dbg](https://www.npmjs.com/package/@rslike/dbg) — `dbg!`-style debug macro

## License

MIT © Vitali Haradkou
