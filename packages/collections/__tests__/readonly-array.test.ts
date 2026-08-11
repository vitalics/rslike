import { expect, test, vi } from "vitest";
import { Iter, ParIter } from "@rslike/iter";
import { Array as RSLikeArray, ReadonlyArray as RSLikeReadonlyArray } from "../src/index";

// Constructor
test("constructor creates empty readonly array with no arguments", () => {
  const arr = new RSLikeReadonlyArray();
  expect(arr.length).toBe(0);
});

test("constructor creates readonly array from iterable", () => {
  const arr = new RSLikeReadonlyArray([1, 2, 3]);
  expect(arr.length).toBe(3);
});

test("constructor creates empty readonly array from null", () => {
  expect(new RSLikeReadonlyArray(null).length).toBe(0);
});

test("constructor accepts readonly array", () => {
  const source = [10, 20, 30] as const;
  const arr = new RSLikeReadonlyArray(source);
  expect(arr.length).toBe(3);
  expect(arr.get(0).unwrap()).toBe(10);
});

test("RSLikeReadonlyArray.from creates from iterable", () => {
  const arr = RSLikeReadonlyArray.from([1, 2, 3]);
  expect(arr.length).toBe(3);
  expect(arr.get(2).unwrap()).toBe(3);
});

// get
test("get returns Some for valid index", () => {
  const arr = new RSLikeReadonlyArray([10, 20, 30]);
  expect(arr.get(0).unwrap()).toBe(10);
  expect(arr.get(2).unwrap()).toBe(30);
});

test("get returns None for out-of-bounds index", () => {
  const arr = new RSLikeReadonlyArray([1, 2]);
  expect(arr.get(5).isNone()).toBe(true);
});

test("get returns None for negative index", () => {
  expect(new RSLikeReadonlyArray([1]).get(-1).isNone()).toBe(true);
});

// at
test("at returns Some for positive index", () => {
  expect(new RSLikeReadonlyArray([1, 2, 3]).at(1).unwrap()).toBe(2);
});

test("at returns Some for negative index (from end)", () => {
  const arr = new RSLikeReadonlyArray([10, 20, 30]);
  expect(arr.at(-1).unwrap()).toBe(30);
  expect(arr.at(-3).unwrap()).toBe(10);
});

test("at returns None when out of bounds", () => {
  expect(new RSLikeReadonlyArray([1]).at(99).isNone()).toBe(true);
  expect(new RSLikeReadonlyArray([1]).at(-99).isNone()).toBe(true);
});

// first / last
test("first returns Some for non-empty array", () => {
  expect(new RSLikeReadonlyArray([7, 8, 9]).first().unwrap()).toBe(7);
});

test("first returns None for empty array", () => {
  expect(new RSLikeReadonlyArray<number>().first().isNone()).toBe(true);
});

test("last returns Some for non-empty array", () => {
  expect(new RSLikeReadonlyArray([7, 8, 9]).last().unwrap()).toBe(9);
});

test("last returns None for empty array", () => {
  expect(new RSLikeReadonlyArray<number>().last().isNone()).toBe(true);
});

// find
test("find returns Some when predicate matches", () => {
  const arr = new RSLikeReadonlyArray([1, 2, 3]);
  expect(arr.find(v => v > 1).unwrap()).toBe(2);
});

test("find returns None when no element matches", () => {
  expect(new RSLikeReadonlyArray([1, 2]).find(v => v > 10).isNone()).toBe(true);
});

// findIndex
test("findIndex returns Some(index) when found", () => {
  const arr = new RSLikeReadonlyArray(["a", "b", "c"]);
  expect(arr.findIndex(v => v === "b").unwrap()).toBe(1);
});

test("findIndex returns None when not found", () => {
  expect(new RSLikeReadonlyArray([1]).findIndex(v => v > 100).isNone()).toBe(true);
});

// map — returns RSLikeArray (mutable)
test("map returns a new RSLikeArray", () => {
  const arr = new RSLikeReadonlyArray([1, 2, 3]);
  const result = arr.map(v => v * 2);
  expect(result).toBeInstanceOf(RSLikeArray);
  expect(result.get(0).unwrap()).toBe(2);
});

// filter — returns RSLikeReadonlyArray
test("filter returns a new RSLikeReadonlyArray", () => {
  const arr = new RSLikeReadonlyArray([1, 2, 3, 4]);
  const result = arr.filter(v => v % 2 === 0);
  expect(result).toBeInstanceOf(RSLikeReadonlyArray);
  expect(result.length).toBe(2);
});

// forEach
test("forEach calls callback for each element", () => {
  const arr = new RSLikeReadonlyArray([1, 2, 3]);
  const cb = vi.fn();
  arr.forEach(cb);
  expect(cb).toBeCalledTimes(3);
});

