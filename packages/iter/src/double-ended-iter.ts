import { Some, None } from "@rslike/std";
import { Iter } from "./iter.ts";
import type { AnyOption } from "./types.ts";

/**
 * A double-ended iterator backed by an array, allowing iteration from both
 * the front and the back. Modeled after Rust's `DoubleEndedIterator` trait.
 *
 * The `next()` and `nextBack()` methods share cursor state, so they can be
 * interleaved:
 *
 * @example
 * ```ts
 * import { doubleEndedIter } from "@rslike/iter";
 *
 * const dei = doubleEndedIter([1, 2, 3, 4]);
 * dei.next();     // Some(1)
 * dei.nextBack(); // Some(4)
 * dei.next();     // Some(2)
 * dei.nextBack(); // Some(3)
 * dei.next();     // None (exhausted)
 * ```
 */
export class DoubleEndedIter<const T> extends Iter<T> {
  // Single source of truth shared between the generator (in super) and all methods.
  #s: { items: readonly T[]; front: number; back: number };

  /**
   * Creates a `DoubleEndedIter<T>` from an array.
   * Provides backward-compatible API similar to `Array.from()`.
   *
   * @example
   * ```ts
   * DoubleEndedIter.from([1, 2, 3]).nextBack(); // Some(3)
   * DoubleEndedIter.from([1, 2, 3]).rev().collect(); // [3, 2, 1]
   * ```
   */
  static override from<T>(items: readonly T[]): DoubleEndedIter<T> {
    return new DoubleEndedIter(items);
  }

  constructor(items: readonly T[]) {
    const s = { items, front: 0, back: items.length - 1 };
    super(function* () {
      while (s.front <= s.back) {
        yield s.items[s.front++];
      }
    });
    this.#s = s;
  }

