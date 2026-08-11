import { describe, expect, test } from "vitest";
import { Enum } from "../src/enum";
import { WELL_KNOWN_CLONE_API } from "../src/symbols";

describe("Enum.new — bidirectional mapping", () => {
  test("creates forward mapping for string values", () => {
    const e = Enum.new({ Up: "up", Down: "down" });
    expect(e.Up).toBe("up");
    expect(e.Down).toBe("down");
  });

  test("creates reverse mapping for string values", () => {
    const e = Enum.new({ Up: "up", Down: "down" });
    expect(e.up).toBe("Up");
    expect(e.down).toBe("Down");
  });

  test("creates forward and reverse mapping for number values", () => {
    const e = Enum.new({ Zero: 0, One: 1, Negative: -1 });
    expect(e.Zero).toBe(0);
    expect(e.One).toBe(1);
    expect(e.Negative).toBe(-1);
    expect(e[0]).toBe("Zero");
    expect(e[1]).toBe("One");
    expect(e[-1]).toBe("Negative");
  });

  test("creates reverse mapping for boolean values via string keys", () => {
    const e = Enum.new({ Yes: true, No: false });
    expect(e.Yes).toBe(true);
    expect(e.No).toBe(false);
    expect(e.true).toBe("Yes");
    expect(e.false).toBe("No");
  });

  test("supports mixed primitive values", () => {
    const e = Enum.new({ Name: "str", Count: 5, Flag: true });
    expect(e.Name).toBe("str");
    expect(e.Count).toBe(5);
    expect(e.Flag).toBe(true);
    expect(e.str).toBe("Name");
    expect(e[5]).toBe("Count");
    expect(e.true).toBe("Flag");
  });

  test("handles empty object", () => {
    const e = Enum.new({});
    expect(Object.keys(e)).toEqual([]);
  });
});

describe("Enum.new — immutability", () => {
  test("result is frozen", () => {
    const e = Enum.new({ A: 1 });
    expect(Object.isFrozen(e)).toBe(true);
  });

  test("mutation throws in strict mode", () => {
    const e = Enum.new({ A: 1 });
    expect(() => {
      // @ts-expect-error — testing runtime immutability
      e.A = 2;
    }).toThrow(TypeError);
    expect(e.A).toBe(1);
  });
});

describe("Enum.new — validation", () => {
  test.each([
    ["null", null, "null"],
    ["undefined", undefined, "undefined"],
    ["object", {}, "object"],
    ["array", [], "object"],
    ["function", () => 1, "function"],
    ["symbol", Symbol("s"), "symbol"],
    ["bigint", 10n, "bigint"],
  ])("throws TypeError for %s value", (_, value, typeName) => {
    expect(() => Enum.new({ Bad: value })).toThrow(TypeError);
    expect(() => Enum.new({ Bad: value })).toThrow(
      `Enum.new: value of "Bad" must be a string, number or boolean, got ${typeName}`
    );
  });

  test("throws TypeError on duplicate values", () => {
    expect(() => Enum.new({ A: 1, B: 1 })).toThrow(TypeError);
    expect(() => Enum.new({ A: 1, B: 1 })).toThrow(
      'Enum.new: duplicate value "1" for key "B"'
    );
  });

  test("throws on values colliding after string coercion", () => {
    // 1 and "1" produce the same reverse key
    expect(() => Enum.new({ A: 1, B: "1" })).toThrow(
      'Enum.new: duplicate value "1" for key "B"'
    );
  });
});

describe("Enum.new — soft mode", () => {
  test("skips invalid values instead of throwing", () => {
    const e = Enum.new({ Good: 1, Bad: null, AlsoBad: {} }, { soft: true });
    expect(e.Good).toBe(1);
    expect(e[1]).toBe("Good");
    expect("Bad" in e).toBe(false);
    expect("AlsoBad" in e).toBe(false);
  });

  test("skips duplicate values, keeping the first", () => {
    const e = Enum.new({ First: 1, Second: 1 }, { soft: true });
    expect(e.First).toBe(1);
    expect(e[1]).toBe("First");
    expect("Second" in e).toBe(false);
  });
});

describe("Enum.new — cloning", () => {
  test("result exposes WELL_KNOWN_CLONE_API", () => {
    const e = Enum.new({ A: 1 });
    expect(typeof e[WELL_KNOWN_CLONE_API]).toBe("function");
  });

  test("clone API returns a frozen copy, not the same reference", () => {
    const e = Enum.new({ A: 1, B: "b" });
    const copy = e[WELL_KNOWN_CLONE_API]();
    expect(copy).not.toBe(e);
    expect(Object.isFrozen(copy)).toBe(true);
    expect(copy.A).toBe(1);
    expect(copy[1]).toBe("A");
    expect(copy.B).toBe("b");
    expect(copy.b).toBe("B");
  });
});

describe("Enum instance", () => {
  test("clone() returns the same instance", () => {
    const e = new Enum();
    expect(e.clone()).toBe(e);
  });

  test("WELL_KNOWN_CLONE_API delegates to clone()", () => {
    const e = new Enum();
    expect(e[WELL_KNOWN_CLONE_API]()).toBe(e);
  });
});
