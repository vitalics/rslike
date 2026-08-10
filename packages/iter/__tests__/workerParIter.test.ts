import { expect, test, describe } from "vitest";
import { WorkerParIter, workerParIter, Iter, ParIter, parIter, iter } from "../src/index";

// ── Laziness ──────────────────────────────────────────────────────────────────

describe("laziness", () => {
  test("map() is lazy — returns WorkerParIter without spawning workers", () => {
    const result = workerParIter([1, 2, 3]).map(v => v * 2);
    expect(result).toBeInstanceOf(WorkerParIter);
  });

  test("filter() is lazy — returns WorkerParIter without spawning workers", () => {
    const result = workerParIter([1, 2, 3]).filter(v => v > 1);
    expect(result).toBeInstanceOf(WorkerParIter);
  });

  test("long pipeline built lazily before collect()", () => {
    // All adapters are synchronous — no workers spawned yet
    const pipeline = workerParIter([1, 2, 3, 4, 5, 6])
      .filter(v => v % 2 === 0)
      .map(v => v * v)
      .filter(v => v > 5);
    expect(pipeline).toBeInstanceOf(WorkerParIter);
  });

  test("[Symbol.iterator] throws when pipeline stages are pending", () => {
    const it = workerParIter([1, 2, 3]).map(v => v * 2);
    expect(() => [...it]).toThrow(
      "Cannot synchronously iterate a WorkerParIter with pending pipeline stages"
    );
  });

  test("[Symbol.iterator] works when no pipeline stages", () => {
    expect([...workerParIter([4, 5, 6])]).toEqual([4, 5, 6]);
  });
});

// ── Construction ──────────────────────────────────────────────────────────────

describe("construction", () => {
  test("accepts an Array", async () => {
    expect(workerParIter([1, 2, 3])).toBeInstanceOf(WorkerParIter);
    expect(await workerParIter([1, 2, 3]).collect()).toEqual([1, 2, 3]);
  });

  test("accepts a Set (deduplication happens before materialise)", async () => {
    expect(await workerParIter(new Set([10, 20, 30])).collect()).toEqual([10, 20, 30]);
  });

  test("accepts a generator factory", async () => {
    const it = new WorkerParIter<number>(function* () {
      yield 1; yield 2; yield 3;
    });
    expect(await it.collect()).toEqual([1, 2, 3]);
  });

  test("accepts an Iter instance", async () => {
    const it = iter([1, 2, 3]);
    expect(await workerParIter(it).collect()).toEqual([1, 2, 3]);
  });

  test("accepts an Iter instance with pipeline applied in workers", async () => {
    const it = iter([1, 2, 3, 4]);
    expect(await workerParIter(it).map(v => v * 2).collect()).toEqual([2, 4, 6, 8]);
  });

  test("accepts a ParIter instance — source collected before distributing to workers", async () => {
    const pi = parIter([1, 2, 3]);
    expect(await workerParIter(pi).collect()).toEqual([1, 2, 3]);
  });

  test("accepts a ParIter with pipeline — ParIter collected then worker pipeline applied", async () => {
    const pi = parIter([1, 2, 3, 4]).map(v => v * 10);
    expect(await workerParIter(pi).map(v => v + 1).collect()).toEqual([11, 21, 31, 41]);
  });

  test("accepts a ParIter with filter — results flow into worker pipeline", async () => {
    const pi = parIter([1, 2, 3, 4, 5, 6]).filter(v => v % 2 === 0);
    expect(await workerParIter(pi).map(v => v * v).collect()).toEqual([4, 16, 36]);
  });

  test("WorkerParIter constructor accepts ParIter directly", async () => {
    const pi = new ParIter<number>([10, 20, 30]);
    const w = new WorkerParIter(pi);
    expect(await w.collect()).toEqual([10, 20, 30]);
  });

  test("single-element source", async () => {
    expect(await workerParIter([42]).collect()).toEqual([42]);
  });

  test("empty source — collect() returns []", async () => {
    expect(await workerParIter<number>([]).collect()).toEqual([]);
  });
});

// ── Worker-count boundaries ───────────────────────────────────────────────────

