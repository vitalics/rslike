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

/* eslint-disable @typescript-eslint/no-unused-vars */

import { Option, Errors } from '@rslike/std';

import { CompareError, OrderingError } from './errors.ts';
import { Ordering } from './cmp.ts';

/**
 * Type for equality comparisons which are equivalence relations.
 * 
 * This means, that in addition to `a == b` and `a != b` being strict inverses, the equality must be (for all a, b and c):
 * 
 * - reflexive: `a === a`;
 * - symmetric: `a == b` implies `b == a`; and
 * - transitive: `a == b` and `b == c` implies `a == c`.
 * This property can understands on runtime only, and therefore `Eq` implies `PartialEq`, and has no extra methods.
 * 
 * # How I can implement `Eq`?
 * specify that your type implements `Eq`.
 * @example
 * enum BookFormat { Paperback, Hardback, Ebook }
 * class Book implements Eq {
 *     public isbn: number;
 *     public format: BookFormat;
 *     equals(other:Book) {
 *       return this.isbn == other.isbn
 *     }
 * }
 */
export type Eq<T = unknown> = PartialEq<T> & {
  /**
   * Type for equality comparisons which are equivalence relations.
   * 
   * **NOTE:** other always will be `unknown`. Generic `T` only helps when use with typescript. Perform checks on your side.
   * ## Best practicies
   * - create more checks especially for incoming argument, it's type and expectations.
   * - throws {@link CompareError} if you cannot compare `self` with `other`.
   * - throws {@link Errors.UndefinedBehaviorError} if your incoming type are not expected.
   * @param other
   * @returns {boolean} true if `this` and `other` are equals, and is used like `===` (without type lossenes), otherwise it returns `false`.
   */
  equals(other: T): boolean;
}

/**
 * Typescript type for types that form a partial order.
 * 
 * The `lt`, `le`, `gt`, and `ge` methods of this type cannot be called using the <, <=, >, and >= operators.
 * 
 * The methods of this trait must be consistent with each other and with those of {@link PartialEq}. The following conditions must hold:
 * 
 * - `a == b` if and only if `partialCompare(a, b) == Some(Equal)`.
 * - `a < b` if and only if `partialCompare(a, b) == Some(Less)`
 * - `a > b` if and only if `partialCompare(a, b) == Some(Greater)`
 * - `a <= b` if and only if `a < b || a == b`
 * - `a >= b` if and only if `a > b || a == b`
 * - `a != b` if and only if `!(a == b)`.
 * 
 * Conditions 2–5 above are ensured by the default implementation. Condition 6 is already ensured by PartialEq.
 * 
 * If {@link Ord} is also implemented for `this` and `T`, it must also be consistent with `partialCompare` (see the documentation of that trait for the exact requirements). It’s easy to accidentally make them disagree by deriving some of the traits and manually implementing others.
 * 
 * The comparison must satisfy, for all a, b and c:
 * 
 * - **transitivity**: `a < b` and` b < c `implies `a < c`. The same must hold for both == and >.
 * - **duality**: `a < b` if and only if `b > a`.
 * 
 * ## Corollaries
 * 
 * The following corollaries follow from the above requirements:
 * 
 * - **irreflexivity** of < and >: `!(a < a)`, `!(a > a)`
 * - **transitivity** of >: if `a > b` and `b > c` then `a > c`
 * - **duality** of `partialCompare`: `partialCompare(a, b) == partialCompare(b, a).map((ord) => ord.reverse())`
 */
export type PartialOrd<T = unknown> = PartialEq<T> & {
  /**
   * Compare 2 items. `this` with `other` and return it's {@link Option}<{@link Ordering}>.
   * 
   * `Ordering` have 3 possible values:
   * - `Less`
   * - `Equal`
   * - `Greater`
   *
   * By convention, `this.partialCompare(other)` returns the ordering matching with type loosenes.
   * 
   * **NOTE:** Since in JavaScript types are removed - check all uncomparing type on your side.
   * 
   * ## Best practice
   * - perform less checks than {@link Ord.compare} does.
   * - throw {@link CompareError} if you cannot compare `this` with `other`.
   * 
   * @param {T} other
   * @return {*}  {Option<Ordering>}
   */
  partialCompare(other: T): Option<Ordering>;

  /**
   * This method tests less than (for `self` and `other`) and is used by the `<` operator.
   * @example
   * 1 < 1 // false
   * @param {T} other
   * @return {*}  {boolean}
   */
  lt(other: T): boolean;
  /**
   * This method tests less than or equal to (for `self` and `other`) and is used by the `<=` operator.
   * @example
   * 1.0 <= 1.0 // true
   * 2.0 <= 1.0 // false
   * @param {T} other
   * @return {*}  {boolean}
   */
  le(other: T): boolean;
  /**
   * This method tests greater than (for `self` and `other`) and is used by the `>` operator.
   * @example
   * 1.0 > 1.0 // false
   * @param {T} other
   * @return {*}  {boolean}
   */
  gt(other: T): boolean;
  /**
   * This method tests greater than or equal to (for `self` and `other`) and is used by the `>=` operator.
   * @example
   * 1.0 >= 1.0 // true
   * @param {T} other
   * @return {*}  {boolean}
   */
  ge(other: T): boolean;
}

