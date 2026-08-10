import { test, expect, vi } from "vitest";
import { Some, None, UndefinedBehaviorError } from "@rslike/std";
import { AsyncIter, Iter, asyncIter, type IterLike, type AnyOption } from "../src/index";

async function* agen<T>(items: T[]): AsyncGenerator<T> {
  for (const item of items) {
    yield item;
  }
}

// ── Construction ───────────────────────────────────────────────────

test("AsyncIter.from creates AsyncIter from array", () => {
  const it = AsyncIter.from([1, 2, 3]);
  expect(it).toBeInstanceOf(AsyncIter);
});

test("AsyncIter.from with mapFn transforms values", async () => {
  expect(await AsyncIter.from([1, 2, 3], v => v * 2).collect()).toEqual([2, 4, 6]);
});

test("AsyncIter.from with async mapFn", async () => {
  expect(await AsyncIter.from([1, 2, 3], async v => v * 2).collect()).toEqual([2, 4, 6]);
});

test("AsyncIter.from with mapFn receives index", async () => {
  expect(await AsyncIter.from(["a", "b"], (c, i) => `${i}:${c}`).collect()).toEqual(["0:a", "1:b"]);
});

test("asyncIter factory from async generator", async () => {
  expect(await asyncIter(agen([1, 2, 3])).collect()).toEqual([1, 2, 3]);
});

test("asyncIter from string", async () => {
  expect(await asyncIter("ab").collect()).toEqual(["a", "b"]);
});

// ── next() ─────────────────────────────────────────────────────────

test("next() returns Option values then None", async () => {
  const it = asyncIter([1, 2]);
  expect((await it.next()).unwrap()).toBe(1);
  expect((await it.next()).unwrap()).toBe(2);
  expect((await it.next()).isNone()).toBe(true);
});

// ── Iteration protocols ────────────────────────────────────────────

test("for await...of over async generator source", async () => {
  const result: number[] = [];
  for await (const v of asyncIter(agen([1, 2, 3]))) {
    result.push(v);
  }
  expect(result).toEqual([1, 2, 3]);
});

test("sync for...of yields promises for sync source", async () => {
  const result: number[] = [];
  for (const p of asyncIter([1, 2, 3])) {
    result.push(await p);
  }
  expect(result).toEqual([1, 2, 3]);
});

test("sync for...of chains async map results", async () => {
  const result: number[] = [];
  for (const p of asyncIter([1, 2, 3]).map(async v => v * 2)) {
    result.push(await p);
  }
  expect(result).toEqual([2, 4, 6]);
});

test("sync iteration throws for async source", () => {
  expect(() => [...asyncIter(agen([1, 2])) as Iterable<unknown>]).toThrow(UndefinedBehaviorError);
});

test("sync iteration throws after filterAsync", () => {
  const it = asyncIter([1, 2, 3]).filterAsync(async () => true);
  expect(() => [...it as Iterable<unknown>]).toThrow(UndefinedBehaviorError);
});

// ── Adapters ───────────────────────────────────────────────────────

test("map with sync fn", async () => {
  expect(await asyncIter([1, 2, 3]).map(v => v * 2).collect()).toEqual([2, 4, 6]);
});

test("map with async fn", async () => {
  expect(await asyncIter([1, 2, 3]).map(async v => v * 2).collect()).toEqual([2, 4, 6]);
});

test("map receives index", async () => {
  expect(await asyncIter(["a", "b"]).map((v, i) => `${i}:${v}`).collect()).toEqual(["0:a", "1:b"]);
});

test("filter keeps matching elements", async () => {
  expect(await asyncIter([1, 2, 3, 4]).filter(v => v % 2 === 0).collect()).toEqual([2, 4]);
});

test("filter narrows type via type predicate", async () => {
  const mixed: (number | string)[] = [1, "a", 2, "b"];
  const result = await asyncIter(mixed)
    .filter((v): v is number => typeof v === "number")
    .collect();
  expect(result).toEqual([1, 2]);
});

test("filterAsync with async predicate", async () => {
  expect(await asyncIter([1, 2, 3, 4]).filterAsync(async v => v % 2 === 0).collect()).toEqual([2, 4]);
});

test("filterMap keeps Some values unwrapped", async () => {
  const result = await asyncIter([1, 2, 3, 4])
    .filterMap(v => v > 2 ? Some(v * 10) : None())
    .collect();
  expect(result).toEqual([30, 40]);
});

