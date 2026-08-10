import { expect, test, vi } from "vitest";
import { None, Some } from "@rslike/std";
import { Iter, ParIter } from "@rslike/iter";
import { Array as RSLikeArray } from "../src/index";

// Constructor
test("constructor creates empty array with no arguments", () => {
  const arr = new RSLikeArray();
  expect(arr.length).toBe(0);
});

test("constructor creates array from iterable", () => {
  const arr = new RSLikeArray([1, 2, 3]);
  expect(arr.length).toBe(3);
});

test("constructor creates empty array from null", () => {
  const arr = new RSLikeArray(null);
  expect(arr.length).toBe(0);
});

test("RSLikeArray.from creates array from iterable", () => {
  const arr = RSLikeArray.from([10, 20, 30]);
  expect(arr.length).toBe(3);
  expect(arr.get(0).unwrap()).toBe(10);
});

// get
test("get returns Some(value) for valid index", () => {
  const arr = new RSLikeArray([1, 2, 3]);
  expect(arr.get(0).unwrap()).toBe(1);
  expect(arr.get(2).unwrap()).toBe(3);
});

test("get returns None for out-of-bounds index", () => {
  const arr = new RSLikeArray([1, 2]);
  expect(arr.get(5).isNone()).toBe(true);
});

test("get returns None for negative index", () => {
  const arr = new RSLikeArray([1, 2]);
  expect(arr.get(-1).isNone()).toBe(true);
});

test("get returns None for empty array", () => {
  const arr = new RSLikeArray<number>();
  expect(arr.get(0).isNone()).toBe(true);
});

// at
test("at returns Some for positive index", () => {
  const arr = new RSLikeArray([10, 20, 30]);
  expect(arr.at(1).unwrap()).toBe(20);
});

test("at returns Some for negative index (from end)", () => {
  const arr = new RSLikeArray([10, 20, 30]);
  expect(arr.at(-1).unwrap()).toBe(30);
  expect(arr.at(-2).unwrap()).toBe(20);
});

test("at returns None when out of bounds", () => {
  const arr = new RSLikeArray([1, 2]);
  expect(arr.at(10).isNone()).toBe(true);
  expect(arr.at(-10).isNone()).toBe(true);
});

// first / last
test("first returns Some for non-empty array", () => {
  const arr = new RSLikeArray([5, 6, 7]);
  expect(arr.first().unwrap()).toBe(5);
});

test("first returns None for empty array", () => {
  expect(new RSLikeArray<number>().first().isNone()).toBe(true);
});

test("last returns Some for non-empty array", () => {
  const arr = new RSLikeArray([5, 6, 7]);
  expect(arr.last().unwrap()).toBe(7);
});

test("last returns None for empty array", () => {
  expect(new RSLikeArray<number>().last().isNone()).toBe(true);
});

// pop
test("pop returns Some(last) and removes it", () => {
  const arr = new RSLikeArray([1, 2, 3]);
  const result = arr.pop();
  expect(result.unwrap()).toBe(3);
  expect(arr.length).toBe(2);
});

test("pop returns None for empty array", () => {
  expect(new RSLikeArray<number>().pop().isNone()).toBe(true);
});

// shift
test("shift returns Some(first) and removes it", () => {
  const arr = new RSLikeArray([10, 20, 30]);
  const result = arr.shift();
  expect(result.unwrap()).toBe(10);
  expect(arr.length).toBe(2);
  expect(arr.get(0).unwrap()).toBe(20);
});

test("shift returns None for empty array", () => {
  expect(new RSLikeArray<number>().shift().isNone()).toBe(true);
});

// find
test("find returns Some(value) when predicate matches", () => {
  const arr = new RSLikeArray([1, 2, 3, 4]);
  expect(arr.find(v => v > 2).unwrap()).toBe(3);
});

test("find returns None when no element matches", () => {
  const arr = new RSLikeArray([1, 2, 3]);
  expect(arr.find(v => v > 10).isNone()).toBe(true);
});

