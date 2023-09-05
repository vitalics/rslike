# @rslike/cmp

## 2.1.2

### Patch Changes

- d34b352: make dbg package more reliable for external building
- Updated dependencies [d34b352]
  - @rslike/std@2.1.2

## 2.1.1

### Patch Changes

- 9bfb757: make dbg package more reliable for external building
- Updated dependencies [9bfb757]
  - @rslike/std@2.1.1

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

### Patch Changes

- Updated dependencies [90ea149]
  - @rslike/std@2.1.0

## 2.0.2

### Patch Changes

- 0360cdc: add related block for readme file
- Updated dependencies [0360cdc]
  - @rslike/std@2.0.1

## 2.0.1

### Patch Changes

- ff7e732: Fix readme file and description in package.json

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

### Patch Changes

- Updated dependencies [731b6e8]
  - @rslike/std@2.0.0
