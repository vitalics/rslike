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

import { Err, Ok, Result } from './result.ts';
import { UndefinedBehaviorError } from './errors.ts';

enum Status {
  None,
  Some,
}

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
 * @implements {CloneLike<Option<T>>}
 * @implements {EqualLike}
 * @implements {OptionLike<T>}
 * @template T
 */
export class Option<T> {
  private constructor(protected status: Status, protected value?: T) { }

  /**
   * Returns the contained `Some` value, consuming the self value.
   * @example
   * const x = Some("value");
   * x.expect("fruits are healthy") === "value"; // true
   * 
   * const y: Option<string> = None();
   * y.expect("fruits are healthy"); // throws with `fruits are healthy`
   * @param {string} message
   * @return {*}  {Value}
   */
  expect(reason: string): T {
    assertArgument('expect', reason, 'string');
    if (this.status === Status.None) {
      throw new Error(reason, { cause: "Option have 'None' status" })
    }
    return this.value as T;
  }
  /**
   * Returns the contained `Some` value, consuming the self value.
   * 
   * Because this function may throws, its use is generally discouraged. Instead, prefer to use pattern matching and handle the None case explicitly, or call `unwrapOr`, `unwrapOrElse`, or `unwrapOrDefault`.
   *
   * Throws an error when value is `None`
   * 
   * @example
   * const x = Some("air");
   * x.unwrap() === "air";
   * 
   * const x: Option<string> = None();
   * x.unwrap() // fails
   * @return {*}  {Value}
  */
  unwrap(): T {
    if (this.status === Status.None) {
      throw new Error("Unwrap error. Option have 'None' status", { cause: { status: this.status, value: this.value } })
    }
    return this.value as T;
  }
  /**
   * Returns the contained `Some` value or a provided default.
   * @example
   * const x = Some("air");
   * x.unwrapOr("another") === "air";
   * 
   * const x: Option<string> = None();
   * x.unwrapOr("another") === 'another'
   * @param {T} another
   * @return {*}  {Value}
   */
  unwrapOr(fallback: T): T {
    if (this.status === Status.None) {
      return fallback;
    }
    return this.value as T;
  }

