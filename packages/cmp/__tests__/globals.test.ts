import { UndefinedBehaviorError } from "@rslike/std";
import "../src/globals";

import type { Ord } from "../src/types";

test("number should support Symbol.compare", () => {
  const isMoreThan = (5)[Symbol.compare](3);
  expect(isMoreThan).toBe(1);
});

test("number constructor should support Symbol.compare", () => {
  const isMoreThan = new Number(5)[Symbol.compare](3);
  expect(isMoreThan).toBe(1);
});

test("number should work with string", () => {
  const val = (5)[Symbol.compare]("qwe");
  expect(val).toBe(-1);
});

test("number should throws error for object which is not implements Symbol.compare", () => {
  // @ts-expect-error
  expect(() => (5)[Symbol.compare]({})).toThrow(UndefinedBehaviorError);
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

test("string should support Symbol.compare", () => {
  const val = "qwe"[Symbol.compare]("another");
  expect(val).toBe(1);
});
