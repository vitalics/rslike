import { expect, test, vi } from "vitest";
import { None, Some } from "@rslike/std";
import { Iter, iter } from "@rslike/iter";
import { Map as RSLikeMap } from "../src/index";

// Constructor
test("constructor creates empty map when called with no arguments", () => {
  const map = new RSLikeMap();
  expect(map.size).toBe(0);
});

test("constructor creates map from iterable of tuples", () => {
  const map = new RSLikeMap([
    ["a", 1],
    ["b", 2],
  ]);
  expect(map.size).toBe(2);
  expect(map.get("a").unwrap()).toBe(1);
  expect(map.get("b").unwrap()).toBe(2);
});

test("constructor creates empty map when called with null", () => {
  const map = new RSLikeMap(null);
  expect(map.size).toBe(0);
});

// get — core safe API
test("get returns Some with value when key exists", () => {
  const map = new RSLikeMap<string, number>();
  map.set("key", 42);
  const result = map.get("key");
  expect(result.isSome()).toBe(true);
  expect(result.unwrap()).toBe(42);
});

test("get returns None when key does not exist", () => {
  const map = new RSLikeMap<string, number>();
  const result = map.get("missing");
  expect(result.isNone()).toBe(true);
});

test("get returns None after key is deleted", () => {
  const map = new RSLikeMap<string, number>();
  map.set("x", 1);
  map.delete("x");
  expect(map.get("x").isNone()).toBe(true);
});

test("get returns None after clear", () => {
  const map = new RSLikeMap<string, number>();
  map.set("x", 1);
  map.clear();
  expect(map.get("x").isNone()).toBe(true);
});

test("get result is instanceof Some when key exists", () => {
  const map = new RSLikeMap<string, string>();
  map.set("k", "v");
  expect(map.get("k") instanceof Some).toBe(true);
});

test("get result is instanceof None when key does not exist", () => {
  const map = new RSLikeMap<string, string>();
  expect(map.get("missing") instanceof None).toBe(true);
});

// set
test("set returns None when key is new", () => {
  const map = new RSLikeMap<string, number>();
  const result = map.set("a", 1);
  expect(result.isNone()).toBe(true);
  expect(map.get("a").unwrap()).toBe(1);
});

test("set returns Some(oldValue) when key already existed", () => {
  const map = new RSLikeMap<string, number>();
  map.set("a", 1);
  const result = map.set("a", 99);
  expect(result.isSome()).toBe(true);
  expect(result.unwrap()).toBe(1);
});

test("set stores the new value regardless of whether key existed", () => {
  const map = new RSLikeMap<string, number>();
  map.set("a", 1);
  map.set("a", 99);
  expect(map.get("a").unwrap()).toBe(99);
  expect(map.size).toBe(1);
});

// has
test("has returns true when key exists", () => {
  const map = new RSLikeMap<string, number>();
  map.set("k", 1);
  expect(map.has("k")).toBe(true);
});

test("has returns false when key does not exist", () => {
  const map = new RSLikeMap<string, number>();
  expect(map.has("k")).toBe(false);
});

// delete
test("delete returns true and removes the key", () => {
  const map = new RSLikeMap<string, number>();
  map.set("k", 1);
  expect(map.delete("k")).toBe(true);
  expect(map.has("k")).toBe(false);
});

test("delete returns false when key does not exist", () => {
  const map = new RSLikeMap<string, number>();
  expect(map.delete("k")).toBe(false);
});

// clear
test("clear removes all entries", () => {
  const map = new RSLikeMap<string, number>([
    ["a", 1],
    ["b", 2],
  ]);
  map.clear();
  expect(map.size).toBe(0);
  expect(map.has("a")).toBe(false);
});

// size and length
test("size reflects the number of entries", () => {
  const map = new RSLikeMap<string, number>();
  expect(map.size).toBe(0);
  map.set("a", 1);
  expect(map.size).toBe(1);
  map.set("b", 2);
  expect(map.size).toBe(2);
  map.delete("a");
  expect(map.size).toBe(1);
});

test("length equals size", () => {
  const map = new RSLikeMap<string, number>([
    ["a", 1],
    ["b", 2],
    ["c", 3],
  ]);
  expect(map.length).toBe(map.size);
  expect(map.length).toBe(3);
});

