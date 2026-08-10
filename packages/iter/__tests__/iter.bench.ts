import { bench, describe } from "vitest";
import { iter, doubleEndedIter, parIter } from "../src/index";
import { Iter, Peekable } from "../src/iter";

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const N = 1_000;
const ARR = Array.from({ length: N }, (_, i) => i);

// ─── Construction ─────────────────────────────────────────────────────────────

describe("iter construction (1 000 items)", () => {
  bench("native Array.from()", () => {
    void Array.from({ length: N }, (_, i) => i);
  });

  bench("native new Array.fill()", () => {
    new Array(N).fill(N, 0, N);
  });

  bench("Iter.from(array)", () => {
    void iter(ARR);
  });

  bench("Iter.from(array) + collect()", () => {
    void iter(ARR).collect();
  });

  bench("doubleEndedIter(array)", () => {
    void doubleEndedIter(ARR);
  });

  bench("parIter(array)", () => {
    void parIter(ARR);
  });
});

// ─── collect / spread ─────────────────────────────────────────────────────────

describe("iter collect (1 000 items)", () => {
  bench("native [...arr]", () => {
    void [...ARR];
  });

  bench("native Array.from(arr)", () => {
    void Array.from(ARR);
  });

  bench("Iter.collect()", () => {
    void iter(ARR).collect();
  });

  bench("DoubleEndedIter.collect()", () => {
    void doubleEndedIter(ARR).collect();
  });
});

// ─── map ──────────────────────────────────────────────────────────────────────

describe("iter map ×2 (1 000 items)", () => {
  const fn = (v: number) => v * 2;

  bench("native Array.map()", () => {
    void ARR.map(fn);
  });

  bench("Iter.map().collect()", () => {
    void iter(ARR).map(fn).collect();
  });

  bench("DoubleEndedIter.map().collect()", () => {
    void doubleEndedIter(ARR).map(fn).collect();
  });
});

// ─── filter ───────────────────────────────────────────────────────────────────

describe("iter filter keep-even (1 000 → 500 items)", () => {
  const pred = (v: number) => v % 2 === 0;

  bench("native Array.filter()", () => {
    void ARR.filter(pred);
  });

  bench("Iter.filter().collect()", () => {
    void iter(ARR).filter(pred).collect();
  });

  bench("DoubleEndedIter.filter().collect()", () => {
    void doubleEndedIter(ARR).filter(pred).collect();
  });
});

// ─── map + filter (pipeline) ──────────────────────────────────────────────────

describe("iter map+filter pipeline (×2, keep even, 1 000 → 500)", () => {
  const double = (v: number) => v * 2;
  const isEven = (v: number) => v % 2 === 0;

  bench("native .map().filter()", () => {
    void ARR.map(double).filter(isEven);
  });

  bench("Iter.map().filter().collect()", () => {
    void iter(ARR).map(double).filter(isEven).collect();
  });
});

// ─── find ─────────────────────────────────────────────────────────────────────

describe("iter find — hit (middle element)", () => {
  const target = N >> 1;
  const pred = (v: number) => v === target;

  bench("native Array.find()", () => {
    void ARR.find(pred);
  });

  bench("Iter.find()", () => {
    void iter(ARR).find(pred);
  });

  bench("DoubleEndedIter.find()", () => {
    void doubleEndedIter(ARR).find(pred);
  });
});

describe("iter find — miss (never found)", () => {
  const pred = (v: number) => v === N + 1;

  bench("native Array.find()", () => {
    void ARR.find(pred);
  });

  bench("Iter.find()", () => {
    void iter(ARR).find(pred);
  });
});

// ─── fold / reduce ────────────────────────────────────────────────────────────

describe("iter fold/reduce — sum (1 000 items)", () => {
  bench("native Array.reduce()", () => {
    void ARR.reduce((acc, v) => acc + v, 0);
  });

  bench("Iter.fold()", () => {
    void iter(ARR).fold(0, (acc, v) => acc + v);
  });

  bench("DoubleEndedIter.fold()", () => {
    void doubleEndedIter(ARR).fold(0, (acc, v) => acc + v);
  });

  bench("DoubleEndedIter.rfold() — reverse accumulation", () => {
    void doubleEndedIter(ARR).rfold(0, (acc, v) => acc + v);
  });
});

// ─── take ─────────────────────────────────────────────────────────────────────

describe("iter take first 100 from 1 000", () => {
  bench("native Array.slice(0, 100)", () => {
    void ARR.slice(0, 100);
  });

  bench("Iter.take(100).collect()", () => {
    void iter(ARR).take(100).collect();
  });
});

// ─── enumerate ────────────────────────────────────────────────────────────────

describe("iter enumerate (index + value)", () => {
  bench("native Array.map((v,i) => [i,v])", () => {
    void ARR.map((v, i) => [i, v]);
  });

  bench("Iter.enumerate().collect()", () => {
    void iter(ARR).enumerate().collect();
  });
});

