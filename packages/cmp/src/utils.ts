import { UndefinedBehaviorError } from "@rslike/std";

type CompareFn = (a: unknown, b: unknown) => number;

export function compare(
  a: { [Symbol.compare](another: unknown): number },
  b: { [Symbol.compare](another: unknown): number },
): number;
export function compare(
  a: { [Symbol.compare](another: unknown): number },
  b: unknown,
): number;
export function compare(
  a: unknown,
  b: { [Symbol.compare](another: unknown): number },
): number;
export function compare(a: unknown, b: unknown, compareFn: CompareFn): number;
export function compare(a: any, b: any, compareFn?: CompareFn): number {
  if (typeof a[Symbol.compare] === "function") {
    return a[Symbol.compare](b);
  }
  if (typeof b[Symbol.compare] === "function") {
    return b[Symbol.compare](a);
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
  a: { [Symbol.partialEquals](another: unknown): boolean },
  b: { [Symbol.partialEquals](another: unknown): boolean },
): boolean;
export function partialEquals(
  a: { [Symbol.partialEquals](another: unknown): boolean },
  b: unknown,
): boolean;
export function partialEquals(
  a: unknown,
  b: { [Symbol.partialEquals](another: unknown): boolean },
): boolean;
export function partialEquals(
  a: unknown,
  b: unknown,
  equalityFn?: EqualityFn,
): boolean;

/**
 * Partial equals. Same as `==`(type loose comparison)
 *
 * @throws UndefinedBehaviorError for a and b objects without implementation "Symbol.partialEquals" trait or if "Symbol.partialEquals" returns not boolean type.
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
  if (typeof a[Symbol.partialEquals] === "function") {
    const res = Reflect.apply(a[Symbol.partialEquals], a, [b]);
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
  if (typeof b[Symbol.partialEquals] === "function") {
    const res = Reflect.apply(b[Symbol.partialEquals], b, [a]);
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
  a: { [Symbol.equals](another: unknown): boolean },
  b: { [Symbol.equals](another: unknown): boolean },
  equalityFn?: EqualityFn,
): boolean;
export function equals(
  a: { [Symbol.equals](another: unknown): boolean },
  b: unknown,
  equalityFn?: EqualityFn,
): boolean;
export function equals(
  a: unknown,
  b: { [Symbol.equals](another: unknown): boolean },
  equalityFn?: EqualityFn,
): boolean;
export function equals(
  a: unknown,
  b: unknown,
  equalityFn?: EqualityFn,
): boolean;

/**
 * equals. Same as `===`(type looseness comparison)
 *
 * @throws UndefinedBehaviorError for a and b objects without implementation "Symbol.equals" trait or if "Symbol.equals" returns not boolean type.
 * @export
 * @param a
 * @param b
 * @param [equalityFn] function that will be called if neighter of incoming arguments implements `Symbol.equals` trait. By default this function uses type loose comparison (`===`)
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
    Symbol.equals in a &&
    typeof a[Symbol.equals] === "function"
  ) {
    const res = Reflect.apply((a as any)[Symbol.equals], a, [b]);
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
    Symbol.equals in b &&
    typeof b[Symbol.equals] === "function"
  ) {
    const res = Reflect.apply((b as any)[Symbol.equals], b, [a]);
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
