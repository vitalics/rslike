import { bench, describe } from "vitest";
import { Set as RSLikeSet, ReadonlySet as RSLikeReadonlySet } from "../src/index";

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const N = 1_000;

const VALUES = Array.from({ length: N }, (_, i) => i);
// Two halves that overlap in the middle: A = [0..750), B = [250..1000)
const VALUES_A = VALUES.slice(0, 750);
const VALUES_B = VALUES.slice(250);

const nativeSet = new Set(VALUES);
const rsSet = new RSLikeSet(VALUES);
const roSet = new RSLikeReadonlySet(VALUES);

const nativeSetA = new Set(VALUES_A);
const nativeSetB = new Set(VALUES_B);
const rsSetA = new RSLikeSet(VALUES_A);
const rsSetB = new RSLikeSet(VALUES_B);
const roSetA = new RSLikeReadonlySet(VALUES_A);
const roSetB = new RSLikeReadonlySet(VALUES_B);

const HIT = N >> 1;        // definitely in set
const MISS = N + 1;        // never in set

// ─── Construction ─────────────────────────────────────────────────────────────

describe("set construction (1 000 values)", () => {
  bench("native Set", () => {
    new Set(VALUES);
  });

  bench("RSLikeSet", () => {
    new RSLikeSet(VALUES);
  });

  // Always makes a defensive copy
  bench("RSLikeReadonlySet (defensive copy)", () => {
    new RSLikeReadonlySet(VALUES);
  });

  bench("RSLikeReadonlySet from RSLikeSet", () => {
    new RSLikeReadonlySet(rsSet);
  });
});

// ─── Insert / add ─────────────────────────────────────────────────────────────

describe("set insert single new value", () => {
  bench("native Set.add", () => {
    const s = new Set<number>();
    s.add(1);
  });

  bench("RSLikeSet.insert → bool", () => {
    const s = new RSLikeSet<number>();
    s.insert(1);
  });
});

describe("set insert — already present (no-op)", () => {
  // insert on an existing value: RSLikeSet.insert checks has() first → one extra call
  bench("native Set.add (duplicate — no-op)", () => {
    nativeSet.add(HIT);
  });

  bench("RSLikeSet.insert (duplicate) → false", () => {
    rsSet.insert(HIT);
  });
});

// ─── Lookup ───────────────────────────────────────────────────────────────────

describe("set has — hit", () => {
  bench("native Set.has", () => {
    nativeSet.has(HIT);
  });

  bench("RSLikeSet.has", () => {
    rsSet.has(HIT);
  });

  bench("RSLikeReadonlySet.has", () => {
    roSet.has(HIT);
  });
});

describe("set has — miss", () => {
  bench("native Set.has (miss)", () => {
    nativeSet.has(MISS);
  });

  bench("RSLikeSet.has (miss)", () => {
    rsSet.has(MISS);
  });
});

describe("set get → Option", () => {
  bench("RSLikeSet.get hit → Some", () => {
    rsSet.get(HIT);
  });

  bench("RSLikeSet.get miss → None", () => {
    rsSet.get(MISS);
  });

  bench("RSLikeReadonlySet.get hit → Some", () => {
    roSet.get(HIT);
  });
});

// ─── Set algebra ──────────────────────────────────────────────────────────────
// A = [0..750), B = [250..1000) → 500 shared, 250 A-only, 250 B-only

describe("set union collect (A ∪ B, 750 + 750 → 1000 unique)", () => {
  bench("native: new Set([...A, ...B])", () => {
    void new Set([...nativeSetA, ...nativeSetB]);
  });

  bench("RSLikeSet.union(RSLikeSet).collect()", () => {
    void rsSetA.union(rsSetB).collect();
  });

  bench("RSLikeReadonlySet.union(RSLikeReadonlySet).collect()", () => {
    void roSetA.union(roSetB).collect();
  });

  bench("RSLikeReadonlySet.union(RSLikeSet).collect() [cross-type]", () => {
    void roSetA.union(rsSetB).collect();
  });
});

