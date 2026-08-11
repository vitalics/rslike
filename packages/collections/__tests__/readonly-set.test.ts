import { expect, test, vi } from "vitest";
import { None, Some } from "@rslike/std";
import { Iter, ParIter } from "@rslike/iter";
import {
  Set as RSLikeSet,
  ReadonlySet as RSLikeReadonlySet,
} from "../src/index";

// ── Constructor ───────────────────────────────────────────────────────────────

test("constructor creates empty set with no arguments", () => {
  const s = new RSLikeReadonlySet();
  expect(s.size).toBe(0);
  expect(s.isEmpty()).toBe(true);
});

test("constructor creates set from array", () => {
  const s = new RSLikeReadonlySet([1, 2, 3]);
  expect(s.size).toBe(3);
});

test("constructor deduplicates values from source", () => {
  const s = new RSLikeReadonlySet([1, 1, 2, 2, 3]);
  expect(s.size).toBe(3);
});

test("constructor creates empty set from null", () => {
  expect(new RSLikeReadonlySet(null).size).toBe(0);
});

test("RSLikeReadonlySet.from() works like constructor", () => {
  const s = RSLikeReadonlySet.from([10, 20]);
  expect(s.has(10)).toBe(true);
  expect(s.size).toBe(2);
});

// ── Defensive copy: mutations to source are NOT reflected ─────────────────────

test("mutations to the source Set after construction are not reflected", () => {
  const source = new Set([1, 2, 3]);
  const s = new RSLikeReadonlySet(source);
  source.add(4);
  source.delete(1);
  expect(s.size).toBe(3); // still original size
  expect(s.has(1)).toBe(true); // 1 still present
  expect(s.has(4)).toBe(false); // 4 was never in the copy
});

test("mutations to the source RSLikeSet after construction are not reflected", () => {
  const source = new RSLikeSet([1, 2, 3]);
  const s = new RSLikeReadonlySet(source);
  source.insert(99);
  source.delete(1);
  expect(s.size).toBe(3);
  expect(s.has(1)).toBe(true);
  expect(s.has(99)).toBe(false);
});

// ── No mutation methods ───────────────────────────────────────────────────────

test("insert is not a method on RSLikeReadonlySet", () => {
  expect(typeof (new RSLikeReadonlySet() as any).insert).toBe("undefined");
});

test("delete is not a method on RSLikeReadonlySet", () => {
  expect(typeof (new RSLikeReadonlySet() as any).delete).toBe("undefined");
});

test("clear is not a method on RSLikeReadonlySet", () => {
  expect(typeof (new RSLikeReadonlySet() as any).clear).toBe("undefined");
});

test("take is not a method on RSLikeReadonlySet", () => {
  expect(typeof (new RSLikeReadonlySet() as any).take).toBe("undefined");
});

// ── get / has ─────────────────────────────────────────────────────────────────

test("get returns Some(value) when present", () => {
  const s = new RSLikeReadonlySet([42]);
  const r = s.get(42);
  expect(r.isSome()).toBe(true);
  expect(r.unwrap()).toBe(42);
});

test("get returns None when absent", () => {
  const s = new RSLikeReadonlySet([1]);
  expect(s.get(99).isNone()).toBe(true);
});

test("get result is instanceof Some when present", () => {
  expect(new RSLikeReadonlySet([1]).get(1) instanceof Some).toBe(true);
});

test("get result is instanceof None when absent", () => {
  expect(new RSLikeReadonlySet([1]).get(0) instanceof None).toBe(true);
});

test("has returns true for a present value", () => {
  expect(new RSLikeReadonlySet(["x"]).has("x")).toBe(true);
});

test("has returns false for an absent value", () => {
  expect(new RSLikeReadonlySet(["x"]).has("z")).toBe(false);
});

// ── size / length / isEmpty ──────────────────────────────────────────────────

test("length equals size", () => {
  const s = new RSLikeReadonlySet([1, 2, 3]);
  expect(s.length).toBe(s.size);
  expect(s.length).toBe(3);
});

test("isEmpty is true for empty set", () => {
  expect(new RSLikeReadonlySet().isEmpty()).toBe(true);
});

test("isEmpty is false for non-empty set", () => {
  expect(new RSLikeReadonlySet([1]).isEmpty()).toBe(false);
});

// ── forEach ───────────────────────────────────────────────────────────────────

test("forEach visits each value", () => {
  const s = new RSLikeReadonlySet([1, 2, 3]);
  const cb = vi.fn();
  s.forEach(cb);
  expect(cb).toBeCalledTimes(3);
});

test("forEach does not call callback on empty set", () => {
  const cb = vi.fn();
  new RSLikeReadonlySet().forEach(cb);
  expect(cb).not.toBeCalled();
});

test("forEach respects thisArg binding", () => {
  const s = new RSLikeReadonlySet([10, 20]);
  const obj = { sum: 0 };
  s.forEach(function (this: typeof obj, v: number) {
    this.sum += v;
  }, obj);
  expect(obj.sum).toBe(30);
});

