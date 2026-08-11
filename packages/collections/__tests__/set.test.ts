import { expect, test, vi } from "vitest";
import { None, Some } from "@rslike/std";
import { Iter, iter } from "@rslike/iter";
import { Set as RSLikeSet } from "../src/index";

// ── Constructor ──────────────────────────────────────────────────────────────

test("constructor creates empty set when called with no arguments", () => {
  const s = new RSLikeSet();
  expect(s.size).toBe(0);
});

test("constructor creates set from array", () => {
  const s = new RSLikeSet([1, 2, 3]);
  expect(s.size).toBe(3);
  expect(s.has(1)).toBe(true);
  expect(s.has(2)).toBe(true);
  expect(s.has(3)).toBe(true);
});

test("constructor creates empty set when called with null", () => {
  const s = new RSLikeSet(null);
  expect(s.size).toBe(0);
});

test("constructor deduplicates values from iterable", () => {
  const s = new RSLikeSet([1, 1, 2, 2, 3]);
  expect(s.size).toBe(3);
});

test("constructor accepts any iterable (Set)", () => {
  const s = new RSLikeSet(new Set([10, 20, 30]));
  expect(s.size).toBe(3);
  expect(s.has(20)).toBe(true);
});

// ── insert ───────────────────────────────────────────────────────────────────

test("insert returns true when value is newly added", () => {
  const s = new RSLikeSet<number>();
  expect(s.insert(1)).toBe(true);
});

test("insert returns false when value already exists", () => {
  const s = new RSLikeSet([1, 2]);
  expect(s.insert(2)).toBe(false);
});

test("insert actually adds the value", () => {
  const s = new RSLikeSet<number>();
  s.insert(42);
  expect(s.has(42)).toBe(true);
  expect(s.size).toBe(1);
});

test("insert does not change size when value already present", () => {
  const s = new RSLikeSet([1]);
  s.insert(1);
  expect(s.size).toBe(1);
});

// ── delete ───────────────────────────────────────────────────────────────────

test("delete returns true and removes the value", () => {
  const s = new RSLikeSet([1, 2, 3]);
  expect(s.delete(2)).toBe(true);
  expect(s.has(2)).toBe(false);
  expect(s.size).toBe(2);
});

test("delete returns false when value does not exist", () => {
  const s = new RSLikeSet<number>();
  expect(s.delete(99)).toBe(false);
});

// ── take ─────────────────────────────────────────────────────────────────────

test("take returns Some(value) and removes it when present", () => {
  const s = new RSLikeSet([1, 2, 3]);
  const result = s.take(2);
  expect(result.isSome()).toBe(true);
  expect(result.unwrap()).toBe(2);
  expect(s.has(2)).toBe(false);
  expect(s.size).toBe(2);
});

test("take returns None when value is not present", () => {
  const s = new RSLikeSet([1, 2, 3]);
  const result = s.take(99);
  expect(result.isNone()).toBe(true);
});

test("take result is instanceof Some when value is present", () => {
  const s = new RSLikeSet(["a", "b"]);
  expect(s.take("a") instanceof Some).toBe(true);
});

test("take result is instanceof None when value is absent", () => {
  const s = new RSLikeSet(["a"]);
  expect(s.take("z") instanceof None).toBe(true);
});

// ── clear ─────────────────────────────────────────────────────────────────────

test("clear removes all values", () => {
  const s = new RSLikeSet([1, 2, 3]);
  s.clear();
  expect(s.size).toBe(0);
  expect(s.has(1)).toBe(false);
});

// ── has ───────────────────────────────────────────────────────────────────────

test("has returns true for present value", () => {
  const s = new RSLikeSet(["x", "y"]);
  expect(s.has("x")).toBe(true);
});

test("has returns false for absent value", () => {
  const s = new RSLikeSet(["x"]);
  expect(s.has("z")).toBe(false);
});

// ── get ───────────────────────────────────────────────────────────────────────

test("get returns Some(value) when present", () => {
  const s = new RSLikeSet([1, 2, 3]);
  const result = s.get(2);
  expect(result.isSome()).toBe(true);
  expect(result.unwrap()).toBe(2);
});

test("get returns None when absent", () => {
  const s = new RSLikeSet([1, 2]);
  expect(s.get(99).isNone()).toBe(true);
});

test("get result is instanceof Some when present", () => {
  const s = new RSLikeSet([42]);
  expect(s.get(42) instanceof Some).toBe(true);
});

test("get result is instanceof None when absent", () => {
  const s = new RSLikeSet([42]);
  expect(s.get(0) instanceof None).toBe(true);
});

test("get returns None after the value is deleted", () => {
  const s = new RSLikeSet([1]);
  s.delete(1);
  expect(s.get(1).isNone()).toBe(true);
});

// ── size / length / isEmpty ──────────────────────────────────────────────────

test("size reflects the current number of values", () => {
  const s = new RSLikeSet<number>();
  expect(s.size).toBe(0);
  s.insert(1);
  expect(s.size).toBe(1);
  s.insert(2);
  expect(s.size).toBe(2);
  s.delete(1);
  expect(s.size).toBe(1);
});

