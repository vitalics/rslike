import { UndefinedBehaviorError } from "@rslike/std";

import { kCompare, kEquals, kPartialEquals } from "./symbols.ts";

type CompareFn = (a: unknown, b: unknown) => number;

export function compare(
  a: { [kCompare](another: unknown): number },
  b: { [kCompare](another: unknown): number },
): number;
export function compare(
  a: { [kCompare](another: unknown): number },
  b: unknown,
): number;
export function compare(
  a: unknown,
  b: { [kCompare](another: unknown): number },
): number;
export function compare(a: unknown, b: unknown, compareFn: CompareFn): number;
/**
 * Called `Symbol.compare` to compare 2 arguments between each others and returns number.
 *
 * In Most cases it returns 4 possible numeric values and can be interpretate:
 * - result is `>=1` - first argument is more than incoming
 * - result is `0` - arguments are the same
 * - result is `<=-1` - second argument is more than incoming
 * - result is `NaN` - argument have same types but uncomparable between each other (e.g. comparing `NaN` with `NaN` gives `NaN`, since we cannot compare 2 `NaN`s)
 *
 * If neigther of arguments not implemnting `Symbol.compare` trait - `compareFn`(3rd argument) will be called.
 *
 * @throws UndefinedBehaviorError if `compareFn` is not defined and neigther of arguments implements `Symbol.compare` trait
 * @throws UndefinedBehaviorError if `compareFn` is not a function
 * @throws UndefinedBehaviorError if `compareFn` returns not a number type
 *
 * @export
 * @param {unknown} a
 * @param {unknown} b
 * @param compareFn function that will be called if neighter of incoming arguments implements `Symbol.compare` trait.
 * @return {*}  {number}
 */
export function compare(a: any, b: any, compareFn?: CompareFn): number {
  if (typeof a[kCompare] === "function") {
    return a[kCompare](b);
  }
  if (typeof b[kCompare] === "function") {
    return b[kCompare](a);
  }
  if (compareFn) {
    if (typeof compareFn !== "function") {
      throw new UndefinedBehaviorError(
        `compareFn argument should be a function. Got "${typeof compareFn}"`,
        {
          cause: {
            value: compareFn,
            type: typeof compareFn,
          },
        },
      );
    }
    const res = compareFn(a, b);
    if (typeof res !== "number") {
      throw new UndefinedBehaviorError(
        `"compareFn" function should return number. Got "${typeof res}"`,
        { cause: { value: res, type: typeof res } },
      );
    }
  }
  throw new UndefinedBehaviorError(
    'At least 1 argument should implement "Symbol.compare" trait',
  );
}

type EqualityFn = (a: unknown, b: unknown) => boolean;

export function partialEquals(
  a: { [kPartialEquals](another: unknown): boolean },
  b: { [kPartialEquals](another: unknown): boolean },
): boolean;
export function partialEquals(
  a: { [kPartialEquals](another: unknown): boolean },
  b: unknown,
): boolean;
export function partialEquals(
  a: unknown,
  b: { [kPartialEquals](another: unknown): boolean },
): boolean;
export function partialEquals(
  a: unknown,
  b: unknown,
  equalityFn?: EqualityFn,
): boolean;

/**
 * Partial equals. Same as `==`(type loose comparison)
 *
 * @throws UndefinedBehaviorError for a and b objects without implementation `Symbol.partialEquals` trait or if `Symbol.partialEquals` trait returns not boolean type.
 * @export
 * @param a
 * @param b
 * @param [equalityFn] function that will be called if neighter of incoming arguments implements `Symbol.partialEquals` trait. By default this function uses type loose comparison (`==`)
 * @return {*}  {boolean}
 */