// ── Set-algebra: same-type operand ────────────────────────────────────────────

test("union of two RSLikeReadonlySets yields all unique values", () => {
  const a = new RSLikeReadonlySet([1, 2, 3]);
  const b = new RSLikeReadonlySet([3, 4, 5]);
  expect(a.union(b).collect()).toEqual([1, 2, 3, 4, 5]);
});

test("intersection of two RSLikeReadonlySets yields shared values", () => {
  const a = new RSLikeReadonlySet([1, 2, 3]);
  const b = new RSLikeReadonlySet([2, 3, 4]);
  expect(a.intersection(b).collect()).toEqual([2, 3]);
});

test("difference yields values in this but not in other", () => {
  const a = new RSLikeReadonlySet([1, 2, 3]);
  const b = new RSLikeReadonlySet([2, 3, 4]);
  expect(a.difference(b).collect()).toEqual([1]);
});

test("symmetricDifference yields values in exactly one set", () => {
  const a = new RSLikeReadonlySet([1, 2, 3]);
  const b = new RSLikeReadonlySet([2, 3, 4]);
  expect(a.symmetricDifference(b).collect()).toEqual([1, 4]);
});

// ── Set-algebra: cross-type operands (the non-trivial gotcha) ─────────────────

test("RSLikeReadonlySet.union accepts a mutable RSLikeSet as other", () => {
  const a = new RSLikeReadonlySet([1, 2]);
  const b = new RSLikeSet([2, 3]);
  expect(a.union(b).collect()).toEqual([1, 2, 3]);
});

test("RSLikeReadonlySet.intersection accepts a native Set as other", () => {
  const a = new RSLikeReadonlySet([1, 2, 3]);
  const b = new Set([2, 3, 4]);
  expect(a.intersection(b).collect()).toEqual([2, 3]);
});

test("RSLikeSet.union accepts a RSLikeReadonlySet as other", () => {
  const a = new RSLikeSet([1, 2]);
  const b = new RSLikeReadonlySet([2, 3]);
  expect(a.union(b).collect()).toEqual([1, 2, 3]);
});

test("RSLikeSet.intersection accepts a RSLikeReadonlySet as other", () => {
  const a = new RSLikeSet([1, 2, 3]);
  const b = new RSLikeReadonlySet([2, 3, 4]);
  expect(a.intersection(b).collect()).toEqual([2, 3]);
});

test("RSLikeSet.difference accepts a RSLikeReadonlySet as other", () => {
  const a = new RSLikeSet([1, 2, 3]);
  const b = new RSLikeReadonlySet([2, 3]);
  expect(a.difference(b).collect()).toEqual([1]);
});

test("RSLikeSet.isSubset accepts a RSLikeReadonlySet as other", () => {
  const a = new RSLikeSet([1, 2]);
  const b = new RSLikeReadonlySet([1, 2, 3]);
  expect(a.isSubset(b)).toBe(true);
});

test("RSLikeSet.isSuperset accepts a RSLikeReadonlySet as other", () => {
  const a = new RSLikeSet([1, 2, 3]);
  const b = new RSLikeReadonlySet([1, 2]);
  expect(a.isSuperset(b)).toBe(true);
});

// ── Set-algebra edge cases ────────────────────────────────────────────────────

test("symmetricDifference of equal sets is empty", () => {
  const a = new RSLikeReadonlySet([1, 2, 3]);
  const b = new RSLikeReadonlySet([1, 2, 3]);
  expect(a.symmetricDifference(b).collect()).toEqual([]);
});

test("union with empty other returns this set's values", () => {
  const a = new RSLikeReadonlySet([1, 2]);
  expect(a.union(new RSLikeReadonlySet()).collect()).toEqual([1, 2]);
});

test("intersection with empty other returns empty", () => {
  const a = new RSLikeReadonlySet([1, 2]);
  expect(a.intersection(new RSLikeReadonlySet()).collect()).toEqual([]);
});

test("difference with empty other returns all values", () => {
  const a = new RSLikeReadonlySet([1, 2, 3]);
  expect(a.difference(new RSLikeReadonlySet()).collect()).toEqual([1, 2, 3]);
});

test("set-algebra result is a new lazy Iter each call (not cached)", () => {
  const a = new RSLikeReadonlySet([1, 2]);
  const b = new RSLikeReadonlySet([2, 3]);
  // calling union twice produces two independent iterators
  const r1 = a.union(b).collect();
  const r2 = a.union(b).collect();
  expect(r1).toEqual(r2);
  expect(r1).not.toBe(r2); // different array instances
});

// ── Subset / superset / disjoint ─────────────────────────────────────────────

test("empty set isSubset of any set", () => {
  expect(new RSLikeReadonlySet().isSubset(new RSLikeReadonlySet([1, 2]))).toBe(
    true
  );
});

