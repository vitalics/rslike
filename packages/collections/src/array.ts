import { type Option, Some, None } from "@rslike/std";
import {
  Iter,
  ParIter,
  DoubleEndedIter,
  type IntoIterLike,
} from "@rslike/iter";

import { type IterSource, toIterable } from "./iter-source";
import type { RsArrayLike } from "./array-like";

export class RSLikeArray<T>
  implements Iterable<T>, IntoIterLike<T>, RsArrayLike<T>
{
  /**
   * ArrayLike numeric indexed access. Indexes are exposed as live accessor
   * properties reading straight from the internal storage, so values never
   * go stale after mutations. Writing through an index throws in strict
   * mode — mutate via the methods instead.
   */
  readonly [index: number]: T;

  #items: T[];
  /**
   * Number of index accessors ever defined on `this`. Accessors are never
   * deleted on shrink — only hidden — so this value never decreases.
   */
  #capacity = 0;
  /** Cursor backing the `IterLike` contract ({@link next}). */
  #cursor = 0;

  static from<T>(items?: IterSource<T> | null): RSLikeArray<T> {
    return new RSLikeArray(items);
  }

  /**
   * @param items - Optional source of values: any iterable or a pull-based
   *   `IterLike` (`next(): Option<T>`).
   */
  constructor(items?: IterSource<T> | null) {
    this.#items = items ? [...toIterable(items)] : [];
    this.#syncIndexes(0);
  }

  /**
   * Reconciles the visible index range after the length changed from
   * `prevLength`. Accessors read `#items[i]` on demand, so element values
   * never need re-mirroring — after `shift()` every index observes its
   * shifted value for free. Only visibility is managed: grown indexes get
   * an accessor (or are re-shown), shrunk ones are hidden from own-key
   * views (`Object.keys`, spread) by turning off `enumerable`. Cost is
   * O(|length - prevLength|) per mutation, so `pop`/`shift` pay O(1) here
   * and `push(...k)` pays O(k).
   */
  #syncIndexes(prevLength: number): void {
    const length = this.#items.length;
    const lo = Math.min(prevLength, length);
    const hi = Math.max(prevLength, length);
    for (let i = lo; i < hi; i++) {
      if (i < this.#capacity) {
        Reflect.defineProperty(this, i, { enumerable: i < length });
      } else {
        const index = i;
        Reflect.defineProperty(this, index, {
          get: () => this.#items[index],
          enumerable: true,
          configurable: true,
        });
      }
    }
    if (hi > this.#capacity) this.#capacity = hi;
  }

  // ── IterLike contract ─────────────────────────────────────────────

  /**
   * Pull-based iteration over the current contents: `Some(value)` until
   * the internal cursor passes the end, then `None`. The cursor is
   * one-shot and shared per instance — for independent, repeatable
   * passes use {@link iter}.
   */
  next(): Option<T> {
    if (this.#cursor >= this.#items.length) return None();
    return Some(this.#items[this.#cursor++]);
  }

  // ── Safe access (Rust slice / Vec) ────────────────────────────────

  /** `slice::get(index)` — None if index is out of bounds. */
  get(index: number): Option<T> {
    if (index < 0 || index >= this.#items.length) return None();
    return Some(this.#items[index]);
  }

  /** Like `Array.prototype.at()` but returns `Option<T>`. Supports negative indices. */
  at(index: number): Option<T> {
    const len = this.#items.length;
    const i = index < 0 ? len + index : index;
    if (i < 0 || i >= len) return None();
    return Some(this.#items[i]);
  }

  /** `slice::first()` — None if empty. */
  first(): Option<T> {
    if (this.#items.length === 0) return None();
    return Some(this.#items[0]);
  }

  /** `slice::last()` — None if empty. */
  last(): Option<T> {
    if (this.#items.length === 0) return None();
    return Some(this.#items[this.#items.length - 1]);
  }

  /** `Vec::pop()` — removes and returns the last element, or None if empty. */
  pop(): Option<T> {
    const prev = this.#items.length;
    if (prev === 0) return None();
    const value = this.#items.pop() as T;
    this.#syncIndexes(prev);
    return Some(value);
  }

  /** Removes and returns the first element, or None if empty. */
  shift(): Option<T> {
    const prev = this.#items.length;
    if (prev === 0) return None();
    const value = this.#items.shift() as T;
    this.#syncIndexes(prev);
    return Some(value);
  }

  /** `slice::iter().find()` — None if no element matches. */
  find(fn: (value: T, index: number) => boolean): Option<T> {
    const index = this.#items.findIndex((v, i) => fn(v, i));
    return index === -1 ? None() : Some(this.#items[index]);
  }

  /** Returns `Some(index)` of the first matching element, or None. */
  findIndex(fn: (value: T, index: number) => boolean): Option<number> {
    const index = this.#items.findIndex((v, i) => fn(v, i));
    return index === -1 ? None() : Some(index);
  }

  // ── Standard methods ──────────────────────────────────────────────

  push(...items: T[]): number {
    const prev = this.#items.length;
    const length = this.#items.push(...items);
    this.#syncIndexes(prev);
    return length;
  }

  map<U>(fn: (value: T, index: number) => U): RSLikeArray<U> {
    return new RSLikeArray(this.#items.map(fn));
  }

  filter(fn: (value: T, index: number) => boolean): RSLikeArray<T> {
    return new RSLikeArray(this.#items.filter(fn));
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

  slice(start?: number, end?: number): RSLikeArray<T> {
    return new RSLikeArray(this.#items.slice(start, end));
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
    return this.#items[Symbol.iterator]();
  }
}
