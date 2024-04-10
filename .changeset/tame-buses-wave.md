---
"@rslike/std": major
"@rslike/cmp": major
"@rslike/dbg": major
---

## What's new

### std

All changes applies to `Option` and `Result` objects.

#### Symbols for Option and Result objects

Implements `Symbol.iterator`, `Symbol.asyncIterator`, `Symbol.search`, `Symbol.split`, `Symbol.inspect`, `Symbol.toPrimitive`, `Symbol.toStringTag` for `Option` and `Result` objects

Example:

```ts
// Before
const arr = Some([1, 2, 3]);
// error, for..of only supports with arrays
for (let el of arr) {
}
```

As a workaround you may unwrap the value:

```ts
// workaround
const arr = Some([1, 2, 3]);
// error, for..of now works with arrays
for (let el of arr.unwrap()) {
}
```

Now you can "just call for..of".

```ts
// now it works
const arr = Some([1, 2, 3]);
// error, for..of only supports with arrays
for (let el of arr) {
  // works now!
}
```

**Note**: This method will only yeild if the `Option` is `Some`

**Note**: throws `UndefinedBehaviorError` for `Some(value)` if `value` is not implements `Symbol.iterator`

More about examples with Symbols implementation you can found in [wiki](https://github.com/vitalics/rslike/wiki)

#### Symbol.hasInstance for `Some`, `None`, `Ok` and `Err` functions

Now you can call `instanceof` keyword for functions. From now you can skip importing `Result` and `Option` classes.

Example:

```ts
// Before
import { Ok, Err, Result } from "@rslike/std";
const a = Ok(3);
a instanceof Ok; // false
a instanceof Result; // true

// now, less imports
import { Ok, Err } from "@rslike/std";
const b = Ok(3);
b instanceof Ok; // true
b instanceof Err; // false
Err("Some Err") instanceof Err; // true
```

#### Advanced Types inferring

Add more complex TS types to understands have value or not.

Example:

```ts
// Before
const a = Some(3);

a.isSome(); // TS type: boolean

// now
a.isSome(); // TS type: true
```

#### double unwraping in match function for `Result<Option<T>, E>`

From now you just can use `match` function with only 1 unwrapping.

If you're using `Async` or `Bind` functions - your result will be wraped to `Result<Option<_>>`. To unwrap this result you must to use double matching.

Example (before - 67 lines):

```ts
import { Bind, match, Err } from "@rslike/std";
function divide(a: number, b: number) {
  if (b === 0) Err("Divide to zero");
  if (a === 0) Ok(0);
  if (Number.isNaN(a) || Number.isNaN(b)) return undefined;
  return a / b;
}

const binded = Bind(divide);
const fn1 = binded(1, 1); // Result<Option<number | undefined>, string>
const fn2 = binded(NaN, 1); // Result<Option<undefined>, string>

const res1 = match(
  fn1, // or fn2
  (res) => {
    return match(
      res,
      (value) => {
        console.log("value is:", value);
      },
      () => {
        console.log("value is None");
      },
    );
  },
  (err) => {
    console.error(err);
  },
);

console.log(res1); // value is: 1
console.log(res2); // value is None
```

Example (now - 27 lines):

```ts
import { Bind, match, Err } from "@rslike/std";
function divide(a: number, b: number) {
  if (b === 0) Err("Divide to zero");
  if (a === 0) Ok(0);
  if (Number.isNaN(a) || Number.isNaN(b)) return undefined;
  return a / b;
}

const binded = Bind(divide);
const fn1 = binded(1, 1); // Result<Option<number | undefined>, string>
const fn2 = binded(NaN, 1); // Result<Option<undefined>, string>

const res1 = match(
  fn1, // or fn2
  (value) => {
    console.log("value is:", value);
  },
  (err) => {
    if (err) console.error(err);
    else console.log("value is None");
  },
);

console.log(res1); // value is: 1
console.log(res2); // value is None
```

### cmp

Compare package now register in global scope `Symbol.compare`, `Symbol.partialEquals` and `Symbol.equals`.

for more examples how to work with theese symbols see at [wiki](https://github.com/vitalics/rslike/wiki)

#### Definitions for built-in objects.

- `Number` and `NumberConstructor` implements `Symbol.compare`, `Symbol.partialEquals` and `Symbol.equals`
- `String` and `StringConstructor` implements `Symbol.compare`, `Symbol.partialEquals` and `Symbol.equals`
- `Boolean` and `BooleanConstructor` implements `Symbol.compare`, `Symbol.partialEquals` and `Symbol.equals`
- `Date` and `DateConstructor` implements `Symbol.compare`, `Symbol.partialEquals` and `Symbol.equals`

#### utilities function

`@rslike/cmp` now export utilities function `compare`, `partialEquals` and `equals`. All this functions call Symbols implementation. (e.g. `compare` calls `Symbol.compare` implementation)

- `compare` calls `Symbol.compare` implementation
- `partialEquals` calls `Symbol.partialEquals` implementation
- `equals` calls `Symbol.equals` implementation
