# @rslike/std

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
