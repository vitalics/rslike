import { bench, describe } from "vitest";

const CLONE = Symbol("clone");

const SOURCE = {
  North: 0,
  East: 1,
  South: 2,
  West: 3,
  Up: "up",
  Down: "down",
} as const;

// A — current implementation
function currentImpl(obj: Record<string, unknown>, soft = false) {
  const result: Record<PropertyKey, unknown> = {};
  const usedReverseKeys = new Set<string>();
  const keys = Object.keys(obj);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const value = obj[key];
    const t = typeof value;
    if (
      value === null ||
      (t !== "string" && t !== "number" && t !== "boolean")
    ) {
      if (soft) continue;
      throw new TypeError("invalid");
    }
    const reverseKey = String(value);
    if (usedReverseKeys.has(reverseKey)) {
      if (soft) continue;
      throw new TypeError("duplicate");
    }
    usedReverseKeys.add(reverseKey);
    result[key] = value;
    result[reverseKey] = key;
  }
  result[CLONE] = () => Object.freeze({ ...result });
  return Object.freeze(result);
}

// B — array scan instead of Set
function arrayScan(obj: Record<string, unknown>, soft = false) {
  const result: Record<PropertyKey, unknown> = {};
  const used: string[] = [];
  const keys = Object.keys(obj);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const value = obj[key];
    const t = typeof value;
    if (
      value === null ||
      (t !== "string" && t !== "number" && t !== "boolean")
    ) {
      if (soft) continue;
      throw new TypeError("invalid");
    }
    const reverseKey = t === "string" ? (value as string) : String(value);
    if (used.indexOf(reverseKey) !== -1) {
      if (soft) continue;
      throw new TypeError("duplicate");
    }
    used.push(reverseKey);
    result[key] = value;
    result[reverseKey] = key;
  }
  result[CLONE] = () => Object.freeze({ ...result });
  return Object.freeze(result);
}

// C — B + no Object.freeze (measures freeze share)
function noFreeze(obj: Record<string, unknown>, soft = false) {
  const result: Record<PropertyKey, unknown> = {};
  const used: string[] = [];
  const keys = Object.keys(obj);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const value = obj[key];
    const t = typeof value;
    if (
      value === null ||
      (t !== "string" && t !== "number" && t !== "boolean")
    ) {
      if (soft) continue;
      throw new TypeError("invalid");
    }
    const reverseKey = t === "string" ? (value as string) : String(value);
    if (used.indexOf(reverseKey) !== -1) {
      if (soft) continue;
      throw new TypeError("duplicate");
    }
    used.push(reverseKey);
    result[key] = value;
    result[reverseKey] = key;
  }
  result[CLONE] = () => Object.freeze({ ...result });
  return result;
}

// D — B + no clone closure (measures closure share)
function noClosure(obj: Record<string, unknown>, soft = false) {
  const result: Record<PropertyKey, unknown> = {};
  const used: string[] = [];
  const keys = Object.keys(obj);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const value = obj[key];
    const t = typeof value;
    if (
      value === null ||
      (t !== "string" && t !== "number" && t !== "boolean")
    ) {
      if (soft) continue;
      throw new TypeError("invalid");
    }
    const reverseKey = t === "string" ? (value as string) : String(value);
    if (used.indexOf(reverseKey) !== -1) {
      if (soft) continue;
      throw new TypeError("duplicate");
    }
    used.push(reverseKey);
    result[key] = value;
    result[reverseKey] = key;
  }
  return Object.freeze(result);
}

// E — for..in instead of Object.keys (uses V8 enum cache, no array alloc)
function forIn(obj: Record<string, unknown>, soft = false) {
  const result: Record<PropertyKey, unknown> = {};
  const used: string[] = [];
  for (const key in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
    const value = obj[key];
    const t = typeof value;
    if (
      value === null ||
      (t !== "string" && t !== "number" && t !== "boolean")
    ) {
      if (soft) continue;
      throw new TypeError("invalid");
    }
    const reverseKey = t === "string" ? (value as string) : String(value);
    if (used.indexOf(reverseKey) !== -1) {
      if (soft) continue;
      throw new TypeError("duplicate");
    }
    used.push(reverseKey);
    result[key] = value;
    result[reverseKey] = key;
  }
  result[CLONE] = () => Object.freeze({ ...result });
  return Object.freeze(result);
}

// F — no dedup check at all (measures dedup share, semantics differ)
function noDedup(obj: Record<string, unknown>) {
  const result: Record<PropertyKey, unknown> = {};
  const keys = Object.keys(obj);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const value = obj[key];
    const t = typeof value;
    if (
      value === null ||
      (t !== "string" && t !== "number" && t !== "boolean")
    ) {
      throw new TypeError("invalid");
    }
    result[key] = value;
    result[t === "string" ? (value as string) : String(value)] = key;
  }
  result[CLONE] = () => Object.freeze({ ...result });
  return Object.freeze(result);
}

describe("Enum.new variants (6 keys)", () => {
  bench("A: current (Set + String() + freeze + closure)", () => {
    void currentImpl(SOURCE);
  });
  bench("B: array scan + string fast path", () => {
    void arrayScan(SOURCE);
  });
  bench("C: B without Object.freeze", () => {
    void noFreeze(SOURCE);
  });
  bench("D: B without clone closure", () => {
    void noClosure(SOURCE);
  });
  bench("E: for..in + array scan", () => {
    void forIn(SOURCE);
  });
  bench("F: no dedup check (lower bound)", () => {
    void noDedup(SOURCE);
  });
  bench("baseline: Object.freeze({...SOURCE})", () => {
    void Object.freeze({ ...SOURCE });
  });
});
