# Rust-Like Standard Library

Make Javascript without undefined behavior. Forgot about `try/catch/finally` which breakes your code!

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
npm i @rslike/std
```

YARN/PNPM:

```bash
yarn add @rslike/std
pnpm add @rslike/std
```

## Wiki

Avaliable by link: https://github.com/vitalics/rslike/wiki

## Adding global functions and classes

1. Install [package](#installation)
2. In your entry file write next:

```typescript
// your main file

// add global types in globalThis Some,None,Option, Result,Ok,Err functions
import "@rslike/std/globals";

// rest your file
```

## Related packages

- [cmp](https://www.npmjs.com/package/@rslike/cmp)
- [dbg](https://www.npmjs.com/package/@rslike/dbg)

## API

### Match

Matches the `Option` or `Result` and calls callback functions.

1 callback function will be executed for `Ok` or `Some` result.

2 callback function will be executed for `Err` or `None` result.

If incoming arguments is not `Option` or `Result` or callback functions is not a functions then it throws an `UndefinedBehavior` error.

If your result have type `Result<Option<T>, E>`. You need to call match function only once

```ts

const resFromBackend = Bind(async (...args) => return (await fetch(...args)).json())

const json = match(await resFromBackend('https://json-placeholder.typicode.com/posts/1'), (res) => {
    console.log('JSON is:', unwrapped)
}, (e) => {
  if(e){
    console.log('Error:', e)
  }
  else {
    console.log('JSON is None(null or undefined)')
  }
})

console.log(json); // YOUR JSON from Backend
```

### Bind

Function decorator. Combines Result and Option modules. Make the function safe to execute.

Wraps function and return new function with binded context.

Result of this function will be mapped into `Result<Option<T>,E>`.

Function `result` will be mapped into `Ok(Some(result))`.

`undefined` function result will mapped into `Ok(None())`.

```ts
const fn = (a: number) => a + 2;
const newFn = Bind(fn);

const res = newFn(1);
res.unwrap().unwrap(); // 3
newFn(10).unwrap().unwrap(); // 12

const thrower = () => {
  throw new Error("shit happens :)");
};
const func = Bind(thrower);
func().isErr(); // true
const err = func().unwrapErr();
console.log(err); // {message: 'shit happens :)'}
err instanceof Error; // true

// async example
const asyncFn = () => Promise.resolve(123);
const fn = Bind(asyncFn);

const r = await fn();

r.isOk(); // true
r.unwrap(); // 123
```

### Option

Type `Option` represents an optional value: every `Option` is either `Some` and contains a value, or `None`, and does not. `Option` have a number of uses:

- Initial values
- Return values for functions that are not defined over their entire input range (partial functions)
- Return value for otherwise reporting simple errors, where `None` is returned on error
- `Optional` struct fields
- `Optional` function arguments
- Nullish(null or undefined) value.
- Swapping things out of difficult situations
- Options are commonly paired with pattern matching to query the presence of a value and take action, always accounting for the `None` case.

#### Functions

##### Some(T)

represents Some value

##### None

Represents nullish(`null` or `undefiend`) value

#### Symbols

##### Symbol.toPrimitive

> since 3.x.x

Returns `value` from `Option`

##### Symbol.toStringTag

> since 3.x.x

##### Symbol.asyncIterator

> since 3.x.x

See [MDN docs](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/asyncIterator) for more

**Note**: This method will only yeild if the `Option` is `Some`

**Note**: throws `UndefinedBehaviorError` for `Some(value)` if `value` is not implements `Symbol.asyncIterator`

##### Symbol.iterator

> since 3.x.x

See [MDN docs](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/iterator) for more

**Note**: This method will only yeild if the `Option` is `Some`

**Note**: throws `UndefinedBehaviorError` for `Some(value)` if `value` is not implements `Symbol.iterator`

Example:

```ts
const a = Some([1, 2, 3]);
for (const el of a) {
  console.log("element is:", el);
}
// will prints
// element is: 1
// element is: 2
// element is: 3

const b = Some(1);
// will throws, Symbol.iterator is not suported for number
for (const el of b) {
  console.log("element is:", el);
}

const c = Some({
  [Symbol.iterator]() {
    return 1;
  },
});

