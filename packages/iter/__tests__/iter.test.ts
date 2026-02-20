import { test, expect, vi } from "vitest";
import { Option, Some, None } from "@rslike/std";
import { Iter, Peekable, iter } from "../src/index";
import { kCompare, kEquals } from "@rslike/cmp";

// ── Iter.from() ────────────────────────────────────────────────────

test("Iter.from creates Iter from array", () => {
  const it = Iter.from([1, 2, 3]);
  expect(it).toBeInstanceOf(Iter);
  expect(it.collect()).toEqual([1, 2, 3]);
});

test("Iter.from creates Iter from string", () => {
  expect(Iter.from("abc").collect()).toEqual(["a", "b", "c"]);
});

test("Iter.from creates Iter from Set", () => {
  expect(Iter.from(new Set([1, 2, 3])).collect()).toEqual([1, 2, 3]);
});

test("Iter.from creates Iter from Map", () => {
  const m = new Map([["a", 1], ["b", 2]]);
  expect(Iter.from(m).collect()).toEqual([["a", 1], ["b", 2]]);
});

test("Iter.from creates Iter from generator", () => {
  function* gen() {
    yield 1;
    yield 2;
  }
  expect(Iter.from(gen()).collect()).toEqual([1, 2]);
});

test("Iter.from supports chaining with adapters", () => {
  const result = Iter.from([1, 2, 3, 4, 5])
    .filter(x => x % 2 === 0)
    .map(x => x * 10)
    .collect();
  expect(result).toEqual([20, 40]);
});

test("Iter.from with mapFn transforms values", () => {
  expect(Iter.from([1, 2, 3], x => x * 2).collect()).toEqual([2, 4, 6]);
});

test("Iter.from with mapFn receives index", () => {
  expect(Iter.from(["a", "b", "c"], (c, i) => `${i}:${c}`).collect()).toEqual(["0:a", "1:b", "2:c"]);
});

test("Iter.from with mapFn changes type", () => {
  expect(Iter.from([1, 2, 3], x => String(x)).collect()).toEqual(["1", "2", "3"]);
});

test("Iter.from with mapFn on empty", () => {
  expect(Iter.from([], (x: number) => x * 2).collect()).toEqual([]);
});

test("Iter.from with mapFn on Set", () => {
  expect(Iter.from(new Set([1, 2, 3]), x => x * 10).collect()).toEqual([10, 20, 30]);
});

test("Iter.from with mapFn supports chaining", () => {
  const result = Iter.from([1, 2, 3, 4], x => x * 2)
    .filter(x => x > 4)
    .collect();
  expect(result).toEqual([6, 8]);
});

// ── Factory ────────────────────────────────────────────────────────

test("iter creates Iter from array", () => {
  const it = iter([1, 2, 3]);
  expect(it).toBeInstanceOf(Iter);
  expect(it.collect()).toEqual([1, 2, 3]);
});

test("iter creates Iter from string", () => {
  expect(iter("abc").collect()).toEqual(["a", "b", "c"]);
});

test("iter creates Iter from Set", () => {
  expect(iter(new Set([1, 2, 3])).collect()).toEqual([1, 2, 3]);
});

test("iter creates Iter from Map", () => {
  const m = new Map([["a", 1], ["b", 2]]);
  expect(iter(m).collect()).toEqual([["a", 1], ["b", 2]]);
});

test("iter creates Iter from generator", () => {
  function* gen() {
    yield 1;
    yield 2;
  }
  expect(iter(gen()).collect()).toEqual([1, 2]);
});

test("Iter works with for...of", () => {
  const result: number[] = [];
  for (const x of iter([1, 2, 3])) {
    result.push(x);
  }
  expect(result).toEqual([1, 2, 3]);
});

test("Iter works with spread", () => {
  expect([...iter([1, 2, 3])]).toEqual([1, 2, 3]);
});

// ── next() ─────────────────────────────────────────────────────────

