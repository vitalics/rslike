import { test, expect } from "vitest";

import { UndefinedBehaviorError } from "@rslike/std";
import "../src/globals";
import { compare, partialEquals, equals } from "../src/utils";

const compareCases = [
  [1, 5, 2],
  [-1, 2, 5],
  [0, 1, 1],
] as const;

test.each(compareCases)(
  "compare should returns %s for (%s, %s) pair",
  (expected, v1, v2) => {
    const actual = compare(v1, v2);
    expect(actual).toBe(expected);
  }
);

test("compare should return 1 for defined object", () => {
  const res = compare(
    { value: 5 },
    {
      [Symbol.compare](another) {
        expect(another).toStrictEqual({ value: 5 });
        return 1;
      },
    }
  );
  expect(res).toBe(1);
});

test("compare should throw error for not defined object with Symbol.compare", () => {
  // @ts-expect-error
  expect(() => compare({}, {})).toThrow(UndefinedBehaviorError);
});

test("compare should throw error for compareFn is not a function", () => {
  // @ts-expect-error
  expect(() => compare({}, {}, {})).toThrow(UndefinedBehaviorError);
});

test("compare should throw error for compareFn returns not a number", () => {
  // @ts-expect-error
  expect(() => compare({}, {}, () => "qwe")).toThrow(UndefinedBehaviorError);
});

const partialEqualsCases = [
  [true, 5, "5"],
  [false, 5, "6"],
] as const;

test.each(partialEqualsCases)(
  "partialEquals should returns %s for (%s, %s) pair",
  (expected, v1, v2) => {
    const actual = partialEquals(v1, v2);
    expect(actual).toBe(expected);
  }
);

test("partialEquals should return true for object with Symbol.partialCompare implementation", () => {
  const res = partialEquals(
    { value: 5 },
    {
      value: "5",
      [Symbol.partialEquals](this: any, another: any) {
        return this.value == another.value;
      },
    }
  );
  expect(res).toBe(true);
});

test("partialEquals should throw for Symbol.partialCompare returns not boolean value", () => {
  expect(() =>
    partialEquals(
      {
        value: "5",
        [Symbol.partialEquals](this: any, another: any) {
          return 4;
        },
      },
      { value: 5 }
    )
  ).toThrow(UndefinedBehaviorError);
});
test("partialEquals should throw for Symbol.partialCompare returns not boolean value", () => {
  expect(() =>
    partialEquals(
      { value: 5 },
      {
        value: "5",
        [Symbol.partialEquals](this: any, another: any) {
          return 4;
        },
      }
    )
  ).toThrow(UndefinedBehaviorError);
});

test("partialEquals should throw error for compareFn returns not a boolean", () => {
  // @ts-expect-error
  expect(() => partialEquals({}, {}, () => "qwe")).toThrow(
    UndefinedBehaviorError
  );
});

test("partialEquals should throw error for compareFn is not a fuction", () => {
  // @ts-expect-error
  expect(() => partialEquals({}, {}, 5)).toThrow(UndefinedBehaviorError);
});

test("partialEquals should pass for 2 objects without Symbol.partialEquals", () => {
  const res = partialEquals({}, {});
  expect(res).toBe(false);
});

test("partialEquals should pass when compare 2 object and equalsFn returns a boolean", () => {
  const res = partialEquals({}, {}, () => true);
  expect(res).toBe(true);
});

const equalsCases = [
  [true, 5, 5],
  [false, 5, "6"],
  [false, 5, 6],
  [false, Number.NaN, Number.NaN],
  [false, {}, {}],
] as const;

test.each(equalsCases)(
  "equals should returns %s for (%s, %s) pair",
  (expected, v1, v2) => {
    const actual = equals(v1, v2);
    expect(actual).toBe(expected);
  }
);

test("equals should return true for object with Symbol.equals implementation", () => {
  const res = equals(
    { value: 5 },
    {
      value: "5",
      [Symbol.equals](this: any, another: any) {
        return this.value == another.value;
      },
    }
  );
  expect(res).toBe(true);
});

test("equals should throw for Symbol.equals returns not boolean value", () => {
  expect(() =>
    equals(
      {
        value: "5",
        [Symbol.equals](this: any, another: any) {
          return 4;
        },
      },
      { value: 5 }
    )
  ).toThrow(UndefinedBehaviorError);
});
test("equals should throw for Symbol.equals returns not boolean value", () => {
  expect(() =>
    equals(
      { value: 5 },
      {
        value: "5",
        [Symbol.equals](this: any, another: any) {
          return 4;
        },
      }
    )
  ).toThrow(UndefinedBehaviorError);
});

test("equals should throw error for equalityFn returns not a boolean", () => {
  // @ts-expect-error
  expect(() => equals({}, {}, () => "qwe")).toThrow(UndefinedBehaviorError);
});

test("equals should throw for object which is implemnets Symbol.equals but return not a boolean type", () => {
  expect(
    equals(
      {
        [Symbol.equals]() {
          return true;
        },
      },
      {}
    )
  ).toBe(true);
});

test("equals should throw error for compareFn is not a fuction", () => {
  // @ts-expect-error
  expect(() => equals({}, {}, 5)).toThrow(UndefinedBehaviorError);
});

test("equals should pass when compare 2 object and equalsFn returns a boolean", () => {
  const res = equals({}, {}, () => true);
  expect(res).toBe(true);
});

test("equals should pass for 2 objects without Symbol.equals", () => {
  expect(equals({}, null)).toBe(false);
  expect(equals({}, {})).toBe(false);
  expect(equals([], [])).toBe(false);
});

test("compare should throw an error for not a number returns result", () => {
  // @ts-expect-error should throw
  expect(() => compare({}, {}, () => "qwe")).toThrow(UndefinedBehaviorError);
});

// ── New coverage ─────────────────────────────────────────────────────

// compare() with valid compareFn returning a number — documents a source bug:
// utils.ts line 60-67 validates the result but is missing `return res;`
// so execution falls through to `throw UndefinedBehaviorError` even for valid results.
test("compare with valid compareFn returning a number falls through to throw (source bug)", () => {
  expect(() => compare({}, {}, () => 42)).toThrow(UndefinedBehaviorError);
});

test("partialEquals with null as first argument throws (source bug: no null guard)", () => {
  // utils.ts line 108 does `a[kPartialEquals]` without guarding for null,
  // so passing null as the first argument throws a TypeError.
  expect(() => partialEquals(null, undefined)).toThrow(TypeError);
  expect(() => partialEquals(null, null)).toThrow(TypeError);
});

test("partialEquals fallback == with 0 and false", () => {
  expect(partialEquals(0, false)).toBe(true); // 0 == false
  expect(partialEquals(1, true)).toBe(true); // 1 == true
});

test("equals with two primitives uses === operator", () => {
  expect(equals("x", "x")).toBe(true);
  expect(equals("x", "y")).toBe(false);
  expect(equals(1, "1")).toBe(false);
});

test("equals with null as first argument returns a === b", () => {
  expect(equals(null, null)).toBe(true);
  expect(equals(null, undefined)).toBe(false);
});
