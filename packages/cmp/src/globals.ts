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

import { kCompare, kEquals, kPartialEquals } from "./symbols";

declare global {
  interface SymbolConstructor {
    /**
     * Type for equality comparisons which are equivalence relations.
     *
     * ## Notes
     * - other always will be `unknown`. Generic `T` only helps when use with typescript. Perform checks on your side.
     * - built-in objects will throw {@link UndefinedBehaviorError} error for object with `[Symbol.equals]` trait implementation but returns not a boolean type
     * ## Best practicies
     * - always return "boolean" type without throwing an error
     * @param other
     * @returns {boolean} true if `this` and `other` are equals, and is used like `===` (without type lossenes), otherwise it returns `false`.
     */
    readonly equals: typeof kEquals;
    /**
     * This method tests for `this` and `other` values to be equal, and is used by `==` (with type lossenes).
     *
     * **NOTE:** other always will be `unknown`. Generic `T` only helps when use with typescript. Perform checks on your side.
     *
     * ## Notes
     * - `partialEquals` function uses `this` to binds self result.
     * - built-in objects can throw {@link UndefinedBehaviorError} error for object with `[Symbol.partialEquals]` trait implementation but returns not a boolean type
     * ## Best practice
     * - accept `other` as `unknown` type and make less checks than `Eq.equals` does.
     * - use function declaration for `this` binding if you need to use original object to compare
     */
    readonly partialEquals: typeof kPartialEquals;

    /**
     * Compare 2 items. `this` with `other` and return it's Ordering.
     *
     * `Ordering` have 3 possible values:
     * - `Less` === `-1`
     * - `Equal` === `0`
     * - `Greater` === `1`
     *
     * By convention, `this.compare(other)` returns the ordering matching the expression `self <operator> other` if `true`.
     * ## Notes
     * - built-in objects will throw {@link UndefinedBehaviorError} error for object with `[Symbol.partialEquals]` trait implementation but returns not a boolean type
     * ## Best practicies
     * - throw {@link UndefinedBehaviorError} in case of `other` argument is not that your method expects
     */
    readonly compare: typeof kCompare;
  }

  // biome-ignore lint/suspicious/noShadowRestrictedNames: declare global variable
  var Symbol: SymbolConstructor;
  interface Symbol {
    readonly [Symbol.equals]: unique symbol;
    readonly [Symbol.compare]: unique symbol;
    readonly [Symbol.partialEquals]: unique symbol;
  }
}

(Symbol as any).compare = kCompare;
(Symbol as any).partialEquals = kPartialEquals;
(Symbol as any).equals = kEquals;

// patch primitives
import "./primitives.ts";
