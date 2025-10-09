import { test, expect } from "vitest";

import { UndefinedBehaviorError } from "@rslike/std";
import "../src/globals";
import "../src/primitives";

import type { Ord } from "../src/types";

const numberCases = [
  [1, 5, 3],
  [-1, 3, 5],
  [0, 3, 3],
  [0, 3, 3],
] as const;

test.each(numberCases)(
  "number should support Symbol.compare trait and returns %s for (%s, %s) pair",
  (result, first, second) => {
    const actualResult = first[Symbol.compare](second);
    expect(actualResult).toBe(result);
  }
);

test.each(numberCases)(
  "number should support Symbol.compare trait and returns %s for (%s, %s) pair",
  (result, first, second) => {
    const actualResult = new Number(first)[Symbol.compare](second);
    expect(actualResult).toBe(result);
  }
);

const negativeCases = [
  [undefined],
  [null],
  [{}],
  [new Array()],
  [new Function()],
] as const;

test.each(negativeCases)(
  "number should throw UndefinedBehaviorError for '%s' which does not implements Symbol.compare trait",
  (value) => {
    expect(() => (5)[Symbol.compare](value)).toThrow(UndefinedBehaviorError);
  }
);

test.each(negativeCases)(
  "number should throw UndefinedBehaviorError for '%s' which does not implements Symbol.compare trait",
  (value) => {
    expect(() => new Number(5)[Symbol.compare](value)).toThrow(
      UndefinedBehaviorError
    );
  }
);

test("number should throw error for string", () => {
  expect(() => (5)[Symbol.compare]("qwe")).toThrow(UndefinedBehaviorError);
});

test("Number[Symbol.compare] should returns NaN for not Finite number", () => {
  expect((4)[Symbol.compare](NaN)).toBe(NaN);
  expect((4)[Symbol.compare](Infinity)).toBe(NaN);
  expect((4)[Symbol.compare](-Infinity)).toBe(NaN);
});

test("Number[Symbol.compare] should throw an error for object which is implements Symbol.compare and returns not a number", () => {
  expect(() =>
    (4)[Symbol.compare]({
      [Symbol.compare]() {
        return true;
      },
    })
  ).toThrow(UndefinedBehaviorError);
});

test("number should work with Symbol.compare class", () => {
  class A implements Ord {
    compare<const V>(another: V): number {
      return this[Symbol.compare](another);
    }
    [Symbol.compare](another: unknown): number {
      if (typeof another === "number") {
        return this.value - another;
      }
      throw new Error("Not implemented");
    }
    readonly value = 2;
  }
  const a = new A();
  const val = (5)[Symbol.compare](a);
  expect(val).toBe(-3);
});

test("Number[Symbol.equals] should throw an error for object with Symbol.equals trait implementation and returns not a boolean type", () => {
  expect(
    (4)[Symbol.equals]({
      [Symbol.equals]() {
        return true;
      },
    })
  ).toBe(true);
});

test("Number[Symbol.partialEquals] should throw an error for object with Symbol.partialEquals trait implementation and returns not a boolean type", () => {
  expect(() =>
    (4)[Symbol.partialEquals]({
      [Symbol.partialEquals]() {
        return "asd";
      },
    })
  ).toThrow(UndefinedBehaviorError);
});

test("Number[Symbol.partialEquals] should not an error for object with Symbol.partialEquals trait implementation and returns a boolean type", () => {
  expect(
    (4)[Symbol.partialEquals]({
      [Symbol.partialEquals]() {
        return true;
      },
    })
  ).toBe(true);
});

test("Number[Symbol.equals] should throw an error for object with Symbol.equals trait implementation and returns not a boolean type", () => {
  expect(() =>
    (4)[Symbol.equals]({
      [Symbol.equals]() {
        return "asd";
      },
    })
  ).toThrow(UndefinedBehaviorError);
});

test("string should support Symbol.compare", () => {
  const val = "qwe"[Symbol.compare]("another");
  expect(val).toBe(1);
});

test.each(negativeCases)("string should throw for '%s' value", (value) => {
  expect(() => String(5)[Symbol.compare](value)).toThrow(
    UndefinedBehaviorError
  );
});

test("String[Symbol.compare] should supports primitives", () => {
  expect(""[Symbol.compare]("")).toBe(0);
  expect("asd"[Symbol.compare]("")).toBe(1);
  expect(""[Symbol.compare]("asd")).toBe(-1);

  expect("false"[Symbol.compare](false)).toBe(0);
  expect("1"[Symbol.compare](1)).toBe(0);
});

