import { type Option, Some, None } from "@rslike/std";
import { Iter, ParIter, type IntoIterLike } from "@rslike/iter";
import { RSLikeSetIterator } from "./set";
import { type IterSource, toIterable } from "./iter-source";

/** Structural type accepted by all set-algebra methods. */
type AnySet<T> = { has(value: T): boolean } & Iterable<T>;

/**
 * An immutable Rust-inspired `HashSet` wrapper.
 *
 * Provides the same read API and set-algebra as `RSLikeSet<T>` but exposes
 * **no** mutation methods (`insert`, `delete`, `clear`, `take`). The internal
 * set is held in a private field so it cannot be mutated through any reference.
 *
 * Construction always makes a **defensive copy** of the source, so later
 * mutations to the original `Set` or `RSLikeSet` are not reflected here.
 *
 * Set-algebra methods accept any value satisfying `{ has(v): boolean } & Iterable<T>`:
 * `Set<T>`, `RSLikeSet<T>`, `RSLikeReadonlySet<T>`, `ReadonlySet<T>`, etc.
 *
 * @example
 * ```ts
 * import { RSLikeReadonlySet } from "@rslike/collections";
 *
 * const s = new RSLikeReadonlySet([1, 2, 3]);
 * s.get(2);    // Some(2)
 * s.get(9);    // None
 * s.has(1);    // true
 * // s.insert(4) — compile error, method does not exist
 *
 * const t = new RSLikeReadonlySet([2, 3, 4]);
 * s.intersection(t).collect(); // [2, 3]
 * ```
 */
export class RSLikeReadonlySet<T> implements IntoIterLike<T> {
  #internalSet: Set<T>;

  static from<T>(iterable?: IterSource<T> | null): RSLikeReadonlySet<T> {
    return new RSLikeReadonlySet(iterable);
  }

  /**
   * @param iterable - Optional source of initial values: any iterable or a
   *   pull-based `IterLike` (`next(): Option<T>`).
   *   The values are copied; later changes to the source are not reflected.
   */
  constructor(iterable?: IterSource<T> | null) {
    this.#internalSet =
      iterable != null ? new Set(toIterable(iterable)) : new Set();
  }

  // ── Query ──────────────────────────────────────────────────────────────

  /** Returns `true` if the set contains the given value. */
  has(value: T): boolean {
    return this.#internalSet.has(value);
  }

  /**
   * Returns `Some(value)` if present, `None` otherwise.
   *
   * @example
   * ```ts
   * s.get(2); // Some(2)
   * s.get(9); // None
   * ```
   */
  get(value: T): Option<T> {
    return this.#internalSet.has(value) ? Some(value) : None();
  }

  /** The number of values in the set. */
  get size(): number {
    return this.#internalSet.size;
  }

  /** Alias for `size`, consistent with `RSLikeArray.length`. */
  get length(): number {
    return this.#internalSet.size;
  }

  /** Returns `true` if the set contains no values. */
  isEmpty(): boolean {
    return this.#internalSet.size === 0;
  }

  forEach(
    callbackfn: (value: T, value2: T, set: Set<T>) => void,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    thisArg?: any
  ): void {
    this.#internalSet.forEach(callbackfn, thisArg);
  }

  // ── Set-algebra ────────────────────────────────────────────────────────

  /**
   * Returns a lazy `Iter<T>` over all values in `this` **or** `other` (union).
   *
   * @example
   * ```ts
   * new RSLikeReadonlySet([1, 2]).union(new RSLikeReadonlySet([2, 3])).collect();
   * // [1, 2, 3]
   * ```
   */
  union(other: AnySet<T>): Iter<T> {
    return Iter.from(this.#internalSet).chain(
      Iter.from(other).filter((v) => !this.#internalSet.has(v))
    );
  }

