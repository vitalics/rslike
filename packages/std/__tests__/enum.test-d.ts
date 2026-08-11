import { describe, expectTypeOf, test } from "vitest";
import { Enum } from "../src/enum";
import { clone, WELL_KNOWN_CLONE_API } from "../src";

/**
 * `expectTypeOf` silently passes when the actual type is `never`
 * (every assertion on `never` collapses), so never-checks go through
 * this explicit helper instead.
 */
type IsNever<T> = [T] extends [never] ? true : false;

describe("EnumType — type-level", () => {
  test("forward mapping preserves literal types", () => {
    const e = Enum.new({ Up: "up", Down: "down" });
    expectTypeOf(e.Up).toEqualTypeOf<"up">();
    expectTypeOf(e.Down).toEqualTypeOf<"down">();
  });

  test("reverse mapping for string values", () => {
    const e = Enum.new({ Up: "up", Down: "down" });
    expectTypeOf(e.up).toEqualTypeOf<"Up">();
    expectTypeOf(e.down).toEqualTypeOf<"Down">();
  });

  test("reverse mapping for number values", () => {
    const e = Enum.new({ Zero: 0, Negative: -1 });
    expectTypeOf(e[0]).toEqualTypeOf<"Zero">();
    expectTypeOf(e[-1]).toEqualTypeOf<"Negative">();
  });

  test("reverse mapping for boolean values", () => {
    const e = Enum.new({ Yes: true, No: false });
    expectTypeOf(e.true).toEqualTypeOf<"Yes">();
    expectTypeOf(e.false).toEqualTypeOf<"No">();
  });

  test("mixed primitive values", () => {
    const e = Enum.new({ Name: "str", Count: 5, Flag: true });
    expectTypeOf(e.Name).toEqualTypeOf<"str">();
    expectTypeOf(e.str).toEqualTypeOf<"Name">();
    expectTypeOf(e[5]).toEqualTypeOf<"Count">();
    expectTypeOf(e.true).toEqualTypeOf<"Flag">();
  });

  test("composite values collapse to never in strict mode", () => {
    const strict1 = Enum.new({ Bad: {} });
    const strict2 = Enum.new({ Bad: null });
    const strict3 = Enum.new({ Bad: undefined });
    expectTypeOf<IsNever<typeof strict1>>().toEqualTypeOf<true>();
    expectTypeOf<IsNever<typeof strict2>>().toEqualTypeOf<true>();
    expectTypeOf<IsNever<typeof strict3>>().toEqualTypeOf<true>();
  });

  test("soft mode drops invalid entries instead of collapsing to never", () => {
    const soft = Enum.new({ Good: 1, Bad: null, AlsoBad: {} }, { soft: true });
    expectTypeOf<IsNever<typeof soft>>().toEqualTypeOf<false>();
    expectTypeOf(soft.Good).toEqualTypeOf<1>();
    expectTypeOf(soft[1]).toEqualTypeOf<"Good">();
    // @ts-expect-error — invalid entry is removed from the type
    void soft.Bad;
    // @ts-expect-error — invalid entry is removed from the type
    void soft.AlsoBad;
  });
});
