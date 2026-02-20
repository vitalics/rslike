# @rslike/cmp

Rust-inspired comparison traits for JavaScript and TypeScript. Adds `Symbol.compare`, `Symbol.equals`, and `Symbol.partialEquals` to built-in primitives and gives you utility functions to work with any comparable value.

## Installation

```bash
npm i @rslike/cmp
yarn add @rslike/cmp
pnpm add @rslike/cmp
```

## Quick start

```ts
import "@rslike/cmp/globals"; // patch Symbol once in your entry file
import { compare, equals } from "@rslike/cmp";

compare(2, 5); // -1
compare(5, 2); // 1
compare(3, 3); // 0

equals(42, 42); // true
equals(42, "42"); // false
```

## Globals

The package augments the global `Symbol` object with three well-known symbols. Import the globals entry **once** in your application entry point:

```ts
// entry.ts
import "@rslike/cmp/globals";
```

After that, `Symbol.compare`, `Symbol.equals`, and `Symbol.partialEquals` are available everywhere without additional imports.

## Traits

### `Symbol.compare` — total ordering (`Ord`)

Returns a number:

- `>= 1` — `this` is greater than `another`
- `0` — equal
- `<= -1` — `this` is less than `another`
- `NaN` — values are uncomparable (e.g. `NaN` vs `NaN`)

### `Symbol.equals` — strict equality (`Eq`)

Mirrors `===`. Returns `true` only when types and values both match.

### `Symbol.partialEquals` — loose equality (`PartialEq`)

Mirrors `==`. Allows cross-type comparisons (`0 == false`, `"5" == 5`).

## Built-in primitive support

After importing `@rslike/cmp/globals` (or `@rslike/cmp/primitives` directly), all four primitive types get trait implementations automatically.

### Number

```ts
import "@rslike/cmp/globals";

(5)[Symbol.compare](2); // 1
(5)[Symbol.compare](5); // 0
(2)[Symbol.compare](5); // -1
(4)[Symbol.compare](NaN); // NaN  (non-finite → NaN)

(5)[Symbol.equals](5); // true
(5)[Symbol.equals](6); // false

(5)[Symbol.partialEquals]("5"); // true  (loose ==)
(5)[Symbol.partialEquals](5); // true
```

### String

```ts
"abc"[Symbol.compare]("abd"); // -1  (localeCompare)
"abc"[Symbol.compare]("abc"); // 0
"abd"[Symbol.compare]("abc"); // 1
"1"[Symbol.compare](1); // 0   (number coerced to string)
"true"[Symbol.compare](true); // 0   (boolean coerced to string)

"hello"[Symbol.equals]("hello"); // true
"hello"[Symbol.equals]("world"); // false

"5"[Symbol.partialEquals](5); // true  (loose ==)
```

### Boolean

```ts
true[Symbol.compare](false); // 1
false[Symbol.compare](true); // -1
true[Symbol.compare](true); // 0

true[Symbol.compare](1); // inverted via Number[Symbol.compare]
true[Symbol.compare]("yes"); // compares this with Boolean("yes")

true[Symbol.equals](true); // true
true[Symbol.equals](false); // false

false[Symbol.partialEquals](0); // true  (loose ==)
false[Symbol.partialEquals](""); // true
```

### Date

```ts
const d = new Date();
const earlier = new Date(d.valueOf() - 1000);

d[Symbol.compare](earlier); // 1   (later > earlier)
d[Symbol.compare](d.valueOf()); // 0   (same timestamp)
d[Symbol.compare](d.toISOString()); // 0   (string parsed to Date)

d[Symbol.equals](d.valueOf()); // true
d[Symbol.equals](d.toISOString()); // true
d[Symbol.equals](earlier); // false

d[Symbol.partialEquals](d); // true
d[Symbol.partialEquals](d.valueOf()); // true
```

> Passing an invalid date string (e.g. `"not-a-date"`) to `Date[Symbol.compare]` throws `UndefinedBehaviorError`.

## Utility functions

Import from the main entry point:

```ts
import { compare, equals, partialEquals } from "@rslike/cmp";
```

