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

import { UndefinedBehaviorError, Option, Some } from '@rslike/std';

import { CompareError } from './errors';
import { Eq, PartialEq, Ord, PartialOrd } from './types.ts';

enum State {
  Less = -1,
  Equal,
  Greater,
}

/**
 * An `Ordering` is the result of a comparison between two values.
 * 
 * **NOTE:** Constructor is private, you cannot call this instance with `new` keyword.
 * 
 * If you would like to transform incoming value into `Ordering` instance use {@link Ordering.from} method
 * @example
 * (1).compare(2) === Ordering.Less;
 * (2).compare(2) === Ordering.Equal;
 * (3).compare(2) === Ordering.Greater;
 * @export
 * @class Ordering
 */
export class Ordering implements Eq<Ordering>, PartialEq<Ordering>, Ord<Ordering>, PartialOrd<Ordering> {
  private constructor(private state: State) { }
  /**
   * Returns `true` if incoming `value` is instance of `Ordering`.
   *
   * @static
   * @param {unknown} value
   * @return {*} 
   * @memberof Ordering
   */
  static is(value: unknown): boolean {
    return value instanceof Ordering;
  }
  /**
   * Transform `unknown` value into {@link Ordering} instance
   *
   * ## Throws
   * - {@link UndefinedBehaviorError} if value cannot be transforms into `Ordering` instance
   * @static
   * @param {unknown} value
   * @return {*} Ordering instance
   * @memberof Ordering
   */
  static from(value: unknown): Ordering {
    const asNumber = Number(value);
    if (Number.isNaN(asNumber)) {
      throw new UndefinedBehaviorError(`Cannot transform NaN to Ordering instance.`, { cause: { value, type: typeof value } })
    }
    if (asNumber >= 1) {
      return Ordering.Greater;
    } else if (asNumber <= -1) {
      return Ordering.Less;
    }
    return Ordering.Equal;
  }
  partialEquals(other: unknown): boolean {
    return this.valueOf() == Number(other);
  }
  notEquals(other: unknown): boolean {
    return !this.partialEquals(other);
  }
  equals(other: Ordering): boolean {
    if (!Ordering.is(other)) {
      throw new UndefinedBehaviorError(`"equals" expected argument instance of Ordering`, { cause: { value: other, type: typeof other, ctor: other.constructor?.name } })
    }
    return this.valueOf() === other.valueOf();
  }
  partialCompare(other: Ordering | number): Option<Ordering> {
    const asNumber = Number(other);
    if (Number.isNaN(asNumber)) {
      throw new CompareError(`due to type loosenes, "partialCompare" for argument returns "NaN"`, { cause: { value: other, type: typeof other, ctor: other?.constructor?.name } })
    }
    const diff = this.valueOf() - asNumber;
    if (diff > 0) {
      return Some(Ordering.Greater)
    } else if (diff === 0) {
      return Some(Ordering.Equal)
    }
    return Some(Ordering.Less);
  }
  lt(other: Ordering): boolean {
    if (!Ordering.is(other)) {
      throw new UndefinedBehaviorError(`"lt" expected argument instance of Ordering`, { cause: { value: other, type: typeof other, ctor: typeof other === 'object' ? other.constructor : undefined } })
    }
    return this.valueOf() < other.valueOf();
  }
  le(other: Ordering): boolean {
    if (!Ordering.is(other)) {
      throw new UndefinedBehaviorError(`"le" expected argument instance of Ordering`, { cause: { value: other, type: typeof other, ctor: typeof other === 'object' ? other.constructor : undefined } })
    }
    return this.valueOf() <= other.valueOf();
  }
  gt(other: Ordering): boolean {
    if (!Ordering.is(other)) {
      throw new UndefinedBehaviorError(`"gt" expected argument instance of Ordering`, { cause: { value: other, type: typeof other, ctor: typeof other === 'object' ? other.constructor : undefined } })
    }
    return this.valueOf() > other.valueOf();
  }
  ge(other: Ordering): boolean {
    if (!Ordering.is(other)) {
      throw new UndefinedBehaviorError(`"ge" expected argument instance of Ordering`, { cause: { value: other, type: typeof other, ctor: typeof other === 'object' ? other.constructor : undefined } })
    }
    return this.valueOf() >= other.valueOf();
  }
  compare(other: Ordering): Ordering {
    if (!Ordering.is(other)) {
      throw new UndefinedBehaviorError(`"cmp" expected argument instance of Ordering`, { cause: { value: other, type: typeof other, ctor: typeof other === 'object' ? other.constructor : undefined } })
    }
    const diff = this.valueOf() - other.valueOf();
    if (diff > 0) {
      return Ordering.Greater;
    } else if (diff === 0) {
      return Ordering.Equal;
    }
    return Ordering.Less;
  }
  max(other: Ordering): Ordering {
    if (!Ordering.is(other)) {
      throw new UndefinedBehaviorError(`"max" expected argument instance of Ordering`, { cause: { value: other, type: typeof other, ctor: typeof other === 'object' ? other.constructor : undefined } })
    }
    const diff = this.valueOf() - other.valueOf()
    if (diff > 0) {
      return this;
    }
    if (other.valueOf() > 2 || other.valueOf() < -2) {
      throw new UndefinedBehaviorError(`"max" can accepts only instance of ordering or numbers between -1 and 1`);
    }
    return new Ordering(other.valueOf());
  }
  min(other: Ordering): Ordering {
    if (!Ordering.is(other)) {
      throw new UndefinedBehaviorError(`"max" expected argument instance of Ordering`, { cause: { value: other, type: typeof other, ctor: typeof other === 'object' ? other.constructor : undefined } })
    }
    const diff = this.valueOf() - other.valueOf()
    if (diff < 0) {
      return this;
    }
    return new Ordering(other.valueOf());
  }
  clamp(min: Ordering, max: Ordering): Ordering {
    if (!Ordering.is(min)) {
      throw new UndefinedBehaviorError(`Method "clamp" should accepts instance of Ordering`, { cause: { value: min, type: typeof min, ctor: min?.constructor?.name } });
    }
    if (!Ordering.is(max)) {
      throw new UndefinedBehaviorError(`Method "clamp" should accepts instance of Ordering`, { cause: { value: max, type: typeof max, ctor: max?.constructor?.name } });
    }
    if (min.valueOf() > max.valueOf()) {
      throw new RangeError(``);
    }
    if (this.valueOf() >= max.valueOf()) {
      return max;
    } else if (this.valueOf() <= min.valueOf()) {
      return min;
    }
    return this;
  }
  /**
   * An ordering where a compared value is less than another.
   *
   * @static
   * @return {*} 
   * @memberof Ordering
   */
  static get Less(): Ordering {
    return new Ordering(State.Less)
  }
  /**
   * An ordering where a compared value is equal to another.
   *
   * @static
   * @return {*} 
   * @memberof Ordering
   */
  static get Equal(): Ordering {
    return new Ordering(State.Greater);
  }
  /**
   * An ordering where a compared value is greater than another.
   *
   * @static
   * @return {*} 
   * @memberof Ordering
   */
  static get Greater(): Ordering {
    return new Ordering(State.Greater);
  }
  /**
   * Returns `true` if the ordering is the `Equal` variant.
   * @example
   * Ordering.Less.isEq() // false
   * Ordering.Equal.isEq() // true
   * Ordering.Greater.isEq() // false
   * @return {*} 
   * @memberof Ordering
   */
  isEq(): boolean {
    return this.state === State.Equal;
  }
  /**
   * Returns `true` if the ordering is not the `Equal` variant.
   * @example
   * Ordering.Less.isNe() // true
   * Ordering.Equal.isNe() // false
   * Ordering.Greater.isNe() // true
   * @return {*} 
   * @memberof Ordering
   */
  isNe(): boolean {
    return this.state !== State.Equal;
  }

