import { describe, expect, test } from "vitest";
import { type Option, Some, None } from "@rslike/std";
import { iter, type IterLike, type IntoIterLike } from "@rslike/iter";

import {
  Array as RSArray,
  Map as RSMap,
  Set as RSSet,
  ReadonlyArray as RSReadonlyArray,
  ReadonlyMap as RSReadonlyMap,
  ReadonlySet as RSReadonlySet,
  toIterable,
} from "../src/index";

/** A bare pull-based iterator: next() → Option<T>, no Symbol.iterator. */
function cursor<T>(items: T[]): IterLike<T> {
  let i = 0;
  return {
    next(): Option<T> {
      return i < items.length ? Some(items[i++]) : None();
    },
  };
}

describe("toIterable", () => {
  test("returns native iterables as-is", () => {
    const arr = [1, 2, 3];
    expect(toIterable(arr)).toBe(arr);
    const set = new Set([1]);
    expect(toIterable(set)).toBe(set);
  });

  test("wraps a bare IterLike into a lazy iterable", () => {
    const it = toIterable(cursor([1, 2, 3]));
    expect([...it]).toEqual([1, 2, 3]);
  });

  test("wrapped IterLike drains the underlying cursor", () => {
    const c = cursor([1, 2]);
    expect([...toIterable(c)]).toEqual([1, 2]);
    // cursor is exhausted — a second pass yields nothing
    expect([...toIterable(c)]).toEqual([]);
  });

  test("stops at the first None", () => {
    let calls = 0;
    const it: IterLike<number> = {
      next(): Option<number> {
        calls++;
        return calls <= 2 ? Some(calls) : None();
      },
    };
    expect([...toIterable(it)]).toEqual([1, 2]);
    expect(calls).toBe(3);
  });
});

describe("collections accept IterLike sources", () => {
  test("Array from bare IterLike", () => {
    const a = new RSArray(cursor([1, 2, 3]));
    expect(a.length).toBe(3);
    expect(a.get(0).unwrap()).toBe(1);
    expect(RSArray.from(cursor(["x"])).length).toBe(1);
  });

  test("ReadonlyArray from bare IterLike", () => {
    const a = new RSReadonlyArray(cursor([1, 2]));
    expect(a.length).toBe(2);
    expect(RSReadonlyArray.from(cursor([9])).get(0).unwrap()).toBe(9);
  });

  test("Set from bare IterLike deduplicates", () => {
    const s = new RSSet(cursor([1, 2, 2, 3]));
    expect(s.size).toBe(3);
    expect(s.has(2)).toBe(true);
  });

  test("ReadonlySet from bare IterLike", () => {
    const s = RSReadonlySet.from(cursor(["a", "a", "b"]));
    expect(s.has("a")).toBe(true);
    expect(s.has("b")).toBe(true);
  });

  test("Map from bare IterLike of pairs", () => {
    const m = new RSMap(
      cursor<readonly [string, number]>([
        ["a", 1],
        ["b", 2],
      ])
    );
    expect(m.size).toBe(2);
    expect(m.get("b").unwrap()).toBe(2);
  });

  test("ReadonlyMap from bare IterLike of pairs", () => {
    const m = RSReadonlyMap.from(cursor<readonly [string, number]>([["k", 42]]));
    expect(m.get("k").unwrap()).toBe(42);
  });
});

describe("collections satisfy IntoIterLike", () => {
  function drain<T>(source: IntoIterLike<T>): T[] {
    const it = source.iter();
    const out: T[] = [];
    for (let r = it.next(); r.isSome(); r = it.next()) out.push(r.unwrap());
    return out;
  }

  test("every collection can be consumed through IntoIterLike", () => {
    expect(drain(new RSArray([1, 2]))).toEqual([1, 2]);
    expect(drain(new RSReadonlyArray([3]))).toEqual([3]);
    expect(drain(new RSSet([4]))).toEqual([4]);
    expect(drain(RSReadonlySet.from([5]))).toEqual([5]);
    expect(drain(new RSMap([["k", 1]]))).toEqual([["k", 1]]);
    expect(drain(RSReadonlyMap.from([["j", 2]]))).toEqual([["j", 2]]);
  });

  test("iter() calls are independent cursors", () => {
    const a = new RSArray([1, 2, 3]);
    const it1 = a.iter();
    const it2 = a.iter();
    it1.next();
    expect(it2.next().unwrap()).toBe(1);
  });
});

describe("collections still accept native iterables and Iter", () => {
  test("Array from Iter adapter chain", () => {
    const a = new RSArray(iter([1, 2, 3, 4]).map((v) => v * 2));
    expect([...a]).toEqual([2, 4, 6, 8]);
  });

  test("Map from another map's entries()", () => {
    const src = new RSMap<string, number>([["a", 1]]);
    const copy = new RSMap(src.entries());
    expect(copy.get("a").unwrap()).toBe(1);
  });

  test("Set from a generator", () => {
    function* gen() {
      yield 1;
      yield 2;
    }
    const s = new RSSet(gen());
    expect(s.size).toBe(2);
  });
});
