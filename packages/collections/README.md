# @rslike/collections

Rust-inspired collections for JavaScript and TypeScript: `Array`, `ReadonlyArray`, `Map`, `ReadonlyMap`, `Set`, `ReadonlySet`.

Wraps the native collections with a safer, Rust-flavoured API: lookups return `Option<T>` from `@rslike/std` instead of `undefined`, mutation methods follow Rust's `Vec`/`HashMap`/`HashSet` semantics, and every collection integrates with `@rslike/iter` for lazy sequential (`Iter`), double-ended (`DoubleEndedIter`) and concurrent (`ParIter`) iteration.

## Features

- Safe access — `get`/`first`/`last`/`pop` return `Option<T>`, never `undefined`
- Rust semantics — `Map.set` returns `Some(old)` on replace, `Set.insert` returns `true` when newly added
- Iterator integration — `iter()`, `parIter()`, `doubleEndedIter()` (arrays), Iter-based `keys()`/`values()`/`entries()`
- Lazy set algebra — `union`, `intersection`, `difference`, `symmetricDifference` return lazy `Iter` pipelines
- Immutable variants — `ReadonlyArray`, `ReadonlyMap`, `ReadonlySet` with no mutation methods at all
- Collect back — works with `iter(...).collect(ctor)` from `@rslike/iter`
- First-class CJS and ESM support, `.d.ts` types included

## Installation

```bash
npm i @rslike/collections
# or
pnpm add @rslike/collections
yarn add @rslike/collections
bun add @rslike/collections
```

## Quick start

```ts
import { Array, Map, Set } from "@rslike/collections";

const arr = new Array([1, 2, 3, 4, 5]);
arr.get(0);  // Some(1)
arr.get(99); // None — no undefined

arr.iter().filter(x => x % 2 === 0).map(x => x * 10).collect(); // [20, 40]

const map = new Map([["a", 1]]);
map.set("a", 2); // Some(1) — previous value
map.get("z");    // None

const set = new Set([1, 2, 3]);
set.intersection(new Set([2, 3, 4])).collect(); // [2, 3]
```

## API

### `Array<T>` (`RSLikeArray`)

A Rust `Vec`-inspired growable array.

#### Safe access (Option-based)

| Method | Description |
|---|---|
| `.get(index)` | `Option<T>` — None if out of bounds |
| `.at(index)` | `Option<T>`, supports negative indices |
| `.first()` / `.last()` | `Option<T>` — None if empty |
| `.pop()` / `.shift()` | `Option<T>` — removes and returns |
| `.find(fn)` / `.findIndex(fn)` | `Option<T>` / `Option<number>` |

#### Standard methods

`push`, `map`, `filter`, `forEach`, `some`, `every`, `includes`, `slice`, `length`, `isEmpty()`, `[Symbol.iterator]`.

#### Iteration (`@rslike/iter`)

| Method | Description |
|---|---|
| `.iter()` | Lazy sequential `Iter<T>` |
| `.doubleEndedIter()` | `DoubleEndedIter<T>` — iterate from both ends |
| `.parIter()` | `ParIter<T>` for concurrent async pipelines |
| `.keys()` | `Iter<number>` over indices |
| `.values()` | `Iter<T>` over values (same as `.iter()`) |
| `.entries()` | `Iter<[number, T]>` over `[index, value]` pairs |

```ts
import { Array } from "@rslike/collections";

const arr = new Array([1, 2, 3, 4]);

arr.doubleEndedIter().nextBack(); // Some(4)
arr.entries().collect();          // [[0, 1], [1, 2], [2, 3], [3, 4]]
await arr.parIter().map(async x => x * 2).collect(); // [2, 4, 6, 8]
```

### `ReadonlyArray<T>` (`RSLikeReadonlyArray`)

