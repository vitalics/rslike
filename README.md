![image](https://github.com/vitalics/rslike/assets/8816260/170f3954-b2a1-4df7-a639-455c3be1ebb8)

![status](https://github.com/vitalics/rslike/actions/workflows/publish.yaml/badge.svg)

# Rust Like

Make Javascript without undefined behavior. Forget about `try/catch/finally`

## Reason to use rslike

1. Less undefined behavior, when using `Option` and `Result`.
2. Well tested. `100% test coverage`
3. JSDoc with examples.
4. Typescript ready - d.ts types are generated with tsc.
5. first-class `CJS` and `ESM` support.
6. Zero dependencies.
7. `2kB` for min+gzip and `7.6kB` for minified. See in [bundlefobia](https://bundlephobia.com/package/@rslike/std@1.4.2).
8. Deno?

## Wanna be contributor?

See [contribute guide](./CONTRIBUTING.md)

## Wiki

Available by link: https://github.com/vitalics/rslike/wiki

## Packages

- [std](./packages/std/README.md). Standard library. Includes `Result` and `Option`

## Tech Stack

- pnpm
- tsup
- typescript
- changeset
- husky
- github actions
- jest
- eslint

## Plans

- [] Promise
- [] Node.js API
- [] Web API
