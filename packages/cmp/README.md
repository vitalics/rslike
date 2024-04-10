# Compare Package

Compare pakage - set of the classes/types for make your structures comparable and orderable.

## Installation

```bash
npm i @rslike/cmp
yarn add @rslike/cmp
pnpm add @rslike/cmp
```

## Adding global functions and classes

1. Install [package](#installation)
2. In your entry file write next:

```typescript
// your main file

// add global types in globalThis Some,None,Option, Result,Ok,Err functions
import "@rslike/cmp/globals";

// rest your file
```

## WIKI

Available by link: https://github.com/vitalics/rslike/wiki

## Related packages

- [std](https://www.npmjs.com/package/@rslike/std)
- [dbg](https://www.npmjs.com/package/@rslike/dbg)

## Globals

This package patch `Symbol` and global object. So to make sure that this package is works correctly - you need to import **1 time-only** `@rslike/cmp/globals`

Example:

```ts
// entry.ts
import "@rslike/cmp/globals";

// file.ts

const a = {
  // works!
  [Symbol.compare]() {
    return 1;
  },
};
```

## Usage

This package exports next useful functions/types/constants:

- Utilities functions (`compare`, `equals`, `partialEquals`)
- Types (`Eq`, `Ord`, `PartialEq`)
- Symbols (`Symbol.compare`, `Symbol.equals`, `Symbol.partialEquals`)

Example:

```ts
import { compare } from "@rslike/cmp";

compare(2, 3); // -1
```