test("find returns None for empty array", () => {
  expect(new RSLikeArray<number>().find(() => true).isNone()).toBe(true);
});

// findIndex
test("findIndex returns Some(index) when predicate matches", () => {
  const arr = new RSLikeArray([10, 20, 30]);
  expect(arr.findIndex(v => v === 20).unwrap()).toBe(1);
});

test("findIndex returns None when no element matches", () => {
  const arr = new RSLikeArray([1, 2]);
  expect(arr.findIndex(v => v > 100).isNone()).toBe(true);
});

// push
test("push increases length and appends elements", () => {
  const arr = new RSLikeArray<number>();
  arr.push(1, 2, 3);
  expect(arr.length).toBe(3);
  expect(arr.last().unwrap()).toBe(3);
});

// map
test("map transforms values and returns a new RSLikeArray", () => {
  const arr = new RSLikeArray([1, 2, 3]);
  const doubled = arr.map(v => v * 2);
  expect(doubled).toBeInstanceOf(RSLikeArray);
  expect(doubled.get(0).unwrap()).toBe(2);
  expect(doubled.get(2).unwrap()).toBe(6);
});

// filter
test("filter returns a new RSLikeArray with matching elements", () => {
  const arr = new RSLikeArray([1, 2, 3, 4]);
  const evens = arr.filter(v => v % 2 === 0);
  expect(evens).toBeInstanceOf(RSLikeArray);
  expect(evens.length).toBe(2);
  expect(evens.get(0).unwrap()).toBe(2);
});

// forEach
test("forEach calls callback for each element", () => {
  const arr = new RSLikeArray([1, 2, 3]);
  const cb = vi.fn();
  arr.forEach(cb);
  expect(cb).toBeCalledTimes(3);
});

// some / every / includes
test("some returns true when at least one element matches", () => {
  expect(new RSLikeArray([1, 2, 3]).some(v => v > 2)).toBe(true);
  expect(new RSLikeArray([1, 2, 3]).some(v => v > 10)).toBe(false);
});

test("every returns true when all elements match", () => {
  expect(new RSLikeArray([2, 4, 6]).every(v => v % 2 === 0)).toBe(true);
  expect(new RSLikeArray([2, 3, 6]).every(v => v % 2 === 0)).toBe(false);
});

test("includes returns true when element is present", () => {
  expect(new RSLikeArray([1, 2, 3]).includes(2)).toBe(true);
  expect(new RSLikeArray([1, 2, 3]).includes(9)).toBe(false);
});

// slice
test("slice returns a new RSLikeArray with the given range", () => {
  const arr = new RSLikeArray([1, 2, 3, 4, 5]);
  const sliced = arr.slice(1, 3);
  expect(sliced).toBeInstanceOf(RSLikeArray);
  expect(sliced.length).toBe(2);
  expect(sliced.get(0).unwrap()).toBe(2);
  expect(sliced.get(1).unwrap()).toBe(3);
});

// Symbol.iterator
test("Symbol.iterator allows for...of", () => {
  const arr = new RSLikeArray([1, 2, 3]);
  const collected: number[] = [];
  for (const v of arr) collected.push(v);
  expect(collected).toEqual([1, 2, 3]);
});

// iter()
test("iter() returns an Iter instance", () => {
  const arr = new RSLikeArray([1, 2, 3]);
  const it = arr.iter();
  expect(it).toBeInstanceOf(Iter);
  expect(it.collect()).toEqual([1, 2, 3]);
});

// parIter()
test("parIter() returns a ParIter instance", () => {
  const arr = new RSLikeArray([1, 2, 3]);
  expect(arr.parIter()).toBeInstanceOf(ParIter);
});

test("parIter().map() is lazy — returns ParIter without executing", () => {
  const arr = new RSLikeArray([1, 2, 3]);
  const result = arr.parIter().map(async v => v * 10); // no await
  expect(result).toBeInstanceOf(ParIter);
});

test("parIter().map().collect() executes pipeline concurrently", async () => {
  const arr = new RSLikeArray([1, 2, 3]);
  const result = await arr.parIter().map(async v => v * 10).collect();
  expect(result).toEqual([10, 20, 30]);
});

