import { test, expect } from "vitest";
import { Option, Some, None } from "@rslike/std";
import { DoubleEndedIter, Iter, iter, doubleEndedIter } from "../src/index";

// ── DoubleEndedIter.from() ─────────────────────────────────────────

test("DoubleEndedIter.from creates instance from array", () => {
  const dei = DoubleEndedIter.from([1, 2, 3]);
  expect(dei).toBeInstanceOf(DoubleEndedIter);
  expect(dei.collect()).toEqual([1, 2, 3]);
});

test("DoubleEndedIter.from supports double-ended iteration", () => {
  const dei = DoubleEndedIter.from([1, 2, 3, 4]);
  expect(dei.next().unwrap()).toBe(1);
  expect(dei.nextBack().unwrap()).toBe(4);
  expect(dei.next().unwrap()).toBe(2);
  expect(dei.nextBack().unwrap()).toBe(3);
  expect(dei.next().isNone()).toBe(true);
});

test("DoubleEndedIter.from empty array", () => {
  const dei = DoubleEndedIter.from<number>([]);
  expect(dei.collect()).toEqual([]);
  expect(dei.next().isNone()).toBe(true);
});

test("DoubleEndedIter.from supports chaining", () => {
  const result = DoubleEndedIter.from([1, 2, 3, 4, 5])
    .filter(x => x % 2 !== 0)
    .rev()
    .collect();
  expect(result).toEqual([5, 3, 1]);
});

// ── Factory ────────────────────────────────────────────────────────

test("doubleEndedIter creates DoubleEndedIter from array", () => {
  const dei = doubleEndedIter([1, 2, 3]);
  expect(dei).toBeInstanceOf(DoubleEndedIter);
  expect(dei.collect()).toEqual([1, 2, 3]);
});

test("doubleEndedIter from empty array", () => {
  const dei = doubleEndedIter<number>([]);
  expect(dei.collect()).toEqual([]);
});

// ── next() ─────────────────────────────────────────────────────────

test("next advances from the front", () => {
  const dei = doubleEndedIter([10, 20, 30]);
  const first = dei.next();
  expect(first).toBeInstanceOf(Option);
  expect(first.unwrap()).toBe(10);
  expect(dei.next().unwrap()).toBe(20);
  expect(dei.next().unwrap()).toBe(30);
});

test("next returns None when exhausted", () => {
  const dei = doubleEndedIter([1]);
  dei.next();
  expect(dei.next().isNone()).toBe(true);
});

// ── nextBack() ─────────────────────────────────────────────────────

test("nextBack advances from the back", () => {
  const dei = doubleEndedIter([10, 20, 30]);
  expect(dei.nextBack().unwrap()).toBe(30);
  expect(dei.nextBack().unwrap()).toBe(20);
  expect(dei.nextBack().unwrap()).toBe(10);
});

test("nextBack returns None when exhausted", () => {
  const dei = doubleEndedIter([1]);
  dei.nextBack();
  expect(dei.nextBack().isNone()).toBe(true);
});

test("nextBack on empty iterator returns None", () => {
  const dei = doubleEndedIter<number>([]);
  expect(dei.nextBack().isNone()).toBe(true);
});

// ── Interleaved next/nextBack ──────────────────────────────────────

test("next and nextBack share cursor state", () => {
  const dei = doubleEndedIter([1, 2, 3, 4]);
  expect(dei.next().unwrap()).toBe(1);
  expect(dei.nextBack().unwrap()).toBe(4);
  expect(dei.next().unwrap()).toBe(2);
  expect(dei.nextBack().unwrap()).toBe(3);
  expect(dei.next().isNone()).toBe(true);
  expect(dei.nextBack().isNone()).toBe(true);
});

