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

import {
  UndefinedBehaviorError,
  assertArgument,
  customInspectSymbol,
} from "./utils.ts";
import { None, Option, Some } from "./option.ts";

/** Result possible status */
enum Status {
  Err,
  Ok,
}

type Resolver<T> = (value: T) => void;
type Rejecter<E> = (reason?: E) => void;
type Executor<T, E> = (resolve: Resolver<T>, reject: Rejecter<E>) => void;

/**
 * `Result<T, E>` is the type used for returning and propagating errors. It is an enum with the variants, `Ok(T)`, representing success and containing a value, and `Err(E)`, representing error and containing an error value.
 *
 * Based on Promise-like API
 * @example
 * @template T success value
 * @template E error value
 */
export class Result<const T, const E, const S extends Status = Status> {
  private value: T | null = null;
  private error: E | null | undefined = undefined;
  private status: S | undefined;

  constructor(executor: Executor<T, E>) {
    const resolve: Resolver<T> = (value) => {
      if (!this.status) {
        this.value = value;
        this.status = Status.Ok as S;
      }
    };

    const reject: Rejecter<E> = (error) => {
      if (!this.status) {
        this.error = error;
        this.status = Status.Err as S;
      }
    };

    try {
      executor(resolve, reject);
    } catch (err) {
      reject(err as E);
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
   * @throws `Error` if `Result` has error status
   * @param {string} reason
   * @return {*}  {T}
   */
  expect(reason: string): S extends Status.Err ? never : T {
    if (reason && this.status === Status.Err) {
      throw new Error(reason, { cause: this.error });
    }
    return this.value as never;
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
  unwrap(): S extends Status.Ok ? T : never {
    if (this.status === Status.Ok) {
      return this.value as never;
    }
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
  unwrapOr<const U>(fallback: U): S extends Status.Err ? U : T {
    if (this.status === Status.Ok) {
      return this.value as never;
    }
    return fallback as never;
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
  isOk(): S extends Status.Ok ? true : S extends Status.Err ? false : boolean {
    return (this.status === Status.Ok) as never;
  }
  /**
   * Returns `true` if the result is `Ok` and the value inside of it matches a predicate.
   *
   * @throws `UndefinedBehaviorError` if `predicate` is not a function
   * @throws `UndefinedBehaviorError` if `predicate` result  is not a boolean
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
  isOkAnd<const R extends boolean>(
    predicate: (value: T) => R,
  ): S extends Status.Ok ? true : R {
    if (this.status === Status.Err) {
      return false as never;
    }
    assertArgument("isOkAnd", predicate, "function");
    const res = predicate(this.value as T);
    assertArgument("isOkAnd", res, "boolean");
    return res as never;
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
  isErr(): S extends Status.Err ? true : S extends Status.Ok ? false : boolean {
    return (this.status === Status.Err) as never;
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
   * @throws `UndefinedBehaviorError` if `predicate` is not a function
   * @throws `UndefinedBehaviorError` if `predicate` result is not a boolean
   * @param {(err: E) => boolean} predicate
   * @return {*}  {boolean}
   */
  isErrAnd<R extends boolean>(
    predicate: (err: E) => R,
  ): S extends Status.Err ? true : R {
    if (this.status === Status.Ok) {
      return false as never;
    }
    assertArgument("isErrAnd", predicate, "function");
    const res = predicate(this.err as E);
    assertArgument("isErrAnd", res, "boolean");
    return res as never;
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
  ok(): S extends Status.Ok
    ? Option<T, typeof Option.Status.Some>
    : Option<T, typeof Option.Status.None> {
    if (this.status === Status.Ok) {
      return Some(this.value) as never;
    }
    return None() as never;
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
  err(): S extends Status.Err
    ? Option<E, typeof Option.Status.Some>
    : Option<E, typeof Option.Status.None> {
    if (this.status === Status.Err) {
      return Some(this.error) as never;
    }
    return None() as never;
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
   * @throws `UndefinedBehaviorError` if `mapFn` is not a function
   * @param {(value: T) => U} mapFn
   * @return {*} {Result<U, E>}
   */
  map<const U>(
    mapFn: (value: T) => U,
  ): S extends Status.Err ? this : Result<U, E> {
    assertArgument("map", mapFn, "function");
    if (this.status === Status.Ok) {
      return Ok(mapFn(this.value as T)) as never;
    }
    return this as never;
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
   * @throws `UndefinedBehaviorError` if `predicate` is not a function
   * @template U
   * @param {U} another
   * @param {(value: T) => U} predicate
   * @return {*}  {U}
   */
  mapOr<const U, const FR>(
    another: U,
    predicate: (value: T) => FR,
  ): S extends Status.Err ? U : FR {
    assertArgument("mapOr", predicate, "function");
    if (this.status === Status.Ok) {
      return predicate(this.value as T) as never;
    }
    return another as never;
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
   * @throws `UndefinedBehaviorError` if `errFn` is not a function
   * @throws `UndefinedBehaviorError` if `okFn` is not a function
   * @template U
   * @param errFn
   * @param okFn
   * @return {*} {U}
   */
  mapOrElse<const ER, const RR>(
    errFn: (err: E) => ER,
    okFn: (value: T) => RR,
  ): S extends Status.Err ? ER : RR {
    assertArgument("mapOrElse", errFn, "function");
    if (this.status === Status.Err) {
      return errFn(this.error as E) as never;
    }
    assertArgument("mapOrElse", okFn, "function");
    return okFn(this.value as T) as never;
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
   * @throws `UndefinedBehaviorError` if `errFn` is not a function
   * @param {(err: E) => F} errFn
   * @return {*}  {Result<T, F>}
   */
  mapErr<const F>(
    errFn: (err: E) => F,
  ): S extends Status.Err ? Result<T, F> : this {
    assertArgument("mapErr", errFn, "function");
    if (this.status === Status.Err) {
      return Err(errFn(this.error as E)) as never;
    }
    return this as never;
  }
  /**
   * Returns the contained `Err` value, consuming the self value.
   *
   * @example
   * const x: Result<number, string> = Ok(10);
   * x.expectErr("Testing expectErr"); // throws `Testing expectErr; cause: 10`
   * @throws `Error` if `Result` status is OK
   * @param {string} reason
   * @return {*}  {E}
   */
  expectErr(reason: string): S extends Status.Ok ? never : E {
    assertArgument("expectErr", reason, "string");
    if (this.status === Status.Ok) {
      throw new Error(reason, { cause: this.value });
    }
    return this.error as never;
  }
  /**
   * Returns the contained `Err` value, consuming the self value.
   *
   * @example
   * const x: Result<number, string> = Err("emergency failure");
   * x.unwrapErr() === "emergency failure";
   * @throws `value` if `Result` status is OK
   * @return {*}  {E}
   */
  unwrapErr(): S extends Status.Err ? E : never {
    if (this.status === Status.Err) {
      return this.error as never;
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
   * @throws `UndefinedBehaviorError` if `predicate` is not a function
   * @param predicate
   * @return {*} {T}
   */
  unwrapOrElse<const U>(predicate: (err: E) => U): S extends Status.Ok ? T : U {
    if (this.status === Status.Ok) {
      return this.value as never;
    }
    assertArgument("unwrapOrElse", predicate, "function");
    return predicate(this.error as E) as never;
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
   * @throws `UndefinedBehaviorError` if `res` is not an instance of `Result`
   * @param res
   * @return {*}  {Result<U, E>}
   */
  and<const U, const R extends Result<U, unknown>>(
    res: R,
  ): S extends Status.Ok
    ? R extends Result<any, infer RE, infer RS>
      ? RS extends Status.Ok
        ? R
        : Result<U, RE>
      : Result<U, E>
    : Result<T, E> {
    if (!(res instanceof Result)) {
      throw new UndefinedBehaviorError(
        `Method "and" should accepts isntance of Result`,
        { cause: { value: res } },
      );
    }
    if (this.status === Status.Err) {
      return Err(this.error as E) as never;
    }
    return res as never;
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
   * @throws `UndefinedBehaviorError` if `fn` argument is not a function
   * @throws `UndefinedBehaviorError` if `fn` result is not an instance of `Result`
   * @param {(value: T) => Result<U, E>} fn
   * @return {*}  {Result<U, E>}
   */
  andThen<const U, const R extends Result<U, E> = Result<U, E>>(
    fn: (value: T) => R,
  ): S extends Status.Err ? this : R {
    assertArgument("andThen", fn, "function");
    if (this.status === Status.Ok) {
      const res = fn(this.value as T);
      if (res instanceof Result) {
        return res as never;
      }
      throw new UndefinedBehaviorError(
        "Function result expected to be instance of Result.",
        { cause: res },
      );
    }
    return Err(this.error as E) as never;
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
   * @throws `UndefinedBehaviorError` if `res` argument is not an instance of `Result`
   * @param {Result<T, F>} res
   * @return {*}  {Result<T, F>}
   */
  or<const F, const R extends Result<unknown, F> = Result<unknown, F>>(
    res: R,
  ): S extends Status.Err ? R : Result<T, F, S> {
    if (!(res instanceof Result)) {
      throw new UndefinedBehaviorError(
        `Operator "or" expect to pass instance of Result`,
        { cause: { value: res } },
      );
    }
    if (this.status === Status.Err) {
      return res as never;
    }
    return this as never;
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
   * @throws `UndefinedBehaviorError` if `fn` argument is not a function
   * @throws `UndefinedBehaviorError` if `fn` result is not an isntance of `Result`
   * @param fn
   * @return {*}  {Result<T, F>}
   */
  orElse<const R extends Result<unknown, unknown> = Result<unknown, unknown>>(
    fn: (err: E) => R,
  ): S extends Status.Ok ? this : R {
    if (this.status === Status.Ok) {
      return this as never;
    }
    assertArgument("orElse", fn, "function");
    const res = fn(this.error as E);
    if (!(res instanceof Result)) {
      throw new UndefinedBehaviorError(
        'Operator "orElse" expected to return instance of Result. Use "Ok" or "Err" function to define them.',
        { cause: { value: res, type: typeof res } },
      );
    }
    return res as never;
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

  static Ok<const V, const E>(value: V) {
    return new Result<V, E, Status.Ok>((res) => res(value));
  }
  static Err<const V, const ErrorValue>(value: ErrorValue) {
    return new Result<V, ErrorValue, Status.Err>((_, rej) => rej(value));
  }

  static ok = Result.Ok;
  static err = Result.Err;

  /**
   * Similar to `Promise.withResolvers` API.
   * @example
   * const {ok, result} = Result.withResolvers()
   * ok(3)
   * result.unwrap() // 3
   */
  static withResolvers<const T, const E>() {
    let ok: Resolver<T>;
    let err: Rejecter<E>;

    const result = new Result<T, E>((res, rej) => {
      ok = res;
      err = rej;
    });

    return { ok: ok!, err: err!, result };
  }

  /**
   * Returns `true` if incoming `value` is instance of `Result`.
   *
   * @static
   * @param {unknown} value
   * @return {*}
   * @memberof Ordering
   */
  static is(value: unknown): boolean {
    return value instanceof Result;
  }

  static Status = Status;
  static async fromPromise<const P, const E>(
    promiseLike: P | Promise<P> | PromiseLike<P>,
  ): Promise<Result<Awaited<P>, E>> {
    const { err, ok, result } = Result.withResolvers<Awaited<P>, E>();
    try {
      const v = await promiseLike;
      ok(v);
    } catch (e) {
      err(e as E);
    }
    return result;
  }

  /**
   * Compare Self and another value.
   * You can pass your own function to compare
   * @example
   * const a = Ok(2)
   * const b = 2
   * const same = a.equal(b, (result, another) => {
   * // result = Ok(2)
   * // another = 2
   *  return result.unwrap() === another
   * })
   * console.log(same) // true
   * console.log(a.equal(b)) // false
   * console.log(a.equal(Ok(2))) // true
   * @param other another value
   * @param [cmp=Object.is] compare function. Default - `Object.is`
   */
  equal<const U>(
    other: U,
    cmp: (value1: this, value2: U) => boolean = Object.is,
  ): boolean {
    if (other instanceof Result) {
      if (this.status === Status.Ok && other.status === Status.Ok) {
        return cmp(this.value as never, other.value);
      }
      if (this.status === Status.Err && other.status === Status.Err) {
        return cmp(this.error as never, other.error);
      }
      return false;
    }
    return cmp(this, other);
  }

  valueOf() {
    if (this.isOk()) {
      return this.value;
    }
    return undefined;
  }

  toString() {
    const printFn = this.status === Status.Err ? `Err` : `Ok`;
    return `${printFn}(${this.status === Status.Err ? this.error : this.value})`;
  }

  toJSON() {
    return {
      status: this.status,
      value: this.value,
      error: this.error,
    };
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
    return "Result";
  }
  /**
   * @protected
   * Iterator support for `Option`.
   *
   * _Note: This method will only yeild if the Option is Some._
   */
  [Symbol.iterator]<
    ArrOk = T extends Iterable<infer V> ? V : never,
  >(): ArrOk extends never ? never : Iterator<ArrOk> {
    if (this.isErr()) {
      throw this.error;
    }
    if (
      this.isOk() &&
      typeof this.value === "object" &&
      this.value !== null &&
      typeof (this.value as any)[Symbol.iterator] === "function"
    ) {
      return (this.value as any)[Symbol.iterator]();
    }
    throw new UndefinedBehaviorError(
      `[Symbol.iterator] can applies only for Ok(<Iterable>) value`,
      {
        cause: {
          value: this.value,
          type: typeof this.value,
          status: this.status,
        },
      },
    );
  }
  [Symbol.split](string: string, limit?: number) {
    if (this.isErr()) {
      throw this.error;
    }
    if (
      this.isOk() &&
      (typeof this.value === "string" ||
        (typeof this.value === "object" &&
          this.value &&
          this.value.constructor.name === "RegExp"))
    ) {
      return string.split(this.value as string | RegExp, limit);
    }
    throw new UndefinedBehaviorError(
      `[Symbol.split] can applies only for Ok(<string | RegExp>) value`,
      {
        cause: {
          value: this.value,
          type: typeof this.value,
          status: this.status,
        },
      },
    );
  }
  [Symbol.search](string: string) {
    if (this.isErr()) {
      throw this.error;
    }
    if (this.isOk() && typeof this.value === "string") {
      return string.indexOf(this.value);
    }
    throw new UndefinedBehaviorError(
      `[Symbol.search] can applies only for Ok(<string>) value`,
      {
        cause: {
          value: this.value,
          type: typeof this.value,
          status: this.status,
        },
      },
    );
  }

  /**
   * @protected
   * Iterator support for `Option`.
   *
   * _Note: This method will only yeild if the Option is Some._
   */
  async *[Symbol.asyncIterator]<
    Arr = T extends Iterable<infer V> ? Awaited<V> : never,
  >(): AsyncIterator<Arr> {
    if (this.isErr()) {
      throw this.error;
    }
    if (
      this.isOk() &&
      typeof this.value === "object" &&
      this.value !== null &&
      typeof (this.value as any)[Symbol.iterator] === "function"
    ) {
      return (this.value as any)[Symbol.iterator]();
    }
    throw new UndefinedBehaviorError(
      `[Symbol.iterator] can applies only for Some(<Iterable>) value`,
      {
        cause: {
          value: this.value,
          type: typeof this.value,
          status: this.status,
        },
      },
    );
  }
  [customInspectSymbol](depth: number, options: any, inspect: Function) {
    const name = this.isOk() ? "Ok" : "Err";
    const value = this.isOk() ? this.value : this.error;

    if (depth < 0) {
      return options.stylize(name, "special");
    }
    const newOptions = Object.assign({}, options, {
      depth: options.depth === null ? null : options.depth - 1,
    });
    const inner = inspect(value, newOptions).replace(/\n/g, `\n$`);
    return `${options.stylize(name, "special")}(${inner})`;
  }
}

/**
 * Return a non-error value result.
 *
 * @param input a value that does not extend the `Error` type.
 * @returns {Result<T, E>}
 * @example
 * function divide(left: number, right: number): Result<number, string> {
 *   if (right === 0) return Err("Divided by zero");
 *
 *   return Ok(left / right);
 * }
 *
 * @example
 * const foo = Ok("Foo!");
 *
 * if (foo instanceof Ok) {
 *  // Do something
 * }
 */
export function Ok<const T, const E = unknown>(
  value?: T | null,
): Result<T, E, Status.Ok> {
  return Result.Ok(value) as Result<T, E, Status.Ok>;
}

Object.defineProperty(Ok, Symbol.hasInstance, {
  value: <T, E>(instance: Result<T, E>) => {
    if (typeof instance !== "object") return false;
    const instanceOfOption = instance instanceof Result;
    if (instanceOfOption === false) {
      return false;
    }
    return instance.isOk();
  },
});

/**
 * Return a error result.
 *
 * @param input a value that conaints `Error` type.
 * @example
 * function divide(left: number, right: number): Result<number, string> {
 *   if (right === 0) return Err("Divided by zero");
 *
 *   return Ok(left / right);
 * }
 * @example
 * const foo = Err(new Error("Foo!"));
 *
 * if (foo instanceof Err) {
 *  // Do something
 * }
 */
export function Err<const T, const E = unknown>(
  err: E,
): Result<T, E, Status.Err> {
  return Result.Err(err) as Result<T, E, Status.Err>;
}

Object.defineProperty(Err, Symbol.hasInstance, {
  value: <T, E>(instance: Result<T, E>) => {
    if (typeof instance !== "object") return false;
    const instanceOfOption = instance instanceof Result;
    if (instanceOfOption === false) {
      return false;
    }
    return instance.isErr();
  },
});
