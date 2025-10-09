/**
MIT License

Copyright (c) 2023 Vitali Haradkou

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject ot the following conditions:

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

import { Err, Ok, Result } from "./result.ts";
import type {
  ComparatorFn,
  IsNever,
  ToStack,
  TUndefinedBehaviorError,
} from "./types.ts";
import {
  UndefinedBehaviorError,
  assertArgument,
  customInspectSymbol,
} from "./utils.ts";

/** Option possible statuses */
const Status = Object.freeze({
  None: "None",
  Some: "Some",
} as const);

type StatusKey = keyof typeof Status;

type SomeFn<T> = (value?: T | null | undefined) => void;
type NoneFn<E = unknown> = (reason?: E) => void;
type Executor<T, E = unknown, R = T> = (
  some: SomeFn<T>,
  none: NoneFn<E>
) => void | R;

/**
 * Type Option represents an optional value: every `Option` is either `Some` and contains a value, or `None`, and does not. Option types are very common in code, as they have a number of uses:
 * - Initial values
 * - Return values for functions that are not defined over their entire input range (partial functions)
 * - Return value for otherwise reporting simple errors, where `None` is returned on error
 * - Optional fields
 * - Optional function arguments
 * - Nullable values
 * - Swapping things out of difficult situations
 *
 * `Options` are commonly paired with pattern matching to query the presence of a value and take action, always accounting for the `None` case.
 *
 * @see {@link https://github.com/vitalics/rslike/wiki/Option WIKI}
 * @export
 * @class Option
 * @implements {Symbol.iterator}
 * @implements {Symbol.asyncIterator}
 * @implements {OptionLike<T>}
 * @template T
 */
export class Option<
  const T,
  const S extends (typeof Status)[StatusKey] = IsNever<T> extends true
    ? typeof Status.None
    : T extends undefined
    ? typeof Status.None
    : [T] extends [null]
    ? typeof Status.None
    : (typeof Status)[StatusKey]
