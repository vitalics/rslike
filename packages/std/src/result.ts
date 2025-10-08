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
import type {
  ComparatorFn,
  Fn,
  IsNever,
  IsPromise,
  ToStack,
  TUndefinedBehaviorError,
} from "./types.ts";

/** Result possible status */
const Status = Object.freeze({
  Err: "Err",
  Ok: "Ok",
} as const);

type StatusKey = keyof typeof Status;

type Resolver<T> = (value?: T) => void;
type Rejecter<E> = (reason?: E) => void;
export type Executor<T, E, R = T> = (
  resolve: Resolver<T>,
  reject: Rejecter<E>
) => R | void;

/**
 * `Result<T, E>` is the type used for returning and propagating errors. It is an enum with the variants, `Ok(T)`, representing success and containing a value, and `Err(E)`, representing error and containing an error value.
 *
 * Based on Promise-like API
 * @template TInput success value
 * @template TErr error value
 * @throws `UndefinedBehaviorError` if executor is async function or returns a Promise
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/search implements Symbol.search}
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/split implements Symbol.split}
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/iterator implements Symbol.iterator}
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/asyncIterator implements Symbol.asyncIterator}
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for-await...of for await of} syntax
 * @see {@link https://nodejs.org/api/util.html#utilpromisifycustom Node.js inspection symbol} implementation
 * @example
 * const r1 = new Result(() => {
 *  throw new Error("qwe");
 * })
 * r1.isErr() // true
 *
 * const r2 = new Result(() => {
 *  return "some success";
 * })
 * r2.isOk() // true
 * r2.unwrap() // "some success"
 * // using control flow functions
 * const r3 = new Result((ok, err) => {
 *    // return is not needed
 *    Math.random() > 0.5 ? ok("success") : err("error");
 * })
 * // Note: async functions or Promise return will throw an error
 * new Result(async () => { // throws
 *   await Promise.resolve();
 * });
 * new Result(() => Promise.resolve()); // throws
 * Result.fromPromise(Promise.resolve('okay')); // OK. Result<okay>
 */
export class Result<
  const TInput,
  const TErr = IsNever<TInput> extends true
    ? unknown
    : IsPromise<TInput> extends true
    ? TUndefinedBehaviorError<{
        readonly message: `You passed an async function in constructor or executor returned a promise. Only synchronous functions are allowed. Use "Result.fromPromise" or "Result.fromAsync" instead.`;
        readonly cause: "AsyncFunction";
        readonly stack: ToStack<["at new Result()", "at constructor"]>;
      }>
    : unknown,
  const S extends (typeof Status)[StatusKey] = IsNever<TInput> extends true
    ? typeof Status.Err
    : (typeof Status)[StatusKey]
