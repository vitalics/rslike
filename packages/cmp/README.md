# Compare Package

Compare pakage - set of the classes/types for make your structures comparable and orderable.

## Reasons to install @rsLike/std?

1. Less undefined behavior, when using Option and Result.
2. Well tested. `100% test coverage`
3. JSDoc with examples.
4. Typescript ready - d.ts types are generated with tsc.
5. first-class `CJS` and `ESM` support.
6. Zero dependencies.
7. `2kB` for min+gzip and `7.6kB` for minified. See in [bundlefobia](https://bundlephobia.com/package/@rslike/std@1.4.2).
8. Deno?

## Installation

NPM:

```bash
npm i @rslike/cmp
```

YARN/PNPM:

```bash
yarn add @rslike/cmp
pnpm add @rslike/cmp
```

## Adding global functions and classes

1. Install [package](#installation)
2. In your entry file write next:

```typescript
// your main file

// add global types in globalThis Some,None,Option, Result,Ok,Err functions
import '@rslike/cmp/globals';

// rest your file
```

## WIKI

Available by link: https://github.com/vitalics/rslike/wiki

## API

## Ordering

classs that shows 