> {
  private value: T | null | undefined;
  private status: S | undefined;

  constructor(executor: Executor<T>) {
    const some: SomeFn<T> = (value) => {
      if (!this.status) {
        if (value === undefined || value === null) {
          this.value = value as T;
          this.status = Status.None as S;
        } else {
          this.value = value;
          this.status = Status.Some as S;
        }
      }
    };

    const none: NoneFn = (reason: unknown = undefined) => {
      if (!this.status) {
        this.value = reason as T;
        this.status = Status.None as S;
      }
    };

    assertArgument("constructor", executor, "function");
    let executionResult: unknown;
    try {
      const err = new UndefinedBehaviorError(
        `You passed an async function in constructor. Only synchronous functions are allowed. Use "Option.fromPromise" or "Option.fromAsync" instead.`,
      );
      const executionResult = executor(some, none);
      if (
        executionResult &&
        typeof executionResult === "object" &&
        "then" in executionResult &&
        typeof executionResult.then === "function"
      ) {
        throw err;
      } else if (executionResult instanceof Option) {
        // biome-ignore lint/correctness/noConstructorReturn: already option, return it
        return executionResult;
      } else if (executionResult instanceof Result) {
        if (executionResult.isOk()) {
          const unwrapped = executionResult.unwrap();
          if (unwrapped === undefined || unwrapped === null) {
            none(unwrapped);
          } else {
            some(unwrapped);
          }
        } else {
          none(executionResult.valueOf());
        }
      } else if (executionResult !== undefined && executionResult !== null) {
        some(executionResult);
      } else {
        // noop, in case of withResolvers
        /* istanbul ignore if -- @preserve */
      }
    } catch (e) {
      if (e instanceof UndefinedBehaviorError) {
        throw e;
      }
      none(e);
    }
  }

  /**
   * Returns the contained `Some` value, consuming the self value.
   * @example
   * const x = Some("value");
   * x.expect("fruits are healthy") === "value"; // true
   *
   * const y: Option<string> = None();
   * y.expect("fruits are healthy"); // throws with `fruits are healthy`
   * @param {string} reason error message
   * @throws `Error` if value is `null` or `undefined`
   * @return {*}  {Value}
   */
  expect(reason: string): NonNullable<T> {
    assertArgument("expect", reason, "string");
    if (
      this.status === Status.None ||
      this.value === null ||
      this.value === undefined
    ) {
      throw new Error(reason, {
        cause: {
          message: "Option have 'None' status",
          value: this.value,
          type: typeof this.value,
          status: this.status,
        },
      });
    }
    return this.value!;
  }
  /**
   * Returns the contained `Some` value, consuming the self value.
   *
   * Because this function may throws, its use is generally discouraged. Instead, prefer to use pattern matching and handle the None case explicitly, or call `unwrapOr`, `unwrapOrElse`, or `unwrapOrDefault`.
   *
   * @throws `Error` when value is `None`, `null` or `undefined`
   *
   * @example
   * const x = Some("air");
   * x.unwrap() === "air";
   *
   * const x: Option<string> = None();
   * x.unwrap() // fails
   * @return {*}
   */
  unwrap(): S extends typeof Status.None
    ? never
    : T extends void | null | undefined
      ? never
      : NonNullable<T> {
    if (
      this.status === Status.None ||
      this.value === null ||
      this.value === undefined
    ) {
      throw new Error("Unwrap error. Option have 'None' status", {
        cause: { status: this.status, value: this.value },
      });
    }
    return this.value! as never;
  }
  /**
   * Returns the contained `Some` value or a provided default.
   * @example
   * const x = Some("air");
   * x.unwrapOr("another") === "air";
   *
   * const x: Option<string> = None();
   * x.unwrapOr("another") === 'another'
   * @param {T} fallback fallback value
   * @return {*} {Value}
   */
  unwrapOr<const U>(
    fallback: U
  ): S extends typeof Status.Some ? NonNullable<T> : U {
    if (
      this.status === Status.None ||
      this.value === null ||
      this.value === undefined
    ) {
      return fallback as never;
    }
    return this.value as never;
  }

  /**
   * Returns the contained `Some` value or computes it from a closure.
   * @example
   * const k = 10;
   * Some(4).unwrapOrElse(() => 2 * k) === 4
   * None().unwrapOrElse(() => 2 * k) === 20
   * @param predicate function to call when `Option` is `None`
   * @throws `UndefinedBehaviorError` if `predicate` is not a function
   * @return Unwrapped value or prdicate result
   */
  unwrapOrElse<const U>(
    predicate: () => U
  ): S extends typeof Status.Some ? NonNullable<T> : U {
    if (this.status === Status.None) {
      assertArgument("unwrapOrElse", predicate, "function");
      return predicate() as never;
    }
    return this.unwrap() as never;
  }

  /**
   * Maps an `Option<T>` to `Option<U>` by applying a function to a contained value (if `Some`) or returns `None` (if `None`).
   *
   * @example
   * const maybeSomeString = Some("Hello, World!");
   * const maybeSomeLen = maybeSomeString.map(s => s.length);
   * maybeSomeLen === Some(13));
   *
   * const x: Option<string> = None();
   * x.map(s => s.length) === None();
   * @template U
   * @param predicate function to evaluate when `Option` have `Some` value
   * @throws `UndefinedBehaviorError` if `predicate` is not a function
   * @return `Option` instance
   */
  map<const U>(
    predicate: (value: T) => U
  ): S extends typeof Status.Some
    ? U extends null
      ? Option<U, typeof Status.None>
      : U extends undefined
      ? Option<U, typeof Status.None>
      : Option<NonNullable<U>, typeof Status.Some>
    : Option<U, typeof Status.None> {
    if (this.status === Status.Some) {
      assertArgument("map", predicate, "function");
      return Some(predicate(this.value as T)) as never;
    }
    return None() as never;
  }

  /**
   * Returns the provided default result (if none), or applies a function to the contained value (if any).
   *
   * Arguments passed to `mapOr` are eagerly evaluated; if you are passing the result of a function call, it is recommended to use `mapOrElse`, which is lazily evaluated.
   *
   * @example
   * const x = Some("foo");
   * x.mapOr(42, v => v.length) === 3;
   *
   * const x: Option<string> = None();
   * x.mapOr(42, v => v.len() === 42;
   * @param {U} fallback fallback value returns when `Option` have `None` status
   * @param predicate function to evaluate when `Option` have `Some` status
   * @throws `UndefinedBehaviorError` if `predicate` is not a function
   * @return
   */
  mapOr<const U>(
    fallback: U,
    predicate: (value: T) => U
  ): S extends typeof Status.None ? U : T {
    if (this.status === Status.None) {
      return fallback as never;
    }
    assertArgument("mapOr", predicate, "function");
    return predicate(this.value as T) as never;
  }

  /**
   * Computes a default function result (if none), or applies a different function to the contained value (if any).
   *
   * @example
   * const k = 21;
   *
   * const x = Some("foo");
   * x.mapOrElse(() => 2 * k, v => v.length) === 3;
   *
   * const x: Option<string> = None();
   * x.mapOrElse(() => 2 * k, v => v.length) === 42;
   * @template U
   * @throws `UndefinedBehaviorError` if `noneFn` is not a function
   * @throws `UndefinedBehaviorError` if `someFn` is not a function
   * @return {*}  {U}
   */
  mapOrElse<const U>(noneFn: () => U, someFn: (value: T) => U): U {
    assertArgument("mapOrElse", noneFn, "function");
    assertArgument("mapOrElse", someFn, "function");
    if (this.status === Status.None) {
      return noneFn();
    }
    return someFn(this.value as T);
  }
  /**
   * Transforms the `Option<T>` into a `Result<T, E>`, mapping `Some(v)` to `Ok(v)` and None to `Err(err)`.
   *
   * Arguments passed to `okOr` are eagerly evaluated; if you are passing the result of a function call, it is recommended to use `okOrElse`, which is lazily evaluated.
   *
   * @example
   * const x = Some("foo");
   * String(x.okOr(0)) === String(Ok("foo"));
   *
   * const y: Option<string> = None();
   * y.okOr(0) === Err(0);
   */
  okOr<const Err>(err: Err): Result<T, Err> {
    if (this.status === Status.None) {
      return Err(err);
    }
    return Ok(this.value) as never;
  }

  /**
   * Transforms the `Option<T>` into a `Result<T, E>`, mapping `Some(v)` to `Ok(v)` and None to `Err(err())`.
   *
   * @example
   * const x = Some("foo");
   * console.assert(x.okOrElse(() => 0) === Ok("foo"));
   *
   * let y: Option<string> = None();
   * console.assert(y.okOrElse(() => 0) === Err(0));
   * @return {*}  {Value}
   */
  okOrElse<const Err = unknown>(err: () => Err): Result<T, Err> {
    if (this.status === Status.None) {
      assertArgument("okOrElse", err, "function");
      return Err(err()) as Result<T, Err>;
    }
    return Ok(this.value) as Result<T, Err>;
  }

  /**
   * Returns `None` if the option is `None`, otherwise returns `optb`.
   *
   * Arguments passed to and are eagerly evaluated; if you are passing the result of a function call, it is recommended to use `andThen`, which is lazily evaluated.
   * @throws `UndefinedBehaviorError` if `optb` is not an instance of `Option`
   * @example
   * const x = Some(2);
   * const y: Option<string> = None();
   * console.assert(x.and(y) === None());
   * // another example
   * let x: Option<number> = None();
   * let y = Some("foo");
   * console.assert(x.and(y) === None());
   * // another example
   * let x = Some(2);
   * let y = Some("foo");
   * console.assert(x.and(y) === Some("foo"));
   * // another example
   * let x: Option<number> = None();
   * let y: Option<string> = None();
   * console.assert(x.and(y) === None());
   */
  and<const U, const O extends Option<any, any> = Option<U>>(
    optb: O
  ): S extends typeof Status.None ? Option<T, typeof Status.None> : O {
    if (this.status === Status.None) {
      return None() as never;
    }
    if (!(optb instanceof Option)) {
      throw new UndefinedBehaviorError(
        `Method "and" should accepts instance of Option`,
        { cause: { value: optb, type: typeof optb } }
      );
    }
    return optb as never;
  }

  /**
   * Returns `None` if the option is `None`, otherwise calls `f` with the wrapped value and returns the result.
   *
   * Some languages call this operation flatmap.
   *
   * @example
   * function toString(x: number): Option<string> {
   *  return Some(String(x));
   * }
   * console.assert(Some(2).andThen(toString) === Some(2.toString()));
   * console.assert(None().andThen(toString) === None());
   * @template U
   * @throws `UndefinedBehaviorError` if `predicate` is not a function
   * @throws `UndefinedBehaviorError` if return type of `predicate` is not an instance of `Option`
   * @return {*}  {Option<U>}
   */
  andThen<const U, O extends Option<U, (typeof Status)[StatusKey]>>(
    predicate: (value: T) => O
  ): S extends typeof Status.None ? Option<U, typeof Status.None> : O {
    if (this.status === Status.None) {
      return None() as never;
    }
    assertArgument("andThen", predicate, "function");
    const res = predicate(this.value as T);
    if (!(res instanceof Option)) {
      throw new UndefinedBehaviorError(
        'callback for Method "andThen" expects to returns instance of Option. Use "None" or "Some" funtions',
        { cause: { value: res, type: typeof res } }
      );
    }
    return res as never;
  }

  /**
   * Returns `None` if the option is `None`, otherwise calls predicate with the wrapped value and returns:
   *
   * - `Some(t)` if predicate returns `true` (where t is the wrapped value), an
   * - `None` if predicate returns `false`
   *
   * @example
   * function isEven(n: number): boolean {
   *  return n % 2 == 0
   * }
   * console.assert(None().filter(isEven) === None());
   * console.assert(Some(3).filter(isEven) === None());
   * console.assert(Some(4).filter(isEven) === Some(4));
   * @throws `UndefinedBehaviorError` if `predicate` is not a function
   * @throws `UndefinedBehaviorError` if return type of `predicate` function is not a `boolean`
   * @param predicate
   * @return {*}  {Option<Value>}
   */
  filter(
    predicate: (value: T) => boolean
  ): S extends typeof Status.None
    ? Option<T, typeof Status.None>
    : Option<T, StatusKey> {
    if (this.status === Status.None) {
      return None() as never;
    }
    assertArgument("filter", predicate, "function");
    const success = predicate(this.value as T);
    assertArgument("filter", success, "boolean");
    if (success) {
      return Some(this.value) as never;
    }
    return None() as never;
  }

  /**
   * Returns `Some` if exactly one of self, optb is `Some`, otherwise returns `None`.
   * @throws `UndefinedBehaviorError` if `optb` is not an instance of `Option`
   * @param optb
   * @return {*}  {Option<Value>}
   */
  xor<const U, O extends Option<any, any> = Option<U>>(
    optb: O
  ): S extends typeof Status.Some
    ? this
    : O extends Option<any, infer OS extends StatusKey>
    ? OS extends typeof Status.Some
      ? O
      : Option<any, typeof Status.None>
    : Option<any, typeof Status.None> {
    if (this.status === Status.Some) {
      return this as never;
    }
    if (!(optb instanceof Option)) {
      throw new UndefinedBehaviorError(
        `Method "xor" should accepts instance of Option`,
        { cause: { value: optb } }
      );
    }
    return optb as never;
  }

  /**
   * Inserts value into the option, then returns a mutable reference to it.
   *
   * If the option already contains a value, the old value is dropped.
   *
   * See also `getOrInsert`, which doesn’t update the value if the option already contains `Some`.
   * @see {@link Option.getOrInsert}
   * @example
   * const opt = None();
   * const val = opt.insert(1);
   * console.assert(val === 1);
   * console.assert(opt.unwrap() === 1);
   * // another example
   * const val = opt.insert(2);
   * console.assert(val === 2);
   *
   * @param value
   * @return {*}  {Option<Value>}
   */
  insert<const U>(
    value?: U | null
  ): U extends undefined
    ? Option<U, typeof Status.None>
    : U extends null
    ? Option<U, typeof Status.None>
    : Option<NonNullable<U>, typeof Status.Some> {
    if (value === undefined) {
      this.status = Status.None as S;
      this.value = undefined;
    } else if (value === null) {
      this.status = Status.None as S;
      this.value = null;
    } else {
      this.status = Status.Some as S;
      this.value = value as never;
    }
    return this as never;
  }
  /**
   * Replaces the actual value in the option by the value given in parameter, returning the old value if present, leaving a `Some` in its place without deinitializing either one.
   *
   * @example
   * const x = Some(2);
   * const old = x.replace(5);
   * console.assert(x === Some(5));
   * console.assert(old === Some(2));
   * // another example
   * const x = None();
   * const old = x.replace(3);
   * console.assert(x === Some(3));
   * console.assert(old === None());
   * @param {T} value
   * @return {*}  {Option<Value>}
   */
  replace<const U>(value: U): this {
    const oldValue = Some(this.value);
    const newValue = Some(value);
    if (newValue.isSome()) {
      this.value = newValue.unwrap() as never;
      this.status = Status.Some as S;
    } else {
      this.value = newValue.valueOf() as never;
      this.status = Status.None as S;
    }
    return oldValue as never;
  }
  /**
   * Zips self with another Option.
   *
   * If self is `Some(s)` and other is `Some(o)`, this method returns `Some((s, o))`. Otherwise, `None` is returned.
   *
   * @example
   * const x = Some(1);
   * const y = Some("hi");
   * const z = None<number>();
   *
   * x.zip(y) === Some((1, "hi"));
   * x.zip(z) === None();
   * @template U
   * @param {Option<U>} other
   * @throws `UndefinedBehaviorError` if `other` is not an instance of `Option`
   * @return {*} {Option<[Value, U]>}
   */
  zip<const U, O extends Option<any, any> = Option<U>>(
    other: O
  ): O extends Option<infer V, infer OS>
    ? OS extends typeof Status.Some
      ? S extends typeof Status.Some
        ? Option<[T, V], typeof Status.Some>
        : Option<[T, V], typeof Status.None>
      : Option<[T, V], typeof Status.None>
    : Option<[T, never], typeof Status.None> {
    if (!(other instanceof Option)) {
      throw new UndefinedBehaviorError(
        `Method "zip" should accepts instance of Option`,
        { cause: { value: other } }
      );
    }
    if (this.status === Status.Some && other.status === Status.Some) {
      return new Option((some) => some([this.value, other.value])) as never;
    }
    return None() as never;
  }
  /**
   * Zips self and another Option with function `f`.
   *
   * If self is `Some(s)` and other is `Some(o)`, this method returns `Some(f(s, o))`. Otherwise, `None` is returned.
   *
   * @example
   * class Point {
   *   constructor (readonly x: number, readonly y: number){}
   *   static create(x:number, y: number){
   *     return new Point(x,y);
   *   }
   * }
   * const x = Some(17.5);
   * const y = Some(42.7);
   *
   * x.zipWith(y, Point.create) === Some({ x: 17.5, y: 42.7 })
   * @throws `UndefinedBehaviorError` if `other` is not an instance of `Option`
   * @throws `UndefinedBehaviorError` if `predicate` is not a function
   * @template U
   * @template R
   * @param {Option<U>} other
   * @param predicate
   * @return {*} {Option<R>}
   */
  zipWith<const U, const R, O extends Option<any, any> = Option<U>>(
    other: O,
    predicate: (value: T, other: O extends Option<infer V> ? V : U) => R
  ): O extends Option<any, infer OS>
    ? OS extends typeof Status.Some
      ? S extends typeof Status.Some
        ? Option<R, typeof Status.Some>
        : Option<R, typeof Status.None>
      : Option<R, typeof Status.None>
    : Option<R, typeof Status.None> {
    if (!(other instanceof Option)) {
      throw new UndefinedBehaviorError(
        `Method "zipWith" should accepts instance of Option`,
        { cause: { value: other, type: typeof other } }
      );
    }
    assertArgument("zipWith", predicate, "function");
    if (this.status === Status.Some && other.status === Status.Some) {
      return Some(predicate(this.value as T, other.value as never)) as never;
    }
    return None() as never;
  }
  /**
   * Unzips an option containing a tuple of two options.
   *
   * If self is `Some((a, b))` this method returns `(Some(a), Some(b))`. Otherwise, `(None, None)` is returned.
   *
   * @example
   * const x = Some([1, "hi"]);
   * const y = None<[number, number]>();
   * console.assert(x.unzip() === [Some(1), Some("hi")]);
   * console.assert(y.unzip() === [None(), None()]);
   */
  unzip(): T extends readonly [infer A, infer B]
    ? [Option<A, S>, Option<B, S>]
    : [Option<unknown, S>, Option<unknown, S>] {
    if (Array.isArray(this.value) && this.value.length === 2) {
      return [Some(this.value.at(0)), Some(this.value.at(1))] as never;
    }
    return [None(), None()] as never;
  }

  /**
   * Converts from `Option<Option<T>>` to `Option<T>`.
   * @example
   * const x: Option<Option<number>> = Some(Some(6));
   * Some(6) === x.flatten();
   *
   * const x: Option<Option<number>> = Some(None());
   * None() === x.flatten();
   *
   * const x: Option<Option<number>> = None();
   * None() === x.flatten()
   * @return {*}  {Value extends Option<infer Sub> ? Option<Sub> : Option<Value>}
   */
  flatten(): T extends Option<
    infer Sub,
    infer SubStatus extends (typeof Status)[StatusKey]
  >
    ? Option<Sub, SubStatus>
    : Option<T, S> {
    if (this.value instanceof Option) {
      return Some(this.value.value) as never;
    }
    return Some(this.value) as never;
  }

  /**
   * Some value of type `T`.
   */
  static Some<const T = undefined>(
    value: T = undefined as T
  ): T extends undefined | null
    ? Option<T, typeof Status.None>
    : Option<NonNullable<T>, typeof Status.Some> {
    if (value === undefined || value === null) {
      return new Option((_, none) => none(value)) as never;
    }
    return new Option<T, typeof Status.Some>((some) => some(value)) as never;
  }

  /**
   * No value.
   */
  static None<T = undefined>(value: undefined | null = undefined) {
    return new Option<T, typeof Status.None>((_, none) => none(value as never));
  }

  /** represents no value */
  static none = Option.None;

  /** represents some value (non `null` or `undefined`) */
  static some = Option.Some;

  /**
   * Creates an Option instance along with its associated `some` and `none` functions.
   * @returns An object containing the resolve function, reject function, and the Option instance.
   * @example
   * const { resolve, reject, option } = Option.withResolvers<number, string>();
   * resolve(3);
   * option.then(value => console.log(value)); // Outputs: 3
   */
  static withResolvers<T>() {
    let some: SomeFn<T>;
    let none: NoneFn;

    const option = new Option<T>((ok, err) => {
      some = ok;
      none = err;
    });

    return { some: some!, none: none!, option };
  }

  static Status = Status;

  /**
   * Returns `true` if incoming `value` is instance of `Option`.
   *
   * @static
   * @param {unknown} value
   * @return {*}
   * @memberof Ordering
   */
  static is(value: unknown): boolean {
    return value instanceof Option;
  }

  /**
   * Await a promise and return an `Option` instance.
   * @param promiseLike promise to await
   * @returns
   */
  static async fromPromise<const P, const E>(
    promiseLike: P | Promise<P> | PromiseLike<P>
  ): Promise<Option<Awaited<P>>> {
    let option: Option<Awaited<P>>;
    try {
      const v = await promiseLike;
      option = Some(v) as never;
    } catch (error) {
      if (error === undefined || error === null) {
        option = None(error) as never;
      } else {
        option = None() as never;
      }
    }
    return option;
  }

  static fromAsync = this.fromPromise;

  /**
   * Compare Self and another value.
   * You can pass your own function to compare
   * @example
   * const a = Some(2)
   * const b = 2
   * const same = a.equal(b, (result, another) => {
   *   // result = Some(2)
   *   // another = 2
   *   return result.unwrap() === another
   * })
   * console.log(same) // true
   * console.log(a.equal(b)) // false
   * console.log(a.equal(Some(2))) // true
   * @param other another value
   * @param [cmp=Object.is] compare function. Default - `Object.is`
   */
  equal<
    const U = T,
    const Self extends Option<T, S> = this,
    const DefaultComparator extends ComparatorFn<any, any> = ComparatorFn<
      Self,
      U
    >,
    const ResolvedComparatorFn extends ComparatorFn<
      any,
      any
    > = U extends Option<infer UValue, any>
      ? ComparatorFn<T, UValue>
      : DefaultComparator
  >(
    other: U,
    cmp: ResolvedComparatorFn = Object.is as ResolvedComparatorFn
  ): boolean {
    if (other instanceof Option) {
      return cmp(this.value as never, other.value);
    }
    return cmp(this, other);
  }

  /**
   * Returns `true` if the option is a `Some` value.
   *
   * @example
   * const x: Option<number> = Some(2);
   * x.isSome() === true // true
   *
   * const x: Option<number> = None();
   * x.isSome() === false // true
   * @return {*}  {boolean}
   */

  isSome(): S extends typeof Status.None
    ? false
    : S extends typeof Status.Some
    ? true
    : boolean {
    return (this.status === Status.Some) as never;
  }

  /**
   * Returns true if the option is a `None` value.
   *
   * @return {*}  {boolean}
   */
  isNone(): S extends typeof Status.None
    ? true
    : S extends typeof Status.Some
    ? false
    : boolean {
    return (this.status === Status.None) as never;
  }

  /**
   * Returns `true` if the option is a `Some` and the value inside of it matches a predicate.
   * @throws `UndefinedBehaviorError` if predicate is not a function
   * @throws `UndefinedBehaviorError` if predicate return type is not a `boolean`
   * @example
   * const x: Option<number> = Some(2);
   * x.isSomeAnd(x => x > 1) === true // true
   *
   * const x: Option<number> = Some(0);
   * x.isSomeAnd(x => x > 1 ) === false // true
   *
   * const x: Option<number> = None();
   * x.isSomeAnd(x => x > 1 ) === false // true
   * @param predicate
   */
  isSomeAnd(predicate: (value: T) => boolean) {
    assertArgument("isSomeAnd", predicate, "function");
    if (this.status === Status.Some) {
      const res = predicate(this.value as T);
      assertArgument("isSomeAnd", res, "boolean");
      return res;
    }
    return false;
  }

  /**
   * Inserts value into the option if it is `None`, then returns a mutable reference to the contained value.
   *
   * See also `insert`, which updates the value even if the option already contains `Some`.
   * @see {@link Option.insert insert method}
   * @throws `UndefinedBehaviorError` if incoming `value` is `null` or `undefined`
   * @example
   * const x = None<number>();
   * const y = x.getOrInsert(7);
   *
   * y === 7 // true
   * @param {T} value
   * @return {*}  {Value}
   */
  getOrInsert<const U>(
    value: NonNullable<U>
  ): S extends typeof Status.None ? U : T {
    if (this.status === Status.None) {
      if (value === undefined) {
        throw new UndefinedBehaviorError(
          `Method "getOrInsert" should provide non "undefined" value.`
        );
        // biome-ignore lint/style/noUselessElse: <explanation>
      } else if (value === null) {
        throw new UndefinedBehaviorError(
          `Method "getOrInsert" should provide non "null" value.`
        );
      }
      return this.insert(value).unwrap() as never;
    }
    return this.value as never;
  }

  /**
   * Inserts a value computed from `predicate` into the option if it is `None`, then returns the contained value.
   * @throws `UndefinedBehaviorError` if incoming `predicate` type is not a function
   * @throws `UndefinedBehaviorError` if incoming `predicate` returns `null` or `undefined`
   * @example
   * const x = None<number>();
   * const y = x.getOrInsertWith(() => 5);
   *
   * y === 5 // true
   *
   * @param predicate
   * @return {*}  {Value}
   */
  getOrInsertWith<const U>(
    predicate: () => NonNullable<U>
  ): S extends typeof Status.None
    ? U extends undefined
      ? never
      : U extends null
      ? never
      : U
    : T {
    if (this.status === Status.None) {
      assertArgument("getOrInsertWith", predicate, "function");
      const res = predicate();
      if (res === undefined) {
        throw new UndefinedBehaviorError(
          "Callback for method 'getOrInsertWith' should returns non 'undefined' value."
        );
        // biome-ignore lint/style/noUselessElse: <explanation>
      } else if (res === null) {
        throw new UndefinedBehaviorError(
          "Callback for method 'getOrInsertWith' should returns non 'null' value."
        );
      }
      return this.insert(res).unwrap() as never;
    }
    return this.value as never;
  }

  /**
   * Returns the `Option` if it contains a value, otherwise returns `optb`.
   * Arguments passed to or are eagerly evaluated; if you are passing the result of a function call, it is recommended to use `orElse`, which is lazily evaluated.
   *
   * @throws `UndefinedBehaviorError` if incoming `optb` is not an instance of `Option`
   * @example
   * const x = Some(2);
   * const y = None();
   * console.assert(x.or(y) === Some(2));
   * // another example
   * const x = None();
   * const y = Some(100);
   * console.assert(x.or(y) === Some(100));
   * // another example
   * let x = Some(2)
   * let y = Some(100)
   * console.assert(x.or(y) === Some(2));
   * // another example
   * const x: Option<number> = None();
   * const y = None();
   * console.assert(x.or(y) === None());
   *
   * @param {Option<T>} optb
   * @return {*}  {Option<Value>}
   */
  or<const U, const O extends Option<any, any> = Option<U>>(
    optb: O
  ): S extends typeof Status.None ? O : this {
    if (this.status === Status.Some) {
      return this as never;
    }
    if (!(optb instanceof Option)) {
      throw new UndefinedBehaviorError(
        `Method "or" should accepts isntance of "Option"`,
        { cause: { value: optb, type: typeof optb } }
      );
    }
    return optb as never;
  }

  /**
   * Returns the `Option` if it contains a value, otherwise calls `f` and returns the result.
   *
   * @throws `UndefinedBehaviorError` if incoming `predicate` is not a function
   * @throws `UndefinedBehaviorError` if incoming `predicate` returns not an isntance of `Option`
   * @example
   * function nobody(): Option<string> { return None() }
   * function vikings(): Option<string> { return Some("vikings") }
   *
   * Some("barbarians").orElse(vikings) === Some("barbarians"); // true
   * None().orElse(vikings) === Some("vikings"); // true
   * None().orElse(nobody) === None(); // true
   *
   * @param predicate
   * @return {*}  {Option<Value>}
   */
  orElse<const U, const O extends Option<any, any> = Option<U>>(
    predicate: () => O
  ): S extends typeof Status.None ? O : this {
    if (this.status === Status.Some) {
      return this as never;
    }
    assertArgument("orElse", predicate, "function");
    const result = predicate();
    if (!(result instanceof Option)) {
      throw new UndefinedBehaviorError(
        `Callback result for method "orElse" should returns instance of Option. Use "Some" or "None".`,
        { cause: { value: result, type: typeof result } }
      );
    }
    return result as never;
  }

  /**
   * Transposes an `Option` of a `Result` into a Result of an Option.
   *
   * `None` will be mapped to `Ok(None)`.
   * `Some(Ok(_))` and `Some(Err(_))` will be mapped to `Ok(Some(_))` and `Err(_)`.
   * @throws `UndefinedBehaviorError` if unwrapped value is not an instance of `Result`
   */
  transpose(): T extends Result<infer OK, infer ERR>
    ? Result<Option<OK, S>, ERR>
    : S extends typeof Status.None
    ? Result<Option<T, S>, unknown>
    : never {
    if (this.isNone()) {
      return Ok(None()) as never;
    }
    const value = this.unwrap() as unknown as Result<any, any>;
    if (value instanceof Result) {
      if (value.isOk()) {
        return Ok(Some(value.unwrap())) as never;
      }
      return value as never;
    }
    throw new UndefinedBehaviorError(
      `no method named "transpose" found for class "Result<${typeof this
        .value}, _>" in the current scope`
    );
  }

  /**
   * Returns raw value.
   * @note This method is used for internal purposes and should not be used directly.
   */
  valueOf() {
    return this.value;
  }

  toString(): `${S}(${string})` {
    return `${this.status}(${
      this.status === Status.None ? "" : this.value
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
    return "Option";
  }

  /**
   * @protected
   * Iterator support for `Option`.
   *
   * _Note: This method will only yeild if the Option is Some._
   */
  [Symbol.iterator](): S extends typeof Status.None
    ? never
    : T extends Iterable<infer TT>
    ? IteratorObject<TT, BuiltinIteratorReturn>
    : never {
    if (
      this.isSome() &&
      typeof this.value === "object" &&
      this.value !== null &&
      typeof (this.value as any)[Symbol.iterator] === "function"
    ) {
      return (this.value as any)[Symbol.iterator]();
    }
    throw new UndefinedBehaviorError(
      "[Symbol.iterator] can applies only for Some(<Iterable>) value",
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
    const TError = TUndefinedBehaviorError<{
      readonly message: `[Symbol.split] can applies only for Ok(<string>) value`;
      readonly cause: {
        readonly value: T;
        readonly status: S;
        readonly expectedType: string;
      };
      readonly stack: ToStack<
        [
          `Symbol.split`,
          `Status===Some: ${S extends typeof Status.Some ? true : false}`
        ]
      >;
    }>
  >(
    string: string,
    limit?: number
  ): S extends typeof Status.None
    ? TError
    : T extends string
    ? string[]
    : TError {
    if (this.isSome() && typeof this.value === "string") {
      return string.split(this.value as string, limit) as never;
    }
    throw new UndefinedBehaviorError(
      "[Symbol.split] can applies only for Some(<string>) value",
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
      readonly message: "[Symbol.search] can applies only for Some(<string>) value";
      readonly cause: {
        readonly value: T;
        readonly type: string;
        readonly status: S;
      };
    }>
  >(
    string: string
  ): S extends typeof Status.None
    ? TError
    : T extends string
    ? number
    : TError {
    if (this.isSome() && typeof this.value === "string") {
      return string.indexOf(this.value) as never;
    }
    throw new UndefinedBehaviorError(
      "[Symbol.search] can applies only for Some(<string>) value",
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
   * Iterator support for `Option`.
   *
   * _Note: This method will only yeild if the Option is Some._
   */
  [Symbol.asyncIterator](): S extends typeof Status.None
    ? never
    : T extends AsyncIterable<infer TT>
    ? AsyncIteratorObject<TT, BuiltinIteratorReturn>
    : never {
    if (
      this.isSome() &&
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
    const primitive = this[Symbol.toPrimitive]();
    if (depth < 0) {
      return `${options.stylize(name, "special")}(${primitive})`;
    }
    const newOptions = Object.assign({}, options, {
      depth: options.depth === null ? null : options.depth - 1,
    });
    const inner =
      this.value !== undefined
        ? inspect(this.value, newOptions).replace(/\n/g, "\n$")
        : "";
    return `${options.stylize(name, "special")}(${inner})`;
  }
}

/**
 * Construct an `Option` from a value other than `None`.
 * @example
 * ```ts
 * function divide(left: number, right: number): Option<number> {
 *   if (right === 0) return None();
 *
 *   return Some(left / right);
 * }
 *
 * ```
 *
 * @example
 * ```ts
 * const foo = Some("Value");
 *
 * if (foo instanceof Some) {
 *  // Do something
 * }
 * ```
 */
export function Some<const T>(value: T = undefined as T) {
  return Option.Some<T>(value);
}

Object.defineProperty(Some, Symbol.hasInstance, {
  value: <T>(instance: Option<T>) => {
    if (typeof instance !== "object") return false;
    const instanceOfOption = instance instanceof Option;
    if (instanceOfOption === false) {
      return false;
    }
    return instance.isSome();
  },
});

/**
 * Construct the None variant of Option.
 *
 * Can be initialized as `undefined` or `null` for optimization purpuses.
 * @default undefined
 * @example
 * ```ts
 *  function divide(left: number, right: number): Option<number> {
 *   if (right === 0) return None();
 *
 *   return Some(left / right);
 * }
 * ```
 * @example
 * ```ts
 * const foo = None();
 *
 * if (foo instanceof None) {
 *  // Do something
 * }
 * ```
 */
export function None<const T>(value: null | undefined = undefined) {
  return Option.None<T>(value);
}

Object.defineProperty(None, Symbol.hasInstance, {
  value: <T>(instance: Option<T>) => {
    if (typeof instance !== "object") return false;
    const instanceOfOption = instance instanceof Option;
    if (instanceOfOption === false) {
      return false;
    }
    return instance.isNone();
  },
});
