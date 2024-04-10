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

import { UndefinedBehaviorError } from "@rslike/std";

import { kCompare, kEquals, kPartialEquals } from "./symbols";

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
export type Eq = {
  /**
   * Type for equality comparisons which are equivalence relations.
   *
   * **NOTE:** other always will be `unknown`. Generic `T` only helps when use with typescript. Perform checks on your side.
   * ## Best practicies
   * - create more checks especially for incoming argument, it's type and expectations.
   * - throws {@link UndefinedBehaviorError} if your incoming type are not expected.
   * @param other
   * @returns {boolean} true if `this` and `other` are equals, and is used like `===` (without type lossenes), otherwise it returns `false`.
   */
  [kEquals]<const V>(another: V): boolean;
};

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
export type Ord = {
  /**
   * Compare 2 items. `this` with `other` and return numeric value
   *
   * translate numberic result as have 3 possible values:
   * - `Less`
   * - `Equal`
   * - `Greater`
   *
   * ## Best practicies
   * - throw {@link UndefinedBehaviorError} in case of `other` argument is not that your method expects
   * - throws `TypeError` if incoming type is not matched with expected
   * @param another
   * @return {*}  {Ordering}
   */
  [kCompare]<const V>(another: V): number;
};

/**
 * Typescript type for equality comparisons.
 *
 * `x.eq(y)` can also be written `x == y`, and `x.notEquals(y)` can be written `x != y`. We use the easier-to-read infix notation in the remainder of this documentation.
 *
 * This type allows for partial equality, for types that do not have a full equivalence relation. Formally speaking, when `Rhs == Self`, this type corresponds to a partial equivalence relation.
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
export type PartialEq = {
  /**
   * This method tests for `this` and `other` values to be equal, and is used by `==` (with type lossenes).
   *
   * **NOTE:** other always will be `unknown`. Generic `T` only helps when use with typescript. Perform checks on your side.
   *
   * ## Best practice
   * accept `other` as `unknown` type and make less checks than `Eq.equals` does.
   *
   * @param {T} other
   * @return {*}  {boolean}
   */
  [kPartialEquals]<const V>(another: V): boolean;
};
