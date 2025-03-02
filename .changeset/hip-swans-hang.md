---
"@rslike/cmp": minor
"@rslike/dbg": minor
"@rslike/std": minor
---


## New Features

### `Result` & `Option` constructors control flow

From this version you can create `Result` or `Option` instances as Promises or by returning a value.

```ts
import { Result, Option } from "@rslike/std";

// constructor control flow
const result = new Result((ok, err) => {
  if (Math.random() > 0.5) {
    ok(42);
  } else {
    err("error");
  }
});

// return control flow
const result2 = new Result(() => {
  if (Math.random() > 0.5) {
    return 42;
  } else {
    throw new Error("error");
  }
});

console.log(result2); // Result<42, Error> or Result<number, Error>

const option = new Option((some, none) => {
  if (Math.random() > 0.5) {
    some(42);
  } else {
    none();
  }
});

const opt2 = new Option(() => {
  throw new Error("error");
});

console.log(opt2.isNone()); // true
```

**NOTE:** Async functions and `Promise` return statements are not supported and throw an error for `Result` and `Option`.

```ts
import { Result } from "@rslike/std";

// constructor control flow
new Result((ok, err) => {
  ok(Promise.resolve(42)); // throw an error. Use `Result.fromPromise` instead
});

// return control flow
new Result(() => {
  return Promise.resolve(42); // throw an error. Use `Result.fromPromise` instead
});

// return control flow
new Result(async () => {
  return "qwe"; // throw an error. Use `Result.fromPromise` instead
});
```

### Option.fromPromise & Option.fromAsync methods

From this version you are able to create an Option from a Promise or an async function.

## Fixes

- migrate `Status` for `Result` and `Option` from `enum` to object.
- add assertion for passing constructor executor argument in `Result` and `Option`.
- fix types for well known Symbols: `Symbol.split`, `Symbol.search`, `Symbol.iterator` and `Symbol.asyncIterator`
- fix inspection output result for `Result` and `Option` in node.js
-

## Chore

- migrate from eslint to biome
- bump typescript to 5.8.2
- move typedoc in devDependencies
- bump typedoc to 0.27.9
- update nodejs version in CI
- fix lint issues
