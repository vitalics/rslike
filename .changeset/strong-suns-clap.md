---
"@rslike/std": minor
"@rslike/cmp": minor
"@rslike/dbg": minor
---

# What's new

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
import { dbg } from '@rslike/dbg';
// or import default
import dbg from '@rslike/dbg';


const a = 123;

dbg(() => a); // a: 123
```

See more at [wiki](https://github.com/vitalics/rslike/wiki/Debug)

## Other fixes/improves

### `std`

- add methods `toJSON` for `Option` and `Result` classes which will be executed when `JSON.stringify` is executed
