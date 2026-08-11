import { bench, describe } from "vitest";
import {
  Array as RSLikeArray,
  ReadonlyArray as RSLikeReadonlyArray,
} from "../src/index";

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const N = 1_000;

const ITEMS = Array.from({ length: N }, (_, i) => i);

const rsArr = new RSLikeArray(ITEMS);
const roArr = new RSLikeReadonlyArray(ITEMS);

const MID = N >> 1; // index that definitely exists
const OUT = N + 1; // index that is always out of bounds

// ─── Construction ─────────────────────────────────────────────────────────────

describe("array construction (1 000 items)", () => {
  bench("native [...items]", () => {
    void [...ITEMS];
  });

  bench("RSLikeArray", () => {
    new RSLikeArray(ITEMS);
  });

  // Always makes a defensive copy
  bench("RSLikeReadonlyArray (defensive copy)", () => {
    new RSLikeReadonlyArray(ITEMS);
  });

  bench("RSLikeReadonlyArray from RSLikeArray", () => {
    new RSLikeReadonlyArray(rsArr);
  });
});

// ─── Indexed access ───────────────────────────────────────────────────────────

describe("array get — in bounds", () => {
  bench("native arr[i]", () => {
    void ITEMS[MID];
  });

  bench("RSLikeArray.get → Some", () => {
    rsArr.get(MID);
  });

  bench("RSLikeReadonlyArray.get → Some", () => {
    roArr.get(MID);
  });
});

describe("array get — out of bounds", () => {
  bench("native arr[i] → undefined", () => {
    void ITEMS[OUT];
  });

  bench("RSLikeArray.get → None", () => {
    rsArr.get(OUT);
  });

  bench("RSLikeReadonlyArray.get → None", () => {
    roArr.get(OUT);
  });
});

describe("array at — negative index", () => {
  bench("native arr.at(-1)", () => {
    void ITEMS.at(-1);
  });

  bench("RSLikeArray.at(-1) → Some", () => {
    rsArr.at(-1);
  });

  bench("RSLikeReadonlyArray.at(-1) → Some", () => {
    roArr.at(-1);
  });
});

describe("array first/last", () => {
  bench("native arr[0] / arr[len - 1]", () => {
    void ITEMS[0];
    void ITEMS[ITEMS.length - 1];
  });

  bench("RSLikeArray.first() + last()", () => {
    rsArr.first();
    rsArr.last();
  });

  bench("RSLikeReadonlyArray.first() + last()", () => {
    roArr.first();
    roArr.last();
  });
});

// ─── find ─────────────────────────────────────────────────────────────────────

describe("array find — hit (middle element)", () => {
  const pred = (v: number) => v === MID;

  bench("native Array.find", () => {
    void ITEMS.find(pred);
  });

  bench("RSLikeArray.find → Some", () => {
    rsArr.find(pred);
  });

  bench("RSLikeReadonlyArray.find → Some", () => {
    roArr.find(pred);
  });
});

describe("array find — miss (never found)", () => {
  const pred = (v: number) => v === OUT;

  bench("native Array.find → undefined", () => {
    void ITEMS.find(pred);
  });

  bench("RSLikeArray.find → None", () => {
    rsArr.find(pred);
  });

  bench("RSLikeReadonlyArray.findIndex → None", () => {
    roArr.findIndex(pred);
  });
});

// ─── map / filter ─────────────────────────────────────────────────────────────

describe("array map ×2 (1 000 items)", () => {
  const fn = (v: number) => v * 2;

  bench("native Array.map", () => {
    void ITEMS.map(fn);
  });

  bench("RSLikeArray.map → RSLikeArray", () => {
    void rsArr.map(fn);
  });

  // ReadonlyArray.map copies the backing storage before mapping
  bench("RSLikeReadonlyArray.map → RSLikeArray", () => {
    void roArr.map(fn);
  });

  bench("RSLikeArray.iter().map().collect() — lazy pipeline", () => {
    void rsArr.iter().map(fn).collect();
  });
});