describe("set intersection collect (A ∩ B, 500 results)", () => {
  bench("native: [...A].filter(v => B.has(v))", () => {
    void [...nativeSetA].filter((v) => nativeSetB.has(v));
  });

  bench("RSLikeSet.intersection(RSLikeSet).collect()", () => {
    void rsSetA.intersection(rsSetB).collect();
  });

  bench("RSLikeReadonlySet.intersection(RSLikeReadonlySet).collect()", () => {
    void roSetA.intersection(roSetB).collect();
  });
});

describe("set difference collect (A ∖ B, 250 results)", () => {
  bench("native: [...A].filter(v => !B.has(v))", () => {
    void [...nativeSetA].filter((v) => !nativeSetB.has(v));
  });

  bench("RSLikeSet.difference(RSLikeSet).collect()", () => {
    void rsSetA.difference(rsSetB).collect();
  });

  bench("RSLikeReadonlySet.difference(RSLikeReadonlySet).collect()", () => {
    void roSetA.difference(roSetB).collect();
  });
});

describe("set symmetricDifference collect ((A∖B)∪(B∖A), 500 results)", () => {
  bench("native: spread + two filters", () => {
    const onlyA = [...nativeSetA].filter((v) => !nativeSetB.has(v));
    const onlyB = [...nativeSetB].filter((v) => !nativeSetA.has(v));
    void [...onlyA, ...onlyB];
  });

  bench("RSLikeSet.symmetricDifference(RSLikeSet).collect()", () => {
    void rsSetA.symmetricDifference(rsSetB).collect();
  });

  bench("RSLikeReadonlySet.symmetricDifference(RSLikeReadonlySet).collect()", () => {
    void roSetA.symmetricDifference(roSetB).collect();
  });
});

// ─── Subset checks ────────────────────────────────────────────────────────────

describe("set isSubset (true: small ⊆ large)", () => {
  const smallNative = new Set(VALUES.slice(0, 10));
  const smallRs = new RSLikeSet(VALUES.slice(0, 10));
  const smallRo = new RSLikeReadonlySet(VALUES.slice(0, 10));

  bench("native: every(v => large.has(v))", () => {
    void [...smallNative].every((v) => nativeSet.has(v));
  });

  bench("RSLikeSet.isSubset(RSLikeSet)", () => {
    void smallRs.isSubset(rsSet);
  });

  bench("RSLikeReadonlySet.isSubset(RSLikeReadonlySet)", () => {
    void smallRo.isSubset(roSet);
  });
});

// ─── Iteration: sequential ────────────────────────────────────────────────────

describe("set iterate all values (1 000)", () => {
  bench("native [...set]", () => {
    void [...nativeSet];
  });

  bench("RSLikeSet.iter().collect()", () => {
    void rsSet.iter().collect();
  });

  bench("RSLikeReadonlySet.iter().collect()", () => {
    void roSet.iter().collect();
  });

  bench("Array.from(rsSet)", () => {
    void Array.from(rsSet);
  });
});

describe("set iter with map (×2)", () => {
  bench("native [...set].map(v => v * 2)", () => {
    void [...nativeSet].map((v) => v * 2);
  });

  bench("RSLikeSet.iter().map(v => v * 2).collect()", () => {
    void rsSet.iter().map((v) => v * 2).collect();
  });
});

describe("set iter with filter (keep even)", () => {
  bench("native [...set].filter(v => v % 2 === 0)", () => {
    void [...nativeSet].filter((v) => v % 2 === 0);
  });

  bench("RSLikeSet.iter().filter(v => v % 2 === 0).collect()", () => {
    void rsSet.iter().filter((v) => v % 2 === 0).collect();
  });
});

// ─── Parallel iteration ───────────────────────────────────────────────────────

describe("set async map (parIter vs Promise.all spread)", () => {
  const addOne = async (v: number) => v + 1;

  bench("Promise.all([...set].map(fn))", async () => {
    await Promise.all([...nativeSet].map(addOne));
  });

  bench("RSLikeSet.parIter().map(fn).collect()", async () => {
    await rsSet.parIter().map(addOne).collect();
  });

  bench("RSLikeReadonlySet.parIter().map(fn).collect()", async () => {
    await roSet.parIter().map(addOne).collect();
  });
});