for (const el of c) {
  console.log("iterable:", el);
}
// will prints
// iterable: 1
```

##### Symbol.split

> implemented since 3.x.x version

See [MDN docs](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/split) for more

**NOTE:** throws `UndefinedBehaviorError` if wrapped value is not a `string` or `RegExp`

example:

```ts
const a = Some("bar");

"foobar".split(a); // ["foo", ""]
```

##### Symbol.search

> implemented since 3.x.x version

See [MDN docs](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/search) for more

**NOTE:** throws `UndefinedBehaviorError` if wrapped value is not a `string` or `RegExp`

##### Symbol.inspect

> `util.inspect` is a server feature

The `util.inspect()` method returns a string representation of object that is intended for debugging.

See more about [Symbol.inspect](https://nodejs.org/api/util.html#utilinspectobject-showhidden-depth-colors)

Example:

```ts
import util from "node:util";

const a = Some(4);
util.inspect(a); // Some(4)
```

#### Methods

##### expect

Returns the contained `Some` value, consuming the self value.

```typescript
const x = Some("value");
x.expect("fruits are healthy") === "value"; // true

const y: Option<string> = None();
y.expect("fruits are healthy"); // throws with `fruits are healthy`
```

##### unwrap

Returns the contained `Some` value, consuming the self value.

Because this function may throws, its use is generally discouraged. Instead, prefer to use pattern matching and handle the None case explicitly, or call `unwrapOr`, `unwrapOrElse`, or `unwrapOrDefault`.

Throws an error when value is `None`

```typescript
const x = Some("air");
x.unwrap() === "air";

const x: Option<string> = None();
x.unwrap(); // fails
```

##### unwrapOr

Returns the contained `Some` value or a provided default.

```typescript
const x = Some("air");
x.unwrapOr("another") === "air";

const x: Option<string> = None();
x.unwrapOr("another") === "another";
```

##### unwrapOrElse

Returns the contained Some value or computes it from a closure.

```typescript
const k = 10;
Some(4).unwrapOrElse(() => 2 * k) === 4;
None().unwrapOrElse(() => 2 * k) === 20;
```

##### map

Maps an `Option<T>` to `Option<U>` by applying a function to a contained value (if `Some`) or returns None (if `None`).

```typescript
const maybeSomeString = Some("Hello, World!");
const maybeSomeLen = maybeSomeString.map(s => s.length);
maybeSomeLen === Some(13));

const x: Option<string> = None();
x.map(s => s.length) === None();
```

##### mapOr

Returns the provided default result (if `none`), or applies a function to the contained value (if any).

Arguments passed to mapOr are eagerly evaluated; if you are passing the result of a function call, it is recommended to use `mapOrElse`, which is lazily evaluated.

```typescript
const x = Some("foo");
x.mapOr(42, (v) => v.length) === 3;

const x: Option<string> = None();
x.mapOr(42, (v) => v.len()) === 42;
```

##### mapOrElse

Computes a default function result (if `none`), or applies a different function to the contained value (if any).

```typescript
const k = 21;

const x = Some("foo");
x.mapOrElse(
  () => 2 * k,
  (v) => v.length,
) === 3;

const x: Option<string> = None();
x.mapOrElse(
  () => 2 * k,
  (v) => v.length,
) === 42;
```

##### okOr

Transforms the `Option<T>` into a `Result<T, E>`, mapping `Some(v)` to `Ok(v)` and `None` to `Err(err)`.

Arguments passed to `okOr` are eagerly evaluated; if you are passing the result of a function call, it is recommended to use `okOrElse`, which is lazily evaluated.

```typescript
const x = Some("foo");
String(x.okOr(0)) === String(Ok("foo"));

const y: Option<string> = None();
y.okOr(0) === Err(0);
```

##### okOrElse

Transforms the `Option<T>` into a `Result<T, E>`, mapping `Some(v)` to `Ok(v)` and None to `Err(err())`.

```typescript
const x = Some("foo");
console.assert(x.okOrElse(() => 0) === Ok("foo"));