test("length equals size", () => {
  const s = new RSLikeSet([1, 2, 3]);
  expect(s.length).toBe(s.size);
  expect(s.length).toBe(3);
});

test("isEmpty returns true for empty set", () => {
  expect(new RSLikeSet().isEmpty()).toBe(true);
});

test("isEmpty returns false for non-empty set", () => {
  expect(new RSLikeSet([1]).isEmpty()).toBe(false);
});

test("isEmpty returns true after clear", () => {
  const s = new RSLikeSet([1, 2]);
  s.clear();
  expect(s.isEmpty()).toBe(true);
});

// ── forEach ───────────────────────────────────────────────────────────────────

test("forEach calls callback for each value", () => {
  const s = new RSLikeSet([1, 2, 3]);
  const cb = vi.fn();
  s.forEach(cb);
  expect(cb).toBeCalledTimes(3);
});

test("forEach does not call callback on empty set", () => {
  const cb = vi.fn();
  new RSLikeSet().forEach(cb);
  expect(cb).not.toBeCalled();
});

// ── Set-algebra ───────────────────────────────────────────────────────────────

test("union returns all values from both sets without duplicates", () => {
  const a = new RSLikeSet([1, 2, 3]);
  const b = new RSLikeSet([3, 4, 5]);
  expect(a.union(b).collect()).toEqual([1, 2, 3, 4, 5]);
});

test("union with empty set returns this set's values", () => {
  const a = new RSLikeSet([1, 2]);
  expect(a.union(new RSLikeSet()).collect()).toEqual([1, 2]);
});

test("union of two empty sets is empty", () => {
  expect(new RSLikeSet().union(new RSLikeSet()).collect()).toEqual([]);
});

test("union returns lazy Iter (is instance of Iter)", () => {
  const a = new RSLikeSet([1]);
  expect(a.union(new RSLikeSet([2])) instanceof Iter).toBe(true);
});

test("union works with native Set", () => {
  const a = new RSLikeSet([1, 2]);
  const b = new Set([2, 3]);
  expect(a.union(b).collect()).toEqual([1, 2, 3]);
});

test("intersection returns only shared values", () => {
  const a = new RSLikeSet([1, 2, 3]);
  const b = new RSLikeSet([2, 3, 4]);
  expect(a.intersection(b).collect()).toEqual([2, 3]);
});

test("intersection with no overlap returns empty", () => {
  const a = new RSLikeSet([1, 2]);
  const b = new RSLikeSet([3, 4]);
  expect(a.intersection(b).collect()).toEqual([]);
});

test("intersection with empty set returns empty", () => {
  const a = new RSLikeSet([1, 2]);
  expect(a.intersection(new RSLikeSet()).collect()).toEqual([]);
});

test("intersection works with native Set", () => {
  const a = new RSLikeSet([1, 2, 3]);
  expect(a.intersection(new Set([2, 3, 4])).collect()).toEqual([2, 3]);
});

test("difference returns values in this but not in other", () => {
  const a = new RSLikeSet([1, 2, 3]);
  const b = new RSLikeSet([2, 3, 4]);
  expect(a.difference(b).collect()).toEqual([1]);
});

test("difference with empty other returns all values", () => {
  const a = new RSLikeSet([1, 2, 3]);
  expect(a.difference(new RSLikeSet()).collect()).toEqual([1, 2, 3]);
});

test("difference with superset returns empty", () => {
  const a = new RSLikeSet([1, 2]);
  const b = new RSLikeSet([1, 2, 3]);
  expect(a.difference(b).collect()).toEqual([]);
});

test("symmetricDifference returns values in exactly one set", () => {
  const a = new RSLikeSet([1, 2, 3]);
  const b = new RSLikeSet([2, 3, 4]);
  expect(a.symmetricDifference(b).collect()).toEqual([1, 4]);
});

test("symmetricDifference of identical sets is empty", () => {
  const a = new RSLikeSet([1, 2, 3]);
  const b = new RSLikeSet([1, 2, 3]);
  expect(a.symmetricDifference(b).collect()).toEqual([]);
});

test("symmetricDifference of disjoint sets is their union", () => {
  const a = new RSLikeSet([1, 2]);
  const b = new RSLikeSet([3, 4]);
  expect(a.symmetricDifference(b).collect()).toEqual([1, 2, 3, 4]);
});

// ── Subset / superset ─────────────────────────────────────────────────────────

test("isSubset returns true when all values are in other", () => {
  expect(new RSLikeSet([1, 2]).isSubset(new RSLikeSet([1, 2, 3]))).toBe(true);
});

test("isSubset returns false when a value is missing from other", () => {
  expect(new RSLikeSet([1, 4]).isSubset(new RSLikeSet([1, 2, 3]))).toBe(false);
});

test("isSubset of equal sets is true", () => {
  expect(new RSLikeSet([1, 2]).isSubset(new RSLikeSet([1, 2]))).toBe(true);
});