> {
  private value: TInput | null = null;
  private error: TErr | null | undefined = undefined;
  private status: S | undefined;

  constructor(executor: Executor<TInput, TErr>) {
    const okFn: Resolver<TInput> = (value) => {
      if (!this.status) {
        this.value = value ?? null;
        this.status = Status.Ok as S;
      }
    };

    const errorFn: Rejecter<TErr> = (error) => {
      if (!this.status) {
        this.error = error;
        this.status = Status.Err as S;
      }
    };

    assertArgument("constructor", executor, "function");
    let executionResult: unknown;
    try {
      executionResult = executor(okFn, errorFn);
      if (
        executionResult &&
        typeof executionResult === "object" &&
        "then" in executionResult &&
        typeof executionResult.then === "function"
      ) {
        const err = new UndefinedBehaviorError(
          `You passed an async function in constructor or executor returned a promise. Only synchronous functions are allowed. Use "Result.fromPromise" or "Result.fromAsync" instead.`
        );
        // fail promise anyway with error as declared before
        executionResult.then(() => {
          throw err;
        });
        throw err;
        // biome-ignore lint/style/noUselessElse: <explanation>
      } else if (executionResult instanceof Result) {
        // biome-ignore lint/correctness/noConstructorReturn: this is Result, return result
        return executionResult;
        // biome-ignore lint/style/noUselessElse: <explanation>
      } else if (executionResult instanceof Option) {
        if (executionResult.isSome()) {
          okFn(executionResult.unwrap());
        } else {
          errorFn(executionResult.valueOf());
        }
      } else if (executionResult !== undefined) {
        okFn(executionResult as TInput);
      }
    } catch (err) {
      if (
        err instanceof UndefinedBehaviorError &&
        executionResult &&
        typeof executionResult === "object" &&
        "then" in executionResult &&
        typeof executionResult.then === "function"
      ) {
        throw err;
        // biome-ignore lint/style/noUselessElse: <explanation>
      } else {
        errorFn(err as TErr);
      }
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
  expect(reason: string): S extends typeof Status.Err ? never : TInput {
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
  unwrap(): S extends typeof Status.Err ? never : TInput {
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
   * @param {TInput} fallback
   * @return {*}  {T}
   */
  unwrapOr<const U>(fallback: U): S extends typeof Status.Err ? U : TInput {
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
  isOk(): [TInput] extends [never]
    ? false
    : S extends typeof Status.Ok
    ? true
    : S extends typeof Status.Err
    ? false
    : boolean {
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
    predicate: (value: TInput) => R
  ): S extends typeof Status.Ok ? true : R {
    if (this.status === Status.Err) {
      return false as never;
    }
    assertArgument("isOkAnd", predicate, "function");
    const res = predicate(this.value as TInput);
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
  isErr(): IsNever<TInput> extends true
    ? true
    : S extends typeof Status.Err
    ? true
    : S extends typeof Status.Ok
    ? false
    : boolean {
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
   * @param {(err: TErr) => boolean} predicate
   * @return {*}  {boolean}
   */
  isErrAnd<
    const R extends boolean,
    const PredicateFn extends Fn<R, [err: TErr]> = Fn<R, [err: TErr]>
  >(predicate: PredicateFn): S extends typeof Status.Err ? true : R {
    if (this.status === Status.Ok) {
      return false as never;
    }
    assertArgument("isErrAnd", predicate, "function");
    const res = predicate(this.err as TErr);
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
  ok(): S extends typeof Status.Ok
    ? Option<TInput, typeof Option.Status.Some>
    : Option<TInput, typeof Option.Status.None> {
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
  err(): S extends typeof Status.Err
    ? Option<TErr, typeof Option.Status.Some>
    : Option<TErr, typeof Option.Status.None> {
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
   * @param {(value: TInput) => U} mapFn
   * @return {*} {Result<U, E>}
   */
  map<const U>(
    mapFn: (value: TInput) => U
  ): S extends typeof Status.Err ? this : Result<U, TErr> {
    assertArgument("map", mapFn, "function");
    if (this.status === Status.Ok) {
      return Ok(mapFn(this.value as TInput)) as never;
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
   * @param {(value: TInput) => U} predicate
   * @return {*}  {U}
   */
  mapOr<const U, const FR>(
    another: U,
    predicate: (value: TInput) => FR
  ): S extends typeof Status.Err ? U : FR {
    assertArgument("mapOr", predicate, "function");
    if (this.status === Status.Ok) {
      return predicate(this.value as TInput) as never;
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
    errFn: (err: TErr) => ER,
    okFn: (value: TInput) => RR
  ): S extends typeof Status.Err ? ER : RR {
    assertArgument("mapOrElse", errFn, "function");
    if (this.status === Status.Err) {
      return errFn(this.error as TErr) as never;
    }
    assertArgument("mapOrElse", okFn, "function");
    return okFn(this.value as TInput) as never;
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
   * @param {(err: TErr) => F} errFn
   * @return {*}  {Result<T, F>}
   */
  mapErr<const F>(
    errFn: (err: TErr) => F
  ): S extends typeof Status.Err ? Result<TInput, F> : this {
    assertArgument("mapErr", errFn, "function");
    if (this.status === Status.Err) {
      return Err(errFn(this.error as TErr)) as never;
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
  expectErr(reason: string): S extends typeof Status.Ok ? never : TErr {
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
  unwrapErr(): S extends typeof Status.Err ? TErr : never {
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
  unwrapOrElse<const U>(
    predicate: (err: TErr) => U
  ): S extends typeof Status.Ok ? TInput : U {
    if (this.status === Status.Ok) {
      return this.value as never;
    }
    assertArgument("unwrapOrElse", predicate, "function");
    return predicate(this.error as TErr) as never;
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
  and<const U, const R extends Result<any, any, any>>(
    res: R
  ): S extends typeof Status.Ok
    ? R extends Result<any, infer RE, infer RS>
      ? RS extends typeof Status.Ok
        ? R
        : Result<U, RE, RS>
      : Result<TInput, TErr, S>
    : S extends typeof Status.Err
    ? Result<TInput, TErr, S>
    : R extends Result<any, infer RE, infer RS>
    ? Result<U, RE, RS>
    : Result<TInput, TErr> {
    if (!(res instanceof Result)) {
      throw new UndefinedBehaviorError(
        `Method "and" should accepts instance of Result`,
        { cause: { value: res } }
      );
    }
    if (this.status === Status.Err) {
      return Err(this.error as TErr) as never;
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
   * @param {(value: TInput) => Result<U, TErr>} fn
   * @return {*}  {Result<U, E>}
   */
  andThen<
    const U,
    const R extends Result<any, any, any> = Result<U, TErr, any>
  >(fn: (value: TInput) => R): S extends typeof Status.Err ? this : R {
    assertArgument("andThen", fn, "function");
    if (this.status === Status.Ok) {
      const res = fn(this.value as TInput);
      if (res instanceof Result) {
        return res as never;
      }
      throw new UndefinedBehaviorError(
        "Function result expected to be instance of Result.",
        { cause: res }
      );
    }
    return Err(this.error as TErr) as never;
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
   * @param {Result<TInput, F>} res
   * @return {*}  {Result<T, F>}
   */
  or<const F, const R extends Result<any, any, any> = Result<any, F, any>>(
    res: R
  ): S extends typeof Status.Err ? R : Result<TInput, F, S> {
    if (!(res instanceof Result)) {
      throw new UndefinedBehaviorError(
        `Operator "or" expect to pass instance of Result`,
        { cause: { value: res } }
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
   * @throws `UndefinedBehaviorError` if `fn` result is not an instance of `Result`
   * @param fn
   * @return {*}  {Result<T, F>}
   */
  orElse<const R extends Result<any, any, any> = Result<any, any, any>>(
    fn: (err: TErr) => R
  ): S extends typeof Status.Ok ? this : R {
    if (this.status === Status.Ok) {
      return this as never;
    }
    assertArgument("orElse", fn, "function");
    const res = fn(this.error as TErr);
    if (!(res instanceof Result)) {
      throw new UndefinedBehaviorError(
        'Operator "orElse" expected to return instance of Result. Use "Ok" or "Err" function to define them.',
        { cause: { value: res, type: typeof res } }
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
  flatten(): TInput extends Result<infer Ok, TErr>
    ? Result<Ok, TErr>
    : Result<TInput, TErr> {
    if (this.value instanceof Result) {
      return this.value as never;
    }
    return this as never;
  }

  static Ok<const V, const E>(value: V) {
    return new Result<V, E, typeof Status.Ok>((ok) => ok(value));
  }
  static Err<const V, const ErrorValue>(value: ErrorValue) {
    return new Result<V, ErrorValue, typeof Status.Err>((_, rej) => rej(value));
  }

  static ok = Result.Ok;
  static err = Result.Err;

  /**
   * Similar to `Promise.withResolvers` API.
   * @example
   * const {ok, result} = Result.withResolvers()
   * ok(3)
   * result.unwrap() // 3
   * result.isOk() // true
   *
   */
  static withResolvers<const T, const E>() {
    var ok: Resolver<T>;
    var err: Rejecter<E>;

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

  /**
   * Await a promise and return a Result instance.
   *
   * @static
   * @param promiseLike value that should be resolved
   * @returns
   */
  static async fromPromise<const P, const E>(
    promiseLike: P | Promise<P> | PromiseLike<P>
  ): Promise<Result<Awaited<P>, E>> {
    var result: Result<Awaited<P>, E>;
    try {
      var v = await promiseLike;
      result = Ok(v) as never;
    } catch (e) {
      result = Err(e as E);
    }
    return result;
  }

  static fromAsync = this.fromPromise;

  /**
   * Compare `self` and another value.
   *
   * comparer algorithm (if comparatorFunction does not set):
   * - if self=Ok, other=Ok -> `self.unwrap() === other.unwrap()`
   * - if self=Err, other=Ok -> `false`
   * - if self=Ok, other=Err -> `false`
   * - if self=Err, other=Err -> `self.unwrapErr() === other.unwrapErr()`
   * You can pass your own function to compare
   * @example
   * const a = Ok(2)
   * const b = 2
   * const same = a.equal(b, (self, another) => {
   * // self = Ok(2)
   * // another = 2
   *  return result.unwrap() === another
   * })
   * console.log(same) // true
   * console.log(a.equal(b)) // false
   * console.log(a.equal(Ok(2))) // true
   * @param other another value
   * @param [comparatorFn=Object.is] compare function. Default - `Object.is`
   */
  equal<
    const U = TInput,
    const Self extends Result<TInput, TErr, S> = this,
    const DefaultComparator extends ComparatorFn<any, any> = ComparatorFn<
      Self,
      U
    >,
    const ResolvedComparatorFn extends ComparatorFn<
      any,
      any
    > = U extends Result<infer UValue, infer UErr, infer UStatus>
      ? UStatus extends typeof Status.Ok
        ? S extends typeof Status.Ok
          ? ComparatorFn<TInput, UValue>
          : DefaultComparator
        : UStatus extends typeof Status.Err
        ? S extends typeof Status.Err
          ? ComparatorFn<TErr, UErr>
          : DefaultComparator
        : DefaultComparator
      : DefaultComparator
  >(
    other: U,
    comparatorFn: ResolvedComparatorFn = Object.is as ResolvedComparatorFn
  ): boolean {
    if (other instanceof Result) {
      if (this.status === Status.Ok && other.status === Status.Ok) {
        return comparatorFn(this.value as never, other.value);
      }
      if (this.status === Status.Err && other.status === Status.Err) {
        return comparatorFn(this.error as never, other.error);
      }
      return false;
    }
    return comparatorFn(this, other);
  }

  valueOf() {
    if (this.isOk()) {
      return this.value;
    }
    return undefined;
  }

  toString(): `${S}(${string})` {
    return `${this.status}(${
      this.status === Status.Err ? this.error : this.value
    })` as never;
  }

  /**
   * This internal method using for `JSON.stringify` serialization. Please avoid using this method directly.
   * @internal
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#tojson_behavior MDN. toJSON behavior}
   */
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
   * _Note: This method will only yield if the Result is Ok
   */
  [Symbol.iterator](): IsNever<TInput> extends true
    ? never
    : S extends (typeof Status)["Err"]
    ? never
    : TInput extends Iterable<infer TT>
    ? IteratorObject<TT, BuiltinIteratorReturn>
    : never {
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
      "[Symbol.iterator] can applies only for Ok(<Iterable | Iterator | Generator>) value",
      {
        cause: {
          value: this.value,
          type: typeof this.value,
          status: this.status,
        },
      }
    );
  }

  [Symbol.split]<
    TError = TUndefinedBehaviorError<{
      readonly message: `[Symbol.split] can applies only for Ok(<string>) value`;
      readonly cause: {
        readonly value: TInput;
        readonly error: TErr;
        readonly status: S;
      };
      readonly stack: ToStack<
        ["Symbol.split", `TInput===never: ${IsNever<TInput>}`, `Status: ${S}`]
      >;
    }>
  >(
    string: TInput,
    limit?: number
  ): IsNever<TInput> extends true
    ? TError
    : S extends (typeof Status)["Err"]
    ? TError
    : string[] {
    if (this.isErr()) {
      throw this.error;
    }
    if (this.isOk() && typeof this.value === "string") {
      return (string as string).split(this.value as string, limit) as never;
    }

    throw new UndefinedBehaviorError(
      "[Symbol.split] can applies only for Ok(<string>) value",
      {
        cause: {
          value: this.value,
          type: typeof this.value,
          status: this.status,
        },
      }
    );
  }

  [Symbol.search]<
    const TError = TUndefinedBehaviorError<{
      readonly message: `[Symbol.search] can applies only for Ok(<string>) value`;
      readonly cause: {
        readonly value: TInput;
        readonly error: TErr;
        readonly status: S;
      };
      readonly stack: ToStack<["Symbol.search", `IsNever: ${IsNever<TInput>}`]>;
    }>
  >(
    string: TInput
  ): IsNever<TInput> extends true
    ? TError
    : S extends (typeof Status)["Err"]
    ? TError
    : number {
    if (this.isErr()) {
      throw this.error;
    }
    if (this.isOk() && typeof this.value === "string") {
      return (string as string).search(this.value) as never;
    }
    throw new UndefinedBehaviorError(
      "[Symbol.search] can applies only for Ok(<string>) value",
      {
        cause: {
          value: this.value,
          type: typeof this.value,
          status: this.status,
        },
      }
    );
  }

  /**
   * @protected
   * Iterator support for `Result`.
   *
   * _Note: This method will only yield if the Result is Ok
   */
  [Symbol.asyncIterator](): IsNever<TInput> extends true
    ? never
    : S extends (typeof Status)["Err"]
    ? never
    : TInput extends {
        readonly [Symbol.asyncIterator]: () => infer _ extends
          | AsyncIterator<any>
          | Iterator<any>
          | Generator<any>;
      }
    ? _ extends Generator<infer A>
      ? AsyncIteratorObject<A>
      : _ extends AsyncGenerator<infer A>
      ? AsyncIteratorObject<A>
      : _
    : never {
    if (this.isErr()) {
      throw this.error;
    }
    if (
      this.isOk() &&
      typeof this.value === "object" &&
      this.value !== null &&
      typeof (this.value as any)[Symbol.asyncIterator] === "function"
    ) {
      return (this.value as any)[Symbol.asyncIterator]();
    }
    throw new UndefinedBehaviorError(
      "[Symbol.asyncIterator] can applies only for Some(<AsyncIterable>) value",
      {
        cause: {
          value: this.value,
          type: typeof this.value,
          status: this.status,
        },
      }
    );
  }

  [customInspectSymbol](depth: number, options: any, inspect: Function) {
    const name = this.status!;
    const value = this.isOk() ? this.value : this.error;
    if (depth < 0) {
      return options.stylize(name, "special");
    }
    const newOptions = Object.assign({}, options, {
      depth: options.depth === null ? null : options.depth - 1,
    });
    const inner = inspect(value, newOptions);
    if (name === "Err" && value instanceof Error) {
      const cause = value.cause ? inspect(value.cause, newOptions) : "";
      return `${options.stylize(name, "special")}(${options.stylize(
        value.name,
        "regexp"
      )}: ${value.message})) ${cause}\n${value.stack}`;
    }
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
export function Ok<const T, const E = never>(
  value?: T | null
): Result<T, E, typeof Status.Ok> {
  return Result.Ok(value) as Result<T, E, typeof Status.Ok>;
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
  err: E
): Result<T, E, typeof Status.Err> {
  return Result.Err(err) as Result<T, E, typeof Status.Err>;
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