let y: Option<string> = None();
console.assert(y.okOrElse(() => 0) === Err(0));
```

##### and

Returns `None` if the option is `None`, otherwise returns `optb`.

Arguments passed to and are eagerly evaluated; if you are passing the result of a function call, it is recommended to use `andThen`, which is lazily evaluated.

```typescript
const x = Some(2);
const y: Option<string> = None();
console.assert(x.and(y) === None());
// another example
let x: Option<number> = None();
let y = Some("foo");
console.assert(x.and(y) === None());
// another example
let x = Some(2);
let y = Some("foo");
console.assert(x.and(y) === Some("foo"));
// another example
let x: Option<number> = None();
let y: Option<string> = None();
console.assert(x.and(y) === None());
```

##### andThen

Returns `None` if the option is `None`, otherwise calls f with the wrapped value and returns the result.

Some languages call this operation flatmap.

```typescript
function toString(x: number): Option<string> {
 return Some(String(x));
}
console.assert(Some(2).andThen(toString) === Some(2.toString()));
console.assert(None().andThen(toString) === None());
```

##### filter

Returns `None` if the option is `None`, otherwise calls predicate with the wrapped value and returns:

`Some(t)` if predicate returns true (where t is the wrapped value), an
`None` if predicate returns false

```typescript
function isEven(n: number): boolean {
  return n % 2 == 0;
}
console.assert(None().filter(isEven) === None());
console.assert(Some(3).filter(isEven) === None());
console.assert(Some(4).filter(isEven) === Some(4));
```

##### xor

Returns `Some` if exactly one of self, `optb` is `Some`, otherwise returns `None`.

##### insert

Inserts value into the option, then returns a mutable reference to it.

If the option already contains a value, the old value is dropped.

See also `getOrInsert`, which doesn’t update the value if the option already contains `Some`.

```typescript
const opt = None();
const val = opt.insert(1);
console.assert(val === 1);
console.assert(opt.unwrap() === 1);
// another example
const val = opt.insert(2);
console.assert(val === 2);
```

##### replace

Replaces the actual value in the option by the value given in parameter, returning the old value if present, leaving a `Some` in its place without deinitializing either one.

```ts
const x = Some(2);
const old = x.replace(5);
console.assert(x === Some(5));
console.assert(old === Some(2));
// another example
const x = None();
const old = x.replace(3);
console.assert(x === Some(3));
console.assert(old === None());
```

##### zip

Zips self with another `Option`.

If self is `Some(s)` and other is `Some(o)`, this method returns `Some((s, o))`. Otherwise, `None` is returned.

```ts
const x = Some(1);
const y = Some("hi");
const z = None<number>();

x.zip(y) === Some((1, "hi"));
x.zip(z) === None();
```

##### zipWith

Zips self and another `Option` with function `f`.

If self is `Some(s)` and other is `Some(o)`, this method returns `Some(f(s, o))`. Otherwise, `None` is returned.

```ts
class Point {
  constructor(
    readonly x: number,
    readonly y: number,
  ) {}
  static create(x: number, y: number) {
    return new Point(x, y);
  }
}
const x = Some(17.5);
const y = Some(42.7);

x.zipWith(y, Point.create) === Some({ x: 17.5, y: 42.7 });
```

##### unzip

Unzips an option containing a tuple of two options.

If self is `Some((a, b))` this method returns `(Some(a), Some(b))`. Otherwise, `(None, None)` is returned.

```ts
const x = Some([1, "hi"]);
const y = None<[number, number]>();
console.assert(x.unzip() === [Some(1), Some("hi")]);
console.assert(y.unzip() === [None(), None()]);
```

##### flatten

Converts from `Option<Option<T>>` to `Option<T>`.

```ts
const x: Option<Option<number>> = Some(Some(6));
Some(6) === x.flatten();

const x: Option<Option<number>> = Some(None());
None() === x.flatten();

const x: Option<Option<number>> = None();
None() === x.flatten();
```

##### isSome

Returns `true` if the option is a `Some` value.

```ts
const x: Option<number> = Some(2);
x.isSome() === true; // true

const x: Option<number> = None();
x.isSome() === false; // true
```

##### isNone

Returns true if the option is a `None` value.

##### isSomeAnd

Returns `true` if the option is a `Some` and the value inside of it matches a predicate.

```ts
const x: Option<number> = Some(2);
x.isSomeAnd((x) => x > 1) === true; // true

const x: Option<number> = Some(0);
x.isSomeAnd((x) => x > 1) === false; // true

