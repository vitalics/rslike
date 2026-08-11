import { expect, test } from "vitest";
import { ParIter, parIter, Iter, WorkerParIter, workerParIter } from "../src/index";

// ── ParIter — lazy pipeline ──────────────────────────────────────────────────

test("parIter() creates a ParIter from an iterable", () => {
  const it = parIter([1, 2, 3]);
  expect(it).toBeInstanceOf(ParIter);
});

test("ParIter constructor accepts a generator factory", () => {
  const it = new ParIter<number>(function* () {
    yield 1; yield 2; yield 3;
  });
  expect(it).toBeInstanceOf(ParIter);
});

// Lazy adapters — return ParIter without executing

test("map() is lazy — returns ParIter immediately without awaiting", () => {
  const mapped = parIter([1, 2, 3]).map(async v => v * 2);
  expect(mapped).toBeInstanceOf(ParIter);
});

test("filter() is lazy — returns ParIter immediately without awaiting", () => {
  const filtered = parIter([1, 2, 3]).filter(v => v > 1);
  expect(filtered).toBeInstanceOf(ParIter);
});

test("chunks() is lazy — returns ParIter immediately without awaiting", () => {
  const chunked = parIter([1, 2, 3, 4]).chunks(2);
  expect(chunked).toBeInstanceOf(ParIter);
});

// Terminal: collect()

test("collect() materializes source with no pipeline", async () => {
  const result = await parIter([1, 2, 3]).collect();
  expect(result).toEqual([1, 2, 3]);
});

test("map().collect() transforms all items concurrently", async () => {
  const result = await parIter([1, 2, 3])
    .map(async v => v * 2)
    .collect();
  expect(result).toEqual([2, 4, 6]);
});

test("map() with sync fn works without async", async () => {
  const result = await parIter([1, 2, 3])
    .map(v => v + 10)
    .collect();
  expect(result).toEqual([11, 12, 13]);
});

test("filter().collect() keeps only matching items", async () => {
  const result = await parIter([1, 2, 3, 4, 5])
    .filter(v => v % 2 === 0)
    .collect();
  expect(result).toEqual([2, 4]);
});

test("filter() with async predicate works", async () => {
  const result = await parIter([1, 2, 3, 4])
    .filter(async v => v > 2)
    .collect();
  expect(result).toEqual([3, 4]);
});

test("chunks().collect() splits into equal-sized batches", async () => {
  const result = await parIter([1, 2, 3, 4, 5]).chunks(2).collect();
  expect(result).toEqual([[1, 2], [3, 4], [5]]);
});

test("chunks(1).collect() makes single-element batches", async () => {
  const result = await parIter([1, 2, 3]).chunks(1).collect();
  expect(result).toEqual([[1], [2], [3]]);
});

// Chaining lazy adapters

test("filter + map chain executes in order on collect()", async () => {
  const result = await parIter([1, 2, 3, 4, 5, 6])
    .filter(v => v % 2 === 0)
    .map(v => v * 10)
    .collect();
  expect(result).toEqual([20, 40, 60]);
});

test("map + filter chain executes in order on collect()", async () => {
  const result = await parIter([1, 2, 3, 4])
    .map(v => v * 3)
    .filter(v => v > 6)
    .collect();
  expect(result).toEqual([9, 12]);
});

test("map + chunks chain works", async () => {
  const result = await parIter([1, 2, 3, 4])
    .map(v => v * 2)
    .chunks(2)
    .collect();
  expect(result).toEqual([[2, 4], [6, 8]]);
});

// Terminal: forEach()

test("forEach() calls fn on each collected item concurrently", async () => {
  const seen: number[] = [];
  await parIter([1, 2, 3]).forEach(v => { seen.push(v); });
  expect(seen.sort((a, b) => a - b)).toEqual([1, 2, 3]);
});

test("filter + forEach executes pipeline then iterates", async () => {
  const seen: number[] = [];
  await parIter([1, 2, 3, 4])
    .filter(v => v % 2 === 0)
    .forEach(v => { seen.push(v); });
  expect(seen.sort()).toEqual([2, 4]);
});

// Terminal: fold()

test("fold() sequentially accumulates after collect", async () => {
  const sum = await parIter([1, 2, 3, 4]).fold(0, (acc, v) => acc + v);
  expect(sum).toBe(10);
});

test("fold() with async reducer works", async () => {
  const product = await parIter([1, 2, 3, 4]).fold(1, async (acc, v) => acc * v);
  expect(product).toBe(24);
});

// iter() — source only, no pipeline

