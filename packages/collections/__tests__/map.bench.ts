import { bench, describe } from "vitest";
import { Map as RSLikeMap, ReadonlyMap as RSLikeReadonlyMap } from "../src/index";

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const N = 1_000;

const ENTRIES = Array.from({ length: N }, (_, i) => [String(i), i] as const);
const KEYS = ENTRIES.map(([k]) => k);
const HIT_KEY = String(N >> 1);   // a key that definitely exists
const MISS_KEY = "MISSING_KEY";   // a key that never exists

const nativeMap = new Map(ENTRIES);
const rsMap = new RSLikeMap(ENTRIES);
const roMap = new RSLikeReadonlyMap(ENTRIES);

// ─── Construction ─────────────────────────────────────────────────────────────

describe("map construction (1 000 entries)", () => {
  bench("native Map", () => {
    new Map(ENTRIES);
  });

  bench("RSLikeMap", () => {
    new RSLikeMap(ENTRIES);
  });

  // RSLikeReadonlyMap always makes a defensive copy — same cost as RSLikeMap construction
  bench("RSLikeReadonlyMap (defensive copy)", () => {
    new RSLikeReadonlyMap(ENTRIES);
  });

  // Extra cost of copying an already-built RSLikeMap into a readonly snapshot
  bench("RSLikeReadonlyMap from RSLikeMap", () => {
    new RSLikeReadonlyMap(rsMap);
  });
});

// ─── Lookup: hit ──────────────────────────────────────────────────────────────

describe("map get — hit (key exists)", () => {
  bench("native Map.get", () => {
    nativeMap.get(HIT_KEY);
  });

  bench("RSLikeMap.get → Option", () => {
    rsMap.get(HIT_KEY);
  });

  bench("RSLikeReadonlyMap.get → Option", () => {
    roMap.get(HIT_KEY);
  });
});

// ─── Lookup: miss ─────────────────────────────────────────────────────────────

describe("map get — miss (key absent)", () => {
  bench("native Map.get → undefined", () => {
    nativeMap.get(MISS_KEY);
  });

  bench("RSLikeMap.get → None", () => {
    rsMap.get(MISS_KEY);
  });

  bench("RSLikeReadonlyMap.get → None", () => {
    roMap.get(MISS_KEY);
  });
});

// ─── Full scan: iterate all keys ──────────────────────────────────────────────

describe("map lookup scan (all keys, 1 000 hits)", () => {
  bench("native Map.get in loop", () => {
    for (const k of KEYS) nativeMap.get(k);
  });

  bench("RSLikeMap.get in loop", () => {
    for (const k of KEYS) rsMap.get(k);
  });
});

// ─── Mutation: set ────────────────────────────────────────────────────────────

describe("map set — new key", () => {
  // Each bench iteration writes the same key, which starts absent
  // We recreate a fresh map in setup so we actually measure a new-key insert
  bench("native Map.set (new key)", () => {
    const m = new Map<string, number>();
    m.set("new", 1);
  });

  bench("RSLikeMap.set (new key) → None", () => {
    const m = new RSLikeMap<string, number>();
    m.set("new", 1);
  });
});

describe("map set — existing key (update)", () => {
  bench("native Map.set (overwrite)", () => {
    nativeMap.set(HIT_KEY, 0);
  });

  bench("RSLikeMap.set (overwrite) → Some(old)", () => {
    rsMap.set(HIT_KEY, 0);
  });
});

// ─── Iteration ────────────────────────────────────────────────────────────────

describe("map iteration — collect all entries", () => {
  bench("native [...map]", () => {
    void [...nativeMap];
  });

  bench("RSLikeMap.iter().collect()", () => {
    void rsMap.iter().collect();
  });

  bench("RSLikeReadonlyMap.iter().collect()", () => {
    void roMap.iter().collect();
  });
});

// ─── Parallel iteration ───────────────────────────────────────────────────────

describe("map async map over values", () => {
  const addOne = async (v: number) => v + 1;

  bench("Promise.all([...map.values()].map(fn))", async () => {
    await Promise.all([...nativeMap.values()].map(addOne));
  });

  bench("RSLikeMap.parIter().map(fn).collect()", async () => {
    await rsMap.parIter().map(([, v]) => addOne(v)).collect();
  });
});