Same read API as `Array<T>` plus `map`/`filter`/`slice` — but no mutation methods (`push`, `pop`, `shift` don't exist). Construction always makes a defensive copy.

```ts
import { ReadonlyArray } from "@rslike/collections";

const ro = new ReadonlyArray([1, 2, 3]);
ro.first(); // Some(1)
// ro.push(4) — compile error, method does not exist
```

### `Map<K, V>` (`RSLikeMap`)

A Rust `HashMap`-inspired map.

| Method | Description |
|---|---|
| `.get(key)` | `Option<V>` — None if missing |
| `.set(key, value)` | `Some(old)` if the key existed, `None` if new (like `HashMap::insert`) |
| `.has(key)` / `.delete(key)` / `.clear()` | Same as native `Map` |
| `.entries()` / `.keys()` / `.values()` | `RSLikeMapIterator` — an `Iter` subclass with `next()` → `Option` |
| `.iter()` / `.parIter()` | `Iter<[K, V]>` / `ParIter<[K, V]>` over entries |
| `.size` / `.length` | Number of entries |

```ts
import { Map } from "@rslike/collections";

const m = new Map([["a", 1], ["b", 2]]);
m.set("a", 10);          // Some(1) — replaced value
m.keys().collect();      // ["a", "b"]
m.iter().map(([k, v]) => `${k}=${v}`).collect(); // ["a=10", "b=2"]
```

### `ReadonlyMap<K, V>` (`RSLikeReadonlyMap`)

The read-only counterpart of `Map` — `get`, `has`, `forEach`, iterators, but no `set`/`delete`/`clear`.

### `Set<T>` (`RSLikeSet`)

A Rust `HashSet`-inspired set.

| Method | Description |
|---|---|
| `.insert(value)` | `true` if newly added, `false` if already present (like `HashSet::insert`) |
| `.get(value)` | `Option<T>` — Some(value) if present |
| `.take(value)` | `Option<T>` — removes and returns the value |
| `.delete(value)` / `.clear()` / `.has(value)` | Same as native `Set` |
| `.union(other)` | Lazy `Iter<T>` — values in either set |
| `.intersection(other)` | Lazy `Iter<T>` — values in both sets |
| `.difference(other)` | Lazy `Iter<T>` — values only in this set |
| `.symmetricDifference(other)` | Lazy `Iter<T>` — values in exactly one set |
| `.isSubset(other)` / `.isSuperset(other)` / `.isDisjoint(other)` | `boolean` |
| `.values()` / `.keys()` / `.entries()` | `RSLikeSetIterator` — an `Iter` subclass |
| `.iter()` / `.parIter()` | `Iter<T>` / `ParIter<T>` over values |

```ts
import { Set } from "@rslike/collections";

const a = new Set([1, 2, 3]);
const b = new Set([3, 4, 5]);

a.union(b).collect();                // [1, 2, 3, 4, 5]
a.intersection(b).collect();         // [3]
a.symmetricDifference(b).collect();  // [1, 2, 4, 5]
a.isSubset(new Set([1, 2, 3, 4]));   // true
```

### `ReadonlySet<T>` (`RSLikeReadonlySet`)

The read-only counterpart of `Set` — queries, set algebra and iterators, but no mutation methods.

## Integration with `@rslike/iter`

Every collection is a first-class citizen of the iterator ecosystem:

```ts
import { iter } from "@rslike/iter";
import { Array, ReadonlyArray, Set, ReadonlySet } from "@rslike/collections";

// collection → lazy iterator
new Set([1, 2, 3]).iter().map(x => x * 2).collect(); // [2, 4, 6]

// iterator → collection via collect(ctor) — any class constructible
// from T[] works, and all rslike collections accept Iterable<T>
iter([1, 2, 2]).collect(Set);           // Set(2) { 1, 2 }
iter([1, 2, 3]).collect(ReadonlyArray); // ReadonlyArray [1, 2, 3]
iter([1, 2, 3]).collect(Array);         // plain native array (special-cased)
```

### `IterLike` sources

Constructors also accept a bare pull-based `IterLike<T>` — any object with
`next(): Option<T>`, even without `Symbol.iterator`:

```ts
import { Some, None, type Option } from "@rslike/std";
import type { IterLike } from "@rslike/iter";
import { Array, toIterable, type IterSource } from "@rslike/collections";

let i = 0;
const cursor: IterLike<number> = {
  next: (): Option<number> => (i < 3 ? Some(i++) : None()),
};

new Array(cursor); // Array [0, 1, 2]

// toIterable normalizes IterSource<T> = Iterable<T> | IterLike<T>
// to a native Iterable — handy for your own APIs:
function sum(source: IterSource<number>): number {
  let acc = 0;
  for (const v of toIterable(source)) acc += v;
  return acc;
}
```

## Subpath imports

Each collection is also available from its own entry point:

```ts
import { RSLikeMap as Map } from "@rslike/collections/map";
import { RSLikeArray as Array } from "@rslike/collections/array";
import { RSLikeReadonlyArray as ReadonlyArray } from "@rslike/collections/readonly-array";
import { RSLikeSet as Set } from "@rslike/collections/set";
import { RSLikeReadonlyMap as ReadonlyMap } from "@rslike/collections/readonly-map";
import { RSLikeReadonlySet as ReadonlySet } from "@rslike/collections/readonly-set";
```

## Related packages

- [@rslike/iter](https://www.npmjs.com/package/@rslike/iter) — lazy iterators (`Iter`, `DoubleEndedIter`, `ParIter`, `WorkerParIter`)
- [@rslike/std](https://www.npmjs.com/package/@rslike/std) — `Option<T>`, `Result<T, E>` and utilities
- [@rslike/cmp](https://www.npmjs.com/package/@rslike/cmp) — `Ord` / `Eq` traits for structural comparison

## License

MIT © Vitali Haradkou