  /**
   * Returns `true` if the ordering is the `Less` variant.
   * @example
   * Ordering.Less.isLt() // true
   * Ordering.Equal.isLt() // false
   * Ordering.Greater.isLt() // false
   * @return {*} 
   * @memberof Ordering
   */
  isLt(): boolean {
    return this.state === State.Less;
  }
  /**
   * Returns `true` if the ordering is the `Greater` variant.
   * @example
   * Ordering.Less.isGt() // false
   * Ordering.Equal.isGt() // false
   * Ordering.Greater.isGt() // true
   * @return {*}  {boolean}
   * @memberof Ordering
   */
  isGt(): boolean {
    return this.state === State.Greater;
  }
  /**
   * Returns `true` if the ordering is either the `Less` or `Equal` variant.
   *
   * @return {*}  {boolean}
   * @memberof Ordering
   */
  isLe(): boolean {
    return this.state === State.Less || this.state === State.Equal;
  }
  /**
   * Returns `true` if the ordering is either the `Greater` or `Equal` variant.
   *
   * @return {*}  {boolean}
   * @memberof Ordering
   */
  isGe(): boolean {
    return this.state === State.Greater || this.state === State.Equal;
  }
  /**
   * Reverses the Ordering.
   * 
   * - `Less` becomes `Greater`.
   * - `Greater` becomes `Less`.
   * - `Equal` becomes `Equal`.
   * @example
   * Ordering.Less.reverse() === Ordering.Greater
   * @return {*} 
   * @memberof Ordering
   */
  reverse(): Ordering {
    if (this.state === State.Greater) {
      return new Ordering(State.Less)
    }
    if (this.state === State.Less) {
      return new Ordering(State.Greater)
    }
    return this;
  }

