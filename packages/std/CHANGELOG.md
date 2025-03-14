# @rslike/std

## 3.1.1

### Patch Changes

- b4303ba: What's new in `@rslike/std`:

  - Improved documentation for constructor parameters for `Option` and `Result`.
  - Update types and JSDoc for `toString`, `valueOf`, `toJSON` for both `Option` and `Result`.
  - Make `Status` frozen and readonly object instead of mutable for `Option` and `Result`.
  - Improved docs for `Some`, `None`, `Ok`, `Err` descriptions expecial usage with `instanceof` keyword.

## 3.1.0

### Minor Changes

- 501b261: ## New Features

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

## 3.0.1

### Patch Changes

- 2513e9b: Adds promise-like API and security fixes

  ## What's new

  Add primise-like API for `Option` and `Result`

  `Result` uses `ok` and `err` for callbacks.

  Example:

  ```ts
  const result = new Result((ok, err) => {
    if (true) ok(1);
    err("Some Error");
  });

  result.unwrap(); // 1
  ```

  `Option` uses `some` and `none` for callbacks.

  **NOTE** `some(null)` and `some(undefined)` will be converted to `none` automatically since it nullable values.

  Example:

  ```ts
  const o = new Option((some, none) => {
    some(undefined);
  });

  o.isNone(); // true
  ```

  `Result` and `Option` now uses `withResolves` as `Promise` API.

  Example:

  ```ts
  const { ok, result, err } = Result.withResolvers();

  ok(3);

  result.unwrap(); // 3
  ```

  ### Security fixes

  - [38](https://github.com/vitalics/rslike/pull/38) - fixes `@babel/traverse` package

## 3.0.0

### Major Changes

- 861b1fb: ## What's new

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
        }
      );
    },
    (err) => {
      console.error(err);
    }
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
    }
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

## 2.1.2

### Patch Changes

- d34b352: make dbg package more reliable for external building

## 2.1.1

### Patch Changes

- 9bfb757: make dbg package more reliable for external building

## 2.1.0

### Minor Changes

- 90ea149: # What's new

  - Introduce new package - `dbg`.

  ## Installation

  pnpm:
  `pnpm add @rslike/dbg -D`
  npm:
  `npm i @rslike/dbg -D`
  yarn:
  `yarn add @rslike/dbg -D`

  ## `dbg` Usage

  ```ts
  import { dbg } from "@rslike/dbg";
  // or import default
  import dbg from "@rslike/dbg";

  const a = 123;

  dbg(() => a); // a: 123
  ```

  See more at [wiki](https://github.com/vitalics/rslike/wiki/Debug)

  ## Other fixes/improves

  ### `std`

  - add methods `toJSON` for `Option` and `Result` classes which will be executed when `JSON.stringify` is executed

## 2.0.1

### Patch Changes

- 0360cdc: add related block for readme file

## 2.0.0

### Major Changes

- 731b6e8: # std

  Reexport `UndefinedBehaviorError` by new way(instead of `Errors` object).

  `match` now can accepts `boolean` type.

  # cmp

  `cmp` - comparison package. Provides interfaces, types and new class `Ordering`.

  How to install:

  ```bash
  npm i @rslike/cmp
  yarn add @rslike/cmp
  pnpm add @rslike/cmp
  ```

  ## How to use

  For you class you can implements type.

  Example

  ```ts
  class MyStructure implements Eq {
    equals(other: unknown) {
      // some checks
      return true;
    }
  }
  ```

  ## Types/Interfaces

  - `Eq` - type for equality check
  - `PartialEq` - type for partial equality check
  - `Ord` - type for ordering
  - `PartialOrd` - type for partial ordering

  More details on [WIKI](https://github.com/vitalics/rslike/wiki/Eq)

  ## Classes

  `Ordering` - Ordering is a class which allows to order item and have 3 possible values: `Greater`, `Less` or `Equals`.

  This class has a private constructor, and if you would like to transform numeric-like value - use `Ordering.from` method.

## 1.6.0

### Minor Changes

- 8a1d9c4: implement `Async` API. Mark as global usable.

## 1.5.1

### Patch Changes

- 90b3776: Build: migrate from esbuild to tsup package
  Package: fix output file extension from `.esm.js` to `mjs` for esm compiling

## 1.5.0

### Minor Changes

- 944e32d: new function: `match`. Match helps to unwrap result in safety way via callbacks.

## 1.4.3

### Patch Changes

- c7672d2: Add mod.ts file for Deno

## 1.4.2

### Patch Changes

- a6c71a2: Package/fix

## 1.4.1

### Patch Changes

- 8fb74e8: Testing deno deployment

## 1.4.0

### Minor Changes

- 7de83ca: - add Error object and make it exportable
  - make test coverage 100%
  - update readme file
  - mark CloneLike as experimental
  - restrict Option and Result and throw UndefinedBehavior error remove main and types in package.json file for Deno

### Patch Changes

- 7de83ca: Deno support

## 1.3.0

### Minor Changes

- 42126d3: - add Error object and make it exportable
  - make test coverage 100%
  - update readme file
  - mark CloneLike as experimental
  - restrict Option and Result and throw UndefinedBehavior error remove main and types in package.json file for Deno

## 1.2.1

### Patch Changes

- c8e961b: Update imports, and CI release