test("interleaved with odd count", () => {
  const dei = doubleEndedIter([1, 2, 3]);
  expect(dei.next().unwrap()).toBe(1);
  expect(dei.nextBack().unwrap()).toBe(3);
  expect(dei.next().unwrap()).toBe(2);
  expect(dei.next().isNone()).toBe(true);
  expect(dei.nextBack().isNone()).toBe(true);
});

// ── Symbol.iterator / for...of ─────────────────────────────────────

test("works with for...of", () => {
  const result: number[] = [];
  for (const x of doubleEndedIter([1, 2, 3])) {
    result.push(x);
  }
  expect(result).toEqual([1, 2, 3]);
});

test("works with spread operator", () => {
  expect([...doubleEndedIter([1, 2, 3])]).toEqual([1, 2, 3]);
});

// ── rev() ──────────────────────────────────────────────────────────

test("rev returns reversed DoubleEndedIter", () => {
  const dei = doubleEndedIter([1, 2, 3]);
  const reversed = dei.rev();
  expect(reversed).toBeInstanceOf(DoubleEndedIter);
  expect(reversed.collect()).toEqual([3, 2, 1]);
});

test("rev on empty iterator", () => {
  expect(doubleEndedIter<number>([]).rev().collect()).toEqual([]);
});

test("rev respects consumed elements", () => {
  const dei = doubleEndedIter([1, 2, 3, 4, 5]);
  dei.next();     // consumes 1
  dei.nextBack(); // consumes 5
  const reversed = dei.rev();
  expect(reversed.collect()).toEqual([4, 3, 2]);
});

// ── rfold() ────────────────────────────────────────────────────────

test("rfold folds from the back", () => {
  const result = doubleEndedIter([1, 2, 3]).rfold("", (acc, x) => acc + String(x));
  expect(result).toBe("321");
});

test("rfold on empty iterator returns init", () => {
  const result = doubleEndedIter<number>([]).rfold(42, (acc, x) => acc + x);
  expect(result).toBe(42);
});

test("rfold respects already consumed back elements", () => {
  const dei = doubleEndedIter([1, 2, 3, 4]);
  dei.nextBack(); // consumes 4
  const result = dei.rfold(0, (acc, x) => acc + x);
  expect(result).toBe(3 + 2 + 1); // 6
});

// ── rfind() ────────────────────────────────────────────────────────

test("rfind finds first match from the back", () => {
  const result = doubleEndedIter([1, 2, 3, 4]).rfind((x) => x < 3);
  expect(result.unwrap()).toBe(2);
});

test("rfind returns None if no match", () => {
  const result = doubleEndedIter([1, 2, 3]).rfind((x) => x > 10);
  expect(result.isNone()).toBe(true);
});

test("rfind on empty iterator returns None", () => {
  const result = doubleEndedIter<number>([]).rfind(() => true);
  expect(result.isNone()).toBe(true);
});

// ── rposition() ────────────────────────────────────────────────────

test("rposition returns index of first match from back", () => {
  const result = doubleEndedIter([1, 2, 3, 2, 1]).rposition((x) => x === 2);
  expect(result.unwrap()).toBe(3);
});

test("rposition returns None if no match", () => {
  const result = doubleEndedIter([1, 2, 3]).rposition((x) => x === 10);
  expect(result.isNone()).toBe(true);
});

test("rposition on empty iterator returns None", () => {
  const result = doubleEndedIter<number>([]).rposition(() => true);
  expect(result.isNone()).toBe(true);
});

// ── map (override) ─────────────────────────────────────────────────

test("map returns DoubleEndedIter", () => {
  const dei = doubleEndedIter([1, 2, 3]).map((x) => x * 10);
  expect(dei).toBeInstanceOf(DoubleEndedIter);
  expect(dei.collect()).toEqual([10, 20, 30]);
});

test("map preserves double-ended capability", () => {
  const dei = doubleEndedIter([1, 2, 3]).map((x) => x * 2);
  expect(dei.nextBack().unwrap()).toBe(6);
  expect(dei.next().unwrap()).toBe(2);
});