  /**
   * Returns the contained `Some` value or computes it from a closure.
   * @example
   * const k = 10;
   * Some(4).unwrapOrElse(() => 2 * k) === 4
   * None().unwrap_or_else(() => 2 * k) === 20
   * @param {() => T} predicate
   * @return {*}  {Value}
   */
  unwrapOrElse(fn: () => T): T {
    if (this.status === Status.None) {
      assertArgument('unwrapOrElse', fn, 'function');
      return fn();
    }
    return this.value as T;
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
   * @param {(value: T) => U} fn
   * @return {*}  {Option<U>}
   */
  map<U>(fn: (value: T) => U): Option<U> {
    if (this.status === Status.Some) {
      assertArgument('map', fn, 'function');
      return Some(fn(this.value as T));
    }
    return None();
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
   * @template U
   * @param {U} value
   * @param {(value: T) => U} predicate
   * @return {*}  {U}
   */
  mapOr<U>(value: U, predicate: (value: T) => U): U {
    if (this.status === Status.None) {
      return value;
    }
    assertArgument('mapOr', predicate, 'function')
    return predicate(this.value as T);
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
   * @return {*}  {U}
   */
  mapOrElse<U>(noneFn: () => U, someFn: (value: T) => U): U {
    assertArgument('mapOrElse', noneFn, 'function');
    assertArgument('mapOrElse', someFn, 'function');
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
  okOr<Err>(err: Err): Result<T, Err> {
    if (this.status === Status.None) {
      return Err(err);
    }
    return Ok(this.value);
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
  okOrElse<Err = unknown>(err: () => Err): Result<T, Err> {
    if (this.status === Status.None) {
      assertArgument('okOrElse', err, 'function')
      return Err(err()) as Result<T, Err>;
    }
    return Ok(this.value) as Result<T, Err>;
  }

  /**
   * Returns `None` if the option is `None`, otherwise returns `optb`.
   * 
   * Arguments passed to and are eagerly evaluated; if you are passing the result of a function call, it is recommended to use `andThen`, which is lazily evaluated.
   *
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
  and<U>(optb: Option<U>): Option<U> {
    if (this.status === Status.None) {
      return None();
    }
    if (!(optb instanceof Option)) {
      throw new UndefinedBehaviorError(`Method "and" should accepts instance of Option`, { cause: { value: optb, } });
    }
    return optb;
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
   * @return {*}  {Option<U>}
   */
  andThen<U>(f: (value: T) => Option<U>): Option<U> {
    if (this.status === Status.None) {
      return None();
    }
    assertArgument('andThen', f, 'function')
    const res = f(this.value as T);
    if (!(res instanceof Option)) {
      throw new UndefinedBehaviorError('callback for Method "andThen" expects to returns instance of Option. Use "None" or "Some" funtions', { cause: { value: res } })
    }
    return res;
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
   * 
   * @param {(value: T) => boolean} predicate
   * @return {*}  {Option<Value>}
   */
  filter(predicate: (value: T) => boolean): Option<T> {
    if (this.status === Status.None) {
      return None();
    }
    assertArgument('filter', predicate, 'function');
    const success = predicate(this.value as T);
    assertArgument('filter', success, 'boolean');
    if (success) {
      return Some(this.value);
    }
    return None();
  }

  /**
   * Returns `Some` if exactly one of self, optb is `Some`, otherwise returns `None`.
   *
   * @param {Option<T>} optb
   * @return {*}  {Option<Value>}
   */
  xor(optb: Option<T>): Option<T> {
    if (this.status === Status.Some) {
      return this;
    }
    if (!(optb instanceof Option)) {
      throw new UndefinedBehaviorError(`Method "xor" should accepts instance of Option`, { cause: { value: optb } });
    }
    return optb;
  }

  /**
   * Inserts value into the option, then returns a mutable reference to it.
   * 
   * If the option already contains a value, the old value is dropped.
   * 
   * See also `getOrInsert`, which doesn’t update the value if the option already contains `Some`.
   *
   * @example
   * const opt = None();
   * const val = opt.insert(1);
   * console.assert(val === 1);
   * console.assert(opt.unwrap() === 1);
   * // another example
   * const val = opt.insert(2);
   * console.assert(val === 2);
   * 
   * @param {T} value
   * @return {*}  {Option<Value>}
   */
  insert(value: T): Option<T> {
    if (value === undefined) {
      this.status = Status.None;
      this.value = undefined;
    } else {
      this.status = Status.Some;
      this.value = value;
    }
    return this;
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
  replace(value: T): Option<T> {
    const newValue = Some(value);
    const oldValue = Some(this.value);
    this.value = newValue.value;
    this.status = newValue.status;
    return oldValue;
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
   * @return {*}  {Option<[Value, U]>}
   */
  zip<U>(other: Option<U>): Option<[T, U]> {
    if (!(other instanceof Option)) {
      throw new UndefinedBehaviorError(`Method "zip" should accepts instance of Option`, { cause: { value: other } });
    }
    if (this.status === Status.Some && other.status === Status.Some) {
      return new Option(Status.Some, [this.value, other.value]) as Option<[T, U]>;
    }
    return None();
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
   * 
   * @template U
   * @template R
   * @param {Option<U>} other
   * @param {(value: T, other: U) => R} fn
   * @return {*}  {Option<R>}
   */
  zipWith<U, R>(other: Option<U>, fn: (value: T, other: U) => R): Option<R> {
    if (!(other instanceof Option)) {
      throw new UndefinedBehaviorError(`Method "zipWith" should accepts instance of Option`, { cause: { value: other } });
    }
    assertArgument("zipWith", fn, 'function');
    if (this.status === Status.Some && other.status === Status.Some) {
      return Some(fn(this.value as T, other.value as U));
    }
    return None();
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
  unzip(): T extends readonly [infer A, infer B] ? [Option<A>, Option<B>] : [Option<unknown>, Option<unknown>] {
    if (Array.isArray(this.value) && this.value.length === 2) {
      return [Some(this.value.at(0)), Some(this.value.at(1))] as T extends readonly [infer A, infer B] ? [Option<A>, Option<B>] : [Option<unknown>, Option<unknown>]
    }
    return [None(), None()] as T extends readonly [infer A, infer B] ? [Option<A>, Option<B>] : [Option<unknown>, Option<unknown>];
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
  flatten(): T extends Option<infer T> ? Option<T> : Option<T> {
    if (this.value instanceof Option) {
      return Some(this.value.value) as T extends Option<infer T> ? Option<T> : Option<never>;
    }
    return Some(this.value) as T extends Option<infer T> ? Option<T> : Option<T>;
  }

  /**
   * Some value of type `T`.
   */
  static Some<T>(value?: T | null | undefined) {
    if (value === undefined) {
      return new Option(Status.None, undefined);
    }
    return new Option(Status.Some, value);
  }
  /**
   * No value.
   *
   * @static
   * @template T
   * @return {*}  {Option<Value>}
   * @memberof Option
   */
  static None<T = undefined>(): Option<T> {
    return new Option<T>(Status.None, undefined);
  }
  equal(other: unknown): boolean {
    if (other instanceof Option) {
      return Object.is(other.value, this.value);
    }
    return false;
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

  isSome(): boolean {
    return this.status === Status.Some;
  }

  /**
   * Returns true if the option is a `None` value.
   *
   * @return {*}  {boolean}
  */
  isNone(): boolean {
    return this.status === Status.None;
  }

  /**
   * Returns `true` if the option is a `Some` and the value inside of it matches a predicate.
   * @example
   * const x: Option<number> = Some(2);
   * x.isSomeAnd(x => x > 1) === true // true
   * 
   * const x: Option<number> = Some(0);
   * x.isSomeAnd(x => x > 1 ) === false // true
   * 
   * const x: Option<number> = None();
   * x.isSomeAnd(x => x > 1 ) === false // true
  */
  isSomeAnd(predicate: (value: T) => boolean) {
    assertArgument('isSomeAnd', predicate, 'function');
    if (this.status === Status.Some) {
      const res = predicate(this.value as T);
      assertArgument('isSomeAnd', res, 'boolean');
      return res;
    }
    return false;
  }

  /**
   * Inserts value into the option if it is `None`, then returns a mutable reference to the contained value. 
   * 
   * See also `insert`, which updates the value even if the option already contains `Some`.
   * @example
   * const x = None<number>();
   * const y = x.getOrInsert(7);
   * 
   * y === 7 // true
   * @param {T} value
   * @return {*}  {Value}
   */
  getOrInsert(value: T): T {
    if (this.status === Status.None) {
      if (value === undefined) {
        throw new UndefinedBehaviorError(`Method "getOrInsert" should provide non "undefined" value.`);
      }
      return this.insert(value).unwrap();
    }
    return this.value as T;
  }

  /**
   * Inserts a value computed from f into the option if it is `None`, then returns the contained value.
   * @example
   * const x = None<number>();
   * const y = x.getOrInsertWith(() => 5);
   * 
   * y === 5 // true
   * 
   * @param {() => T} predicate
   * @return {*}  {Value}
   */
  getOrInsertWith(callback: () => T): T {
    if (this.status === Status.None) {
      assertArgument('getOrInsertWith', callback, 'function');
      const res = callback();
      if (res === undefined) {
        throw new UndefinedBehaviorError("Callback for method 'getOrInsertWith' should returns non 'undefined' value.")
      }
      return this.insert(res).unwrap();
    }
    return this.value as T;
  }

  /**
   * Returns the `Option` if it contains a value, otherwise returns `optb`.
   * Arguments passed to or are eagerly evaluated; if you are passing the result of a function call, it is recommended to use `orElse`, which is lazily evaluated.
   *
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
  or(optb: Option<T>): Option<T> {
    if (this.status === Status.Some) {
      return this;
    }
    if (!(optb instanceof Option)) {
      throw new UndefinedBehaviorError(`Method "or" should accepts isntance of Option`, { cause: { value: optb } });
    }
    return optb;
  }

  /**
   * Returns the `Option` if it contains a value, otherwise calls `f` and returns the result.
   *
   * @example
   * function nobody(): Option<string> { return None() }
   * function vikings(): Option<string> { return Some("vikings") }
   * 
   * Some("barbarians").orElse(vikings) === Some("barbarians"); // true
   * None().orElse(vikings) === Some("vikings"); // true
   * None().orElse(nobody) === None(); // true
   * 
   * @param {() => Option<T>} predicate
   * @return {*}  {Option<Value>}
   */
  orElse(callback: () => Option<T>): Option<T> {
    if (this.status === Status.Some) {
      return this;
    }
    assertArgument('orElse', callback, 'function');
    const result = callback();
    if (!(result instanceof Option)) {
      throw new UndefinedBehaviorError(`Callback result for method "orElse" should returns instance of Option. Use Some or None.`, { cause: { value: result } })
    }
    return result;
  }

  toJSON() {
    return {
      status: this.status,
      value: this.value,
    }
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
    return 'Option';
  }
}

/**
 * Some value of type `T`.
 */
export function Some<T>(value?: T | null): Option<T> {
  return Option.Some(value) as Option<T>;
}

/**
 * No value.
 */
export function None<T = undefined>() {
  return Option.None<T>();
}

type Methods = keyof Option<undefined>;
type TypeofResult = "string" | "number" | "bigint" | "boolean" | "symbol" | "undefined" | "object" | "function";

const assertArgument = (method: Methods, value: unknown, expectedType: TypeofResult) => {
  if (typeof value !== expectedType) {
    throw new UndefinedBehaviorError(`Method "${String(method)}" should accepts ${expectedType}`, { cause: { value: value, type: typeof value, } });
  }
}
