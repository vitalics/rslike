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

import { UndefinedBehaviorError } from "@rslike/std";
import { kCompare, kEquals, kPartialEquals } from "./symbols";

declare global {
  interface SymbolConstructor {
    /**
     * Type for equality comparisons which are equivalence relations.
     *
     * **NOTE:** other always will be `unknown`. Generic `T` only helps when use with typescript. Perform checks on your side.
     * ## Best practicies
     * - create more checks especially for incoming argument, it's type and expectations.
     * - throws {@link CompareError} if you cannot compare `self` with `other`.
     * - throws {@link UndefinedBehaviorError} if your incoming type are not expected.
     * @param other
     * @returns {boolean} true if `this` and `other` are equals, and is used like `===` (without type lossenes), otherwise it returns `false`.
     */
    readonly equals: typeof kEquals;
    /**
     * This method tests for `this` and `other` values to be equal, and is used by `==` (with type lossenes).
     *
     * **NOTE:** other always will be `unknown`. Generic `T` only helps when use with typescript. Perform checks on your side.
     *
     * ## Best practice
     * accept `other` as `unknown` type and make less checks than `Eq.equals` does.
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
     * ## Best practicies
     * - throw {@link UndefinedBehaviorError} in case of `other` argument is not that your method expects
     */
    readonly compare: typeof kCompare;
  }

  interface Symbol {
    readonly [Symbol.equals]: unique symbol;
    readonly [Symbol.compare]: unique symbol;
    readonly [Symbol.partialEquals]: unique symbol;
  }
  var Symbol: SymbolConstructor;

  interface BooleanConstructor {
    [Symbol.partialEquals](
      another: boolean | { [Symbol.partialEquals](another: unknown): boolean },
    ): boolean;
    [Symbol.equals](
      another: boolean | { [Symbol.equals](another: unknown): boolean },
    ): boolean;
    [Symbol.compare](
      another: boolean | { [Symbol.compare](another: unknown): number },
    ): number;
  }
  interface Boolean {
    [Symbol.partialEquals](
      another: boolean | { [Symbol.partialEquals](another: unknown): boolean },
    ): boolean;
    [Symbol.equals](
      another: boolean | { [Symbol.equals](another: unknown): boolean },
    ): boolean;
    [Symbol.compare](
      another: boolean | { [Symbol.compare](another: unknown): number },
    ): number;
  }

  interface NumberConstructor {
    [Symbol.partialEquals](
      another: number | { [Symbol.partialEquals](another: unknown): boolean },
    ): boolean;

    [Symbol.equals](
      another: number | { [Symbol.equals](another: unknown): boolean },
    ): boolean;

    [Symbol.compare](
      another: number | { [Symbol.compare](another: unknown): number },
    ): number;
  }
  interface Number {
    [Symbol.partialEquals](
      another: number | { [Symbol.partialEquals](another: unknown): boolean },
    ): boolean;

    [Symbol.equals](
      another: number | { [Symbol.equals](another: unknown): boolean },
    ): boolean;

    [Symbol.compare](
      another: number | { [Symbol.compare](another: unknown): number },
    ): number;
  }

  interface StringConstructor {
    [Symbol.partialEquals](
      another: string | { [Symbol.partialEquals](another: unknown): boolean },
    ): boolean;

    [Symbol.equals](
      another: string | { [Symbol.equals](another: unknown): boolean },
    ): boolean;

    [Symbol.compare](
      another: string,
      locales?: string | string[],
      opts?: Intl.CollatorOptions,
    ): number;
    [Symbol.compare](another: {
      [Symbol.compare](another: unknown): number;
    }): number;
  }
  interface String {
    [Symbol.partialEquals](
      another: string | { [Symbol.partialEquals](another: unknown): boolean },
    ): boolean;

    [Symbol.equals](
      another: string | { [Symbol.equals](another: unknown): boolean },
    ): boolean;

    [Symbol.compare](
      another: string,
      locales?: string | string[],
      opts?: Intl.CollatorOptions,
    ): number;
    [Symbol.compare](another: {
      [Symbol.compare](another: unknown): number;
    }): number;
  }

  interface DateConstructor {
    [Symbol.partialEquals](
      another:
        | Date
        | string
        | number
        | { [Symbol.partialEquals](another: unknown): boolean },
    ): boolean;

    [Symbol.equals](
      another:
        | Date
        | string
        | number
        | { [Symbol.equals](another: unknown): boolean },
    ): boolean;

    [Symbol.compare](
      another:
        | Date
        | string
        | number
        | { [Symbol.compare](another: unknown): number },
    ): number;
  }
  interface Date {
    [Symbol.partialEquals](
      another:
        | Date
        | string
        | number
        | { [Symbol.partialEquals](another: unknown): boolean },
    ): boolean;

    [Symbol.equals](
      another:
        | Date
        | string
        | number
        | { [Symbol.equals](another: unknown): boolean },
    ): boolean;

    [Symbol.compare](
      another:
        | Date
        | string
        | number
        | { [Symbol.compare](another: unknown): number },
    ): number;
  }
}

import "./primitives.ts";
import "./collections.ts";
import "./typed.ts";