// ── filter (override) ──────────────────────────────────────────────

test("filter returns DoubleEndedIter", () => {
  const dei = doubleEndedIter([1, 2, 3, 4, 5]).filter((x) => x % 2 === 0);
  expect(dei).toBeInstanceOf(DoubleEndedIter);
  expect(dei.collect()).toEqual([2, 4]);
});

test("filter preserves double-ended capability", () => {
  const dei = doubleEndedIter([1, 2, 3, 4, 5]).filter((x) => x % 2 !== 0);
  expect(dei.nextBack().unwrap()).toBe(5);
  expect(dei.next().unwrap()).toBe(1);
  expect(dei.next().unwrap()).toBe(3);
  expect(dei.next().isNone()).toBe(true);
});

// ── take (override) ────────────────────────────────────────────────

test("take returns DoubleEndedIter", () => {
  const dei = doubleEndedIter([1, 2, 3, 4, 5]).take(3);
  expect(dei).toBeInstanceOf(DoubleEndedIter);
  expect(dei.collect()).toEqual([1, 2, 3]);
});

test("take preserves double-ended capability", () => {
  const dei = doubleEndedIter([1, 2, 3, 4, 5]).take(3);
  expect(dei.nextBack().unwrap()).toBe(3);
  expect(dei.next().unwrap()).toBe(1);
});

test("take with n greater than length", () => {
  const dei = doubleEndedIter([1, 2]).take(5);
  expect(dei.collect()).toEqual([1, 2]);
});

// ── skip (override) ────────────────────────────────────────────────

test("skip returns DoubleEndedIter", () => {
  const dei = doubleEndedIter([1, 2, 3, 4, 5]).skip(2);
  expect(dei).toBeInstanceOf(DoubleEndedIter);
  expect(dei.collect()).toEqual([3, 4, 5]);
});

test("skip preserves double-ended capability", () => {
  const dei = doubleEndedIter([1, 2, 3, 4, 5]).skip(2);
  expect(dei.nextBack().unwrap()).toBe(5);
  expect(dei.next().unwrap()).toBe(3);
});

test("skip with n greater than length", () => {
  const dei = doubleEndedIter([1, 2]).skip(5);
  expect(dei.collect()).toEqual([]);
});

// ── Inherited Iter methods work ────────────────────────────────────

test("fold works on DoubleEndedIter", () => {
  const result = doubleEndedIter([1, 2, 3]).fold(0, (acc, x) => acc + x);
  expect(result).toBe(6);
});

test("find works on DoubleEndedIter", () => {
  const result = doubleEndedIter([1, 2, 3, 4]).find((x) => x > 2);
  expect(result.unwrap()).toBe(3);
});

test("any works on DoubleEndedIter", () => {
  expect(doubleEndedIter([1, 2, 3]).any((x) => x === 2)).toBe(true);
  expect(doubleEndedIter([1, 2, 3]).any((x) => x === 5)).toBe(false);
});

test("all works on DoubleEndedIter", () => {
  expect(doubleEndedIter([2, 4, 6]).all((x) => x % 2 === 0)).toBe(true);
  expect(doubleEndedIter([2, 3, 6]).all((x) => x % 2 === 0)).toBe(false);
});

test("count works on DoubleEndedIter", () => {
  expect(doubleEndedIter([1, 2, 3]).count()).toBe(3);
});

test("enumerate works on DoubleEndedIter", () => {
  const result = doubleEndedIter(["a", "b"]).enumerate().collect();
  expect(result).toEqual([[0, "a"], [1, "b"]]);
});

// ── Iter.rev() ─────────────────────────────────────────────────────

test("Iter.rev() returns reversed Iter", () => {
  const result = iter([1, 2, 3]).rev().collect();
  expect(result).toEqual([3, 2, 1]);
});

test("Iter.rev() on empty iterator", () => {
  expect(iter([]).rev().collect()).toEqual([]);
});