// forEach
test("forEach calls callback for each entry with (value, key, map)", () => {
  const map = new RSLikeMap<string, number>([
    ["a", 1],
    ["b", 2],
  ]);
  const cb = vi.fn();
  map.forEach(cb);
  expect(cb).toBeCalledTimes(2);
  expect(cb).toHaveBeenCalledWith(1, "a", map._internalMap);
  expect(cb).toHaveBeenCalledWith(2, "b", map._internalMap);
});

test("forEach does not call callback on empty map", () => {
  const map = new RSLikeMap();
  const cb = vi.fn();
  map.forEach(cb);
  expect(cb).not.toBeCalled();
});

// entries
test("entries returns an iterator over [key, value] pairs", () => {
  const map = new RSLikeMap<string, number>([
    ["a", 1],
    ["b", 2],
  ]);
  const result = [...map.entries()];
  expect(result).toEqual([
    ["a", 1],
    ["b", 2],
  ]);
});

// keys
test("keys returns an iterator over all keys", () => {
  const map = new RSLikeMap<string, number>([
    ["x", 10],
    ["y", 20],
  ]);
  expect([...map.keys()]).toEqual(["x", "y"]);
});

// values
test("values returns an iterator over all values", () => {
  const map = new RSLikeMap<string, number>([
    ["x", 10],
    ["y", 20],
  ]);
  expect([...map.values()]).toEqual([10, 20]);
});

// Symbol.iterator
test("Symbol.iterator allows for...of iteration over [key, value] pairs", () => {
  const map = new RSLikeMap<string, number>([
    ["a", 1],
    ["b", 2],
  ]);
  const collected: [string, number][] = [];
  for (const entry of map) {
    collected.push(entry);
  }
  expect(collected).toEqual([
    ["a", 1],
    ["b", 2],
  ]);
});

test("spread operator works via Symbol.iterator", () => {
  const map = new RSLikeMap<string, number>([["k", 5]]);
  expect([...map]).toEqual([["k", 5]]);
});

// Symbol.toStringTag
test("Symbol.toStringTag returns 'Map'", () => {
  const map = new RSLikeMap();
  expect(map[Symbol.toStringTag]).toBe("Map");
});

// constructor with Iter
test("constructor creates map from Iter.from with tuples", () => {
  const map = new RSLikeMap(Iter.from([[1, 1] as const, [2, 2] as const]));
  expect(map.size).toBe(2);
  expect(map.get(1).unwrap()).toBe(1);
  expect(map.get(2).unwrap()).toBe(2);
});

test("constructor creates map from iter() helper with tuples", () => {
  const map = new RSLikeMap(
    iter([
      ["a", 10],
      ["b", 20],
    ] as const)
  );
  expect(map.size).toBe(2);
  expect(map.get("a").unwrap()).toBe(10);
  expect(map.get("b").unwrap()).toBe(20);
});

test("constructor creates empty map from empty Iter", () => {
  const map = new RSLikeMap(Iter.from([] as readonly (readonly [string, number])[]));
  expect(map.size).toBe(0);
});

test("constructor with Iter preserves all entries", () => {
  const entries = [
    [1, "one"],
    [2, "two"],
    [3, "three"],
  ] as const;
  const map = new RSLikeMap(Iter.from(entries));
  expect(map.size).toBe(3);
  expect(map.get(1).unwrap()).toBe("one");
  expect(map.get(2).unwrap()).toBe("two");
  expect(map.get(3).unwrap()).toBe("three");
});

test("constructor with Iter.from and mapFn transforms entries before insert", () => {
  // Iter.from([1, 2, 3], mapFn) producing tuples
  const map = new RSLikeMap<number, number>(
    Iter.from([1, 2, 3], (v) => [v, v * 10] as const)
  );
  expect(map.size).toBe(3);
  expect(map.get(1).unwrap()).toBe(10);
  expect(map.get(2).unwrap()).toBe(20);
  expect(map.get(3).unwrap()).toBe(30);
});

test("constructor with chained Iter adapters (filter)", () => {
  const entries = [
    [1, "odd"],
    [2, "even"],
    [3, "odd"],
    [4, "even"],
  ] as const;
  const map = new RSLikeMap(
    iter(entries).filter(([k]) => k % 2 === 0)
  );
  expect(map.size).toBe(2);
  expect(map.get(2).unwrap()).toBe("even");
  expect(map.get(4).unwrap()).toBe("even");
  expect(map.get(1).isNone()).toBe(true);
});