  /**
   * Advances the iterator from the front and returns `Option<T>`.
   * Returns `None()` when the iterator is exhausted.
   */
  override next(): AnyOption<T> {
    if (this.#s.front > this.#s.back) {
      return None();
    }
    return Some(this.#s.items[this.#s.front++]);
  }

  /**
   * Advances the iterator from the back and returns `Option<T>`.
   * Returns `None()` when the iterator is exhausted.
   *
   * @example
   * ```ts
   * const dei = doubleEndedIter([1, 2, 3]);
   * dei.nextBack(); // Some(3)
   * dei.nextBack(); // Some(2)
   * dei.nextBack(); // Some(1)
   * dei.nextBack(); // None
   * ```
   */
  nextBack(): AnyOption<T> {
    if (this.#s.front > this.#s.back) {
      return None();
    }
    return Some(this.#s.items[this.#s.back--]);
  }

  /**
   * Returns the remaining elements as a `DoubleEndedIter` in reverse order.
   *
   * @example
   * ```ts
   * doubleEndedIter([1, 2, 3]).rev().collect(); // [3, 2, 1]
   * ```
   */
  override rev(): DoubleEndedIter<T> {
    const remaining = this.#s.items.slice(this.#s.front, this.#s.back + 1);
    remaining.reverse();
    return new DoubleEndedIter(remaining);
  }

  override [Symbol.iterator](): Iterator<T> {
    const s = this.#s;
    return {
      next(): IteratorResult<T> {
        if (s.front > s.back) {
          return { done: true, value: undefined };
        }
        return { done: false, value: s.items[s.front++] };
      },
    };
  }

  // ── Back-end consumers ───────────────────────────────────────────

  /**
   * Folds every remaining element from the back into an accumulator.
   *
   * @example
   * ```ts
   * doubleEndedIter([1, 2, 3]).rfold("", (acc, x) => acc + x); // "321"
   * ```
   */
  rfold<U>(init: U, fn: (acc: U, value: T) => U): U {
    let acc = init;
    while (this.#s.front <= this.#s.back) {
      acc = fn(acc, this.#s.items[this.#s.back--]);
    }
    return acc;
  }

  /**
   * Searches for an element from the back that matches the predicate.
   *
   * @example
   * ```ts
   * doubleEndedIter([1, 2, 3, 4]).rfind(x => x < 3); // Some(2)
   * ```
   */
  rfind(fn: (value: T) => boolean): AnyOption<T> {
    while (this.#s.front <= this.#s.back) {
      const value = this.#s.items[this.#s.back--];
      if (fn(value)) return Some(value);
    }
    return None();
  }

  /**
   * Returns the index (in original order) of the first element from the back
   * that matches the predicate.
   *
   * @example
   * ```ts
   * doubleEndedIter([1, 2, 3, 2, 1]).rposition(x => x === 2); // Some(3)
   * ```
   */
  rposition(fn: (value: T) => boolean): AnyOption<number> {
    while (this.#s.front <= this.#s.back) {
      const idx = this.#s.back--;
      if (fn(this.#s.items[idx])) return Some(idx);
    }
    return None();
  }

  // ── Consumer overrides (bypass generator, use direct array access) ─

  /**
   * Collects remaining elements into an array via `slice()` — avoids generator overhead.
   *
   * Optionally accepts a constructor to collect into a specific collection
   * (`Array`, `Set`, `Map` for `[K, V]` pairs, `Iter`, `DoubleEndedIter`,
   * `@rslike/collections` classes). See {@link Iter.collect}.
   */
  override collect(): T[];
  override collect(ctor: ArrayConstructor): T[];
  override collect<K, V>(
    this: DoubleEndedIter<readonly [K, V]>,
    ctor: MapConstructor,
  ): Map<K, V>;
  override collect<C>(ctor: new (items: T[]) => C): C;
  override collect(
    ctor?: ArrayConstructor | MapConstructor | (new (items: T[]) => unknown),
  ): unknown {
    const result = this.#s.items.slice(this.#s.front, this.#s.back + 1) as T[];
    this.#s.front = this.#s.back + 1;
    if (ctor === undefined || ctor === Array) {
      return result;
    }
    return new (ctor as new (items: T[]) => unknown)(result);
  }

  /**
   * Folds remaining elements from the front using a direct array loop.
   */
  override fold<U>(init: U, fn: (acc: U, value: T) => U): U {
    let acc = init;
    while (this.#s.front <= this.#s.back) {
      acc = fn(acc, this.#s.items[this.#s.front++]);
    }
    return acc;
  }

  /**
   * O(1) count — returns `back - front + 1` without iterating.
   */
  override count(): number {
    const n = Math.max(0, this.#s.back - this.#s.front + 1);
    this.#s.front = this.#s.back + 1;
    return n;
  }

  /**
   * Finds first matching element from the front via direct array loop.
   */
  override find(fn: (value: T) => boolean): AnyOption<T> {
    while (this.#s.front <= this.#s.back) {
      const value = this.#s.items[this.#s.front++];
      if (fn(value)) return Some(value);
    }
    return None();
  }

  /**
   * Iterates remaining elements from the front via direct array loop.
   */
  override forEach(fn: (value: T) => void): void {
    while (this.#s.front <= this.#s.back) {
      fn(this.#s.items[this.#s.front++]);
    }
  }

  /**
   * Returns `true` immediately when a matching element is found.
   */
  override any(fn: (value: T) => boolean): boolean {
    while (this.#s.front <= this.#s.back) {
      if (fn(this.#s.items[this.#s.front++])) return true;
    }
    return false;
  }

  /**
   * Returns `false` immediately when a non-matching element is found.
   */
  override all(fn: (value: T) => boolean): boolean {
    while (this.#s.front <= this.#s.back) {
      if (!fn(this.#s.items[this.#s.front++])) return false;
    }
    return true;
  }

  /**
   * O(1) nth — jumps directly to index without iterating.
   */
  override nth(n: number): AnyOption<T> {
    const idx = this.#s.front + n;
    if (idx > this.#s.back) {
      this.#s.front = this.#s.back + 1;
      return None();
    }
    this.#s.front = idx + 1;
    return Some(this.#s.items[idx]);
  }

  // ── Adapter overrides (preserve DoubleEndedIter) ─────────────────

  /**
   * Creates a `DoubleEndedIter` that transforms each element using `fn`.
   * Note: eagerly evaluates the remaining elements to preserve double-ended capability.
   */
  override map<U>(fn: (value: T) => U): DoubleEndedIter<U> {
    return new DoubleEndedIter(
      this.#s.items.slice(this.#s.front, this.#s.back + 1).map(fn)
    );
  }

  /**
   * Creates a `DoubleEndedIter` with only elements matching the predicate.
   * Note: eagerly evaluates to preserve double-ended capability.
   */
  override filter<S extends T>(fn: (value: T) => value is S): DoubleEndedIter<S>;
  override filter(fn: (value: T) => boolean): DoubleEndedIter<T>;
  override filter(fn: (value: T) => boolean): DoubleEndedIter<T> {
    return new DoubleEndedIter(
      this.#s.items.slice(this.#s.front, this.#s.back + 1).filter(fn)
    );
  }

  /**
   * Creates a `DoubleEndedIter` with at most `n` elements from the front.
   */
  override take(n: number): DoubleEndedIter<T> {
    return new DoubleEndedIter(
      this.#s.items.slice(this.#s.front, Math.min(this.#s.front + n, this.#s.back + 1))
    );
  }

  /**
   * Creates a `DoubleEndedIter` that skips the first `n` elements.
   */
  override skip(n: number): DoubleEndedIter<T> {
    return new DoubleEndedIter(
      this.#s.items.slice(Math.min(this.#s.front + n, this.#s.back + 1), this.#s.back + 1)
    );
  }

  /**
   * Creates a `DoubleEndedIter` that applies `fn` to each remaining element
   * and keeps only the `Some` values (unwrapped).
   * Note: eagerly evaluates to preserve double-ended capability.
   */
  override filter_map<U>(fn: (value: T) => AnyOption<U>): DoubleEndedIter<U> {
    const results: U[] = [];
    const items = this.#s.items.slice(this.#s.front, this.#s.back + 1);
    for (const item of items) {
      const result = fn(item);
      if (result.isSome()) {
        results.push(result.unwrap());
      }
    }
    return new DoubleEndedIter(results);
  }
}