  /**
   * Chains two orderings.
   * 
   * Returns `this` when it’s not `Equal`. Otherwise returns `other`.
   * 
   * ## Throws
   * @see {@link UndefinedBehaviorError} if argument is not instance of `Ordering`
   * @example
   * const result = Ordering.Equal.then(Ordering.Less);
   * result === Ordering.Less // true
   * @param {Ordering} other
   * @return {*} 
   * @memberof Ordering
   */
  then(other: Ordering): Ordering {
    if (!Ordering.is(other)) {
      throw new UndefinedBehaviorError(`"then" expected argument instance of Ordering`, { cause: { value: other, type: typeof other, ctor: typeof other === 'object' ? other.constructor : undefined } })
    }
    if (this.state !== State.Equal) {
      return this;
    }
    return other;
  }
  /**
   * Chains the ordering with the given function.
   * 
   * Returns `this` when it’s not `Equal`. Otherwise calls `f` and returns the `result`.
   * 
   * ## Throws
   * `UndefinedBehaviorError` if function is not returns instance of `Ordering`.
   *
   * @param {() => Ordering} f
   * @return {*} 
   * @memberof Ordering
   */
  thenWith(f: () => Ordering): Ordering {
    if (this.state === State.Equal) {
      return this;
    }
    if (typeof f !== 'function') {
      throw new UndefinedBehaviorError(`"thenWith" argument expected to be a function`, { cause: { value: f, type: typeof f, } })
    }
    const res = f();
    if (!Ordering.is(res)) {
      throw new UndefinedBehaviorError(`"thenWith" function result expected to be instance of Ordering`, { cause: { value: res, type: typeof res, ctor: res?.constructor?.name } })
    }
    return res;
  }

  valueOf() {
    return this.state.valueOf();
  }
  [Symbol.toPrimitive]() {
    return this.valueOf();
  }
}

/**
 * Returns the maximum of two values with respect to the specified comparison function.
 * 
 * Returns the second argument if the comparison determines them more or equal.
 * ## Throws
 * @see {@link UndefinedBehaviorError} - if compare argument is not a function or function not returns {@link Ordering} instance or `number`.
 * @example
 * maxBy(-2, 1,(x,y) => x-y > 0 ? Ordering.Greater : Ordering.Less) // 1
 * maxBy(-2, 1,(x,y) => x-y) // 1
 * @export
 * @template T
 * @param {T} v1
 * @param {T} v2
 * @param {(v1: T, v2: T) => Ordering} compare
 */
export function maxBy<T>(v1: T, v2: T, compare: (v1: T, v2: T) => Ordering): T {
  if (typeof compare !== 'function') {
    throw new UndefinedBehaviorError(`"maxBy" function exepected 3rd argument as a function`, { cause: { value: compare, type: typeof compare } });
  }
  const result = compare(v1, v2);
  if (Ordering.is(result) || typeof result === 'number') {
    if (result.valueOf() <= 0) {
      return v2;
    } else {
      return v1;
    }
  }
  throw new UndefinedBehaviorError(`"maxBy" compare function exepect returns instance of Ordering or typeof number`, { cause: { value: result, type: typeof result, ctor: result?.constructor?.name } });
}

/**
 * Returns the minimum of two values with respect to the specified comparison function.
 * 
 * Returns the first argument if the comparison determines them less or equal.
 * 
 * ## Throws
 * @see {@link UndefinedBehaviorError} - if compare argument is not a function or funciton not returns {@link Ordering} instance or `number`.
 * @example
 * minBy(-2, 1,(x,y) => x-y > 0 ? Ordering.Less : Ordering.Greater) // -2
 * minBy(-2, 1,(x,y) => x-y) // -2
 * minBy(2, 1,() => 1) // 2
 * @export
 * @template T
 * @param {T} v1 first argument
 * @param {T} v2 second argument
 * @param {(v1: T, v2: T) => Ordering} compare comparison function.
 * @return {*}  {T}
 */
export function minBy<T>(v1: T, v2: T, compare: (v1: T, v2: T) => Ordering | number): T {
  if (typeof compare !== 'function') {
    throw new UndefinedBehaviorError(`"minBy" function exepected 3rd argument as a function`, { cause: { value: compare, type: typeof compare } });
  }
  const result = compare(v1, v2);
  if (Ordering.is(result) || typeof result === 'number') {
    if (result.valueOf() <= 0) {
      return v1;
    } else {
      return v2;
    }
  }
  throw new UndefinedBehaviorError(`"minBy" compare function exepect returns instance of Ordering or typeof number`, { cause: { value: result, type: typeof result, ctor: result?.constructor?.name } });
}