test("next returns Some for available elements", () => {
  const it = iter([10, 20]);
  const first = it.next();
  expect(first).toBeInstanceOf(Option);
  expect(first.unwrap()).toBe(10);
  expect(it.next().unwrap()).toBe(20);
});

test("next returns None when exhausted", () => {
  const it = iter<number>([]);
  const result = it.next();
  expect(result.isNone()).toBe(true);
});

test("next returns None after all elements consumed", () => {
  const it = iter([1]);
  it.next();
  expect(it.next().isNone()).toBe(true);
});

// ── map ────────────────────────────────────────────────────────────

test("map transforms elements", () => {
  expect(iter([1, 2, 3]).map(x => x * 2).collect()).toEqual([2, 4, 6]);
});

test("map is lazy", () => {
  const fn = vi.fn((x: number) => x * 2);
  const mapped = iter([1, 2, 3]).map(fn);
  expect(fn).not.toHaveBeenCalled();
  mapped.collect();
  expect(fn).toHaveBeenCalledTimes(3);
});

test("map on empty iterator", () => {
  expect(iter([]).map(x => x).collect()).toEqual([]);
});

// ── filter ─────────────────────────────────────────────────────────

test("filter keeps matching elements", () => {
  expect(iter([1, 2, 3, 4]).filter(x => x % 2 === 0).collect()).toEqual([2, 4]);
});

test("filter is lazy", () => {
  const fn = vi.fn((x: number) => x > 1);
  const filtered = iter([1, 2, 3]).filter(fn);
  expect(fn).not.toHaveBeenCalled();
  filtered.collect();
  expect(fn).toHaveBeenCalledTimes(3);
});

test("filter removes all elements", () => {
  expect(iter([1, 2, 3]).filter(() => false).collect()).toEqual([]);
});

// ── enumerate ──────────────────────────────────────────────────────

test("enumerate yields index-value pairs", () => {
  expect(iter(["a", "b", "c"]).enumerate().collect()).toEqual([
    [0, "a"],
    [1, "b"],
    [2, "c"],
  ]);
});

test("enumerate on empty", () => {
  expect(iter([]).enumerate().collect()).toEqual([]);
});

// ── take ───────────────────────────────────────────────────────────

test("take yields at most n elements", () => {
  expect(iter([1, 2, 3, 4, 5]).take(3).collect()).toEqual([1, 2, 3]);
});

test("take(0) yields nothing", () => {
  expect(iter([1, 2, 3]).take(0).collect()).toEqual([]);
});

test("take more than available yields all", () => {
  expect(iter([1, 2]).take(10).collect()).toEqual([1, 2]);
});

// ── skip ───────────────────────────────────────────────────────────

test("skip drops first n elements", () => {
  expect(iter([1, 2, 3, 4, 5]).skip(2).collect()).toEqual([3, 4, 5]);
});

test("skip(0) yields everything", () => {
  expect(iter([1, 2, 3]).skip(0).collect()).toEqual([1, 2, 3]);
});

test("skip more than available yields nothing", () => {
  expect(iter([1, 2]).skip(10).collect()).toEqual([]);
});

// ── takeWhile ──────────────────────────────────────────────────────

test("takeWhile stops at first non-match", () => {
  expect(iter([1, 2, 3, 4, 1]).takeWhile(x => x < 3).collect()).toEqual([1, 2]);
});

test("takeWhile all match", () => {
  expect(iter([1, 2]).takeWhile(() => true).collect()).toEqual([1, 2]);
});

test("takeWhile none match", () => {
  expect(iter([1, 2]).takeWhile(() => false).collect()).toEqual([]);
});

// ── skipWhile ──────────────────────────────────────────────────────

test("skipWhile skips matching prefix", () => {
  expect(iter([1, 2, 3, 4, 1]).skipWhile(x => x < 3).collect()).toEqual([3, 4, 1]);
});

test("skipWhile all match", () => {
  expect(iter([1, 2]).skipWhile(() => true).collect()).toEqual([]);
});

test("skipWhile none match", () => {
  expect(iter([1, 2]).skipWhile(() => false).collect()).toEqual([1, 2]);
});

