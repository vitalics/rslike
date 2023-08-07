# Rust Like

Make Javascript without undefined behavior

## Reason to use rslike

1. Less undefined behavior, when using `Option` and `Result`.
2. Well tested

## Wanna be contributor?

See [contribute guide](./CONTRIBUTING.md)

## API

### Option

Type Option represents an optional value: every Option is either Some and contains a value, or None, and does not. Option types are very common in Rust code, as they have a number of uses:

- Initial values
- Return values for functions that are not defined over their entire input range (partial functions)
- Return value for otherwise reporting simple errors, where `None` is returned on error
- Optional struct fields
- Optional function arguments
- Nullish(null or undefined) value.
- Swapping things out of difficult situations
- Options are commonly paired with pattern matching to query the presence of a value and take action, always accounting for the None case.

### Result

`Result<T, E>` is the type used for returning and propagating errors. It is an enum with the variants, `Ok(T)`, representing success and containing a value, and `Err(E)`, representing error and containing an error value.

## Tech Stack

- pnpm
- esbuild
- typescript
- husky
- github actions
- jest
- eslint

## Plans

- [] Promise
- [] Node.js API
- [] Web API