test("String[Symbol.compare] should return result for object with Symbol.compare trait implementation and returns number result", () => {
  expect(
    ""[Symbol.compare]({
      [Symbol.compare]() {
        return 2;
      },
    })
  ).toBe(2);
});

test("String[Symbol.compare] should throw an error for object with Symbol.compare trait implementation but returns non number result", () => {
  expect(() =>
    "qwe"[Symbol.compare]({
      [Symbol.compare]() {
        return true;
      },
    })
  ).toThrow(UndefinedBehaviorError);
});

test("String[Symbol.partialEquals] should call == operator", () => {
  const a = "asd"[Symbol.partialEquals](null);
  expect(a).toBe(false);
});

test("String[Symbol.partialEquals] should returns result for object with Symbol.partialEquals trait implementation and returns a boolean", () => {
  expect(
    "zxc"[Symbol.partialEquals]({
      [Symbol.partialEquals]() {
        return Boolean(false);
      },
    })
  ).toBe(false);
});

test("String[Symbol.partialEquals] should throw an error for object with Symbol.partialEquals trait implementation but returns not a boolean", () => {
  expect(() =>
    "qweasd"[Symbol.partialEquals]({
      [Symbol.partialEquals]() {
        return 2;
      },
    })
  ).toThrow(UndefinedBehaviorError);
});

test("String[Symbol.equals] should works for primitives", () => {
  expect(""[Symbol.equals]("")).toBe(true);
  expect("qwe"[Symbol.equals]("qwe")).toBe(true);
});

test("String[Symbol.equals] should returns result for object with Symbol.equals trait implementation", () => {
  expect(
    "qwe"[Symbol.equals]({
      [Symbol.equals]() {
        return true;
      },
    })
  ).toBe(true);
});

test("String[Symbol.equals] should throw undefiend behavior for object with Symbol.equals trait implementation but returns not a boolean", () => {
  expect(() =>
    ""[Symbol.equals]({
      [Symbol.equals]() {
        return "hello";
      },
    })
  ).toThrow(UndefinedBehaviorError);
});

test("String[Symbol.equals] call === operator", () => {
  expect(""[Symbol.equals](null)).toBe(false);
});

test("boolean should support Symbol.compare", () => {
  const val = true[Symbol.compare](false);
  expect(val).toBe(1);
});

test("Boolean[Symbol.partialEquals] should call == operator", () => {
  const a = false[Symbol.partialEquals](null);
  expect(a).toBe(false);
});

test("Boolean[Symbol.partialEquals] should returns result for object with Symbol.partialEquals trait implementation and returns a boolean", () => {
  expect(
    false[Symbol.partialEquals]({
      [Symbol.partialEquals]() {
        return Boolean(false);
      },
    })
  ).toBe(false);
});

test("Boolean[Symbol.partialEquals] should throw an error for object with Symbol.partialEquals trait implementation but returns not a boolean", () => {
  expect(() =>
    false[Symbol.partialEquals]({
      [Symbol.partialEquals]() {
        return 2;
      },
    })
  ).toThrow(UndefinedBehaviorError);
});

test("Boolean[Symbol.compare] should supports primitives", () => {
  expect(false[Symbol.compare]("")).toBe(0);
  expect(true[Symbol.compare]("")).toBe(1);
  expect(false[Symbol.compare]("asd")).toBe(-1);

  expect(false[Symbol.compare](0)).toBe(0);
  expect(true[Symbol.compare](2)).toBe(1);
  expect(false[Symbol.compare](-3)).toBe(-1);

  expect(false[Symbol.compare](false)).toBe(0);
  expect(true[Symbol.compare](true)).toBe(0);
});

test("Boolean[Symbol.compare] should return result for object with Symbol.compare trait implementation and returns number result", () => {
  expect(
    true[Symbol.compare]({
      [Symbol.compare]() {
        return 2;
      },
    })
  ).toBe(2);
});

test("Boolean[Symbol.compare] should throw an error for object with Symbol.compare trait implementation but returns non number result", () => {
  expect(() =>
    true[Symbol.compare]({
      [Symbol.compare]() {
        return true;
      },
    })
  ).toThrow(UndefinedBehaviorError);
});

test("Boolean[Symbol.equals] should return value from object which implements Symbol.equals trait and return boolean result", () => {
  expect(
    false[Symbol.equals]({
      [Symbol.equals]() {
        return true;
      },
    })
  ).toBe(true);
});
test("Boolean[Symbol.equals] should throw error for object which implements Symbol.equals trait and return non boolean result", () => {
  expect(() =>
    false[Symbol.equals]({
      [Symbol.equals]() {
        return 4;
      },
    })
  ).toThrow(UndefinedBehaviorError);
});