describe("worker count boundaries", () => {
  test("workerCount=1 processes all items in a single worker", async () => {
    const result = await workerParIter([1, 2, 3, 4, 5, 6], 1).map(v => v * 2).collect();
    expect(result).toEqual([2, 4, 6, 8, 10, 12]);
  });

  test("workerCount=2 produces identical result to workerCount=1", async () => {
    const input = Array.from({ length: 12 }, (_, i) => i + 1);
    const r1 = await workerParIter(input, 1).map(v => v * v).collect();
    const r2 = await workerParIter(input, 2).map(v => v * v).collect();
    expect(r1).toEqual(r2);
  });

  test("more workers than items — each worker processes ≤1 item", async () => {
    // 3 items, 100 workers → Math.ceil(3/100)=1, so 3 chunks of size 1
    const result = await workerParIter([10, 20, 30], 100).map(v => v / 10).collect();
    expect(result).toEqual([1, 2, 3]);
  });

  test("items count exactly equals worker count", async () => {
    const result = await workerParIter([2, 4, 6], 3).map(v => v + 1).collect();
    expect(result).toEqual([3, 5, 7]);
  });
});

// ── map() ─────────────────────────────────────────────────────────────────────

describe("map()", () => {
  test("identity preserves all values", async () => {
    expect(await workerParIter([1, 2, 3]).map(v => v).collect()).toEqual([1, 2, 3]);
  });

  test("handles negative numbers and zero", async () => {
    expect(
      await workerParIter([-5, -1, 0, 1, 5]).map(v => Math.abs(v)).collect()
    ).toEqual([5, 1, 0, 1, 5]);
  });

  test("maps strings to their length", async () => {
    expect(
      await workerParIter(["hello", "hi", "hey"]).map(v => v.length).collect()
    ).toEqual([5, 2, 3]);
  });

  test("maps objects to a derived primitive (structuredClone input)", async () => {
    const input = [{ x: 3, y: 4 }, { x: 0, y: 5 }, { x: 5, y: 12 }];
    expect(
      await workerParIter(input).map(v => Math.hypot(v.x, v.y)).collect()
    ).toEqual([5, 5, 13]);
  });

  test("maps to new plain objects (structuredClone output)", async () => {
    const input = [{ a: 1, b: 2 }, { a: 3, b: 4 }];
    expect(
      await workerParIter(input).map(v => ({ sum: v.a + v.b })).collect()
    ).toEqual([{ sum: 3 }, { sum: 7 }]);
  });

  test("chained map × map applies both transforms in one worker pass", async () => {
    expect(
      await workerParIter([1, 2, 3]).map(v => v * 2).map(v => v + 1).collect()
    ).toEqual([3, 5, 7]);
  });

  test("100-item dataset — correct values and insertion order preserved", async () => {
    const input = Array.from({ length: 100 }, (_, i) => i + 1);
    expect(
      await workerParIter(input).map(v => v * v).collect()
    ).toEqual(input.map(v => v * v));
  });

  // Pure CPU-bound functions — no external references, must be self-contained.
  test("fibonacci (CPU-bound pure fn) computed in workers", async () => {
    function fib(n: number): number {
      if (n <= 1) return n;
      let a = 0, b = 1;
      for (let i = 2; i <= n; i++) { const t = a + b; a = b; b = t; }
      return b;
    }
    expect(
      await workerParIter([0, 1, 2, 3, 4, 5, 6, 7]).map(fib).collect()
    ).toEqual([0, 1, 1, 2, 3, 5, 8, 13]);
  });
});

// ── filter() ──────────────────────────────────────────────────────────────────

