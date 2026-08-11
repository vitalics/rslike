import { type Option, Some, None } from "@rslike/std";
import { Iter, ParIter, type IntoIterLike } from "@rslike/iter";

import { type IterSource, toIterable } from "./iter-source";

/** Structural type accepted by all set-algebra methods. */
type AnySet<T> = { has(value: T): boolean } & Iterable<T>;

/**
 * A Rust `HashSet`-inspired wrapper around the native `Set<T>`.
 *
 * Key differences from the native `Set<T>`:
 * - `insert(value)` returns `true` when the value is newly added (like Rust's `HashSet::insert`)
 * - `get(value)` / `take(value)` return `Option<T>` instead of nullable values
 * - Set-algebra methods (`union`, `intersection`, `difference`, `symmetricDifference`)
 *   return lazy `Iter<T>` pipelines
 * - `iter()` / `parIter()` for sequential and concurrent iteration
 *
 * All mutation and lookup operations are O(1) — backed directly by the native `Set<T>`.
 *
 * @example
 * ```ts
 * import { RSLikeSet } from "@rslike/collections";
 *
 * const s = new RSLikeSet([1, 2, 3]);
 * s.insert(4); // true  (newly inserted)
 * s.insert(2); // false (already present)
 * s.get(3);    // Some(3)
 * s.get(9);    // None
 *
 * const a = new RSLikeSet([1, 2, 3]);
 * const b = new RSLikeSet([3, 4, 5]);
 * a.intersection(b).collect(); // [3]
 * a.union(b).collect();        // [1, 2, 3, 4, 5]
 * ```
 */