test("Iter.rev() after partial consumption", () => {
  const it = iter([1, 2, 3, 4, 5]);
  it.next(); // consumes 1
  it.next(); // consumes 2
  const reversed = it.rev();
  expect(reversed.collect()).toEqual([5, 4, 3]);
});

// ── filter_map (DoubleEndedIter override) ──────────────────────────

test("filter_map returns DoubleEndedIter", () => {
  const dei = doubleEndedIter([1, 2, 3, 4, 5])
    .filter_map(x => x % 2 === 0 ? Some(x * 10) : None());
  expect(dei).toBeInstanceOf(DoubleEndedIter);
  expect(dei.collect()).toEqual([20, 40]);
});

test("filter_map preserves double-ended capability", () => {
  const dei = doubleEndedIter([1, 2, 3, 4, 5])
    .filter_map(x => x % 2 !== 0 ? Some(x) : None());
  expect(dei.nextBack().unwrap()).toBe(5);
  expect(dei.next().unwrap()).toBe(1);
  expect(dei.next().unwrap()).toBe(3);
  expect(dei.next().isNone()).toBe(true);
});

test("filter_map all None returns empty DoubleEndedIter", () => {
  const dei = doubleEndedIter([1, 2, 3]).filter_map(() => None());
  expect(dei).toBeInstanceOf(DoubleEndedIter);
  expect(dei.collect()).toEqual([]);
});

test("filter_map changes type", () => {
  const result = doubleEndedIter([1, 2, 3, 4, 5, 6])
    .filter_map(n => n > 3 ? Some(`val:${n}`) : None())
    .collect();
  expect(result).toEqual(["val:4", "val:5", "val:6"]);
});

test("DoubleEndedIter.from with filter_map chain", () => {
  const result = DoubleEndedIter.from([1, 2, 3, 4, 5, 6])
    .filter(n => n % 2 === 0)
    .map(n => n * 10)
    .filter_map(n => n > 20 ? Some(`Value: ${n}`) : None())
    .rev()
    .collect();
  expect(result).toEqual(["Value: 60", "Value: 40"]);
});

// ── collect(ctor) ──────────────────────────────────────────────────

test("collect() with no ctor returns plain array", () => {
  expect(doubleEndedIter([1, 2, 3]).collect()).toEqual([1, 2, 3]);
});

test("collect(Array) returns plain array, not nested", () => {
  const result = doubleEndedIter([1, 2, 3]).collect(Array);
  expect(result).toEqual([1, 2, 3]);
  expect(Array.isArray(result)).toBe(true);
});

test("collect(Set) dedupes remaining elements", () => {
  const result = doubleEndedIter([1, 2, 2, 3]).collect(Set);
  expect(result).toBeInstanceOf(Set);
  expect([...result]).toEqual([1, 2, 3]);
});

test("collect(Map) from pairs", () => {
  const result = doubleEndedIter([["a", 1], ["b", 2]] as [string, number][]).collect(Map);
  expect(result).toBeInstanceOf(Map);
  expect(result.get("b")).toBe(2);
});

test("collect(Iter) returns a re-iterable Iter", () => {
  const result = doubleEndedIter([1, 2, 3]).collect(Iter);
  expect(result).toBeInstanceOf(Iter);
  expect(result.collect()).toEqual([1, 2, 3]);
});

test("collect(DoubleEndedIter) preserves double-ended access", () => {
  const result = doubleEndedIter([1, 2, 3]).collect(DoubleEndedIter);
  expect(result).toBeInstanceOf(DoubleEndedIter);
  expect(result.nextBack().unwrap()).toBe(3);
});

test("collect(ctor) collects only remaining elements", () => {
  const dei = doubleEndedIter([1, 2, 3, 4]);
  dei.next();
  dei.nextBack();
  expect(dei.collect(Array)).toEqual([2, 3]);
});