const x: Option<number> = None();
x.isSomeAnd((x) => x > 1) === false; // true
```

##### getOrInsert

Inserts value into the option if it is `None`, then returns a mutable reference to the contained value.

See also `insert`, which updates the value even if the option already contains `Some`.

```ts
const x = None<number>();
const y = x.getOrInsert(7);

y === 7; // true
```

##### getOrInsertWith

Inserts a value computed from `f` into the option if it is `None`, then returns the contained value.

```ts
const x = None<number>();
const y = x.getOrInsertWith(() => 5);

y === 5; // true
```

##### or

Returns the `Option` if it contains a value, otherwise returns `optb`. Arguments passed to or are eagerly evaluated; if you are passing the result of a function call, it is recommended to use `orElse`, which is lazily evaluated.

```ts
const x = Some(2);
const y = None();
console.assert(x.or(y) === Some(2));
// another example
const x = None();
const y = Some(100);
console.assert(x.or(y) === Some(100));
// another example
let x = Some(2);
let y = Some(100);
console.assert(x.or(y) === Some(2));
// another example
const x: Option<number> = None();
const y = None();
console.assert(x.or(y) === None());
```

##### orElse

Returns the `Option` if it contains a value, otherwise calls `f` and returns the result.

```ts
function nobody(): Option<string> {
  return None();
}
function vikings(): Option<string> {
  return Some("vikings");
}

Some("barbarians").orElse(vikings) === Some("barbarians"); // true
None().orElse(vikings) === Some("vikings"); // true
None().orElse(nobody) === None(); // true
```

##### Boolean Operators

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

### Result

`Result<T, E>` is the type used for returning and propagating errors. It is an enum with the variants, `Ok(T)`, representing success and containing a value, and `Err(E)`, representing error and containing an error value.

#### Functions

##### Ok(T)

Represents success with `T` value.

##### Err(E)

Represents fail with some error inside.

#### Symbols

##### Symbol.toPrimitive

##### Symbol.toStringTag

##### Symbol.iterator

See [MDN docs](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/iterator) for more

**Note**: This method will only yeild if the `Option` is `Some`

**Note**: throws `UndefinedBehaviorError` for `Ok(value)` if `value` is not implements `Symbol.iterator`

`Err` value is not iterable.

Example:

```ts
const a = Ok([1, 2, 3]);
for (const el of a) {
  console.log("element is:", el);
}
// will prints
// element is: 1
// element is: 2
// element is: 3

const b = Ok(1);
// will throws, Symbol.iterator is not suported for number
for (const el of b) {
  console.log("element is:", el);
}

const c = Ok({
  [Symbol.iterator]() {
    return 1;
  },
});

for (const el of c) {
  console.log("iterable:", el);
}
// will prints
// iterable: 1
```

##### Symbol.asyncIterator

> since 3.x.x

See [MDN docs](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/asyncIterator) for more

**Note**: This method will only yeild if the `Option` is `Some`

**Note**: throws `UndefinedBehaviorError` for `Some(value)` if `value` is not implements `Symbol.asyncIterator`

##### Symbol.split

##### Symbol.search

##### Symbol.inspect

##### Symbol.inspect

> `util.inspect` is a server feature

The `util.inspect()` method returns a string representation of object that is intended for debugging.

See more about [Symbol.inspect](https://nodejs.org/api/util.html#utilinspectobject-showhidden-depth-colors)

Example:

```ts
import util from "node:util";

const a = Ok(4);
util.inspect(a); // Ok(4)
util.inspect(Err("some error")); // Err('some error')
```

#### Methods

##### expect

Returns the contained `Ok` value, consuming the self value.

Because this function may throws, its use is generally discouraged. Call `unwrapOr`, `unwrapOrElse`.

Panics if the value is an `Err`, with a message including the passed message, and the content of the `Err`.

```ts
const x: Result<number, string> = Err("emergency failure");
x.expect("Testing expect"); // `Testing expect`, cause: emergency failure
```

##### unwrap

Returns the contained `Ok` value, consuming the self value.

Because this function may throws, its use is generally discouraged. Instead, call `unwrapOr`, `unwrapOrElse`.

```ts
const x: Result<number, string> = Ok(2);
x.unwrap() === 2;
```

##### unwrapOr

eturns the contained `Ok` value or a provided default.

Arguments passed to `unwrapOr` are eagerly evaluated; if you are passing the result of a function call, it is recommended to use `unwrapOrElse`, which is lazily evaluated.

```ts
const fallback = 2;
const x = Ok(9);
x.unwrapOr(fallback) === 9; // true

