import { describe, expect, test } from "vitest";
import { type Option, Some, None } from "@rslike/std";
import type { IterLike } from "@rslike/iter";

import {
  Array as RSArray,
  ReadonlyArray as RSReadonlyArray,
  toIterable,
  type IterSource,
  type RsArrayLike,
} from "../src/index";

/** Builds an RsArrayLike over the given items: indexed access + pull-based next(). */
function rsArrayLike<T>(items: T[]): RsArrayLike<T> {
  let i = 0;
  return {
    ...items,
    length: items.length,
    next(): Option<T> {
      return i < items.length ? Some(items[i++]) : None();
    },
  };
}

describe("RsArrayLike", () => {
  test("exposes length and numeric indexed access like ArrayLike", () => {
    const a = rsArrayLike(["a", "b", "c"]);
    expect(a.length).toBe(3);
    expect(a[0]).toBe("a");
    expect(a[2]).toBe("c");
    expect(a[3]).toBeUndefined();
  });

  test("is an IterLike: next() drains values as Option", () => {
    const a = rsArrayLike([1, 2]);
    const asIterLike: IterLike<number> = a;
    expect(asIterLike.next().unwrap()).toBe(1);
    expect(asIterLike.next().unwrap()).toBe(2);
    expect(asIterLike.next().isNone()).toBe(true);
  });

  test("is a valid IterSource: toIterable drains it via next()", () => {
    const source: IterSource<number> = rsArrayLike([1, 2, 3]);
    expect([...toIterable(source)]).toEqual([1, 2, 3]);
  });

  test("feeds collection constructors directly", () => {
    const arr = RSArray.from(rsArrayLike([1, 2, 3]));
    expect(arr.length).toBe(3);
    expect(arr.get(1).unwrap()).toBe(2);
  });

  test("Array implements RsArrayLike: indexed access + length", () => {
    const arr: RsArrayLike<string> = RSArray.from(["a", "b", "c"]);
    expect(arr.length).toBe(3);
    expect(arr[0]).toBe("a");
    expect(arr[2]).toBe("c");
    expect(arr[3]).toBeUndefined();
  });

  test("Array keeps indexes in sync across push/pop/shift", () => {
    const arr = RSArray.from([1, 2]);
    arr.push(3, 4);
    expect(arr[2]).toBe(3);
    expect(arr[3]).toBe(4);

    expect(arr.pop().unwrap()).toBe(4);
    expect(arr[3]).toBeUndefined();

    expect(arr.shift().unwrap()).toBe(1);
    expect(arr[0]).toBe(2);
    expect(arr[1]).toBe(3);
    expect(arr[2]).toBeUndefined();
    expect(arr.length).toBe(2);
  });

  test("Array hides shrunk indexes from own-key views", () => {
    const arr = RSArray.from([1, 2, 3]);
    arr.pop();
    expect(Object.keys(arr)).toEqual(["0", "1"]);
    expect(arr[2]).toBeUndefined();

    arr.push(30, 40);
    expect(Object.keys(arr)).toEqual(["0", "1", "2", "3"]);
    expect(arr[2]).toBe(30);
    expect(arr[3]).toBe(40);
  });

  test("Array index writes throw in strict mode", () => {
    const arr = RSArray.from([1]);
    expect(() => {
      (arr as { [i: number]: number })[0] = 99;
    }).toThrow(TypeError);
    expect(arr[0]).toBe(1);
  });

  test("Array satisfies IterLike: next() drains once, then None", () => {
    const arr = RSArray.from([1, 2]);
    expect(arr.next().unwrap()).toBe(1);
    expect(arr.next().unwrap()).toBe(2);
    expect(arr.next().isNone()).toBe(true);
    expect(arr.next().isNone()).toBe(true);
    // iter() is unaffected by the instance cursor
    expect(arr.iter().collect()).toEqual([1, 2]);
  });

  test("Array works with native array-like consumers", () => {
    const arr = RSArray.from(["x", "y", "z"]);
    expect(globalThis.Array.prototype.join.call(arr, "-")).toBe("x-y-z");
    expect(globalThis.Array.from(arr)).toEqual(["x", "y", "z"]);
  });

  test("ReadonlyArray implements RsArrayLike", () => {
    const arr: RsArrayLike<number> = RSReadonlyArray.from([10, 20]);
    expect(arr.length).toBe(2);
    expect(arr[0]).toBe(10);
    expect(arr[1]).toBe(20);
    expect(arr[2]).toBeUndefined();
    expect(() => {
      (arr as { [i: number]: number })[1] = 99;
    }).toThrow(TypeError);
  });

  test("ReadonlyArray satisfies IterLike: next() drains once", () => {
    const arr = RSReadonlyArray.from([10, 20]);
    expect(arr.next().unwrap()).toBe(10);
    expect(arr.next().unwrap()).toBe(20);
    expect(arr.next().isNone()).toBe(true);
    expect(arr.iter().collect()).toEqual([10, 20]);
  });

  test("supports async instantiation via TNext", async () => {
    const items = [1, 2];
    let i = 0;
    const a: RsArrayLike<number, Promise<Option<number>>> = {
      ...items,
      length: items.length,
      async next(): Promise<Option<number>> {
        return i < items.length ? Some(items[i++]) : None();
      },
    };
    expect(a[0]).toBe(1);
    expect((await a.next()).unwrap()).toBe(1);
    expect((await a.next()).unwrap()).toBe(2);
    expect((await a.next()).isNone()).toBe(true);
  });
});