test("iter() returns Iter from source without pipeline", () => {
  const it = parIter([1, 2, 3]).iter();
  expect(it).toBeInstanceOf(Iter);
  expect(it.collect()).toEqual([1, 2, 3]);
});

// [Symbol.iterator] — throws when pipeline stages pending

test("[Symbol.iterator] works when no pipeline stages", () => {
  const it = parIter([1, 2, 3]);
  expect([...it]).toEqual([1, 2, 3]);
});

test("[Symbol.iterator] throws when pipeline stages are pending", () => {
  const it = parIter([1, 2, 3]).map(v => v * 2);
  expect(() => [...it]).toThrow(
    "Cannot synchronously iterate a ParIter with pending async pipeline stages"
  );
});

// Edge cases

test("collect() on empty source returns empty array", async () => {
  expect(await parIter([]).collect()).toEqual([]);
});

test("filter() removing all items returns empty array", async () => {
  const result = await parIter([1, 2, 3]).filter(() => false).collect();
  expect(result).toEqual([]);
});

// ── WorkerParIter — worker_threads parallelism ──────────────────────────────

test("workerParIter() creates a WorkerParIter", () => {
  expect(workerParIter([1, 2, 3])).toBeInstanceOf(WorkerParIter);
});

test("WorkerParIter.collect() returns all items without transformation", async () => {
  expect(await workerParIter([1, 2, 3]).collect()).toEqual([1, 2, 3]);
});

// Lazy adapters — return WorkerParIter without executing

test("map() is lazy — returns WorkerParIter immediately without spawning workers", () => {
  const result = workerParIter([1, 2, 3]).map(v => v * 2);
  expect(result).toBeInstanceOf(WorkerParIter);
});

test("filter() is lazy — returns WorkerParIter immediately without spawning workers", () => {
  const result = workerParIter([1, 2, 3]).filter(v => v > 1);
  expect(result).toBeInstanceOf(WorkerParIter);
});

test("WorkerParIter.map() transforms items across workers", async () => {
  const result = await workerParIter([1, 2, 3, 4]).map(v => v * 2).collect();
  expect(result).toEqual([2, 4, 6, 8]);
});

test("WorkerParIter.filter() keeps matching items across workers", async () => {
  const result = await workerParIter([1, 2, 3, 4, 5]).filter(v => v % 2 === 0).collect();
  expect(result).toEqual([2, 4]);
});

test("WorkerParIter.map() preserves order", async () => {
  const input = Array.from({ length: 10 }, (_, i) => i + 1);
  const result = await workerParIter(input).map(v => v * v).collect();
  expect(result).toEqual(input.map(v => v * v));
});

test("WorkerParIter.iter() returns Iter", () => {
  const it = workerParIter([1, 2, 3]).iter();
  expect(it).toBeInstanceOf(Iter);
  expect(it.collect()).toEqual([1, 2, 3]);
});

test("WorkerParIter handles empty source", async () => {
  const result = await workerParIter<number>([]).map(v => v * 2).collect();
  expect(result).toEqual([]);
});

test("WorkerParIter can chain map then filter", async () => {
  const result = await workerParIter([1, 2, 3, 4])
    .map(v => v * 3)
    .filter(v => v > 6)
    .collect();
  expect(result).toEqual([9, 12]);
});

// ── collect(ctor) ──────────────────────────────────────────────────

test("collect(Array) returns plain array", async () => {
  const result = await parIter([1, 2, 3]).map(v => v * 2).collect(Array);
  expect(result).toEqual([2, 4, 6]);
  expect(Array.isArray(result)).toBe(true);
});

test("collect(Set) dedupes pipeline results", async () => {
  const result = await parIter([1, 2, 3, 4]).map(v => v % 2).collect(Set);
  expect(result).toBeInstanceOf(Set);
  expect([...result].sort()).toEqual([0, 1]);
});

test("collect(Map) from pairs", async () => {
  const result = await parIter([["a", 1], ["b", 2]] as [string, number][]).collect(Map);
  expect(result).toBeInstanceOf(Map);
  expect(result.get("a")).toBe(1);
});

test("collect(Iter) returns a sequential Iter of results", async () => {
  const result = await parIter([1, 2, 3]).map(v => v * 10).collect(Iter);
  expect(result).toBeInstanceOf(Iter);
  expect(result.collect()).toEqual([10, 20, 30]);
});

test("collect(ctor) with no pipeline", async () => {
  const result = await parIter([1, 1, 2]).collect(Set);
  expect([...result]).toEqual([1, 2]);
});