/**
 * Typescript type for types that form a total order.
 * 
 * Implementations must be consistent with the @see {@link PartialOrd} implementation, and ensure max, min, and clamp are consistent with compare:
 * 
 * - `partialCompare(a, b) == Some(compare(a, b))`.
 * - `max(a, b) == maxBy(a, b, compare)` (ensured by the default implementation).
 * - `min(a, b) == minBy(a, b, compare)` (ensured by the default implementation).
 * For `a.clamp(min, max)`, see the method docs (ensured by the default implementation).
 * It’s easy to accidentally make `compare` and `partialCompare` disagree by deriving some of the traits and manually implementing others.
 */
export type Ord<T = unknown> = PartialOrd<T> & {
  /**
   * Compare 2 items. `this` with `other` and return it's {@link Ordering}.
   * 
   * `Ordering` have 3 possible values:
   * - `Less`
   * - `Equal`
   * - `Greater`
   *
   * By convention, `this.compare(other)` returns the ordering matching the expression `self <operator> other` if `true`.
   * ## Best practicies
   * - throw {@link Errors.UndefinedBehavior} in case of `other` argument is not that your method expects
   * - throw {@link OrderingError} in case of `other` and `self` are not comparable between each others.
   * @param {T} other
   * @return {*}  {Ordering}
   */
  compare(other: T): Ordering;

  /**
   * Compares and returns the maximum of two values.
   * 
   * Returns the second argument if the comparison determines them to be equal.
   * ## Best practicies
   * - throw {@link Errors.UndefinedBehavior} in case of `other` argument is not that your method expects.
   * @example
   * (1).max(2) === 2 // true
   * (2).max(2) === 2 // true
   *
   * @param {T} other
   * @return {*}  {T}
   */
  max(other: T): T;
  /**
   * Compares and returns the minimum of two values.
   * 
   * Returns the first argument if the comparison determines them to be equal.
   * ## Best practicies
   * - throw {@link Errors.UndefinedBehavior} in case of `other` argument is not that your method expects.
   * @example
   * (1).min(2) === 1 // true
   * (2).min(2) === 2 // true
   * @param {T} other
   * @return {*}  {T}
   */
  min(other: T): T
  /**
   * Restrict a value to a certain interval.
   * 
   * Returns `max` if self is greater than max, and `min` if self is less than min. Otherwise this returns `this`.
   * ## Best practices
   * - throw {@link Errors.UndefinedBehavior} in case of `min` or `max` argument is not that your method expects.
   * - throw {@link RangeError} in case of `min` argument is more than `max` argument
   * @example
   * (-3).clamp(-2, 1) === -2
   * (0).clamp(-2, 1) === 0
   * (2).clamp(-2, 1) === 1
   * @param {T} min
   * @param {T} max
   * @return {*}  {T}
   */
  clamp(min: T, max: T): T;
};

/**
 * Typescript type for equality comparisons.
 * 
 * `x.eq(y)` can also be written `x == y`, and `x.notEquals(y)` can be written `x != y`. We use the easier-to-read infix notation in the remainder of this documentation.
 * 
 * This type allows for partial equality, for types that do not have a full equivalence relation. For example, in floating point numbers `NaN != NaN`, so floating point types implement `PartialEq` but not `Eq`. Formally speaking, when `Rhs == Self`, this type corresponds to a partial equivalence relation.
 * 
 * Implementations must ensure that eq and ne are consistent with each other:
 * 
 * - `a != b` if and only if `!(a == b)`.
 * 
 * The equality relation == must satisfy the following conditions (for all a, b, c of type A, B, C):
 * 
 * - **Symmetric**: if `A: PartialEq<B>` and `B: PartialEq<A>`, then `a == b` implies `b == a`; and
 * 
 * - **Transitive**: if `A: PartialEq<B>` and `B: PartialEq<C>` and `A: PartialEq<C>`, then `a == b` and `b == c` implies `a == c`.
 * 
 * **Note** that the `B: PartialEq<A>` (symmetric) and `A: PartialEq<C>` (transitive) implies are not forced to exist, but these requirements apply whenever they do exist.
 * # How can I implement `PartialEq`?
 * @example
 * class Book implements Eq<Book> {
 *   isbn: number,
 *   partialEquals(other: Book):boolean {
 *     return this.isbn == other.isbn;
 *   }
 *   notEquals(other: Book){
 *     return !this.partialEq(other);
 *   }
 * }
 */
export type PartialEq<T = unknown> = {
  /**
   * This method tests for `this` and `other` values to be equal, and is used by `==` (with type lossenes).
   * 
   * **NOTE:** other always will be `unknown`. Generic `T` only helps when use with typescript. Perform checks on your side.
   *
   * ## Best practice
   * accept `other` as `unknown` type and make less checks than {@link Eq.equals} does.
   * 
   * @param {T} other
   * @return {*}  {boolean}
   */
  partialEquals(other: T): boolean;

  /**
   * This method tests for `!=`(with type loosenes)
   * 
   * ## Best practice
   * use next snippet in most cases, since typescript do not have default interfaces/type implementations
   * @example
   * class MyStructure implements PartialEq<number>{
   *   partialEquals(other){
   *     // some checks
   *     return true
   *   }
   *   notEquals(other){
   *     return !this.partialEq(other);
   *   }
   * }
   * @param {T} other
   * @return {*}  {boolean}
   */
  notEquals(other: T): boolean;
};