describe("array filter keep-even (1 000 → 500)", () => {
  const pred = (v: number) => v % 2 === 0;

  bench("native Array.filter", () => {
    void ITEMS.filter(pred);
  });

  bench("RSLikeArray.filter → RSLikeArray", () => {
    void rsArr.filter(pred);
  });

  bench("RSLikeReadonlyArray.filter → RSLikeReadonlyArray", () => {
    void roArr.filter(pred);
  });

  bench("RSLikeArray.iter().filter().collect() — lazy pipeline", () => {
    void rsArr.iter().filter(pred).collect();
  });
});

// ─── Mutation: push / pop ─────────────────────────────────────────────────────

describe("array push + pop round-trip", () => {
  bench("native push + pop", () => {
    const a: number[] = [];
    a.push(1);
    void a.pop();
  });

  bench("RSLikeArray push + pop → Option", () => {
    const a = new RSLikeArray<number>();
    a.push(1);
    void a.pop();
  });
});

describe("array pop from empty", () => {
  const emptyNative: number[] = [];
  const emptyRs = new RSLikeArray<number>();

  bench("native [].pop() → undefined", () => {
    void emptyNative.pop();
  });

  bench("RSLikeArray.pop() → None", () => {
    void emptyRs.pop();
  });
});

// ─── slice ────────────────────────────────────────────────────────────────────

describe("array slice middle 100 elements", () => {
  const START = MID - 50;
  const END = MID + 50;

  bench("native Array.slice", () => {
    void ITEMS.slice(START, END);
  });

  bench("RSLikeArray.slice → RSLikeArray", () => {
    void rsArr.slice(START, END);
  });

  bench("RSLikeReadonlyArray.slice → RSLikeReadonlyArray", () => {
    void roArr.slice(START, END);
  });
});

// ─── Iteration ────────────────────────────────────────────────────────────────

describe("array iterate all values (1 000)", () => {
  bench("native for..of", () => {
    let sum = 0;
    for (const v of ITEMS) sum += v;
    void sum;
  });

  bench("RSLikeArray for..of", () => {
    let sum = 0;
    for (const v of rsArr) sum += v;
    void sum;
  });

  bench("RSLikeArray.iter().fold()", () => {
    void rsArr.iter().fold(0, (acc, v) => acc + v);
  });

  bench("RSLikeReadonlyArray.iter().fold()", () => {
    void roArr.iter().fold(0, (acc, v) => acc + v);
  });
});

describe("array entries — [index, value] pairs", () => {
  bench("native [...arr.entries()]", () => {
    void [...ITEMS.entries()];
  });

  bench("RSLikeArray.entries().collect()", () => {
    void rsArr.entries().collect();
  });

  bench("RSLikeReadonlyArray.entries().collect()", () => {
    void roArr.entries().collect();
  });
});

// ─── DoubleEndedIter ──────────────────────────────────────────────────────────

describe("array reverse iteration (rfold sum)", () => {
  bench("native reversed for loop", () => {
    let sum = 0;
    for (let i = ITEMS.length - 1; i >= 0; i--) sum += ITEMS[i];
    void sum;
  });

  bench("RSLikeArray.doubleEndedIter().rfold()", () => {
    void rsArr.doubleEndedIter().rfold(0, (acc, v) => acc + v);
  });
});

// ─── Parallel iteration ───────────────────────────────────────────────────────

describe("array async map (parIter vs Promise.all)", () => {
  const addOne = async (v: number) => v + 1;

  bench("Promise.all(arr.map(fn))", async () => {
    await Promise.all(ITEMS.map(addOne));
  });

  bench("RSLikeArray.parIter().map(fn).collect()", async () => {
    await rsArr.parIter().map(addOne).collect();
  });

  bench("RSLikeReadonlyArray.parIter().map(fn).collect()", async () => {
    await roArr.parIter().map(addOne).collect();
  });
});