// ── chain ──────────────────────────────────────────────────────────

test("chain concatenates two iterators", () => {
  expect(iter([1, 2]).chain(iter([3, 4])).collect()).toEqual([1, 2, 3, 4]);
});

test("chain with array", () => {
  expect(iter([1]).chain([2, 3]).collect()).toEqual([1, 2, 3]);
});

test("chain with empty", () => {
  expect(iter([1, 2]).chain([]).collect()).toEqual([1, 2]);
  expect(iter<number>([]).chain([3, 4]).collect()).toEqual([3, 4]);
});

// ── zip ────────────────────────────────────────────────────────────

test("zip pairs elements", () => {
  expect(iter([1, 2, 3]).zip(["a", "b"]).collect()).toEqual([
    [1, "a"],
    [2, "b"],
  ]);
});

test("zip stops at shorter iterator", () => {
  expect(iter([1]).zip([10, 20, 30]).collect()).toEqual([[1, 10]]);
});

test("zip with empty", () => {
  expect(iter([1, 2]).zip([]).collect()).toEqual([]);
});

// ── flatMap ────────────────────────────────────────────────────────

test("flatMap maps and flattens", () => {
  expect(iter([1, 2, 3]).flatMap(x => [x, x * 10]).collect()).toEqual([1, 10, 2, 20, 3, 30]);
});

test("flatMap with empty results", () => {
  expect(iter([1, 2, 3]).flatMap(() => []).collect()).toEqual([]);
});

// ── flatten ────────────────────────────────────────────────────────

test("flatten one level of nesting", () => {
  expect(iter([[1, 2], [3, 4]]).flatten().collect()).toEqual([1, 2, 3, 4]);
});

test("flatten with empty inner", () => {
  expect(iter([[1], [], [2]]).flatten().collect()).toEqual([1, 2]);
});

// ── inspect ────────────────────────────────────────────────────────

test("inspect calls fn without changing values", () => {
  const seen: number[] = [];
  const result = iter([1, 2, 3]).inspect(x => seen.push(x)).collect();
  expect(result).toEqual([1, 2, 3]);
  expect(seen).toEqual([1, 2, 3]);
});

test("inspect is lazy", () => {
  const fn = vi.fn();
  const inspected = iter([1, 2]).inspect(fn);
  expect(fn).not.toHaveBeenCalled();
  inspected.collect();
  expect(fn).toHaveBeenCalledTimes(2);
});

// ── stepBy ─────────────────────────────────────────────────────────

test("stepBy yields every nth element", () => {
  expect(iter([0, 1, 2, 3, 4, 5]).stepBy(2).collect()).toEqual([0, 2, 4]);
});

test("stepBy(1) yields all", () => {
  expect(iter([1, 2, 3]).stepBy(1).collect()).toEqual([1, 2, 3]);
});

test("stepBy(3)", () => {
  expect(iter([0, 1, 2, 3, 4, 5, 6]).stepBy(3).collect()).toEqual([0, 3, 6]);
});

test("stepBy throws on step < 1", () => {
  expect(() => iter([1]).stepBy(0)).toThrow(RangeError);
});

// ── peekable ───────────────────────────────────────────────────────

test("peekable returns Peekable instance", () => {
  const p = iter([1, 2, 3]).peekable();
  expect(p).toBeInstanceOf(Peekable);
});

test("peek returns next element without consuming", () => {
  const p = iter([1, 2, 3]).peekable();
  expect(p.peek().unwrap()).toBe(1);
  expect(p.peek().unwrap()).toBe(1);
  expect(p.next().unwrap()).toBe(1);
  expect(p.peek().unwrap()).toBe(2);
});

test("peek returns None when exhausted", () => {
  const p = iter<number>([]).peekable();
  expect(p.peek().isNone()).toBe(true);
});

test("peekable next works normally", () => {
  const p = iter([1, 2]).peekable();
  expect(p.next().unwrap()).toBe(1);
  expect(p.next().unwrap()).toBe(2);
  expect(p.next().isNone()).toBe(true);
});