describe("filter()", () => {
  test("predicate always true — all items kept", async () => {
    expect(
      await workerParIter([1, 2, 3]).filter(() => true).collect()
    ).toEqual([1, 2, 3]);
  });

  test("predicate always false — all items removed", async () => {
    expect(
      await workerParIter([1, 2, 3]).filter(() => false).collect()
    ).toEqual([]);
  });

  test("removes zeros from mixed array", async () => {
    expect(
      await workerParIter([0, 1, 0, 2, 0, 3]).filter(v => v !== 0).collect()
    ).toEqual([1, 2, 3]);
  });

  test("filters strings by length", async () => {
    expect(
      await workerParIter(["apple", "fig", "banana", "kiwi"]).filter(v => v.length > 4).collect()
    ).toEqual(["apple", "banana"]);
  });

  test("isPrime — CPU-bound pure predicate in workers", async () => {
    const input = Array.from({ length: 28 }, (_, i) => i + 2); // [2..29]
    expect(
      await workerParIter(input).filter(function(n) {
        if (n < 2) return false;
        for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;
        return true;
      }).collect()
    ).toEqual([2, 3, 5, 7, 11, 13, 17, 19, 23, 29]);
  });

  test("chained filter × filter narrows results in one worker pass", async () => {
    expect(
      await workerParIter([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
        .filter(v => v % 2 === 0)    // [2, 4, 6, 8, 10]
        .filter(v => v > 5)          // [6, 8, 10]
        .collect()
    ).toEqual([6, 8, 10]);
  });

  test("relative order preserved after filter on large dataset with explicit workerCount", async () => {
    const input = Array.from({ length: 50 }, (_, i) => i);
    expect(
      await workerParIter(input, 4).filter(v => v % 5 === 0).collect()
    ).toEqual([0, 5, 10, 15, 20, 25, 30, 35, 40, 45]);
  });
});

// ── forEach() ─────────────────────────────────────────────────────────────────

describe("forEach()", () => {
  test("resolves undefined on empty source", async () => {
    expect(await workerParIter<number>([]).forEach(v => { void v; })).toBeUndefined();
  });

  test("returns undefined (void)", async () => {
    expect(await workerParIter([1, 2, 3]).forEach(v => { void v; })).toBeUndefined();
  });

  test("fn runs on main thread — may capture closures", async () => {
    // Unlike map/filter, forEach fn runs after collect() on the main thread
    const seen: number[] = [];
    await workerParIter([1, 2, 3]).map(v => v * 10).forEach(v => { seen.push(v); });
    expect(seen).toEqual([10, 20, 30]);
  });
});

// ── Complex chains ────────────────────────────────────────────────────────────

describe("complex chains", () => {
  test("map → filter → map (3-stage pipeline sent to workers in one shot)", async () => {
    expect(
      await workerParIter([1, 2, 3, 4, 5, 6])
        .map(v => v * v)     // [1,4,9,16,25,36]
        .filter(v => v > 10) // [16,25,36]
        .map(v => v - 1)     // [15,24,35]
        .collect()
    ).toEqual([15, 24, 35]);
  });

  test("filter → map → filter (3-stage pipeline)", async () => {
    expect(
      await workerParIter(Array.from({ length: 20 }, (_, i) => i))
        .filter(v => v % 2 === 0)  // [0,2,4,...,18]
        .map(v => v + 1)           // [1,3,5,...,19]
        .filter(v => v > 10)       // [11,13,15,17,19]
        .collect()
    ).toEqual([11, 13, 15, 17, 19]);
  });

  test("workerCount=1 and workerCount=4 produce identical results on same chain", async () => {
    const input = Array.from({ length: 20 }, (_, i) => i);
    const r1 = await workerParIter(input, 1).map(v => v * 3).filter(v => v % 2 !== 0).collect();
    const r2 = await workerParIter(input, 4).map(v => v * 3).filter(v => v % 2 !== 0).collect();
    expect(r1).toEqual(r2);
  });

  test("pipeline is reusable — collect() can be called multiple times", async () => {
    const pipeline = workerParIter([1, 2, 3]).map(v => v * 2);
    const r1 = await pipeline.collect();
    const r2 = await pipeline.collect();
    expect(r1).toEqual([2, 4, 6]);
    expect(r2).toEqual([2, 4, 6]);
  });
});

// ── Error propagation ─────────────────────────────────────────────────────────

describe("error propagation", () => {
  test("collect() rejects when map function throws in worker", async () => {
    await expect(
      workerParIter([1, 2, 3]).map(() => { throw new Error("worker boom"); }).collect()
    ).rejects.toThrow();
  });

  test("collect() rejects when filter function throws in worker", async () => {
    await expect(
      workerParIter([1, 2, 3]).filter(() => { throw new Error("filter boom"); }).collect()
    ).rejects.toThrow();
  });
});

// ── Conversions ───────────────────────────────────────────────────────────────

describe("conversions", () => {
  test("collect() no-pipeline fast-path — returns source directly without workers", async () => {
    const it = workerParIter([1, 2, 3]);
    expect(await it.collect()).toEqual([1, 2, 3]);
    expect(await it.collect()).toEqual([1, 2, 3]); // idempotent
  });

  test("collect() after pipeline is idempotent (source re-materialised each time)", async () => {
    const it = workerParIter([1, 2, 3]).map(v => v * 2);
    expect(await it.collect()).toEqual([2, 4, 6]);
    expect(await it.collect()).toEqual([2, 4, 6]);
  });

  test("iter() materialises source only — pipeline NOT applied", () => {
    // .map() adds a stage but iter() skips it
    const w = workerParIter([1, 2, 3]).map(v => v * 10);
    const it = w.iter();
    expect(it).toBeInstanceOf(Iter);
    expect(it.collect()).toEqual([1, 2, 3]); // original values, not ×10
  });

  test("[Symbol.iterator] spreads into array when no pipeline", () => {
    expect([...workerParIter([4, 5, 6])]).toEqual([4, 5, 6]);
  });

  test("parIter() materialises source only — pipeline NOT applied", () => {
    const w = workerParIter([1, 2, 3]).map(v => v * 10);
    const pi = w.parIter();
    expect(pi).toBeInstanceOf(ParIter);
    // ParIter has no pipeline added — reflects raw source values
    return expect(pi.collect()).resolves.toEqual([1, 2, 3]);
  });

  test("parIter() returns ParIter that can chain further stages", async () => {
    const pi = workerParIter([1, 2, 3, 4]).parIter();
    expect(await pi.filter(v => v % 2 === 0).collect()).toEqual([2, 4]);
  });

  test("iter() throws when backed by ParIter source", () => {
    const w = workerParIter(parIter([1, 2, 3]));
    expect(() => w.iter()).toThrow(
      "Cannot synchronously convert a WorkerParIter backed by a ParIter source to Iter"
    );
  });

  test("parIter() throws when backed by ParIter source", () => {
    const w = workerParIter(parIter([1, 2, 3]));
    expect(() => w.parIter()).toThrow(
      "Cannot synchronously convert a WorkerParIter backed by a ParIter source to ParIter"
    );
  });

  test("[Symbol.iterator] throws when backed by ParIter source", () => {
    const w = workerParIter(parIter([1, 2, 3]));
    expect(() => [...w]).toThrow(
      "Cannot synchronously iterate a WorkerParIter backed by a ParIter source"
    );
  });

  test("WorkerParIter from ParIter is idempotent (collect() can be called multiple times)", async () => {
    const w = workerParIter(parIter([1, 2, 3]).map(v => v * 2));
    expect(await w.collect()).toEqual([2, 4, 6]);
    expect(await w.collect()).toEqual([2, 4, 6]);
  });
});

// ── collect(ctor) ──────────────────────────────────────────────────

describe("collect(ctor)", () => {
  test("collect(Array) returns plain array", async () => {
    const result = await workerParIter([1, 2, 3]).map(v => v * 2).collect(Array);
    expect(result).toEqual([2, 4, 6]);
    expect(Array.isArray(result)).toBe(true);
  });

  test("collect(Set) dedupes pipeline results", async () => {
    const result = await workerParIter([1, 2, 3, 4]).map(v => v % 2).collect(Set);
    expect(result).toBeInstanceOf(Set);
    expect([...result].sort()).toEqual([0, 1]);
  });

  test("collect(Map) from pairs", async () => {
    const result = await workerParIter([["a", 1], ["b", 2]] as [string, number][]).collect(Map);
    expect(result).toBeInstanceOf(Map);
    expect(result.get("a")).toBe(1);
  });

  test("collect(Iter) returns a sequential Iter of results", async () => {
    const result = await workerParIter([1, 2, 3]).map(v => v * 10).collect(Iter);
    expect(result).toBeInstanceOf(Iter);
    expect(result.collect()).toEqual([10, 20, 30]);
  });

  test("collect(ctor) with no pipeline", async () => {
    const result = await workerParIter([1, 1, 2]).collect(Set);
    expect([...result]).toEqual([1, 2]);
  });

  test("collect(ctor) with empty source", async () => {
    const result = await workerParIter<number>([]).map(v => v * 2).collect(Set);
    expect(result.size).toBe(0);
  });
});