test("constructor with chained Iter adapters (map)", () => {
  const keys = Iter.from([1, 2, 3], (v) => [v, v ** 2] as const);
  const map = new RSLikeMap<number, number>(keys);
  expect(map.get(1).unwrap()).toBe(1);
  expect(map.get(2).unwrap()).toBe(4);
  expect(map.get(3).unwrap()).toBe(9);
});

// RSLikeMapIterator — safe next()

// entries()
test("entries().next() returns Some([key, value]) when has next entry", () => {
  const map = new RSLikeMap<string, number>([["a", 1]]);
  const result = map.entries().next();
  expect(result.isSome()).toBe(true);
  expect(result.unwrap()).toEqual(["a", 1]);
});

test("entries().next() returns None when map is empty", () => {
  const map = new RSLikeMap<string, number>();
  expect(map.entries().next().isNone()).toBe(true);
});

test("entries().next() returns None after all entries are consumed", () => {
  const map = new RSLikeMap<string, number>([["a", 1]]);
  const iter = map.entries();
  iter.next(); // consumes the only entry
  expect(iter.next().isNone()).toBe(true);
});

test("entries().next() instanceof Some / None", () => {
  const map = new RSLikeMap<string, number>([["k", 42]]);
  const iter = map.entries();
  expect(iter.next() instanceof Some).toBe(true);
  expect(iter.next() instanceof None).toBe(true);
});

test("entries() manual iteration exhausts all entries via next()", () => {
  const map = new RSLikeMap<string, number>([
    ["a", 1],
    ["b", 2],
    ["c", 3],
  ]);
  const iter = map.entries();
  const collected: [string, number][] = [];
  let item = iter.next();
  while (item.isSome()) {
    collected.push(item.unwrap());
    item = iter.next();
  }
  expect(collected).toEqual([
    ["a", 1],
    ["b", 2],
    ["c", 3],
  ]);
});

// keys()
test("keys().next() returns Some(key) when has next key", () => {
  const map = new RSLikeMap<string, number>([["x", 10]]);
  const result = map.keys().next();
  expect(result.isSome()).toBe(true);
  expect(result.unwrap()).toBe("x");
});

test("keys().next() returns None when map is empty", () => {
  const map = new RSLikeMap<string, number>();
  expect(map.keys().next().isNone()).toBe(true);
});

test("keys().next() returns None after all keys are consumed", () => {
  const map = new RSLikeMap<string, number>([["x", 10]]);
  const iter = map.keys();
  iter.next();
  expect(iter.next().isNone()).toBe(true);
});

// values()
test("values().next() returns Some(value) when has next value", () => {
  const map = new RSLikeMap<string, number>([["k", 99]]);
  const result = map.values().next();
  expect(result.isSome()).toBe(true);
  expect(result.unwrap()).toBe(99);
});

test("values().next() returns None when map is empty", () => {
  const map = new RSLikeMap<string, number>();
  expect(map.values().next().isNone()).toBe(true);
});

test("values().next() returns None after all values are consumed", () => {
  const map = new RSLikeMap<string, number>([["k", 99]]);
  const iter = map.values();
  iter.next();
  expect(iter.next().isNone()).toBe(true);
});

// for...of compatibility is preserved
test("entries() is still iterable via for...of after class change", () => {
  const map = new RSLikeMap<string, number>([
    ["a", 1],
    ["b", 2],
  ]);
  const collected: [string, number][] = [];
  for (const entry of map.entries()) {
    collected.push(entry);
  }
  expect(collected).toEqual([
    ["a", 1],
    ["b", 2],
  ]);
});

// shared iterator state: manual next() + for...of
test("manual next() and for...of share iterator state", () => {
  const map = new RSLikeMap<string, number>([
    ["a", 1],
    ["b", 2],
    ["c", 3],
  ]);
  const iter = map.entries();
  // consume first entry manually
  expect(iter.next().unwrap()).toEqual(["a", 1]);
  // for...of continues from second entry
  const rest: [string, number][] = [];
  for (const entry of iter) {
    rest.push(entry);
  }
  expect(rest).toEqual([
    ["b", 2],
    ["c", 3],
  ]);
});

// ── iter().collect(RSLikeMap) round-trip ───────────────────────────

test("iter collect(RSLikeMap) collects pairs into RSLikeMap", () => {
  const result = iter([["a", 1], ["b", 2]] as [string, number][]).collect(RSLikeMap);
  expect(result).toBeInstanceOf(RSLikeMap);
  expect(result.get("a").unwrap()).toBe(1);
  expect(result.size).toBe(2);
});