  /**
   * Returns a lazy `Iter<T>` over values present in **both** `this` and `other`
   * (intersection).
   *
   * @example
   * ```ts
   * new RSLikeReadonlySet([1, 2, 3]).intersection(new Set([2, 3, 4])).collect();
   * // [2, 3]
   * ```
   */
  intersection(other: AnySet<T>): Iter<T> {
    return Iter.from(this.#internalSet).filter((v) => other.has(v));
  }

  /**
   * Returns a lazy `Iter<T>` over values in `this` absent in `other`
   * (set difference `this ∖ other`).
   *
   * @example
   * ```ts
   * new RSLikeReadonlySet([1, 2, 3]).difference(new RSLikeReadonlySet([2])).collect();
   * // [1, 3]
   * ```
   */
  difference(other: AnySet<T>): Iter<T> {
    return Iter.from(this.#internalSet).filter((v) => !other.has(v));
  }

  /**
   * Returns a lazy `Iter<T>` over values in exactly **one** of the two sets
   * (symmetric difference `(this ∖ other) ∪ (other ∖ this)`).
   *
   * @example
   * ```ts
   * new RSLikeReadonlySet([1, 2]).symmetricDifference(new RSLikeReadonlySet([2, 3])).collect();
   * // [1, 3]
   * ```
   */
  symmetricDifference(other: AnySet<T>): Iter<T> {
    return Iter.from(this.#internalSet)
      .filter((v) => !other.has(v))
      .chain(Iter.from(other).filter((v) => !this.#internalSet.has(v)));
  }

  // ── Subset / superset checks ────────────────────────────────────────────

  /**
   * Returns `true` if every value in `this` is also in `other`.
   *
   * @example
   * ```ts
   * new RSLikeReadonlySet([1, 2]).isSubset(new RSLikeReadonlySet([1, 2, 3])); // true
   * ```
   */
  isSubset(other: AnySet<T>): boolean {
    for (const v of this.#internalSet) {
      if (!other.has(v)) return false;
    }
    return true;
  }

  /**
   * Returns `true` if every value in `other` is also in `this`.
   *
   * @example
   * ```ts
   * new RSLikeReadonlySet([1, 2, 3]).isSuperset(new RSLikeReadonlySet([1, 2])); // true
   * ```
   */
  isSuperset(other: AnySet<T>): boolean {
    for (const v of other) {
      if (!this.#internalSet.has(v)) return false;
    }
    return true;
  }

  /**
   * Returns `true` if `this` and `other` share no values.
   *
   * @example
   * ```ts
   * new RSLikeReadonlySet([1, 2]).isDisjoint(new RSLikeReadonlySet([3, 4])); // true
   * ```
   */
  isDisjoint(other: AnySet<T>): boolean {
    for (const v of this.#internalSet) {
      if (other.has(v)) return false;
    }
    return true;
  }

  // ── Iterators ─────────────────────────────────────────────────────────

  /**
   * Returns a sequential lazy `Iter<T>` over the set values.
   */
  iter(): Iter<T> {
    return Iter.from(this.#internalSet);
  }

  /**
   * Returns a `ParIter<T>` for Rayon-style concurrent async operations.
   */
  parIter(): ParIter<T> {
    return new ParIter(this.#internalSet);
  }

  /** Returns a `RSLikeSetIterator<T>` over the set values. */
  values(): RSLikeSetIterator<T> {
    return new RSLikeSetIterator(this.#internalSet.values());
  }

  /** Same as `values()` — `Set` keys are identical to values. */
  keys(): RSLikeSetIterator<T> {
    return new RSLikeSetIterator(this.#internalSet.keys());
  }

  /** Returns a `RSLikeSetIterator<[T, T]>` of `[value, value]` pairs. */
  entries(): RSLikeSetIterator<[T, T]> {
    return new RSLikeSetIterator(this.#internalSet.entries());
  }

  [Symbol.iterator]() {
    return this.#internalSet[Symbol.iterator]();
  }

  get [Symbol.toStringTag]() {
    return this.#internalSet[Symbol.toStringTag];
  }
}