// ── collect / toArray ──────────────────────────────────────────────

test("collect gathers all elements", () => {
  expect(iter([1, 2, 3]).collect()).toEqual([1, 2, 3]);
});

test("collect on empty", () => {
  expect(iter([]).collect()).toEqual([]);
});

test("toArray is alias for collect", () => {
  expect(iter([1, 2]).toArray()).toEqual([1, 2]);
});

// ── fold ───────────────────────────────────────────────────────────

test("fold reduces with initial value", () => {
  expect(iter([1, 2, 3]).fold(0, (acc, x) => acc + x)).toBe(6);
});

test("fold on empty returns init", () => {
  expect(iter<number>([]).fold(42, (acc, x) => acc + x)).toBe(42);
});

test("fold string concatenation", () => {
  expect(iter(["a", "b", "c"]).fold("", (acc, x) => acc + x)).toBe("abc");
});

// ── reduce ─────────────────────────────────────────────────────────

test("reduce without initial value", () => {
  const result = iter([1, 2, 3]).reduce((a, b) => a + b);
  expect(result.unwrap()).toBe(6);
});

test("reduce on empty returns None", () => {
  const result = iter<number>([]).reduce((a, b) => a + b);
  expect(result.isNone()).toBe(true);
});

test("reduce on single element", () => {
  expect(iter([42]).reduce((a, b) => a + b).unwrap()).toBe(42);
});

// ── forEach ────────────────────────────────────────────────────────

test("forEach calls fn on each element", () => {
  const seen: number[] = [];
  iter([1, 2, 3]).forEach(x => seen.push(x));
  expect(seen).toEqual([1, 2, 3]);
});

// ── count ──────────────────────────────────────────────────────────

test("count returns number of elements", () => {
  expect(iter([1, 2, 3]).count()).toBe(3);
});

test("count on empty", () => {
  expect(iter([]).count()).toBe(0);
});

// ── last ───────────────────────────────────────────────────────────

test("last returns last element", () => {
  expect(iter([1, 2, 3]).last().unwrap()).toBe(3);
});

test("last on empty returns None", () => {
  expect(iter([]).last().isNone()).toBe(true);
});

test("last on single element", () => {
  expect(iter([42]).last().unwrap()).toBe(42);
});

// ── nth ────────────────────────────────────────────────────────────

test("nth returns element at index", () => {
  expect(iter([10, 20, 30]).nth(1).unwrap()).toBe(20);
});

test("nth(0) returns first element", () => {
  expect(iter([10, 20]).nth(0).unwrap()).toBe(10);
});

test("nth out of bounds returns None", () => {
  expect(iter([10]).nth(5).isNone()).toBe(true);
});

// ── find ───────────────────────────────────────────────────────────

test("find returns first match", () => {
  expect(iter([1, 2, 3]).find(x => x > 1).unwrap()).toBe(2);
});

test("find returns None if no match", () => {
  expect(iter([1, 2, 3]).find(x => x > 5).isNone()).toBe(true);
});

// ── any ────────────────────────────────────────────────────────────

test("any returns true if any matches", () => {
  expect(iter([1, 2, 3]).any(x => x > 2)).toBe(true);
});

test("any returns false if none match", () => {
  expect(iter([1, 2, 3]).any(x => x > 5)).toBe(false);
});

test("any on empty returns false", () => {
  expect(iter([]).any(() => true)).toBe(false);
});

// ── all ────────────────────────────────────────────────────────────

test("all returns true if all match", () => {
  expect(iter([2, 4, 6]).all(x => x % 2 === 0)).toBe(true);
});

test("all returns false if any fails", () => {
  expect(iter([2, 3, 6]).all(x => x % 2 === 0)).toBe(false);
});

test("all on empty returns true", () => {
  expect(iter([]).all(() => false)).toBe(true);
});

// ── sum ────────────────────────────────────────────────────────────

test("sum adds all elements", () => {
  expect(iter([1, 2, 3]).sum()).toBe(6);
});

