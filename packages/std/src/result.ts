/**
MIT License

Copyright (c) 2023 Vitali Haradkou

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

import { Errors } from './errors';
import { None, Option, Some } from './option';
import type { EqualLike } from './types';

enum Status {
  Ok,
  Err,
}

/**
 * `Result<T, E>` is the type used for returning and propagating errors. It is an enum with the variants, `Ok(T)`, representing success and containing a value, and `Err(E)`, representing error and containing an error value.
 *
 * Functions return `Result` whenever errors are expected and recoverable.
 * @export
 * @class Result
 * @implements {CloneLike<Result<T, E>>}
 * @implements {EqualLike}
 * @template T
 * @template E
 */
export class Result<T, E> implements EqualLike {
  private constructor(protected readonly status: Status, protected readonly value: T | null | undefined, protected readonly error: E | null) {
    if (error) {
      this.status = Status.Err;
    }
  }
  /**
   * Returns the contained `Ok` value, consuming the self value.
   * 
   * Because this function may throws, its use is generally discouraged. Call `unwrapOr`, `unwrapOrElse`.
   *
   * Panics if the value is an `Err`, with a message including the passed message, and the content of the `Err`.
   * 
   * @example
   * const x: Result<number, string> = Err("emergency failure");
   * x.expect("Testing expect"); // `Testing expect`, cause: emergency failure
   * @param {string} reason
   * @return {*}  {T}
   */
  expect(reason: string): T {
    if (this.status === Status.Err) {
      throw new Error(reason, { cause: this.error })
    }
    return this.value as T;
  }
  /**
   * Returns the contained `Ok` value, consuming the self value.
   * 
   * Because this function may throws, its use is generally discouraged. Instead, call `unwrapOr`, `unwrapOrElse`.
   *
   * @example
   * const x: Result<number, string> = Ok(2);
   * x.unwrap() === 2;
   * @return {*}  {T}
   */
  unwrap(): T {
    if (this.status === Status.Ok) return this.value as T;
    throw this.error;
  }
  /**
   * Returns the contained `Ok` value or a provided default.
   * 
   * Arguments passed to `unwrapOr` are eagerly evaluated; if you are passing the result of a function call, it is recommended to use `unwrapOrElse`, which is lazily evaluated.
   *
   * @example
   * const fallback = 2;
   * const x = Ok(9);
   * x.unwrapOr(fallback) === 9; // true
   *
   * cosnt x: Result<number, string> = Err("error");
   * x.unwrapOr(fallback) === fallback; // true
   * @param {T} fallback
   * @return {*}  {T}
   */
  unwrapOr(fallback: T): T {
    if (this.status === Status.Ok) {
      return this.value as T;
    }
    return fallback;
  }

  /**
   * Returns `true` if the result is `Ok`.
   *
   * @example
   * const x: Result<number, string> = Ok(-3);
   * x.isOk() // true
   * // another example
   * let x: Result<number, string> = Err("Some error message");
   * x.isOk() // false
   * @return {*}  {boolean}
   */
  isOk(): boolean {
    return this.status === Status.Ok;
  }
  /**
   * Returns `true` if the result is `Ok` and the value inside of it matches a predicate.
   *
   * @example
   * const x: Result<number, string> = Ok(2);
   * console.assert(x.isOkAnd(x => x > 1) === true);
   * // another example
   * const x: Result<number, string> = Ok(0);
   * console.assert(x.isOkAnd(x => x > 1) === false);
   * // another example
   * const x: Result<number, string> = Err("hey");
   * console.assert(x.isOkAnd(x => x > 1) === false);
   * @return {*}  {boolean}
   */
  isOkAnd(predicate: (value: T) => boolean): boolean {
    if (this.status === Status.Err) {
      return false;
    }
    assertArgument('isOkAnd', predicate, 'function');
    const res = predicate(this.value as T);
    assertArgument('isOkAnd', res, 'boolean');
    return res;
  }
  /**
   * Returns `true` if the result is `Err`.
   * 
   * @example
   * const x: Result<number, string> = Ok(-3);
   * console.assert(x.isErr() === false);
   * // another example
   * const x: Result<number, string> = Err("Some error message");
   * console.assert(x.isErr() === true);
   *
   * @return {*}  {boolean}
   */
  isErr(): boolean {
    return this.status === Status.Err;
  }
  /**
   * Returns `true` if the result is `Err` and the value inside of it matches a predicate.
   * @example
   * const x: Result<number, Error> = Err(new Error("not found"));
   * x.isErrAnd(e => e.message === 'not found') // true;
   * // another example
   * const x: Result<number, Error> = Err(new Error('permission denied'));
   * x.isErrAnd(x => x.name === 'TypeError') // false
   * // another example
   * const x: Result<number, Error> = Ok(123);
   * x.isErrAnd(e => e.name == 'Error'); // false
   *
   * @param {(err: E) => boolean} predicate
   * @return {*}  {boolean}
   */
  isErrAnd(predicate: (err: E) => boolean): boolean {
    if (this.status === Status.Ok) {
      return false;
    }
    assertArgument('isErrAnd', predicate, 'function')
    const res = predicate(this.err as E);
    assertArgument('isErrAnd', res, 'boolean');
    return res;
  }
  /**
   * Converts from `Result<T, E>` to `Option<T>`.
   * 
   * Converts self into an `Option<T>`, consuming self, and discarding the error, if any.
   *
   * @example
   * const x: Result<number, string> = Ok(2);
   * x.ok() === Some(2); // true
   * // another example
   * const x: Result<number, string> = Err("Nothing here");
   * x.ok() === None(); // true
   * @return {*}  {Option<T>}
   */
  ok(): Option<T> {
    if (this.status === Status.Ok) {
      return Some(this.value);
    }
    return None();
  }