export function partialEquals(
  a: any,
  b: any,
  equalityFn?: EqualityFn,
): boolean {
  if (typeof a[kPartialEquals] === "function") {
    const res = Reflect.apply(a[kPartialEquals], a, [b]);
    if (typeof res === "boolean") {
      return res;
    }
    throw new UndefinedBehaviorError(
      `Cannot call partialCompare for imcoming first argument. "Symbol.partialEquals" trait should returns boolean result. Got "${typeof res}"`,
      {
        cause: {
          first: a,
          typeFirst: typeof a,
          ctorFirst: a?.constructor,
          result: res,
          typeResult: typeof res,
          second: b,
          typeSecond: typeof b,
          ctorSecond: b?.constructor,
        },
      },
    );
  }
  if (typeof b[kPartialEquals] === "function") {
    const res = Reflect.apply(b[kPartialEquals], b, [a]);
    if (typeof res === "boolean") {
      return res;
    }
    throw new UndefinedBehaviorError(
      `Cannot call partialCompare for imcoming second argument. "Symbol.partialEquals" trait should returns boolean result. Got "${typeof res}"`,
      {
        cause: {
          first: a,
          typeFirst: typeof a,
          ctorFirst: a?.constructor,
          result: res,
          typeResult: typeof res,
          second: b,
          typeSecond: typeof b,
          ctorSecond: b?.constructor,
        },
      },
    );
  }
  if (equalityFn) {
    if (typeof equalityFn === "function") {
      const res = equalityFn(a, b);
      if (typeof res === "boolean") {
        return res;
      }
      throw new UndefinedBehaviorError(
        `equalityFn should returns boolean. Got "${typeof res}"`,
        {
          cause: { value: res, type: typeof res },
        },
      );
    }
    throw new UndefinedBehaviorError(
      `equalityFn argument should be a function. Got "${typeof equalityFn}"`,
      {
        cause: { value: equalityFn, type: typeof equalityFn },
      },
    );
  }
  return a == b;
}

export function equals(
  a: { [kEquals](another: unknown): boolean },
  b: { [kEquals](another: unknown): boolean },
  equalityFn?: EqualityFn,
): boolean;
export function equals(
  a: { [kEquals](another: unknown): boolean },
  b: unknown,
  equalityFn?: EqualityFn,
): boolean;
export function equals(
  a: unknown,
  b: { [kEquals](another: unknown): boolean },
  equalityFn?: EqualityFn,
): boolean;
export function equals(
  a: unknown,
  b: unknown,
  equalityFn?: EqualityFn,
): boolean;

/**
 * Equals. Same as `===`(type looseness comparison).
 *
 * Called [Symbol.equals] implementation for first or another argument.
 * If neither of the arguments implements `[Symbol.equals]` trait
 * then `equalityFn` argument will be called. Else - {@link UndefinedBehaviorError} will be throws
 *
 * @throws `UndefinedBehaviorError` for a and b objects without implementation "Symbol.equals" trait
 * @throws `UndefinedBehaviorError` if `[Symbol.equals]` trait returns not boolean type.
 * @param a first argument to compare
 * @param b second argument to compare
 * @param [equalityFn] function that will be called if neighter of incoming arguments implements `Symbol.equals` trait. By default this function uses type looseness comparison (`===`)
 * @return {*}  {boolean}
 */
export function equals(
  a: unknown,
  b: unknown,
  equalityFn?: EqualityFn,
): boolean {
  if (
    typeof a == "object" &&
    a !== null &&
    kEquals in a &&
    typeof a[kEquals] === "function"
  ) {
    const res = Reflect.apply((a as any)[kEquals], a, [b]);
    if (typeof res === "boolean") {
      return res;
    }
    throw new UndefinedBehaviorError(
      `Cannot call equals for imcoming first argument. "Symbol.equals" trait should returns boolean result. Got "${typeof res}"`,
      {
        cause: {
          first: a,
          typeFirst: typeof a,
          ctorFirst: a?.constructor,
          result: res,
          typeResult: typeof res,
          second: b,
          typeSecond: typeof b,
          ctorSecond: b?.constructor,
        },
      },
    );
  }
  if (
    typeof b == "object" &&
    b !== null &&
    kEquals in b &&
    typeof b[kEquals] === "function"
  ) {
    const res = Reflect.apply((b as any)[kEquals], b, [a]);
    if (typeof res === "boolean") {
      return res;
    }
    throw new UndefinedBehaviorError(
      `Cannot call equals for imcoming second argument. "Symbol.equals" trait should returns boolean result. Got "${typeof res}"`,
      {
        cause: {
          first: a,
          typeFirst: typeof a,
          ctorFirst: a?.constructor,
          result: res,
          typeResult: typeof res,
          second: b,
          typeSecond: typeof b,
          ctorSecond: b?.constructor,
        },
      },
    );
  }
  if (equalityFn) {
    if (typeof equalityFn === "function") {
      const res = equalityFn(a, b);
      if (typeof res === "boolean") {
        return res;
      }
      throw new UndefinedBehaviorError(
        `equalityFn should returns boolean. Got "${typeof res}"`,
        {
          cause: { value: res, type: typeof res },
        },
      );
    }
    throw new UndefinedBehaviorError(
      `equalityFn argument should be a function. Got "${typeof equalityFn}"`,
      {
        cause: { value: equalityFn, type: typeof equalityFn },
      },
    );
  }
  return a === b;
}