test("isSubset of equal sets is true", () => {
  const a = new RSLikeReadonlySet([1, 2]);
  expect(a.isSubset(new RSLikeReadonlySet([1, 2]))).toBe(true);
});

test("any set isSuperset of empty set", () => {
  expect(new RSLikeReadonlySet([1]).isSuperset(new RSLikeReadonlySet())).toBe(
    true
  );
});

test("empty set isSuperset only of another empty set", () => {
  expect(new RSLikeReadonlySet().isSuperset(new RSLikeReadonlySet())).toBe(
    true
  );
  expect(new RSLikeReadonlySet().isSuperset(new RSLikeReadonlySet([1]))).toBe(
    false
  );
});

test("isDisjoint with empty other is always true", () => {
  expect(
    new RSLikeReadonlySet([1, 2]).isDisjoint(new RSLikeReadonlySet())
  ).toBe(true);
});

test("two empty sets are disjoint", () => {
  expect(new RSLikeReadonlySet().isDisjoint(new RSLikeReadonlySet())).toBe(
    true
  );
});

test("isDisjoint returns false when one shared value exists", () => {
  const a = new RSLikeReadonlySet([1, 2, 3]);
  const b = new RSLikeReadonlySet([3, 4, 5]); // 3 is shared
  expect(a.isDisjoint(b)).toBe(false);
});

// ── iter / parIter ───────────────────────────────────────────────────────────

test("iter() returns an Iter over set values", () => {
  const s = new RSLikeReadonlySet([1, 2, 3]);
  expect(s.iter() instanceof Iter).toBe(true);
  expect(s.iter().collect()).toEqual([1, 2, 3]);
});

test("iter() supports chaining — filter then map", () => {
  const s = new RSLikeReadonlySet([1, 2, 3, 4, 5]);
  const result = s
    .iter()
    .filter((v) => v % 2 === 0)
    .map((v) => v * 10)
    .collect();
  expect(result).toEqual([20, 40]);
});

test("calling iter() twice produces independent iterators", () => {
  const s = new RSLikeReadonlySet([1, 2, 3]);
  const a = s.iter().collect();
  const b = s.iter().collect();
  expect(a).toEqual(b);
  expect(a).not.toBe(b);
});

test("parIter() collects concurrently via async map", async () => {
  const s = new RSLikeReadonlySet([1, 2, 3]);
  const result = await s
    .parIter()
    .map(async (v) => v * 2)
    .collect();
  expect(result).toEqual([2, 4, 6]);
});

test("parIter() is a ParIter instance", () => {
  expect(new RSLikeReadonlySet([1]).parIter() instanceof ParIter).toBe(true);
});

// ── values / keys / entries ───────────────────────────────────────────────────

test("values() iterates over all values via for...of", () => {
  expect([...new RSLikeReadonlySet([10, 20, 30]).values()]).toEqual([
    10, 20, 30,
  ]);
});

test("values().next() returns Some then None", () => {
  const s = new RSLikeReadonlySet([42]);
  const it = s.values();
  expect(it.next().unwrap()).toBe(42);
  expect(it.next().isNone()).toBe(true);
});

test("keys() returns the same values as values() for a Set", () => {
  const s = new RSLikeReadonlySet([1, 2, 3]);
  expect([...s.keys()]).toEqual([...s.values()]);
});

test("entries() returns [value, value] pairs", () => {
  expect([...new RSLikeReadonlySet([1, 2]).entries()]).toEqual([
    [1, 1],
    [2, 2],
  ]);
});

// ── Iterator state sharing ────────────────────────────────────────────────────

test("manual next() and for...of share the same iterator state on values()", () => {
  const s = new RSLikeReadonlySet([1, 2, 3]);
  const it = s.values();
  expect(it.next().unwrap()).toBe(1); // consume first
  const rest: number[] = [];
  for (const v of it) rest.push(v); // for...of continues from 2
  expect(rest).toEqual([2, 3]);
});

// ── Symbol.iterator ───────────────────────────────────────────────────────────

test("Symbol.iterator allows for...of", () => {
  const s = new RSLikeReadonlySet(["a", "b", "c"]);
  const collected: string[] = [];
  for (const v of s) collected.push(v);
  expect(collected).toEqual(["a", "b", "c"]);
});

test("spread operator works via Symbol.iterator", () => {
  expect([...new RSLikeReadonlySet([1, 2, 3])]).toEqual([1, 2, 3]);
});

// ── Symbol.toStringTag ────────────────────────────────────────────────────────

test("Symbol.toStringTag returns 'Set'", () => {
  expect(new RSLikeReadonlySet()[Symbol.toStringTag]).toBe("Set");
});

// ── Constructed from generator ────────────────────────────────────────────────

test("constructor accepts a generator", () => {
  function* nums() {
    yield 10;
    yield 20;
    yield 30;
  }
  const s = new RSLikeReadonlySet(nums());
  expect(s.size).toBe(3);
  expect(s.has(20)).toBe(true);
});