test("flatMap flattens one level", async () => {
  expect(await asyncIter([1, 2, 3]).flatMap(v => [v, v * 10]).collect()).toEqual([1, 10, 2, 20, 3, 30]);
});

test("flatten flattens nested iterables", async () => {
  expect(await asyncIter([[1, 2], [3, 4]]).flatten().collect()).toEqual([1, 2, 3, 4]);
});

test("enumerate yields [index, value] pairs", async () => {
  expect(await asyncIter(["a", "b"]).enumerate().collect()).toEqual([[0, "a"], [1, "b"]]);
});

test("take yields at most n elements", async () => {
  expect(await asyncIter([1, 2, 3, 4]).take(2).collect()).toEqual([1, 2]);
});

test("take on infinite async source", async () => {
  async function* naturals() { let i = 0; while (true) yield i++; }
  expect(await asyncIter(naturals()).take(3).collect()).toEqual([0, 1, 2]);
});

test("skip skips first n elements", async () => {
  expect(await asyncIter([1, 2, 3, 4]).skip(2).collect()).toEqual([3, 4]);
});

test("takeWhile yields while predicate holds", async () => {
  expect(await asyncIter([1, 2, 3, 1]).takeWhile(v => v < 3).collect()).toEqual([1, 2]);
});

test("skipWhile skips while predicate holds", async () => {
  expect(await asyncIter([1, 2, 3, 1]).skipWhile(v => v < 3).collect()).toEqual([3, 1]);
});

test("chain appends another iterable", async () => {
  expect(await asyncIter([1, 2]).chain([3, 4]).collect()).toEqual([1, 2, 3, 4]);
});

test("zip pairs elements, stops at shorter", async () => {
  expect(await asyncIter([1, 2, 3]).zip(["a", "b"]).collect()).toEqual([[1, "a"], [2, "b"]]);
});

test("inspect calls fn without changing values", async () => {
  const seen: number[] = [];
  const result = await asyncIter([1, 2, 3]).inspect(v => { seen.push(v); }).collect();
  expect(result).toEqual([1, 2, 3]);
  expect(seen).toEqual([1, 2, 3]);
});

test("stepBy yields every n-th element", async () => {
  expect(await asyncIter([0, 1, 2, 3, 4, 5]).stepBy(2).collect()).toEqual([0, 2, 4]);
});

test("stepBy throws on step < 1", () => {
  expect(() => asyncIter([1, 2, 3]).stepBy(0)).toThrow(RangeError);
});

test("adapters are lazy until consumed", async () => {
  const fn = vi.fn((v: number) => v * 2);
  asyncIter([1, 2, 3]).map(fn);
  expect(fn).not.toHaveBeenCalled();
});

// ── collect(ctor) ──────────────────────────────────────────────────

test("collect() returns plain array", async () => {
  expect(await asyncIter([1, 2, 3]).collect()).toEqual([1, 2, 3]);
});

test("collect(Array) returns plain array", async () => {
  const result = await asyncIter([1, 2, 3]).collect(Array);
  expect(result).toEqual([1, 2, 3]);
  expect(Array.isArray(result)).toBe(true);
});

test("collect(Set) dedupes", async () => {
  const result = await asyncIter([1, 2, 2, 3]).collect(Set);
  expect(result).toBeInstanceOf(Set);
  expect([...result]).toEqual([1, 2, 3]);
});

test("collect(Map) from pairs", async () => {
  const result = await asyncIter([["a", 1], ["b", 2]] as [string, number][]).collect(Map);
  expect(result).toBeInstanceOf(Map);
  expect(result.get("b")).toBe(2);
});

test("collect(Iter) returns a sync Iter", async () => {
  const result = await asyncIter([1, 2, 3]).map(async v => v * 2).collect(Iter);
  expect(result).toBeInstanceOf(Iter);
  expect(result.collect()).toEqual([2, 4, 6]);
});

test("toArray aliases collect()", async () => {
  expect(await asyncIter([1, 2]).toArray()).toEqual([1, 2]);
});

// ── Consumers ──────────────────────────────────────────────────────

test("forEach calls fn on each element sequentially", async () => {
  const order: number[] = [];
  await asyncIter([1, 2, 3]).forEach(async v => {
    await new Promise(r => setTimeout(r, (4 - v) * 5));
    order.push(v);
  });
  expect(order).toEqual([1, 2, 3]); // sequential, not concurrent
});

test("fold accumulates with async fn", async () => {
  expect(await asyncIter([1, 2, 3]).fold(0, async (acc, v) => acc + v)).toBe(6);
});