  /**
   * Converts from `Result<T, E>` to `Option<E>`.
   * 
   * Converts self into an `Option<E>`, consuming self, and discarding the success value, if any.
   *
   * @example
   * const x: Result<number, string> = Ok(2);
   * x.err() === None(); // true
   * 
   * const x: Result<number, string> = Err("Nothing here");
   * x.err() === Some("Nothing here"); // true
   * @return {*}  {Option<E>}
   */
  err(): Option<E> {
    if (this.status === Status.Err) {
      return Some(this.error);
    }
    return None();
  }

  /**
   * Maps a `Result<T, E>` to `Result<U, E>` by applying a function to a contained Ok value, leaving an `Err` value untouched.
   * 
   * This function can be used to compose the results of two functions.
   * 
   * @example
   * const x = Ok(1);
   * x.map(v => v * 2) === Ok(2) // true
   *
   * @template U
   * @param {(value: T) => U} mapFn
   * @return {*}  {Result<U, E>}
   */
  map<U>(mapFn: (value: T) => U): Result<U, E> {
    assertArgument('map', mapFn, 'function');
    if (this.status === Status.Ok) {
      return Ok(mapFn(this.value as T));
    } else {
      return Err(this.error) as Result<U, E>;
    }
  }

  /**
   * Returns the provided default (if `Err`), or applies a function to the contained value (if `Ok`),
   * 
   * Arguments passed to `mapOr` are eagerly evaluated; if you are passing the result of a function call, it is recommended to use `mapOrElse`, which is lazily evaluated.
   *
   * @example
   * const x: Result<string, string> = Ok("foo");
   * x.mapOr(42, v => v.length) // result is 3
   * // another example
   * const x: Result<number, string> = Err("bar");
   * x.mapOr(42, v => v.length) // 42
   * 
   * @template U
   * @param {U} another
   * @param {(value: T) => U} fn
   * @return {*}  {U}
   */
  mapOr<U>(another: U, fn: (value: T) => U): U {
    assertArgument('mapOr', fn, 'function')
    if (this.status === Status.Ok) {
      return fn(this.value as T);
    }
    return another;
  }

