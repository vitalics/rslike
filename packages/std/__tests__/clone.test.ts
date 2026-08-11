import { expect, test } from "vitest";
import {
  Err,
  None,
  Ok,
  Option,
  Result,
  Some,
  UndefinedBehaviorError,
  clone,
  WELL_KNOWN_CLONE_API,
  type Cloneable,
} from "../src/index";
import { Enum } from "../src/enum";

// ── clone() helper ─────────────────────────────────────────────────

test("clone returns primitives as-is", () => {
  expect(clone(42)).toBe(42);
  expect(clone("str")).toBe("str");
  expect(clone(true)).toBe(true);
  expect(clone(null)).toBe(null);
  expect(clone(undefined)).toBe(undefined);
  const sym = Symbol("s");
  expect(clone(sym)).toBe(sym);
  expect(clone(10n)).toBe(10n);
});

test("clone returns functions as-is", () => {
  const fn = () => 1;
  expect(clone(fn)).toBe(fn);
});

test("clone deep-clones plain objects via structuredClone", () => {
  const src = { a: 1, nested: { list: [1, 2, 3] } };
  const copy = clone(src);
  expect(copy).toEqual(src);
  expect(copy === src).toBe(false);
  expect(copy.nested === src.nested).toBe(false);
  expect(copy.nested.list === src.nested.list).toBe(false);
});

test("clone deep-clones arrays, Map, Set, Date", () => {
  const date = new Date(0);
  const src = {
    arr: [1, 2],
    map: new Map([["k", 1]]),
    set: new Set([1]),
    date,
  };
  const copy = clone(src);
  expect(copy.arr === src.arr).toBe(false);
  expect(copy.map === src.map).toBe(false);
  expect(copy.set === src.set).toBe(false);
  expect(copy.date === src.date).toBe(false);
  expect(copy.map.get("k")).toBe(1);
});

test("clone prefers the Cloneable trait over structuredClone", () => {
  let calls = 0;
  class Point implements Cloneable<Point> {
    constructor(public x: number, public y: number) {}
    clone(): Point {
      calls++;
      return new Point(this.x, this.y);
    }
  }
  const p = new Point(1, 2);
  const copy = clone(p);
  expect(calls).toBe(1);
  expect(copy).toBeInstanceOf(Point);
  expect(copy === p).toBe(false);
  expect(copy.x).toBe(1);
  expect(copy.y).toBe(2);
});

test("clone throws UndefinedBehaviorError for non-cloneable values", () => {
  const withFn = { fn: () => 1 };
  expect(() => clone(withFn)).toThrow(UndefinedBehaviorError);
});

// ── Option.clone() ─────────────────────────────────────────────────

test("Option.clone() clones Some with primitive", () => {
  const x = Some(1);
  const y = x.clone();
  expect(y === x).toBe(false);
  expect(y.isSome()).toBe(true);
  expect(y.unwrap()).toBe(1);
});

test("Option.clone() deep-clones Some object value", () => {
  const inner = { a: [1, 2] };
  const x = Some(inner);
  const y = x.clone();
  expect(y.unwrap()).toEqual(inner);
  expect(y.unwrap() === inner).toBe(false);
  expect(y.unwrap().a === inner.a).toBe(false);
});

test("Option.clone() on None returns None", () => {
  const x = None<number>();
  const y = x.clone();
  expect(y === x).toBe(false);
  expect(y.isNone()).toBe(true);
});

test("Option.clone() uses the Cloneable trait of the inner value", () => {
  class Token implements Cloneable<Token> {
    constructor(public id: number) {}
    clone(): Token {
      return new Token(this.id);
    }
  }
  const y = Some(new Token(7)).clone();
  expect(y.unwrap()).toBeInstanceOf(Token);
  expect(y.unwrap().id).toBe(7);
});

test("clone(option) dispatches through the Cloneable trait", () => {
  const x = Some({ v: 5 });
  const y = clone(x);
  expect(y).toBeInstanceOf(Option);
  expect(y === x).toBe(false);
  expect(y.unwrap()).toEqual({ v: 5 });
  expect(y.unwrap() === x.unwrap()).toBe(false);
});