test("sum on empty returns 0", () => {
  expect(iter<number>([]).sum()).toBe(0);
});

// ── product ────────────────────────────────────────────────────────

test("product multiplies all elements", () => {
  expect(iter([1, 2, 3, 4]).product()).toBe(24);
});

test("product on empty returns 1", () => {
  expect(iter<number>([]).product()).toBe(1);
});

// ── min ────────────────────────────────────────────────────────────

test("min returns smallest element", () => {
  expect(iter([3, 1, 2]).min().unwrap()).toBe(1);
});

test("min on empty returns None", () => {
  expect(iter<number>([]).min().isNone()).toBe(true);
});

test("min with strings", () => {
  expect(iter(["c", "a", "b"]).min().unwrap()).toBe("a");
});

// ── max ────────────────────────────────────────────────────────────

test("max returns largest element", () => {
  expect(iter([3, 1, 2]).max().unwrap()).toBe(3);
});

test("max on empty returns None", () => {
  expect(iter<number>([]).max().isNone()).toBe(true);
});

// ── position ───────────────────────────────────────────────────────

test("position returns index of first match", () => {
  expect(iter([10, 20, 30]).position(x => x === 20).unwrap()).toBe(1);
});

test("position returns None if no match", () => {
  expect(iter([10, 20, 30]).position(x => x === 99).isNone()).toBe(true);
});

// ── unzip ──────────────────────────────────────────────────────────

test("unzip splits pairs", () => {
  const [a, b] = iter([[1, "a"], [2, "b"], [3, "c"]] as [number, string][]).unzip();
  expect(a).toEqual([1, 2, 3]);
  expect(b).toEqual(["a", "b", "c"]);
});

test("unzip on empty", () => {
  const [a, b] = iter([] as [number, string][]).unzip();
  expect(a).toEqual([]);
  expect(b).toEqual([]);
});

// ── Chaining ───────────────────────────────────────────────────────