// ─── chain ────────────────────────────────────────────────────────────────────

describe("iter chain two arrays (1 000 + 1 000 → 2 000)", () => {
  bench("native [...a, ...b]", () => {
    void [...ARR, ...ARR];
  });

  bench("Iter.chain().collect()", () => {
    void iter(ARR).chain(ARR).collect();
  });
});

// ─── zip ──────────────────────────────────────────────────────────────────────

describe("iter zip two arrays (1 000 pairs)", () => {
  bench("native Array.map((v,i) => [v, other[i]])", () => {
    void ARR.map((v, i) => [v, ARR[i]]);
  });

  bench("Iter.zip().collect()", () => {
    void iter(ARR).zip(ARR).collect();
  });
});

// ─── flatMap ──────────────────────────────────────────────────────────────────

describe("iter flatMap (each element → 2 elements, 1 000 → 2 000)", () => {
  const expand = (v: number) => [v, v * 2];

  bench("native Array.flatMap()", () => {
    void ARR.flatMap(expand);
  });

  bench("Iter.flatMap().collect()", () => {
    void iter(ARR).flatMap(expand).collect();
  });
});

// ─── Peekable ─────────────────────────────────────────────────────────────────

describe("Peekable: peek without consuming (1 000 items)", () => {
  bench("native: arr[0] (first element without consuming)", () => {
    void ARR[0];
  });

  bench("Peekable.peek() — non-consuming look-ahead", () => {
    const p = iter(ARR).peekable();
    void p.peek();
  });

  bench("Peekable: peek then consume all — collect()", () => {
    const p = iter(ARR).peekable();
    void p.peek();
    void p.collect();
  });

  bench("Iter.collect() without peek (baseline)", () => {
    void iter(ARR).collect();
  });
});

describe("Peekable: conditional skip-first pattern", () => {
  // Pattern: peek → if matches, skip; then collect rest
  const SKIP_VALUE = 0;

  bench("native: arr[0] === v ? arr.slice(1) : arr", () => {
    void (ARR[0] === SKIP_VALUE ? ARR.slice(1) : ARR);
  });

  bench("Peekable: peek → next (skip) → collect()", () => {
    const p = iter(ARR).peekable();
    if (p.peek().isSome()) p.next();
    void p.collect();
  });
});

// ─── DoubleEndedIter: front + back ────────────────────────────────────────────

describe("DoubleEndedIter: alternate front/back (N/2 pairs)", () => {
  const HALF = N >> 1;

  bench("native: i from front, N-1-i from back", () => {
    const result: number[] = [];
    for (let i = 0; i < HALF; i++) {
      result.push(ARR[i], ARR[N - 1 - i]);
    }
    void result;
  });

  bench("DoubleEndedIter: alternating next() + nextBack()", () => {
    const dei = doubleEndedIter(ARR);
    const result: number[] = [];
    for (let i = 0; i < HALF; i++) {
      const f = dei.next();
      const b = dei.nextBack();
      if (f.isSome()) result.push(f.unwrap());
      if (b.isSome()) result.push(b.unwrap());
    }
    void result;
  });
});

describe("DoubleEndedIter: rfind — last matching element", () => {
  const pred = (v: number) => v === N >> 1;

  bench("native: [...arr].reverse().find()", () => {
    void [...ARR].reverse().find(pred);
  });

  bench("DoubleEndedIter.rfind()", () => {
    void doubleEndedIter(ARR).rfind(pred);
  });
});

// ─── ParIter: async map ───────────────────────────────────────────────────────

describe("ParIter: async map +1 (1 000 items)", () => {
  const addOne = async (v: number) => v + 1;

  bench("Promise.all(arr.map(fn))", async () => {
    await Promise.all(ARR.map(addOne));
  });

  bench("parIter().map(fn).collect()", async () => {
    await parIter(ARR).map(addOne).collect();
  });
});

describe("ParIter: async filter keep-even (1 000 → 500)", () => {
  const isEven = async (v: number) => v % 2 === 0;

  bench("Promise.all + filter via predicate", async () => {
    const flags = await Promise.all(ARR.map(isEven));
    void ARR.filter((_, i) => flags[i]);
  });

  bench("parIter().filter(fn).collect()", async () => {
    await parIter(ARR).filter(isEven).collect();
  });
});

describe("ParIter: async map+filter pipeline (×2, keep even)", () => {
  const double = async (v: number) => v * 2;
  const isEven = async (v: number) => v % 2 === 0;

  bench("native: Promise.all map then filter", async () => {
    const doubled = await Promise.all(ARR.map(double));
    const flags = await Promise.all(doubled.map(isEven));
    void doubled.filter((_, i) => flags[i]);
  });

  bench("parIter().map().filter().collect()", async () => {
    await parIter(ARR).map(double).filter(isEven).collect();
  });
});
