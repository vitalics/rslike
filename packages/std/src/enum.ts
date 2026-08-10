import { WELL_KNOWN_CLONE_API } from "./symbols.ts";
import type { Cloneable } from "./clone.ts";

type Primitive = string | number | boolean;
type Prettify<T> = {
  [P in keyof T]: T[P];
} & {};
/**
 * Turns a value into a valid reverse-map key:
 * - string / number → as-is
 * - boolean → `"true"` / `"false"` (booleans cannot be property keys)
 */
type ReverseKey<V> = V extends PropertyKey
  ? V
  : V extends boolean
  ? `${V}`
  : never;

/**
 * Bidirectional enum type:
 * - forward: `{ readonly fee: -1 }`
 * - reverse: `{ readonly [-1]: "fee" }`
 *
 * Any composite value (array, object) or null/undefined collapses the whole
 * type to `never`.
 */
type _EnumType<T> = [T[keyof T]] extends [Primitive]
  ? {
      readonly [P in keyof T]: T[P];
    } & {
      readonly [P in keyof T as ReverseKey<T[P]>]: P;
    } & {
      readonly [WELL_KNOWN_CLONE_API]: () => EnumType<T>;
    }
  : never;

type EnumType<T> = Prettify<_EnumType<T>>;

/**
 * Keeps only entries whose values are valid enum primitives.
 * Mirrors what `Enum.new(..., { soft: true })` does at runtime.
 */
type PickPrimitives<T> = {
  [P in keyof T as T[P] extends Primitive ? P : never]: T[P];
};

/**
 * Enum type for `soft` mode: invalid entries are dropped instead of
 * collapsing the whole type to `never`.
 *
 * Note: duplicate values are skipped at runtime (first key wins), which
 * cannot be expressed at the type level — reverse keys of duplicates keep
 * a union of candidate keys.
 */
type SoftEnumType<T> = EnumType<PickPrimitives<T>>;

type EnumNewOptions = {
  /** do not throw error and skip keys for not matched validation */
  soft?: boolean;
};

export class Enum implements Cloneable<Enum> {
  /**
   * `Enum` instances are stateless and immutable — cloning returns
   * the same instance (like Rust's `Copy` for zero-sized types).
   *
   * Note: objects produced by `Enum.new(...)` carry their own
   * `[WELL_KNOWN_CLONE_API]` that creates a real frozen copy.
   */
  clone(): Enum {
    return this;
  }

  /** Well-known `Cloneable` trait symbol — delegates to {@link clone}. */
  [WELL_KNOWN_CLONE_API](): Enum {
    return this.clone();
  }

  static new<const T extends Record<string, unknown>>(
    obj: T,
    options: EnumNewOptions & { soft: true }
  ): SoftEnumType<T>;
  static new<const T extends Record<string, unknown>>(
    obj: T,
    options?: EnumNewOptions
  ): EnumType<T>;
  static new<const T extends Record<string, unknown>>(
    obj: T,
    options?: EnumNewOptions
  ): EnumType<T> {
    const result: Record<PropertyKey, unknown> = {};
    // Linear scan beats Set for typical enum sizes (no hashing, no allocation).
    const usedReverseKeys: string[] = [];
    const soft = options?.soft === true;
    // for..in uses V8's enum cache and avoids the Object.keys array allocation.
    for (const key in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
      const value = obj[key];
      const t = typeof value;
      if (
        value === null ||
        (t !== "string" && t !== "number" && t !== "boolean")
      ) {
        if (soft) continue;
        throw new TypeError(
          `Enum.new: value of "${key}" must be a string, number or boolean, got ${
            value === null ? "null" : t
          }`
        );
      }
      const reverseKey = t === "string" ? (value as string) : String(value);
      if (usedReverseKeys.indexOf(reverseKey) !== -1) {
        if (soft) continue;
        throw new TypeError(
          `Enum.new: duplicate value "${reverseKey}" for key "${key}"`
        );
      }
      usedReverseKeys.push(reverseKey);
      result[key] = value;
      result[reverseKey] = key;
    }
    result[WELL_KNOWN_CLONE_API] = () =>
      Object.freeze({ ...result }) as EnumType<T>;
    return Object.freeze(result) as EnumType<T>;
  }
}