// some / every / includes
test("some works correctly", () => {
  expect(new RSLikeReadonlyArray([1, 2, 3]).some(v => v > 2)).toBe(true);
  expect(new RSLikeReadonlyArray([1, 2, 3]).some(v => v > 10)).toBe(false);
});

test("every works correctly", () => {
  expect(new RSLikeReadonlyArray([2, 4, 6]).every(v => v % 2 === 0)).toBe(true);
  expect(new RSLikeReadonlyArray([2, 3]).every(v => v % 2 === 0)).toBe(false);
});

test("includes returns true when element is present", () => {
  expect(new RSLikeReadonlyArray([1, 2, 3]).includes(2)).toBe(true);
  expect(new RSLikeReadonlyArray([1, 2, 3]).includes(9)).toBe(false);
});

// slice — returns RSLikeReadonlyArray
test("slice returns a new RSLikeReadonlyArray", () => {
  const arr = new RSLikeReadonlyArray([1, 2, 3, 4, 5]);
  const sliced = arr.slice(1, 3);
  expect(sliced).toBeInstanceOf(RSLikeReadonlyArray);
  expect(sliced.length).toBe(2);
  expect(sliced.get(0).unwrap()).toBe(2);
});

// Symbol.iterator
test("Symbol.iterator allows for...of", () => {
  const arr = new RSLikeReadonlyArray([10, 20, 30]);
  const collected: number[] = [];
  for (const v of arr) collected.push(v);
  expect(collected).toEqual([10, 20, 30]);
});

// iter()
test("iter() returns an Iter instance", () => {
  const arr = new RSLikeReadonlyArray([1, 2, 3]);
  const it = arr.iter();
  expect(it).toBeInstanceOf(Iter);
  expect(it.collect()).toEqual([1, 2, 3]);
});

// parIter()
test("parIter() returns a ParIter instance", () => {
  expect(new RSLikeReadonlyArray([1, 2]).parIter()).toBeInstanceOf(ParIter);
});

test("parIter().map() is lazy then collect() executes", async () => {
  const arr = new RSLikeReadonlyArray([1, 2, 3]);
  const result = await arr.parIter().map(async v => v + 10).collect();
  expect(result).toEqual([11, 12, 13]);
});

test("parIter().filter() is lazy then collect() executes", async () => {
  const arr = new RSLikeReadonlyArray([1, 2, 3, 4, 5]);
  const result = await arr.parIter().filter(async v => v % 2 !== 0).collect();
  expect(result).toEqual([1, 3, 5]);
});

// No mutating methods
test("pop is not a method on RSLikeReadonlyArray", () => {
  const arr = new RSLikeReadonlyArray([1, 2]);
  expect(typeof (arr as any).pop).toBe("undefined");
});

test("push is not a method on RSLikeReadonlyArray", () => {
  const arr = new RSLikeReadonlyArray([1, 2]);
  expect(typeof (arr as any).push).toBe("undefined");
});

test("shift is not a method on RSLikeReadonlyArray", () => {
  const arr = new RSLikeReadonlyArray([1, 2]);
  expect(typeof (arr as any).shift).toBe("undefined");
});

// ── doubleEndedIter ────────────────────────────────────────────────

test("doubleEndedIter() returns DoubleEndedIter over the array", () => {
  const dei = new RSLikeReadonlyArray([1, 2, 3, 4]).doubleEndedIter();
  expect(dei.next().unwrap()).toBe(1);
  expect(dei.nextBack().unwrap()).toBe(4);
  expect(dei.collect()).toEqual([2, 3]);
});

// ── keys / values / entries ────────────────────────────────────────

test("keys() yields indices", () => {
  expect(new RSLikeReadonlyArray(["a", "b", "c"]).keys().collect()).toEqual([0, 1, 2]);
});

test("values() yields values like iter()", () => {
  expect(new RSLikeReadonlyArray([1, 2, 3]).values().collect()).toEqual([1, 2, 3]);
});

test("entries() yields [index, value] pairs", () => {
  expect(new RSLikeReadonlyArray(["a", "b"]).entries().collect()).toEqual([[0, "a"], [1, "b"]]);
});

test("keys()/values()/entries() on empty array", () => {
  const arr = new RSLikeReadonlyArray<number>();
  expect(arr.keys().collect()).toEqual([]);
  expect(arr.values().collect()).toEqual([]);
  expect(arr.entries().collect()).toEqual([]);
});

// ── isEmpty ────────────────────────────────────────────────────────

test("isEmpty() is true for empty array", () => {
  expect(new RSLikeReadonlyArray().isEmpty()).toBe(true);
});

test("isEmpty() is false for non-empty array", () => {
  expect(new RSLikeReadonlyArray([1]).isEmpty()).toBe(false);
});
