import { type Option, Some, None } from "@rslike/std";
import { Iter, ParIter, type IntoIterLike } from "@rslike/iter";
import { RSLikeMapIterator } from "./map";
import { type IterSource, toIterable } from "./iter-source";

/**
 * An immutable Rust-inspired `HashMap` wrapper.
 *
 * Provides the same safe read API as `RSLikeMap<K, V>` but exposes **no**
 * mutation methods (`set`, `delete`, `clear`). The internal map is held in a
 * private field so it cannot be mutated through any reference escape.
 *
 * Construction always makes a **defensive copy** of the source, so later
 * mutations to the original `Map` or `RSLikeMap` are not reflected here.
 *
 * @example
 * ```ts
 * import { RSLikeReadonlyMap } from "@rslike/collections";
 *
 * const m = new RSLikeReadonlyMap([["a", 1], ["b", 2]]);
 * m.get("a");   // Some(1)
 * m.get("z");   // None
 * m.has("b");   // true
 * // m.set(...)  — compile error, method does not exist
 * ```
 */
export class RSLikeReadonlyMap<K, V> implements IntoIterLike<[K, V]> {
  #internalMap: Map<K, V>;

  static from<K, V>(
    iterable?: IterSource<readonly [K, V]> | null
  ): RSLikeReadonlyMap<K, V> {
    return new RSLikeReadonlyMap(iterable);
  }

  /**
   * @param iterable - Optional source of `[key, value]` pairs.
   *   Accepts any iterable — native `Map`, `RSLikeMap`, array of tuples —
   *   or a pull-based `IterLike` (`next(): Option<[K, V]>`).
   *   The values are copied; later changes to the source are not reflected.
   */
  constructor(iterable?: IterSource<readonly [K, V]> | null) {
    this.#internalMap =
      iterable != null ? new Map(toIterable(iterable)) : new Map();
  }

  // ── Query ──────────────────────────────────────────────────────────────

  /**
   * Returns `Some(value)` if the key exists, `None` otherwise.
   *
   * Unlike the native `Map.get`, this will never return `undefined` for a
   * missing key — the absence is expressed through `None`.
   *
   * @example
   * ```ts
   * m.get("a"); // Some(1)
   * m.get("z"); // None
   * // Edge case: key present with value `undefined`
   * new RSLikeReadonlyMap([["k", undefined]]).get("k"); // Some(undefined)
   * ```
   */
  get(key: K): Option<V> {
    if (!this.#internalMap.has(key)) return None();
    return Some(this.#internalMap.get(key) as V);
  }

  /** Returns `true` if the map contains the given key. */
  has(key: K): boolean {
    return this.#internalMap.has(key);
  }

  /** The number of key-value pairs in the map. */
  get size(): number {
    return this.#internalMap.size;
  }

  /** Alias for `size`, consistent with `RSLikeArray.length`. */
  get length(): number {
    return this.#internalMap.size;
  }

  /** Returns `true` if the map has no entries. */
  isEmpty(): boolean {
    return this.#internalMap.size === 0;
  }

  forEach(
    callbackfn: (value: V, key: K, map: Map<K, V>) => void,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    thisArg?: any
  ): void {
    this.#internalMap.forEach(callbackfn, thisArg);
  }

  // ── Iterators ─────────────────────────────────────────────────────────

  /**
   * Returns a `RSLikeMapIterator<[K, V]>` over all entries.
   * Supports both `next()` → `Option<[K, V]>` and `for...of`.
   */
  entries(): RSLikeMapIterator<[K, V]> {
    return new RSLikeMapIterator(this.#internalMap.entries());
  }

  /**
   * Returns a `RSLikeMapIterator<K>` over all keys.
   */
  keys(): RSLikeMapIterator<K> {
    return new RSLikeMapIterator(this.#internalMap.keys());
  }

  /**
   * Returns a `RSLikeMapIterator<V>` over all values.
   */
  values(): RSLikeMapIterator<V> {
    return new RSLikeMapIterator(this.#internalMap.values());
  }

  /**
   * Returns a sequential lazy `Iter<[K, V]>` over entries.
   *
   * @example
   * ```ts
   * m.iter().map(([k, v]) => `${k}=${v}`).collect();
   * ```
   */
  iter(): Iter<[K, V]> {
    return Iter.from(this.#internalMap);
  }

  /**
   * Returns a `ParIter<[K, V]>` for Rayon-style concurrent async operations.
   */
  parIter(): ParIter<[K, V]> {
    return new ParIter(this.#internalMap.entries());
  }

  [Symbol.iterator]() {
    return this.#internalMap[Symbol.iterator]();
  }

  get [Symbol.toStringTag]() {
    return this.#internalMap[Symbol.toStringTag];
  }
}
