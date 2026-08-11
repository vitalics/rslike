import { bench, describe } from "vitest";
import { Enum } from "../src/enum";
import { WELL_KNOWN_CLONE_API } from "../src/symbols";

const SOURCE = {
  North: 0,
  East: 1,
  South: 2,
  West: 3,
  Up: "up",
  Down: "down",
} as const;

// TypeScript compiles `enum` to this pattern — the baseline to beat.
function tsCompiledEnum() {
  const E: Record<PropertyKey, unknown> = {};
  E[(E["North"] = 0)] = "North";
  E[(E["East"] = 1)] = "East";
  E[(E["South"] = 2)] = "South";
  E[(E["West"] = 3)] = "West";
  E["up"] = E["Up"] = "up" as never;
  E["down"] = E["Down"] = "down" as never;
  return E;
}

describe("Enum construction", () => {
  bench("Enum.new(6 keys)", () => {
    void Enum.new(SOURCE);
  });
  bench("Enum.new(6 keys, soft)", () => {
    void Enum.new(SOURCE, { soft: true });
  });
  bench("plain object literal + Object.freeze", () => {
    void Object.freeze({ ...SOURCE });
  });
  bench("TS-compiled enum pattern", () => {
    void tsCompiledEnum();
  });
});

describe("forward lookup (key → value)", () => {
  const e = Enum.new(SOURCE);
  const plain = { ...SOURCE };

  bench("Enum.new result", () => {
    void e.North;
    void e.West;
    void e.Up;
  });
  bench("plain object", () => {
    void plain.North;
    void plain.West;
    void plain.Up;
  });
});

describe("reverse lookup (value → key)", () => {
  const e = Enum.new(SOURCE);
  const plain = { ...SOURCE };
  const entries = Object.entries(plain);

  bench("Enum.new result — direct property access", () => {
    void e[2];
    void e.up;
  });
  bench("plain object — Object.keys().find scan", () => {
    void Object.keys(plain).find((k) => plain[k as keyof typeof plain] === 2);
    void Object.keys(plain).find(
      (k) => plain[k as keyof typeof plain] === "up"
    );
  });
  bench("plain object — precomputed entries scan", () => {
    void entries.find(([, v]) => v === 2)?.[0];
    void entries.find(([, v]) => v === "up")?.[0];
  });
});

describe("clone", () => {
  const e = Enum.new(SOURCE);
  const plain = { ...SOURCE };

  bench("Enum WELL_KNOWN_CLONE_API", () => {
    void e[WELL_KNOWN_CLONE_API]();
  });
  bench("plain object — spread + freeze", () => {
    void Object.freeze({ ...plain });
  });
  bench("plain object — structuredClone", () => {
    void structuredClone(plain);
  });
});