test("reduce with async fn returns Some", async () => {
  const result = await asyncIter([1, 2, 3]).reduce(async (a, b) => a + b);
  expect(result.unwrap()).toBe(6);
});

test("reduce on empty returns None", async () => {
  expect((await asyncIter<number>([]).reduce((a, b) => a + b)).isNone()).toBe(true);
});

test("count counts elements", async () => {
  expect(await asyncIter([1, 2, 3]).count()).toBe(3);
});

test("last returns Some(last) / None", async () => {
  expect((await asyncIter([1, 2, 3]).last()).unwrap()).toBe(3);
  expect((await asyncIter<number>([]).last()).isNone()).toBe(true);
});

test("nth returns n-th element", async () => {
  expect((await asyncIter([10, 20, 30]).nth(1)).unwrap()).toBe(20);
  expect((await asyncIter([10]).nth(5)).isNone()).toBe(true);
});

test("find with async predicate", async () => {
  expect((await asyncIter([1, 2, 3]).find(async v => v > 1)).unwrap()).toBe(2);
  expect((await asyncIter([1, 2, 3]).find(v => v > 5)).isNone()).toBe(true);
});

test("findMap returns first Some", async () => {
  const result = await asyncIter(["a", "1", "b"])
    .findMap(s => /^\d+$/.test(s) ? Some(Number(s)) : None());
  expect(result.unwrap()).toBe(1);
});

test("position returns index of first match", async () => {
  expect((await asyncIter([10, 20, 30]).position(v => v === 20)).unwrap()).toBe(1);
  expect((await asyncIter([10, 20, 30]).position(v => v === 99)).isNone()).toBe(true);
});

test("any / all with async predicates", async () => {
  expect(await asyncIter([1, 2, 3]).any(async v => v > 2)).toBe(true);
  expect(await asyncIter([1, 2, 3]).any(v => v > 5)).toBe(false);
  expect(await asyncIter([2, 4, 6]).all(async v => v % 2 === 0)).toBe(true);
  expect(await asyncIter([2, 3, 6]).all(v => v % 2 === 0)).toBe(false);
});

test("sum / product", async () => {
  expect(await asyncIter([1, 2, 3]).sum()).toBe(6);
  expect(await asyncIter([1, 2, 3, 4]).product()).toBe(24);
});

test("min / max / minBy / maxBy", async () => {
  expect((await asyncIter([3, 1, 2]).min()).unwrap()).toBe(1);
  expect((await asyncIter([3, 1, 2]).max()).unwrap()).toBe(3);
  expect((await asyncIter(["aaa", "a", "aa"]).minBy((a, b) => a.length - b.length)).unwrap()).toBe("a");
  expect((await asyncIter(["aaa", "a", "aa"]).maxBy((a, b) => a.length - b.length)).unwrap()).toBe("aaa");
});

test("partition splits by predicate", async () => {
  expect(await asyncIter([1, 2, 3, 4]).partition(v => v % 2 === 0)).toEqual([[2, 4], [1, 3]]);
});

test("unzip splits pairs", async () => {
  expect(await asyncIter([[1, "a"], [2, "b"]] as [number, string][]).unzip()).toEqual([[1, 2], ["a", "b"]]);
});

// ── Mixed pipelines ────────────────────────────────────────────────

test("full pipeline over async source with async fns", async () => {
  const result = await asyncIter(agen([1, 2, 3, 4, 5, 6]))
    .filterAsync(async v => v % 2 === 0)
    .map(async v => v * 10)
    .take(2)
    .collect();
  expect(result).toEqual([20, 40]);
});

test("chained sync-only adapters support sync iteration", async () => {
  const result: number[] = [];
  for (const p of asyncIter([1, 2, 3, 4]).filter(v => v % 2 === 0).take(1)) {
    result.push(await p);
  }
  expect(result).toEqual([2]);
});

// ── IterLike (async instantiation) ─────────────────────────────────

test("IterLike<T, Promise<Option<T>>> accepts AsyncIter structurally", async () => {
  async function drain(it: IterLike<number, Promise<AnyOption<number>>>): Promise<number> {
    let sum = 0;
    for (let r = await it.next(); r.isSome(); r = await it.next()) {
      sum += r.unwrap();
    }
    return sum;
  }
  expect(await drain(asyncIter([1, 2, 3]))).toBe(6);
  expect(await drain(asyncIter(agen([4, 5])))).toBe(9);
});