test("complex chain: filter → map → take → collect", () => {
  const result = iter([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    .filter(x => x % 2 === 0)
    .map(x => x * 10)
    .take(3)
    .collect();
  expect(result).toEqual([20, 40, 60]);
});

test("complex chain: skip → enumerate → takeWhile → collect", () => {
  const result = iter([10, 20, 30, 40, 50])
    .skip(1)
    .enumerate()
    .takeWhile(([i]) => i < 2)
    .collect();
  expect(result).toEqual([[0, 20], [1, 30]]);
});

test("chain map → filter → reduce", () => {
  const result = iter([1, 2, 3, 4, 5])
    .map(x => x * 2)
    .filter(x => x > 4)
    .reduce((a, b) => a + b);
  expect(result.unwrap()).toBe(24); // 6 + 8 + 10
});

test("infinite generator with take", () => {
  function* naturals() {
    let i = 0;
    while (true) yield i++;
  }
  const result = iter(naturals()).take(5).collect();
  expect(result).toEqual([0, 1, 2, 3, 4]);
});

test("lazy evaluation: only processes needed elements", () => {
  const processed: number[] = [];
  const result = iter([1, 2, 3, 4, 5])
    .inspect(x => processed.push(x))
    .take(3)
    .collect();
  expect(result).toEqual([1, 2, 3]);
  expect(processed).toEqual([1, 2, 3]);
});

// ── Comparison (cmp) helpers ───────────────────────────────────────

class CmpNum {
  constructor(public value: number) {}
  [kCompare](other: unknown): number {
    if (other instanceof CmpNum) {
      return this.value - other.value;
    }
    throw new Error("Cannot compare");
  }
  [kEquals](other: unknown): boolean {
    if (other instanceof CmpNum) {
      return this.value === other.value;
    }
    return false;
  }
}

// ── minBy / maxBy ──────────────────────────────────────────────────

test("minBy returns minimum using comparator", () => {
  expect(iter([3, 1, 2]).minBy((a, b) => a - b).unwrap()).toBe(1);
});

test("maxBy returns maximum using comparator", () => {
  expect(iter([3, 1, 2]).maxBy((a, b) => a - b).unwrap()).toBe(3);
});

test("minBy on empty returns None", () => {
  expect(iter<number>([]).minBy((a, b) => a - b).isNone()).toBe(true);
});

test("maxBy on empty returns None", () => {
  expect(iter<number>([]).maxBy((a, b) => a - b).isNone()).toBe(true);
});

// ── minCmp / maxCmp ────────────────────────────────────────────────

test("minCmp returns minimum using Ord trait", () => {
  const items = [new CmpNum(3), new CmpNum(1), new CmpNum(2)];
  const result = iter(items).minCmp();
  expect(result.unwrap()).toBeInstanceOf(CmpNum);
  expect((result.unwrap() as CmpNum).value).toBe(1);
});

test("maxCmp returns maximum using Ord trait", () => {
  const items = [new CmpNum(3), new CmpNum(1), new CmpNum(2)];
  const result = iter(items).maxCmp();
  expect(result.unwrap()).toBeInstanceOf(CmpNum);
  expect((result.unwrap() as CmpNum).value).toBe(3);
});

test("minCmp on empty returns None", () => {
  expect(iter<CmpNum>([]).minCmp().isNone()).toBe(true);
});

// ── minByKey / maxByKey ────────────────────────────────────────────

test("minByKey finds min by extracted key", () => {
  const items = [
    { name: "b", rank: new CmpNum(20) },
    { name: "a", rank: new CmpNum(10) },
    { name: "c", rank: new CmpNum(30) },
  ];
  const result = iter(items).minByKey(x => x.rank);
  expect(result.unwrap().name).toBe("a");
});

test("maxByKey finds max by extracted key", () => {
  const items = [
    { name: "b", rank: new CmpNum(20) },
    { name: "a", rank: new CmpNum(10) },
    { name: "c", rank: new CmpNum(30) },
  ];
  const result = iter(items).maxByKey(x => x.rank);
  expect(result.unwrap().name).toBe("c");
});

// ── sortBy ─────────────────────────────────────────────────────────

test("sortBy sorts using comparator", () => {
  expect(iter([3, 1, 2]).sortBy((a, b) => a - b).collect()).toEqual([1, 2, 3]);
});

test("sortBy descending", () => {
  expect(iter([3, 1, 2]).sortBy((a, b) => b - a).collect()).toEqual([3, 2, 1]);
});

test("sortBy on empty", () => {
  expect(iter<number>([]).sortBy((a, b) => a - b).collect()).toEqual([]);
});

// ── sorted ─────────────────────────────────────────────────────────

test("sorted sorts using Ord trait", () => {
  const items = [new CmpNum(3), new CmpNum(1), new CmpNum(2)];
  const result = iter(items).sorted().collect();
  expect(result.map(x => (x as CmpNum).value)).toEqual([1, 2, 3]);
});

// ── cmp ────────────────────────────────────────────────────────────

test("cmp returns 0 for equal iterators", () => {
  const a = [new CmpNum(1), new CmpNum(2)];
  const b = [new CmpNum(1), new CmpNum(2)];
  expect(iter(a).cmp(b)).toBe(0);
});

test("cmp returns negative when this < other", () => {
  const a = [new CmpNum(1), new CmpNum(2)];
  const b = [new CmpNum(1), new CmpNum(3)];
  expect(iter(a).cmp(b)).toBeLessThan(0);
});

test("cmp returns positive when this > other", () => {
  const a = [new CmpNum(1), new CmpNum(3)];
  const b = [new CmpNum(1), new CmpNum(2)];
  expect(iter(a).cmp(b)).toBeGreaterThan(0);
});

test("cmp shorter iterator is less", () => {
  const a = [new CmpNum(1)];
  const b = [new CmpNum(1), new CmpNum(2)];
  expect(iter(a).cmp(b)).toBe(-1);
});

test("cmp longer iterator is greater", () => {
  const a = [new CmpNum(1), new CmpNum(2)];
  const b = [new CmpNum(1)];
  expect(iter(a).cmp(b)).toBe(1);
});

// ── eqBy ───────────────────────────────────────────────────────────

test("eqBy returns true for equal iterators", () => {
  const a = [new CmpNum(1), new CmpNum(2)];
  const b = [new CmpNum(1), new CmpNum(2)];
  expect(iter(a).eqBy(b)).toBe(true);
});

test("eqBy returns false for different values", () => {
  const a = [new CmpNum(1), new CmpNum(2)];
  const b = [new CmpNum(1), new CmpNum(3)];
  expect(iter(a).eqBy(b)).toBe(false);
});

test("eqBy returns false for different lengths", () => {
  const a = [new CmpNum(1), new CmpNum(2)];
  const b = [new CmpNum(1)];
  expect(iter(a).eqBy(b)).toBe(false);
  expect(iter(b).eqBy(a)).toBe(false);
});

// ── dedup ──────────────────────────────────────────────────────────

test("dedup removes consecutive duplicates using Eq trait", () => {
  const items = [new CmpNum(1), new CmpNum(1), new CmpNum(2), new CmpNum(2), new CmpNum(1)];
  const result = iter(items).dedup().collect();
  expect(result.map(x => (x as CmpNum).value)).toEqual([1, 2, 1]);
});

test("dedup on empty", () => {
  expect(iter<CmpNum>([]).dedup().collect()).toEqual([]);
});

test("dedup single element", () => {
  const result = iter([new CmpNum(5)]).dedup().collect();
  expect(result.map(x => (x as CmpNum).value)).toEqual([5]);
});

// ── dedupBy ────────────────────────────────────────────────────────

test("dedupBy removes consecutive duplicates using custom fn", () => {
  expect(iter([1, 1, 2, 3, 3]).dedupBy((a, b) => a === b).collect()).toEqual([1, 2, 3]);
});

test("dedupBy keeps non-consecutive duplicates", () => {
  expect(iter([1, 2, 1, 2]).dedupBy((a, b) => a === b).collect()).toEqual([1, 2, 1, 2]);
});

test("dedupBy on empty", () => {
  expect(iter<number>([]).dedupBy((a, b) => a === b).collect()).toEqual([]);
});

// ── filter_map ─────────────────────────────────────────────────────

test("filter_map keeps Some values unwrapped", () => {
  const result = iter([1, 2, 3, 4, 5])
    .filter_map(x => x > 3 ? Some(x * 10) : None())
    .collect();
  expect(result).toEqual([40, 50]);
});

test("filter_map on empty iterator", () => {
  expect(iter<number>([]).filter_map(x => Some(x)).collect()).toEqual([]);
});

test("filter_map all None returns empty", () => {
  expect(iter([1, 2, 3]).filter_map(() => None()).collect()).toEqual([]);
});

test("filter_map all Some keeps all", () => {
  expect(iter([1, 2, 3]).filter_map(x => Some(x * 2)).collect()).toEqual([2, 4, 6]);
});

test("filter_map is lazy", () => {
  const fn = vi.fn((x: number) => x > 2 ? Some(x) : None());
  const mapped = iter([1, 2, 3, 4]).filter_map(fn);
  expect(fn).not.toHaveBeenCalled();
  mapped.collect();
  expect(fn).toHaveBeenCalledTimes(4);
});

test("filter_map changes type", () => {
  const result = iter([1, 2, 3, 4, 5, 6])
    .filter(n => n % 2 === 0)
    .map(n => n * 10)
    .filter_map(n => n > 20 ? Some(`Value: ${n}`) : None())
    .collect();
  expect(result).toEqual(["Value: 40", "Value: 60"]);
});

test("Iter.from with filter_map chain", () => {
  const data = [1, 2, 3, 4, 5, 6];
  const result = Iter.from(data)
    .filter(n => n % 2 === 0)
    .map(n => n * 10)
    .filter_map(n => n > 20 ? Some(`Value: ${n}`) : None())
    .collect();
  expect(result).toEqual(["Value: 40", "Value: 60"]);
});