test("empty set isSubset of any set", () => {
  expect(new RSLikeSet().isSubset(new RSLikeSet([1, 2]))).toBe(true);
});

test("isSuperset returns true when other is a subset", () => {
  expect(new RSLikeSet([1, 2, 3]).isSuperset(new RSLikeSet([1, 2]))).toBe(true);
});

test("isSuperset returns false when other has extra values", () => {
  expect(new RSLikeSet([1, 2]).isSuperset(new RSLikeSet([1, 2, 3]))).toBe(false);
});

test("any set isSuperset of empty set", () => {
  expect(new RSLikeSet([1]).isSuperset(new RSLikeSet())).toBe(true);
});

test("isDisjoint returns true when sets share no values", () => {
  expect(new RSLikeSet([1, 2]).isDisjoint(new RSLikeSet([3, 4]))).toBe(true);
});

test("isDisjoint returns false when sets share at least one value", () => {
  expect(new RSLikeSet([1, 2]).isDisjoint(new RSLikeSet([2, 3]))).toBe(false);
});

test("empty sets are disjoint", () => {
  expect(new RSLikeSet().isDisjoint(new RSLikeSet())).toBe(true);
});

// ── iter ──────────────────────────────────────────────────────────────────────

test("iter returns an Iter over set values", () => {
  const s = new RSLikeSet([1, 2, 3]);
  expect(s.iter() instanceof Iter).toBe(true);
  expect(s.iter().collect()).toEqual([1, 2, 3]);
});

test("iter supports chaining", () => {
  const s = new RSLikeSet([1, 2, 3, 4]);
  expect(s.iter().filter((v) => v % 2 === 0).collect()).toEqual([2, 4]);
});

// ── parIter ──────────────────────────────────────────────────────────────────

test("parIter collects values via async pipeline", async () => {
  const s = new RSLikeSet([1, 2, 3]);
  const result = await s.parIter().map((v) => v * 2).collect();
  expect(result).toEqual([2, 4, 6]);
});

// ── values / keys / entries ────────────────────────────────────────────────────

test("values() iterates over all values via for...of", () => {
  const s = new RSLikeSet([10, 20, 30]);
  expect([...s.values()]).toEqual([10, 20, 30]);
});

test("values().next() returns Some(value) when has next", () => {
  const s = new RSLikeSet([42]);
  const result = s.values().next();
  expect(result.isSome()).toBe(true);
  expect(result.unwrap()).toBe(42);
});

test("values().next() returns None when exhausted", () => {
  const s = new RSLikeSet([1]);
  const it = s.values();
  it.next();
  expect(it.next().isNone()).toBe(true);
});

test("keys() returns same values as values() for a Set", () => {
  const s = new RSLikeSet([1, 2, 3]);
  expect([...s.keys()]).toEqual([...s.values()]);
});

test("entries() returns [value, value] pairs", () => {
  const s = new RSLikeSet([1, 2]);
  expect([...s.entries()]).toEqual([
    [1, 1],
    [2, 2],
  ]);
});

test("entries().next() returns Some([v, v]) when has next", () => {
  const s = new RSLikeSet(["a"]);
  const result = s.entries().next();
  expect(result.isSome()).toBe(true);
  expect(result.unwrap()).toEqual(["a", "a"]);
});

// ── Symbol.iterator ────────────────────────────────────────────────────────────

test("Symbol.iterator allows for...of", () => {
  const s = new RSLikeSet([1, 2, 3]);
  const collected: number[] = [];
  for (const v of s) {
    collected.push(v);
  }
  expect(collected).toEqual([1, 2, 3]);
});

test("spread operator works via Symbol.iterator", () => {
  const s = new RSLikeSet(["a", "b", "c"]);
  expect([...s]).toEqual(["a", "b", "c"]);
});

// ── Symbol.toStringTag ─────────────────────────────────────────────────────────

test("Symbol.toStringTag returns 'Set'", () => {
  const s = new RSLikeSet();
  expect(s[Symbol.toStringTag]).toBe("Set");
});

// ── Manual iteration via next() ────────────────────────────────────────────────

test("values() manual next() + for...of share iterator state", () => {
  const s = new RSLikeSet([1, 2, 3]);
  const it = s.values();
  expect(it.next().unwrap()).toBe(1);
  const rest: number[] = [];
  for (const v of it) {
    rest.push(v);
  }
  expect(rest).toEqual([2, 3]);
});

test("values() manual iteration exhausts all values", () => {
  const s = new RSLikeSet([10, 20]);
  const it = s.values();
  const collected: number[] = [];
  let item = it.next();
  while (item.isSome()) {
    collected.push(item.unwrap());
    item = it.next();
  }
  expect(collected).toEqual([10, 20]);
});

// ── iter().collect(RSLikeSet) round-trip ───────────────────────────

test("iter collect(RSLikeSet) collects into RSLikeSet", () => {
  const result = iter([1, 2, 2, 3]).collect(RSLikeSet);
  expect(result).toBeInstanceOf(RSLikeSet);
  expect(result.size).toBe(3);
  expect(result.has(2)).toBe(true);
});