### `compare(a, b, [compareFn])`

Calls `Symbol.compare` on the first argument that implements it. Falls back to `compareFn` if provided and neither argument implements the trait.

```ts
compare(5, 2); // 1
compare(2, 5); // -1
compare(1, 1); // 0

// custom objects
class Temperature {
  constructor(public celsius: number) {}
  [Symbol.compare](other: Temperature) {
    return this.celsius - other.celsius > 0
      ? 1
      : this.celsius - other.celsius < 0
      ? -1
      : 0;
  }
}

compare(new Temperature(100), new Temperature(20)); // 1

// fallback compareFn for plain objects
compare({ n: 1 }, { n: 2 }, (a: any, b: any) => a.n - b.n);
```

**Throws `UndefinedBehaviorError`** when:

- Neither argument implements `Symbol.compare` and no `compareFn` is provided
- `compareFn` is not a function
- `compareFn` returns a non-number

### `equals(a, b, [equalityFn])`

Calls `Symbol.equals` on the first argument (object only) that implements it. Falls back to `equalityFn` or `a === b`.

```ts
equals(42, 42); // true
equals(42, "42"); // false
equals({}, {}); // false  (different references, no trait)

// with custom trait
class Id {
  constructor(public value: number) {}
  [Symbol.equals](other: Id) {
    return this.value === other.value;
  }
}
equals(new Id(1), new Id(1)); // true
```

**Throws `UndefinedBehaviorError`** when:

- `Symbol.equals` trait returns a non-boolean
- `equalityFn` is provided but is not a function
- `equalityFn` returns a non-boolean

### `partialEquals(a, b, [equalityFn])`

Calls `Symbol.partialEquals` on the first argument that implements it. Falls back to `equalityFn` or `a == b`.

```ts
partialEquals(5, "5"); // true  (5 == "5")
partialEquals(5, "6"); // false
partialEquals({}, {}); // false (== on two distinct objects)

// custom equalityFn
partialEquals({ v: 1 }, { v: "1" }, (a: any, b: any) => a.v == b.v); // true
```

**Throws `UndefinedBehaviorError`** when:

- `Symbol.partialEquals` trait returns a non-boolean
- `equalityFn` is provided but is not a function
- `equalityFn` returns a non-boolean

## Implementing traits on your own classes

```ts
import "@rslike/cmp/globals";
import type { Ord, Eq, PartialEq } from "@rslike/cmp";
import { compare, equals } from "@rslike/cmp";

class Vector2 implements Ord, Eq, PartialEq {
  constructor(public x: number, public y: number) {}

  get magnitude() {
    return Math.sqrt(this.x ** 2 + this.y ** 2);
  }

  [Symbol.compare](other: Vector2): number {
    const diff = this.magnitude - other.magnitude;
    return diff > 0 ? 1 : diff < 0 ? -1 : 0;
  }

  [Symbol.equals](other: Vector2): boolean {
    return this.x === other.x && this.y === other.y;
  }

  [Symbol.partialEquals](other: unknown): boolean {
    if (other instanceof Vector2) return this[Symbol.equals](other);
    return false;
  }
}

const v1 = new Vector2(3, 4); // magnitude 5
const v2 = new Vector2(1, 0); // magnitude 1

compare(v1, v2); // 1
equals(v1, v1); // true
equals(v1, v2); // false
```

## TypeScript types

| Type        | Description                                          |
| ----------- | ---------------------------------------------------- |
| `Ord`       | Implement `[Symbol.compare](another): number`        |
| `Eq`        | Implement `[Symbol.equals](another): boolean`        |
| `PartialEq` | Implement `[Symbol.partialEquals](another): boolean` |

## Related packages

- [@rslike/std](https://www.npmjs.com/package/@rslike/std) — `Option`, `Result`, `UndefinedBehaviorError`
- [@rslike/dbg](https://www.npmjs.com/package/@rslike/dbg) — debug printing for variables
- [@rslike/iter](https://www.npmjs.com/package/@rslike/iter) — lazy iterators

## WIKI

https://github.com/vitalics/rslike/wiki
