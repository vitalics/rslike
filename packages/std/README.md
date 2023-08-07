# Rust-Like Standard Library

Make Javascript without undefined behavior. Forgot about `try/catch/finally` which breakes your code!

## Installation

NPM:

```bash
npm i @rslike/std
```

YARN/PNPM:

```bash
yarn add @rslike/std
pnpm add @rslike/std
```

## Adding global functions and classes

1. Install [package](#installation)
2. In your entry file write next:

```typescript
// your main file

// add global types in globalThis Some,None,Option, Result,Ok,Err functions
import '@rslike/std/globals';

// rest your file
```

# API

## Option

Type `Option` represents an optional value: every `Option` is either `Some` and contains a value, or `None`, and does not. `Option` have a number of uses:

- Initial values
- Return values for functions that are not defined over their entire input range (partial functions)
- Return value for otherwise reporting simple errors, where `None` is returned on error
- Optional struct fields
- Optional function arguments
- Nullish(null or undefined) value.
- Swapping things out of difficult situations
- Options are commonly paired with pattern matching to query the presence of a value and take action, always accounting for the None case.

### Examples

``` typescript
function divide(numerator: number, denominator: number) : Option<number> {
    if (denominator == 0.0) {
        return None()
    } else {
        return Some(numerator / denominator)
    }
}

const result = divide(2.0, 3.0);

result.isSome() // true
result.unwrap() // 0.66666
```

### Boolean Operators

These methods treat the `Option` as a boolean value, where `Some` acts like true and `None` acts like false. There are two categories of these methods: ones that take an `Option` as input, and ones that take a function as input (to be lazily evaluated).

The `and`, `or`, and `xor` methods take another Option as input, and produce an `Option` as output. Only the and method can produce an `Option<U>` value having a different inner type U than `Option<T>`.

| method | self    | input     | output  |
| ------ | ------- | --------- | ------- |
| and    | None    | (ignored) | None    |
| and    | Some(x) | None      | None    |
| and    | Some(x) | Some(y)   | Some(y) |
| or     | None    | None      | None    |
| or     | None    | Some(y)   | Some(y) |
| or     | Some(x) | (ignored) | Some(x) |
| xor    | None    | None      | None    |
| xor    | None    | Some(y)   | Some(y) |
| xor    | Some    | None      | Some(x) |
| xor    | Some(x) | Some(y)   | None    |

The `andThen` and `orElse` methods take a function as input, and only evaluate the function when they need to produce a new value. Only the `andThen` method can produce an `Option<U>` value having a different inner type `U` than `Option<T>`.

| method    | self    | function input | function result | output  |
| --------- | ------- | -------------- | --------------- | ------- |
| `andThen` | None    | (not provided) | (not evaluated) | None    |
| `andThen` | Some(x) | x              | None            | None    |
| `andThen` | Some(x) | x              | Some(y)         | Some(y) |
| `orElse`  | None    | (not provided) | None            | None    |
| `orElse`  | None    | (not provided) | Some(y)         | Some(y) |
| `orElse`  | Some(x) | (not provided) | (not evaluated) | Some(x) |

This is an example of using methods like `andThen` and or in a pipeline of method calls. Early stages of the pipeline pass failure values (`None`) through unchanged, and continue processing on success values (`Some`). Toward the end, or substitutes an error message if it receives None.

## Result

`Result<T, E>` is the type used for returning and propagating errors. It is an enum with the variants, `Ok(T)`, representing success and containing a value, and `Err(E)`, representing error and containing an error value.

### Boolean Operators

These methods treat the `Result` as a boolean value, where `Ok` acts like true and `Err` acts like false. There are two categories of these methods: ones that take a `Result` as input, and ones that take a function as input (to be lazily evaluated).

The and and or methods take another `Result` as input, and produce a `Result` as output. The and method can produce a `Result<U, E>` value having a different inner type `U` than `Result<T, E>`. The or method can produce a `Result<T, F>` value having a different error type `F` than `Result<T, E>`.

| method | self   | input     | output |
| ------ | ------ | --------- | ------ |
| `and`  | Err(e) | (ignored) | Err(e) |
| `and`  | Ok(x)  | Err(d)    | Err(d) |
| `and`  | Ok(x)  | Ok(y)     | Ok(y)  |
| `or`   | Err(e) | Err(d)    | Err(d) |
| `or`   | Err(e) | Ok(y)     | Ok(y)  |
| `or`   | Ok(x)  | (ignored) | Ok(x)  |

The `andThen` and `orElse` methods take a function as input, and only evaluate the function when they need to produce a new value. The `andThen` method can produce a `Result<U, E>` value having a different inner type `U` than `Result<T, E>`. The `orElse` method can produce a `Result<T, F>` value having a different error type `F` than `Result<T, E>`.

| method    | self   | function       input | function  result | output |
| --------- | ------ | -------------------- | ---------------- | ------ |
| `andThen` | Err(e) | (not provided)       | (not evaluated)  | Err(e) |
| `andThen` | Ok(x)  | x                    | Err(d)           | Err(d) |
| `andThen` | Ok(x)  | x                    | Ok(y)            | Ok(y)  |
| `orElse`  | Err(e) | e                    | Err(d)           | Err(d) |
| `orElse`  | Err(e) | e                    | Ok(y)            | Ok(y)  |
| `orElse`  | Ok(x)  | (not provided)       | (not evaluated)  | Ok(x)  |

### Examples

```typescript
function fnFromSomewhere(...args){
  throw "something"
}

const callable = Result.bind(fnFromSomewhere);

const result = callable(args);

result.isErr() // true
```
