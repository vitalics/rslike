import { type Option, Some, None } from "@rslike/std";
import { Iter, ParIter, DoubleEndedIter, type IntoIterLike } from "@rslike/iter";
import { RSLikeArray } from "./array";
import { type IterSource, toIterable } from "./iter-source";
import type { RsArrayLike } from "./array-like";

export class RSLikeReadonlyArray<T>
  implements Iterable<T>, IntoIterLike<T>, RsArrayLike<T>
{
  /**
   * ArrayLike numeric indexed access. The collection is immutable, so
   * elements are mirrored onto the instance once, in the constructor, as
   * non-writable, non-configurable own properties.
   */
  readonly [index: number]: T;

  #items: readonly T[];
  /** Cursor backing the `IterLike` contract ({@link next}). */
  #cursor = 0;

  static from<T>(
    items?: IterSource<T> | readonly T[] | null
  ): RSLikeReadonlyArray<T> {
    return new RSLikeReadonlyArray(items);
  }

  /**
   * @param items - Optional source of values: any iterable, a readonly
   *   array, or a pull-based `IterLike` (`next(): Option<T>`).
   */
  constructor(items?: IterSource<T> | readonly T[] | null) {
    this.#items = items ? [...toIterable(items as IterSource<T>)] : [];
    for (let i = 0; i < this.#items.length; i++) {
      Object.defineProperty(this, i, {
        value: this.#items[i],
        writable: false,
        enumerable: true,
        configurable: false,
      });
    }
  }

  // ── IterLike contract ─────────────────────────────────────────────

  /**
   * Pull-based iteration over the contents: `Some(value)` until the
   * internal cursor passes the end, then `None`. The cursor is one-shot
   * and shared per instance — for independent, repeatable passes use
   * {@link iter}.
   */
  next(): Option<T> {
    if (this.#cursor >= this.#items.length) return None();
    return Some(this.#items[this.#cursor++]);
  }

  // ── Safe access ───────────────────────────────────────────────────

  get(index: number): Option<T> {
    if (index < 0 || index >= this.#items.length) return None();
    return Some(this.#items[index]);
  }

  at(index: number): Option<T> {
    const len = this.#items.length;
    const i = index < 0 ? len + index : index;
    if (i < 0 || i >= len) return None();
    return Some(this.#items[i]);
  }

  first(): Option<T> {
    if (this.#items.length === 0) return None();
    return Some(this.#items[0]);
  }

  last(): Option<T> {
    if (this.#items.length === 0) return None();
    return Some(this.#items[this.#items.length - 1]);
  }

  find(fn: (value: T, index: number) => boolean): Option<T> {
    const index = this.#items.findIndex((v, i) => fn(v, i));
    return index === -1 ? None() : Some(this.#items[index]);
  }

  findIndex(fn: (value: T, index: number) => boolean): Option<number> {
    const index = this.#items.findIndex((v, i) => fn(v, i));
    return index === -1 ? None() : Some(index);
  }

  // ── Read-only standard methods ────────────────────────────────────

  /** Produces a new mutable `RSLikeArray<U>` — like Rust's owned transformation. */
  map<U>(fn: (value: T, index: number) => U): RSLikeArray<U> {
    return new RSLikeArray([...this.#items].map(fn));
  }

  filter(fn: (value: T, index: number) => boolean): RSLikeReadonlyArray<T> {
    return new RSLikeReadonlyArray([...this.#items].filter(fn));
  }

  forEach(fn: (value: T, index: number) => void): void {
    this.#items.forEach(fn);
  }

  some(fn: (value: T, index: number) => boolean): boolean {
    return this.#items.some(fn);
  }

  every(fn: (value: T, index: number) => boolean): boolean {
    return this.#items.every(fn);
  }

  includes(value: T): boolean {
    return this.#items.includes(value);
  }

  slice(start?: number, end?: number): RSLikeReadonlyArray<T> {
    return new RSLikeReadonlyArray(this.#items.slice(start, end));
  }

  // ── Rust-inspired conversions ─────────────────────────────────────

  /** Returns a sequential lazy `Iter<T>`. */
  iter(): Iter<T> {
    return Iter.from(this.#items);
  }

  /** Returns a `DoubleEndedIter<T>` supporting iteration from both ends. */
  doubleEndedIter(): DoubleEndedIter<T> {
    return new DoubleEndedIter(this.#items);
  }

  /** Returns a `ParIter<T>` for Rayon-style concurrent async operations. */
  parIter(): ParIter<T> {
    return new ParIter(this.#items);
  }

  // ── Native Array iterator contract (Iter-based) ───────────────────

  /** Returns an `Iter<number>` over the array indices. */
  keys(): Iter<number> {
    return new Iter(this.#items.keys());
  }

  /** Returns an `Iter<T>` over the array values. Same as `iter()`. */
  values(): Iter<T> {
    return this.iter();
  }

  /** Returns an `Iter<[number, T]>` over `[index, value]` pairs. */
  entries(): Iter<[number, T]> {
    return this.iter().enumerate();
  }

  /** Returns `true` if the array has no elements. */
  isEmpty(): boolean {
    return this.#items.length === 0;
  }

  get length(): number {
    return this.#items.length;
  }

  [Symbol.iterator](): Iterator<T> {
    return (this.#items as T[])[Symbol.iterator]();
  }
}
