import { expect, test, vi } from "vitest";
import { None, Some } from "@rslike/std";
import { Iter, ParIter } from "@rslike/iter";
import { Map as RSLikeMap, ReadonlyMap as RSLikeReadonlyMap } from "../src/index";

// ── Constructor ───────────────────────────────────────────────────────────────

test("constructor creates empty map with no arguments", () => {
  const m = new RSLikeReadonlyMap();
  expect(m.size).toBe(0);
  expect(m.isEmpty()).toBe(true);
});

test("constructor creates map from array of tuples", () => {
  const m = new RSLikeReadonlyMap([["a", 1], ["b", 2]] as const);
  expect(m.size).toBe(2);
  expect(m.get("a").unwrap()).toBe(1);
});

test("constructor creates empty map from null", () => {
  expect(new RSLikeReadonlyMap(null).size).toBe(0);
});

test("RSLikeReadonlyMap.from() works like constructor", () => {
  const m = RSLikeReadonlyMap.from([["x", 10]] as const);
  expect(m.get("x").unwrap()).toBe(10);
});

// ── Defensive copy: mutations to source are NOT reflected ─────────────────────

test("mutations to the source Map after construction are not reflected", () => {
  const source = new Map([["a", 1]]);
  const m = new RSLikeReadonlyMap(source);
  source.set("b", 2);
  source.delete("a");
  // readonly map still holds the original snapshot
  expect(m.size).toBe(1);
  expect(m.get("a").unwrap()).toBe(1);
  expect(m.has("b")).toBe(false);
});

test("mutations to the source RSLikeMap after construction are not reflected", () => {
  const source = new RSLikeMap([["k", 42]] as const);
  const m = new RSLikeReadonlyMap(source);
  // @ts-expect-error
  source.set("k", 999);
  expect(m.get("k").unwrap()).toBe(42); // original value, not 999
});

// ── No mutation methods ───────────────────────────────────────────────────────

test("set is not a method on RSLikeReadonlyMap", () => {
  expect(typeof (new RSLikeReadonlyMap() as any).set).toBe("undefined");
});

test("delete is not a method on RSLikeReadonlyMap", () => {
  expect(typeof (new RSLikeReadonlyMap() as any).delete).toBe("undefined");
});

test("clear is not a method on RSLikeReadonlyMap", () => {
  expect(typeof (new RSLikeReadonlyMap() as any).clear).toBe("undefined");
});

// ── get — edge cases ──────────────────────────────────────────────────────────

test("get returns Some(value) for an existing key", () => {
  const m = new RSLikeReadonlyMap([["k", 42]] as const);
  const r = m.get("k");
  expect(r.isSome()).toBe(true);
  expect(r.unwrap()).toBe(42);
});

test("get returns None for a missing key", () => {
  const m = new RSLikeReadonlyMap<string, number>();
  expect(m.get("missing").isNone()).toBe(true);
});

test("get returns None even when another key has value undefined", () => {
  // key "a" is absent, key "b" has undefined value — both return None because
  // @rslike/std treats Some(undefined) as None by design
  const m = new RSLikeReadonlyMap<string, undefined>([["b", undefined]]);
  expect(m.get("a").isNone()).toBe(true);
});

test("gotcha: get returns None for a key whose value is undefined — Some(undefined) === None in @rslike/std", () => {
  // @rslike/std Option treats undefined as the absence of a value.
  // Therefore get() cannot distinguish "key absent" from "key present with undefined".
  // Use has() when you need to know whether the key exists.
  const m = new RSLikeReadonlyMap<string, undefined>([["k", undefined]]);
  expect(m.has("k")).toBe(true);     // has() is reliable regardless of value
  expect(m.get("k").isNone()).toBe(true); // Option(undefined) collapses to None
});

test("get result is instanceof Some when key exists", () => {
  const m = new RSLikeReadonlyMap([["k", 1]] as const);
  expect(m.get("k") instanceof Some).toBe(true);
});

test("get result is instanceof None when key is absent", () => {
  const m = new RSLikeReadonlyMap<string, number>();
  expect(m.get("z") instanceof None).toBe(true);
});

// ── has ───────────────────────────────────────────────────────────────────────

test("has returns true for an existing key", () => {
  expect(new RSLikeReadonlyMap([["a", 1]] as const).has("a")).toBe(true);
});

test("has returns false for a missing key", () => {
  expect(new RSLikeReadonlyMap<string, number>().has("x")).toBe(false);
});

test("has returns true even when the value is undefined", () => {
  const m = new RSLikeReadonlyMap<string, undefined>([["k", undefined]]);
  expect(m.has("k")).toBe(true);
});

// ── size / length / isEmpty ──────────────────────────────────────────────────

test("size equals the number of entries", () => {
  const m = new RSLikeReadonlyMap([["a", 1], ["b", 2], ["c", 3]] as const);
  expect(m.size).toBe(3);
});

test("length equals size", () => {
  const m = new RSLikeReadonlyMap([["a", 1], ["b", 2]] as const);
  expect(m.length).toBe(m.size);
});

test("isEmpty returns true for empty map", () => {
  expect(new RSLikeReadonlyMap().isEmpty()).toBe(true);
});

test("isEmpty returns false for non-empty map", () => {
  expect(new RSLikeReadonlyMap([["a", 1]] as const).isEmpty()).toBe(false);
});