// ── Result.clone() ─────────────────────────────────────────────────

test("Result.clone() clones Ok with primitive", () => {
  const x = Ok<number, string>(2);
  const y = x.clone();
  expect(y === x).toBe(false);
  expect(y.isOk()).toBe(true);
  expect(y.unwrap()).toBe(2);
});

test("Result.clone() deep-clones Ok object value", () => {
  const inner = { list: [1, 2, 3] };
  const x = Ok<typeof inner, string>(inner);
  const y = x.clone();
  expect(y.unwrap()).toEqual(inner);
  expect(y.unwrap() === inner).toBe(false);
  expect(y.unwrap().list === inner.list).toBe(false);
});

test("Result.clone() deep-clones Err error value", () => {
  const errObj = { code: 13 };
  const x = Err<number, typeof errObj>(errObj);
  const y = x.clone();
  expect(y.isErr()).toBe(true);
  expect(y.unwrapErr()).toEqual(errObj);
  expect(y.unwrapErr() === errObj).toBe(false);
});

test("clone(result) dispatches through the Cloneable trait", () => {
  const x = Ok<number, string>(1);
  const y = clone(x);
  expect(y).toBeInstanceOf(Result);
  expect(y === x).toBe(false);
  expect(y.unwrap()).toBe(1);
});

test("Result.clone() preserves Err after clone", () => {
  const y = Err<number, string>("boom").clone();
  expect(y.isErr()).toBe(true);
  expect(y.unwrapErr()).toBe("boom");
});

// ── WELL_KNOWN_CLONE_API symbol dispatch ───────────────────────────

test("clone dispatches through WELL_KNOWN_CLONE_API on Option", () => {
  const x = Some({ v: 1 });
  expect(typeof (x as any)[WELL_KNOWN_CLONE_API]).toBe("function");
  const y = (x as any)[WELL_KNOWN_CLONE_API]() as typeof x;
  expect(y).toBeInstanceOf(Option);
  expect(y === x).toBe(false);
  expect(y.unwrap() === x.unwrap()).toBe(false);
});

test("clone dispatches through WELL_KNOWN_CLONE_API on Result", () => {
  const x = Ok<number, string>(1);
  expect(typeof (x as any)[WELL_KNOWN_CLONE_API]).toBe("function");
  const y = (x as any)[WELL_KNOWN_CLONE_API]() as typeof x;
  expect(y).toBeInstanceOf(Result);
  expect(y === x).toBe(false);
});

test("custom class implementing the full Cloneable trait", () => {
  class Vec implements Cloneable<Vec> {
    constructor(public items: number[]) {}
    clone(): Vec {
      return new Vec([...this.items]);
    }
    [WELL_KNOWN_CLONE_API](): Vec {
      return this.clone();
    }
  }
  const v = new Vec([1, 2]);
  const copy = clone(v);
  expect(copy).toBeInstanceOf(Vec);
  expect(copy.items === v.items).toBe(false);
  expect(copy.items).toEqual([1, 2]);
});

// ── Enum integration ───────────────────────────────────────────────

test("Enum.new result is cloneable via WELL_KNOWN_CLONE_API", () => {
  const Status = Enum.new({ Active: 1, Inactive: 0 });
  expect(Status.Active).toBe(1);
  expect(Status[1]).toBe("Active");
  const copy = clone(Status);
  expect(copy === Status).toBe(false);
  expect(copy.Active).toBe(1);
  expect(copy[1]).toBe("Active");
  expect(Object.isFrozen(copy)).toBe(true);
});

test("Enum implements Cloneable — clone() returns same instance (immutable shell)", () => {
  const e = new Enum();
  expect(e.clone()).toBe(e);
  expect(e[WELL_KNOWN_CLONE_API]()).toBe(e);
});

test("clone(new Enum()) dispatches through the symbol and returns same instance", () => {
  const e = new Enum();
  expect(clone(e)).toBe(e);
});