cosnt x: Result<number, string> = Err("error");
x.unwrapOr(fallback) === fallback; // true
```

##### isOk

Returns `true` if the result is `Ok`.

```ts
const x: Result<number, string> = Ok(-3);
x.isOk(); // true
// another example
let x: Result<number, string> = Err("Some error message");
x.isOk(); // false
```

##### isOkAnd

Returns `true` if the result is `Ok` and the value inside of it matches a predicate.

```ts
const x: Result<number, string> = Ok(2);
console.assert(x.isOkAnd((x) => x > 1) === true);
// another example
const x: Result<number, string> = Ok(0);
console.assert(x.isOkAnd((x) => x > 1) === false);
// another example
const x: Result<number, string> = Err("hey");
console.assert(x.isOkAnd((x) => x > 1) === false);
```

##### isErr

Returns `true` if the result is `Err`.

```ts
const x: Result<number, string> = Ok(-3);
console.assert(x.isErr() === false);
// another example
const x: Result<number, string> = Err("Some error message");
console.assert(x.isErr() === true);
```

#### isErrAnd

Returns `true` if the result is `Err` and the value inside of it matches a predicate.

```ts
const x: Result<number, Error> = Err(new Error("not found"));
x.isErrAnd((e) => e.message === "not found"); // true;
// another example
const x: Result<number, Error> = Err(new Error("permission denied"));
x.isErrAnd((x) => x.name === "TypeError"); // false
// another example
const x: Result<number, Error> = Ok(123);
x.isErrAnd((e) => e.name == "Error"); // false
```

##### ok

Converts self into an `Option<T>`, consuming self, and discarding the error, if any.

```ts
const x: Result<number, string> = Ok(2);
x.ok() === Some(2); // true
// another example
const x: Result<number, string> = Err("Nothing here");
x.ok() === None(); // true
```

##### err

Converts self into an `Option<E>`, consuming self, and discarding the success value, if any.

```ts
const x: Result<number, string> = Ok(2);
x.err() === None(); // true

const x: Result<number, string> = Err("Nothing here");
x.err() === Some("Nothing here"); // true
```

##### map

Maps a `Result<T, E>` to `Result<U, E>` by applying a function to a contained Ok value, leaving an `Err` value untouched.

This function can be used to compose the results of two functions.

```ts
const x = Ok(1);
x.map((v) => v * 2) === Ok(2); // true
```

##### mapOr

Returns the provided default (if `Err`), or applies a function to the contained value (if `Ok`),

Arguments passed to `mapOr` are eagerly evaluated; if you are passing the result of a function call, it is recommended to use `mapOrElse`, which is lazily evaluated.

```ts
const x: Result<string, string> = Ok("foo");
x.mapOr(42, (v) => v.length); // result is 3
// another example
const x: Result<number, string> = Err("bar");
x.mapOr(42, (v) => v.length); // 42
```

##### mapOrElse

Maps a `Result<T, E>` to `U` by applying fallback function default to a contained `Err` value, or function `f` to a contained `Ok` value.

This function can be used to unpack a successful result while handling an error.

```ts
let k = 21;

const x: Result<string, string> = Ok("foo");
x.mapOrElse(
  (err) => k * 2,
  (v) => v.length,
); // 3

const y: Result<string, string> = Err("bar");
y.mapOrElse(
  (e) => k * 2,
  (v) => v.length,
); // 42
```

##### mapErr

Maps a `Result<T, E>` to `Result<T, F>` by applying a function to a contained Err value, leaving an `Ok` value untouched.

This function can be used to pass through a successful result while handling an error.

```ts
const stringify = (x: number) => `error code: ${x}`;

const x: Result<number, number> = Ok(2);
x.mapErr(stringify) === Ok(2); // true