// ── forEach ───────────────────────────────────────────────────────────────────

test("forEach calls callback for each entry", () => {
  const m = new RSLikeReadonlyMap([["a", 1], ["b", 2]] as const);
  const cb = vi.fn();
  m.forEach(cb);
  expect(cb).toBeCalledTimes(2);
  expect(cb).toHaveBeenCalledWith(1, "a", expect.any(Map));
  expect(cb).toHaveBeenCalledWith(2, "b", expect.any(Map));
});

test("forEach does not call callback on empty map", () => {
  const cb = vi.fn();
  new RSLikeReadonlyMap().forEach(cb);
  expect(cb).not.toBeCalled();
});

test("forEach respects thisArg binding", () => {
  const m = new RSLikeReadonlyMap([["k", 1]] as const);
  const obj = { collected: [] as number[] };
  m.forEach(function (this: typeof obj, v: number) {
    this.collected.push(v);
  }, obj);
  expect(obj.collected).toEqual([1]);
});

// ── entries / keys / values ───────────────────────────────────────────────────

test("entries() iterates over [key, value] pairs via for...of", () => {
  const m = new RSLikeReadonlyMap([["a", 1], ["b", 2]] as const);
  expect([...m.entries()]).toEqual([["a", 1], ["b", 2]]);
});

test("entries().next() returns Some([k, v]) when has next", () => {
  const m = new RSLikeReadonlyMap([["x", 99]] as const);
  const r = m.entries().next();
  expect(r.isSome()).toBe(true);
  expect(r.unwrap()).toEqual(["x", 99]);
});

test("entries().next() returns None when exhausted", () => {
  const m = new RSLikeReadonlyMap([["x", 1]] as const);
  const it = m.entries();
  it.next();
  expect(it.next().isNone()).toBe(true);
});

test("keys() returns all keys", () => {
  const m = new RSLikeReadonlyMap([["a", 1], ["b", 2]] as const);
  expect([...m.keys()]).toEqual(["a", "b"]);
});

test("values() returns all values", () => {
  const m = new RSLikeReadonlyMap([["a", 10], ["b", 20]] as const);
  expect([...m.values()]).toEqual([10, 20]);
});

// ── Iterator state sharing ────────────────────────────────────────────────────

test("manual next() and for...of share the same iterator state", () => {
  const m = new RSLikeReadonlyMap([["a", 1], ["b", 2], ["c", 3]] as const);
  const it = m.entries();
  // consume first entry manually
  expect(it.next().unwrap()).toEqual(["a", 1]);
  // for...of continues from the second
  const rest: [string, number][] = [];
  for (const e of it) rest.push(e);
  expect(rest).toEqual([["b", 2], ["c", 3]]);
});

// ── iter / parIter ───────────────────────────────────────────────────────────

test("iter() returns an Iter over entries", () => {
  const m = new RSLikeReadonlyMap([["a", 1], ["b", 2]] as const);
  expect(m.iter() instanceof Iter).toBe(true);
  expect(m.iter().collect()).toEqual([["a", 1], ["b", 2]]);
});

test("iter() supports chaining", () => {
  const m = new RSLikeReadonlyMap([["a", 1], ["b", 2], ["c", 3]] as const);
  const keys = m.iter().map(([k]) => k).collect();
  expect(keys).toEqual(["a", "b", "c"]);
});

test("parIter() returns a ParIter", () => {
  expect(new RSLikeReadonlyMap([["a", 1]] as const).parIter() instanceof ParIter).toBe(true);
});

test("parIter().map() collects concurrently", async () => {
  const m = new RSLikeReadonlyMap([["a", 1], ["b", 2]] as const);
  const result = await m.parIter().map(async ([k, v]) => `${k}:${v}`).collect();
  expect(result).toEqual(["a:1", "b:2"]);
});

// ── Symbol.iterator ───────────────────────────────────────────────────────────

test("Symbol.iterator allows for...of over [key, value] pairs", () => {
  const m = new RSLikeReadonlyMap([["a", 1], ["b", 2]] as const);
  const collected: [string, number][] = [];
  for (const e of m) collected.push(e);
  expect(collected).toEqual([["a", 1], ["b", 2]]);
});

test("spread operator works via Symbol.iterator", () => {
  const m = new RSLikeReadonlyMap([["k", 5]] as const);
  expect([...m]).toEqual([["k", 5]]);
});

// ── Symbol.toStringTag ────────────────────────────────────────────────────────

test("Symbol.toStringTag returns 'Map'", () => {
  expect(new RSLikeReadonlyMap()[Symbol.toStringTag]).toBe("Map");
});

// ── iter() called twice produces independent iterators ─────────────────────────

test("calling iter() twice produces two independent iterators", () => {
  const m = new RSLikeReadonlyMap([["a", 1], ["b", 2]] as const);
  const first = m.iter().collect();
  const second = m.iter().collect();
  expect(first).toEqual(second);
});

// ── Constructed from generator ────────────────────────────────────────────────

test("constructor accepts a generator of tuples", () => {
  function* pairs(): Generator<readonly [string, number]> {
    yield ["x", 1];
    yield ["y", 2];
  }
  const m = new RSLikeReadonlyMap(pairs());
  expect(m.size).toBe(2);
  expect(m.get("x").unwrap()).toBe(1);
});