test("Boolean[Symbol.equals] should use === for non primitives", () => {
  expect(false[Symbol.equals](null)).toBe(false);
});

test("Boolean[Symbol.partialEquals] should pass for primitives", () => {
  expect(false[Symbol.partialEquals](false)).toBe(true);
  expect(false[Symbol.partialEquals](0)).toBe(true);
  expect(false[Symbol.partialEquals]("")).toBe(true);
  expect(false[Symbol.partialEquals]("0")).toBe(true);

  expect(
    false[Symbol.partialEquals]({
      [Symbol.partialEquals]() {
        return true;
      },
    })
  ).toBe(true);
});

test.each(negativeCases)("boolean should throw for '%s' value", (value) => {
  expect(() => true[Symbol.compare](value)).toThrow(UndefinedBehaviorError);
});

test("Date[Symbol.equals] trait should call primitives equality", () => {
  const d = new Date();
  expect(d[Symbol.equals](d.valueOf())).toBe(true);
  expect(d[Symbol.equals](d.toISOString())).toBe(true);
  expect(d[Symbol.equals](d)).toBe(true);
  const another = new Date(d.valueOf() + 3);
  expect(d[Symbol.equals](another)).toBe(false);

  expect(d[Symbol.equals](3)).toBe(false);
});

test("Date[Symbol.equals] trait should throw for return not a boolean value", () => {
  expect(() =>
    new Date()[Symbol.equals]({
      [Symbol.equals]() {
        return 5;
      },
    })
  ).toThrow(UndefinedBehaviorError);
});

test("Date should call Symbol.equals trait for object with Symbol.eqauls trait implementation", () => {
  expect(
    new Date()[Symbol.equals]({
      [Symbol.equals]() {
        return true;
      },
    })
  ).toBe(true);
});

test("Date should call === for Symbol.equals for object without Symbol.eqauls trait implementation", () => {
  expect(new Date()[Symbol.equals]({})).toBe(false);
});

test("Date should call partialEquals for primitives", () => {
  const d = new Date();
  expect(d[Symbol.partialEquals](d)).toBe(true);

  expect(d[Symbol.partialEquals](d.valueOf())).toBe(true);

  expect(d[Symbol.partialEquals](d.toString())).toBe(false);
  expect(d[Symbol.partialEquals](d.toISOString())).toBe(true);
  expect(d[Symbol.partialEquals](d.toUTCString())).toBe(false);
});

test("Date[Symbol.compare] should work correctly for primitives", () => {
  const d = new Date();
  expect(d[Symbol.compare](d)).toBe(0);
  expect(d[Symbol.compare](d.valueOf())).toBe(0);
  expect(d[Symbol.compare](d.valueOf() + 3)).toBe(-1);
});

test("Date[Symbol.compare] should work correctly for object with SYmbol.compare implementation", () => {
  expect(
    new Date()[Symbol.compare]({
      [Symbol.compare]() {
        return 1;
      },
    })
  ).toBe(1);
});

test("Date[Symbol.compare] should throw error for not finite date", () => {
  expect(() => new Date()[Symbol.compare](NaN)).toThrow(UndefinedBehaviorError);
});

test("Date[Symbol.compare] should throw error for returns not a number result", () => {
  expect(() =>
    new Date()[Symbol.compare]({
      [Symbol.compare]() {
        return true;
      },
    })
  ).toThrow(UndefinedBehaviorError);
});
test("Date should support Symbol.compare", () => {
  const now = Date.now();
  const lessThan = new Date(now - 30);
  const val = new Date(now)[Symbol.compare](lessThan);
  expect(val).toBe(1);
});

test.each(negativeCases)("Date should throw for '%s' value", (value) => {
  expect(() => new Date()[Symbol.compare](value)).toThrow(
    UndefinedBehaviorError
  );
});

test("Date should support partialEquals", () => {
  expect(new Date()[Symbol.partialEquals]({})).toBe(false);
});

test("Date should support object with Symbol.partialEquals trait and throw for non boolean return result", () => {
  expect(() =>
    new Date()[Symbol.partialEquals]({
      [Symbol.partialEquals]() {
        return 5;
      },
    })
  ).toThrow(UndefinedBehaviorError);
});

test("Date should support object with Symbol.partialEquals trait", () => {
  expect(
    new Date()[Symbol.partialEquals]({
      [Symbol.partialEquals]() {
        return true;
      },
    })
  ).toBe(true);
});