  /**
   * Maps a `Result<T, E>` to `U` by applying fallback function default to a contained `Err` value, or function `f` to a contained `Ok` value.
   * 
   * This function can be used to unpack a successful result while handling an error.
   *
   * @example
   * let k = 21;
   * 
   * const x: Result<string, string> = Ok("foo");
   * x.mapOrElse(err => k * 2, v => v.length); // 3
   *
   * const y : Result<string, string> = Err("bar");
   * y.mapOrElse(e => k * 2, v => v.length) // 42
   * @template U
   * @param {(err: E) => U} errFn
   * @param {(value: T) => U} okFn
   * @return {*}  {U}
   */
  mapOrElse<U>(errFn: (err: E) => U, okFn: (value: T) => U): U {
    assertArgument('mapOrElse', errFn, 'function');
    assertArgument('mapOrElse', okFn, 'function');
    if (this.status === Status.Err) {
      return errFn(this.error as E);
    }
    return okFn(this.value as T);
  }
  /**
   * Maps a `Result<T, E>` to `Result<T, F>` by applying a function to a contained `Err` value, leaving an `Ok` value untouched.
   * 
   * This function can be used to pass through a successful result while handling an error.
   *
   * @example
   * const stringify = (x: number) => `error code: ${x}`
   * 
   * const x: Result<number, number> = Ok(2);
   * x.mapErr(stringify) === Ok(2) // true
   * 
   * const y: Result<number, number> = Err(13);
   * y.mapErr(stringify) === Err("error code: 13"));
   * @template F
   * @param {(err: E) => F} errFn
   * @return {*}  {Result<T, F>}
   */
  mapErr<F>(errFn: (err: E) => F): Result<T, F> {
    assertArgument('mapErr', errFn, 'function');
    if (this.status === Status.Err) {
      return Err(errFn(this.error as E));
    }
    return Ok(this.value as T);
  }
  /**
   * Returns the contained `Err` value, consuming the self value.
   *
   * @example
   * const x: Result<number, string> = Ok(10);
   * x.expectErr("Testing expectErr"); // throws `Testing expectErr; cause: 10`
   * @param {string} reason
   * @return {*}  {E}
   */
  expectErr(reason: string): E {
    assertArgument('expectErr', reason, 'string');
    if (this.status === Status.Ok) {
      throw new Error(reason, { cause: this.error ?? this.value });
    }
    return this.error as E;
  }
  /**
   * Returns the contained `Err` value, consuming the self value.
   *
   * @example
   * const x: Result<number, string> = Err("emergency failure");
   * x.unwrapErr() === "emergency failure";
   * @return {*}  {E}
   */
  unwrapErr(): E {
    if (this.status === Status.Err) {
      return this.error as E;
    }
    throw this.value;
  }
  /**
  * Returns the contained `Ok` value or computes it from a closure.
  *
  * @example
  * const count = (x: string) => x.length;
  * 
  * Ok(2).unwrapOrElse(count) === 2 // true
  * Err("foo").unwrapOrElse(count) === 3; // true
  *
  * @param {(err: E) => T} fn
  * @return {*}  {T}
  */
  unwrapOrElse(fn: (err: E) => T): T {
    if (this.status === Status.Ok) {
      return this.value as T;
    }
    assertArgument('unwrapOrElse', fn, 'function');
    return fn(this.error as E);
  }
  /**
   * Returns `res` if the result is `Ok`, otherwise returns the `Err` value of self.
   * 
   * Arguments passed to and are eagerly evaluated; if you are passing the result of a function call, it is recommended to use `andThen`, which is lazily evaluated.
   *
   * @example
   * const x: Result<number, string> = Ok(2);
   * const y: Result<string, string> = Err("late error");
   * x.and(y) === Err("late error"); // true
   * // another example
   * const x: Result<number, string> = Err("early error");
   * const y: Result<string, string> = Ok("foo");
   * x.and(y) === Err("early error"); // true
   * // another example
   * const x: Result<number, string> = Err("not a 2");
   * const y: Result<string, string> = Err("late error");
   * x.and(y) === Err("not a 2"); // true
   * // another example
   * const x: Result<number, string> = Ok(2);
   * const y: Result<string, string> = Ok("different result type");
   * x.and(y) === Ok("different result type"); // true
   * @template U
   * @param {Result<U, E>} res
   * @return {*}  {Result<U, E>}
   */
  and<U>(res: Result<U, E>): Result<U, E> {
    if (!(res instanceof Result)) {
      throw new Errors.UndefinedBehavior(`Method "and" should accepts isntance of Result`, { cause: { value: res } });
    }
    if (this.status === Status.Err) {
      return Err(this.error as E);
    }
    return res;
  }
  /**
   * Calls op if the result is `Ok`, otherwise returns the `Err` value of self.
   * 
   * This function can be used for control flow based on `Result` values.
   *
   * @example
   * const sqThenToString = (x: number) => {
   *     return Ok(x * x).map(sq => sq.toString())
   * }
   * 
   * Ok(2).andThen(sqThenToString) === Ok(4.toString())); // true
   * Err("not a number").andThen(sqThenToString) === Err("not a number"); // true
   * @template U
   * @param {(value: T) => Result<U, E>} fn
   * @return {*}  {Result<U, E>}
   */
  andThen<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
    assertArgument('andThen', fn, 'function');
    if (this.status === Status.Ok) {
      const res = fn(this.value as T);
      if (res instanceof Result) {
        return res;
      }
      throw new Errors.UndefinedBehavior('Function result expected to be instance of Result.', { cause: res })
    }
    return Err(this.error as E);
  }
  /**
   * Returns `res` if the result is `Err`, otherwise returns the `Ok` value of self.
   * 
   * Arguments passed to or are eagerly evaluated; if you are passing the result of a function call, it is recommended to use `orElse`, which is lazily evaluated.
   *
   * @example
   * const x: Result<number, string> = Ok(2);
   * const y: Result<number, string> = Err("late error");
   * x.or(y) === Ok(2); // true
   * // another example
   * const x: Result<number, string> = Err("early error");
   * const y: Result<number, string> = Ok(2);
   * x.or(y) === Ok(2); // true
   * // another example
   * const x: Result<number, string> = Err("not a 2");
   * const y: Result<number, string> = Err("late error");
   * x.or(y) === Err("late error"); // true
   * // another example
   * const x: Result<number, string> = Ok(2);
   * const y: Result<number, string> = Ok(100);
   * x.or(y) === Ok(2); // true
   * @template F
   * @param {Result<T, F>} res
   * @return {*}  {Result<T, F>}
   */
  or<F>(res: Result<T, F>): Result<T, F> {
    if (!(res instanceof Result)) {
      throw new Errors.UndefinedBehavior(`Operator "or" expect to pass instance of Result`, { cause: { value: res } });
    }
    if (this.status === Status.Err) {
      return res;
    }
    return Ok(this.value as T);
  }
  /**
   * Calls `fn` if the result is `Err`, otherwise returns the `Ok` value of self.
   * 
   * This function can be used for control flow based on result values.
   *
   * @example
   * const sq = (x: number) =>  Ok(x * x);
   * const err = (x: number) => Err(x);
   * 
   * Ok(2).orElse(sq).orElse(sq) === Ok(2); // true
   * Ok(2).orElse(err).orElse(sq) === Ok(2); // true
   * Err(3).orElse(sq).orElse(err) === Ok(9); // true
   * Err(3).orElse(err).orElse(err) === Err(3); // true
   * @template F
   * @param {(err: E) => Result<T, F>} fn
   * @return {*}  {Result<T, F>}
   */
  orElse<F>(fn: (err: E) => Result<T, F>): Result<T, F> {
    if (this.status === Status.Err) {
      assertArgument('orElse', fn, 'function');
      const res = fn(this.error as E);
      if (!(res instanceof Result)) {
        throw new Errors.UndefinedBehavior('Operator "orElse" expected to return instance of Result. Use "Ok" or "Err" function to define them.', { cause: { value: res, type: typeof res } })
      }
      return res;
    }
    return new Result(this.status, this.value, this.error as F);
  }

  /**
    * Converts from `Result<Result<T, E>, E>` to `Result<T, E>`
    *
    * @example
    * const x: Result<Result<string, number>, number> = Ok(Ok("hello"));
    * Ok("hello") === x.flatten() // true
    * 
    * const x: Result<Result<string, number>, number> = Ok(Err(6));
    * Err(6) === x.flatten(); // true
    * 
    * const x: Result<Result<string, number>, number> = Err(6);
    * Err(6) === x.flatten(); // true
    * @return {*}  {T extends Result<infer Ok, E> ? Result<Ok, E> : Result<T, E>}
    */
  flatten(): T extends Result<infer Ok, E> ? Result<Ok, E> : Result<T, E> {
    if (this.value instanceof Result) {
      return this.value as never;
    }
    return this as never;
  }

  static Ok<Value>(value: Value) {
    return new Result(Status.Ok, value, null);
  }
  static Err<ErrorValue>(value: ErrorValue) {
    return new Result(Status.Err, null, value);
  }

  equal(other: unknown): boolean {
    if (other instanceof Result) {
      if (this.status === Status.Ok && other.status === Status.Ok) {
        return this.value === other.value;
      }
      if (this.status === Status.Err && other.status === Status.Err) {
        return this.error === other.error;
      }
      return false;
    }
    return false;
  }

  /**
   * @protected
   */
  [Symbol.toPrimitive]() {
    return this.value;
  }
  /**
   * @protected
   */
  get [Symbol.toStringTag]() {
    return 'Result';
  }
}

export function Ok<T, E = unknown>(value?: T | null): Result<T, E> {
  return Result.Ok(value) as Result<T, E>;
}

export function Err<T, E = unknown>(err: E) {
  return Result.Err(err) as Result<T, E>;
}

type ResultMethods = keyof Result<undefined, undefined>;
type TypeofResult = "string" | "number" | "bigint" | "boolean" | "symbol" | "undefined" | "object" | "function";

function assertArgument(method: ResultMethods, value: unknown, expectedType: TypeofResult): asserts value {
  const type = typeof value;
  if (type !== expectedType) {
    throw new Errors.UndefinedBehavior(`Method "${String(method)}" should accepts or returns ${expectedType}`, { cause: { value, type, } });
  }
}