export class RSLikeSet<T>
  implements Omit<Set<T>, "add" | "values" | "keys" | "entries">, IntoIterLike<T>
{
  _internalSet: Set<T>;

  /**
   * @param source - Optional source of initial values: any iterable or a
   *   pull-based `IterLike` (`next(): Option<T>`).
   */
  constructor(source?: IterSource<T> | null) {
    this._internalSet = source != null ? new Set(toIterable(source)) : new Set();
  }

  // ── Mutation ──────────────────────────────────────────────────────────

  /**
   * Like Rust's `HashSet::insert` — inserts a value and returns `true` if it
   * was newly added, or `false` if it was already present.
   *
   * @example
   * ```ts
   * const s = new RSLikeSet([1, 2]);
   * s.insert(3); // true
   * s.insert(2); // false
   * ```
   */
  insert(value: T): boolean {
    if (this._internalSet.has(value)) return false;
    this._internalSet.add(value);
    return true;
  }

  /**
   * Removes a value. Returns `true` if the value was present and removed.
   * Mirrors both `Set.delete` and Rust's `HashSet::remove`.
   */
  delete(value: T): boolean {
    return this._internalSet.delete(value);
  }

  /**
   * Like Rust's `HashSet::take` — removes and returns the value if present.
   *
   * @example
   * ```ts
   * const s = new RSLikeSet([1, 2, 3]);
   * s.take(2); // Some(2)
   * s.take(9); // None
   * ```
   */
  take(value: T): Option<T> {
    if (this._internalSet.has(value)) {
      this._internalSet.delete(value);
      return Some(value);
    }
    return None();
  }

  /** Removes all values from the set. */
  clear(): void {
    this._internalSet.clear();
  }

  // ── Query ──────────────────────────────────────────────────────────────

  /** Returns `true` if the set contains the given value. */
  has(value: T): boolean {
    return this._internalSet.has(value);
  }

  /**
   * Like Rust's `HashSet::get` — returns `Some(value)` if present, `None` otherwise.
   *
   * @example
   * ```ts
   * const s = new RSLikeSet(["a", "b"]);
   * s.get("a"); // Some("a")
   * s.get("z"); // None
   * ```
   */
  get(value: T): Option<T> {
    return this._internalSet.has(value) ? Some(value) : None();
  }

  /** The number of values in the set. */
  get size(): number {
    return this._internalSet.size;
  }

  /** Alias for `size`, consistent with `RSLikeArray.length`. */
  get length(): number {
    return this._internalSet.size;
  }

  /** Returns `true` if the set contains no values. */
  isEmpty(): boolean {
    return this._internalSet.size === 0;
  }

  forEach(
    callbackfn: (value: T, value2: T, set: Set<T>) => void,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    thisArg?: any
  ): void {
    this._internalSet.forEach(callbackfn, thisArg);
  }

  // ── Set-algebra ────────────────────────────────────────────────────────

  /**
   * Returns a lazy `Iter<T>` over all values in `this` **or** `other` (union).
   *
   * @example
   * ```ts
   * const a = new RSLikeSet([1, 2, 3]);
   * const b = new RSLikeSet([3, 4, 5]);
   * a.union(b).collect(); // [1, 2, 3, 4, 5]
   * ```
   */
  union(other: AnySet<T>): Iter<T> {
    return Iter.from(this._internalSet).chain(
      Iter.from(other).filter((v) => !this._internalSet.has(v)),
    );
  }

  /**
   * Returns a lazy `Iter<T>` over values present in **both** `this` and `other`
   * (intersection).
   *
   * @example
   * ```ts
   * const a = new RSLikeSet([1, 2, 3]);
   * const b = new RSLikeSet([2, 3, 4]);
   * a.intersection(b).collect(); // [2, 3]
   * ```
   */
  intersection(other: AnySet<T>): Iter<T> {
    return Iter.from(this._internalSet).filter((v) => other.has(v));
  }

  /**
   * Returns a lazy `Iter<T>` over values in `this` that are **absent** in `other`
   * (set difference `this ∖ other`).
   *
   * @example
   * ```ts
   * const a = new RSLikeSet([1, 2, 3]);
   * const b = new RSLikeSet([2, 3, 4]);
   * a.difference(b).collect(); // [1]
   * ```
   */
  difference(other: AnySet<T>): Iter<T> {
    return Iter.from(this._internalSet).filter((v) => !other.has(v));
  }

  /**
   * Returns a lazy `Iter<T>` over values in exactly **one** of the two sets
   * (symmetric difference `(this ∖ other) ∪ (other ∖ this)`).
   *
   * @example
   * ```ts
   * const a = new RSLikeSet([1, 2, 3]);
   * const b = new RSLikeSet([2, 3, 4]);
   * a.symmetricDifference(b).collect(); // [1, 4]
   * ```
   */
  symmetricDifference(other: AnySet<T>): Iter<T> {
    return Iter.from(this._internalSet)
      .filter((v) => !other.has(v))
      .chain(Iter.from(other).filter((v) => !this._internalSet.has(v)));
  }

  // ── Subset / superset checks ────────────────────────────────────────────

  /**
   * Returns `true` if every value in `this` is also in `other`.
   *
   * @example
   * ```ts
   * new RSLikeSet([1, 2]).isSubset(new RSLikeSet([1, 2, 3])); // true
   * new RSLikeSet([1, 4]).isSubset(new RSLikeSet([1, 2, 3])); // false
   * ```
   */
  isSubset(other: AnySet<T>): boolean {
    for (const v of this._internalSet) {
      if (!other.has(v)) return false;
    }
    return true;
  }

  /**
   * Returns `true` if every value in `other` is also in `this`.
   *
   * @example
   * ```ts
   * new RSLikeSet([1, 2, 3]).isSuperset(new RSLikeSet([1, 2])); // true
   * new RSLikeSet([1, 2]).isSuperset(new RSLikeSet([1, 2, 3])); // false
   * ```
   */
  isSuperset(other: AnySet<T>): boolean {
    for (const v of other) {
      if (!this._internalSet.has(v)) return false;
    }
    return true;
  }

  /**
   * Returns `true` if `this` and `other` share no values.
   *
   * @example
   * ```ts
   * new RSLikeSet([1, 2]).isDisjoint(new RSLikeSet([3, 4])); // true
   * new RSLikeSet([1, 2]).isDisjoint(new RSLikeSet([2, 3])); // false
   * ```
   */
  isDisjoint(other: AnySet<T>): boolean {
    for (const v of this._internalSet) {
      if (other.has(v)) return false;
    }
    return true;
  }

  // ── Iterators ─────────────────────────────────────────────────────────

  /**
   * Returns a sequential lazy `Iter<T>` over the set values.
   *
   * @example
   * ```ts
   * new RSLikeSet([1, 2, 3]).iter().map(v => v * 2).collect(); // [2, 4, 6]
   * ```
   */
  iter(): Iter<T> {
    return Iter.from(this._internalSet);
  }

  /**
   * Returns a `ParIter<T>` for Rayon-style concurrent async operations.
   *
   * @example
   * ```ts
   * await new RSLikeSet([1, 2, 3]).parIter().map(async v => v * 2).collect();
   * // [2, 4, 6]
   * ```
   */
  parIter(): ParIter<T> {
    return new ParIter(this._internalSet);
  }

  /**
   * Returns a `RSLikeSetIterator<T>` over the set values.
   * Supports both `next()` → `Option<T>` and `for...of`.
   */
  values(): RSLikeSetIterator<T> {
    return new RSLikeSetIterator(this._internalSet.values());
  }

  /**
   * Same as `values()` — `Set` keys are identical to values.
   * Returns a `RSLikeSetIterator<T>` over the set values.
   */
  keys(): RSLikeSetIterator<T> {
    return new RSLikeSetIterator(this._internalSet.keys());
  }

  /**
   * Returns a `RSLikeSetIterator<[T, T]>` of `[value, value]` pairs,
   * mirroring the native `Set.entries()` contract.
   */
  entries(): RSLikeSetIterator<[T, T]> {
    return new RSLikeSetIterator(this._internalSet.entries());
  }

  [Symbol.iterator]() {
    return this._internalSet[Symbol.iterator]();
  }

  get [Symbol.toStringTag]() {
    return this._internalSet[Symbol.toStringTag];
  }
}

/**
 * A lazy iterator over `RSLikeSet` values that extends `Iter<T>`,
 * exposing all chainable iterator adapters alongside the safe `next()` → `Option<T>` API.
 */
export class RSLikeSetIterator<T> extends Iter<T> {
  constructor(iter: Iterator<T>) {
    super(() => iter);
  }

  next(): Option<T> {
    return super.next();
  }

  [Symbol.iterator](): Iterator<T> {
    return super[Symbol.iterator]();
  }
}