test("parIter().filter() is lazy — returns ParIter without executing", () => {
  const arr = new RSLikeArray([1, 2, 3, 4]);
  expect(arr.parIter().filter(v => v % 2 === 0)).toBeInstanceOf(ParIter);
});

test("parIter().filter().collect() returns filtered results", async () => {
  const arr = new RSLikeArray([1, 2, 3, 4]);
  const result = await arr.parIter().filter(async v => v % 2 === 0).collect();
  expect(result).toEqual([2, 4]);
});

test("parIter().forEach() runs all callbacks concurrently", async () => {
  const arr = new RSLikeArray([1, 2, 3]);
  const seen: number[] = [];
  await arr.parIter().forEach(async v => { seen.push(v); });
  expect(seen.sort()).toEqual([1, 2, 3]);
});

test("parIter().chunks() is lazy — returns ParIter without executing", () => {
  const arr = new RSLikeArray([1, 2, 3, 4, 5]);
  expect(arr.parIter().chunks(2)).toBeInstanceOf(ParIter);
});

test("parIter().chunks().collect() splits into batches", async () => {
  const arr = new RSLikeArray([1, 2, 3, 4, 5]);
  const result = await arr.parIter().chunks(2).collect();
  expect(result).toEqual([[1, 2], [3, 4], [5]]);
});

test("parIter() chains filter + map lazily then collects", async () => {
  const arr = new RSLikeArray([1, 2, 3, 4, 5, 6]);
  const result = await arr
    .parIter()
    .filter(v => v % 2 === 0)
    .map(v => v * 10)
    .collect();
  expect(result).toEqual([20, 40, 60]);
});

test("parIter().fold() sequentially folds to single value", async () => {
  const arr = new RSLikeArray([1, 2, 3, 4]);
  const sum = await arr.parIter().fold(0, async (acc, v) => acc + v);
  expect(sum).toBe(10);
});

// ── doubleEndedIter ────────────────────────────────────────────────

test("doubleEndedIter() returns DoubleEndedIter over the array", () => {
  const dei = new RSLikeArray([1, 2, 3, 4]).doubleEndedIter();
  expect(dei.next().unwrap()).toBe(1);
  expect(dei.nextBack().unwrap()).toBe(4);
  expect(dei.collect()).toEqual([2, 3]);
});

test("doubleEndedIter() on empty array", () => {
  const dei = new RSLikeArray<number>().doubleEndedIter();
  expect(dei.next().isNone()).toBe(true);
  expect(dei.nextBack().isNone()).toBe(true);
});

// ── keys / values / entries ────────────────────────────────────────

test("keys() yields indices", () => {
  const arr = new RSLikeArray(["a", "b", "c"]);
  expect(arr.keys().collect()).toEqual([0, 1, 2]);
});

test("values() yields values like iter()", () => {
  const arr = new RSLikeArray([1, 2, 3]);
  expect(arr.values().collect()).toEqual([1, 2, 3]);
});

test("entries() yields [index, value] pairs", () => {
  const arr = new RSLikeArray(["a", "b"]);
  expect(arr.entries().collect()).toEqual([[0, "a"], [1, "b"]]);
});

test("keys()/values()/entries() on empty array", () => {
  const arr = new RSLikeArray<number>();
  expect(arr.keys().collect()).toEqual([]);
  expect(arr.values().collect()).toEqual([]);
  expect(arr.entries().collect()).toEqual([]);
});

test("values() supports lazy adapter chains", () => {
  const arr = new RSLikeArray([1, 2, 3, 4]);
  expect(arr.values().filter(v => v % 2 === 0).map(v => v * 10).collect()).toEqual([20, 40]);
});

// ── isEmpty ────────────────────────────────────────────────────────

test("isEmpty() is true for empty array", () => {
  expect(new RSLikeArray().isEmpty()).toBe(true);
});

test("isEmpty() is false for non-empty array", () => {
  expect(new RSLikeArray([1]).isEmpty()).toBe(false);
});