const y: Result<number, number> = Err(13);
y.mapErr(stringify) === Err("error code: 13");
```

##### expectErr

Returns the contained `Err` value, consuming the self value.

```ts
const x: Result<number, string> = Ok(10);
x.expectErr("Testing expectErr"); // throws `Testing expectErr; cause: 10`
```

##### unwrapErr

Returns the contained `Err` value, consuming the self value.

```ts
const x: Result<number, string> = Err("emergency failure");
x.unwrapErr() === "emergency failure";
```

##### unwrapOrElse

Returns the contained `Ok` value or computes it from a closure.

```ts
const count = (x: string) => x.length;

Ok(2).unwrapOrElse(count) === 2; // true
Err("foo").unwrapOrElse(count) === 3; // true
```

##### and

Returns res if the result is Ok, otherwise returns the Err value of self.

Arguments passed to and are eagerly evaluated; if you are passing the result of a function call, it is recommended to use andThen, which is lazily evaluated.

```ts
const x: Result<number, string> = Ok(2);
const y: Result<string, string> = Err("late error");
x.and(y) === Err("late error"); // true
// another example
const x: Result<number, string> = Err("early error");
const y: Result<string, string> = Ok("foo");
x.and(y) === Err("early error"); // true
// another example
const x: Result<number, string> = Err("not a 2");
const y: Result<string, string> = Err("late error");
x.and(y) === Err("not a 2"); // true
// another example
const x: Result<number, string> = Ok(2);
const y: Result<string, string> = Ok("different result type");
x.and(y) === Ok("different result type"); // true
```

##### andThen

Calls op if the result is `Ok`, otherwise returns the `Err` value of self.

This function can be used for control flow based on `Result` values.

```ts

const sqThenToString = (x: number) => {
    return Ok(x * x).map(sq => sq.toString())
}

Ok(2).andThen(sqThenToString) === Ok(4.toString())); // true
Err("not a number").andThen(sqThenToString) === Err("not a number"); // true
```

##### or

Returns res if the result is Err, otherwise returns the Ok value of self.

Arguments passed to or are eagerly evaluated; if you are passing the result of a function call, it is recommended to use orElse, which is lazily evaluated.

```ts
const x: Result<number, string> = Ok(2);
const y: Result<number, string> = Err("late error");
x.or(y) === Ok(2); // true
// another example
const x: Result<number, string> = Err("early error");
const y: Result<number, string> = Ok(2);
x.or(y) === Ok(2); // true
// another example
const x: Result<number, string> = Err("not a 2");
const y: Result<number, string> = Err("late error");
x.or(y) === Err("late error"); // true
// another example
const x: Result<number, string> = Ok(2);
const y: Result<number, string> = Ok(100);
x.or(y) === Ok(2); // true
```

##### orElse

Calls fn if the result is `Err`, otherwise returns the `Ok` value of self.

This function can be used for control flow based on result values.

```ts
const sq = (x: number) => Ok(x * x);
const err = (x: number) => Err(x);

Ok(2).orElse(sq).orElse(sq) === Ok(2); // true
Ok(2).orElse(err).orElse(sq) === Ok(2); // true
Err(3).orElse(sq).orElse(err) === Ok(9); // true
Err(3).orElse(err).orElse(err) === Err(3); // true
```

##### flatten

Converts from `Result<Result<T, E>, E>` to `Result<T, E>`

```ts
const x: Result<Result<string, number>, number> = Ok(Ok("hello"));
Ok("hello") === x.flatten(); // true

const x: Result<Result<string, number>, number> = Ok(Err(6));
Err(6) === x.flatten(); // true

const x: Result<Result<string, number>, number> = Err(6);
Err(6) === x.flatten(); // true
```

##### Boolean Operators

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

| method    | self   | function input | function result | output |
| --------- | ------ | -------------- | --------------- | ------ |
| `andThen` | Err(e) | (not provided) | (not evaluated) | Err(e) |
| `andThen` | Ok(x)  | x              | Err(d)          | Err(d) |
| `andThen` | Ok(x)  | x              | Ok(y)           | Ok(y)  |
| `orElse`  | Err(e) | e              | Err(d)          | Err(d) |
| `orElse`  | Err(e) | e              | Ok(y)           | Ok(y)  |
| `orElse`  | Ok(x)  | (not provided) | (not evaluated) | Ok(x)  |
