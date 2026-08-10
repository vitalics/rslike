import { Some, None } from "@rslike/std";
import { compare, equals, type Ord } from "@rslike/cmp";
import type { AnyOption, IterLike } from "./types.ts";

/**
 * A lazy iterator class providing Rust-like chainable adapter and consumer methods.
 *
 * Wraps any `Iterable<T>` or iterator factory and provides methods like
 * `map`, `filter`, `take`, `fold`, `collect`, etc. Adapter methods are lazy —
 * they return new `Iter` instances backed by closure-based pull iterators.
 * Consumer methods are eager and execute the full chain.
 *
 * Implements `Iterable<T>` so it works with `for...of`, spread, and destructuring.
 *
 * @example
 * ```ts
 * import { iter } from "@rslike/iter";
 *
 * const result = iter([1, 2, 3, 4, 5])
 *   .filter(x => x % 2 === 0)
 *   .map(x => x * 10)
 *   .collect();
 * // [20, 40]
 * ```
 */
export class Iter<const T> implements Iterable<T>, IterLike<T> {
  #iter: Iterator<T>;

  /**
   * Creates an `Iter<T>` from any iterable source.
   * Provides backward-compatible API similar to `Array.from()`.
   *
   * When a `mapFn` is provided, each element is transformed before being yielded,
   * equivalent to `Array.from(source, mapFn)`.
   *
   * @example
   * ```ts
   * Iter.from([1, 2, 3]).map(x => x * 2).collect(); // [2, 4, 6]
   * Iter.from("hello").collect(); // ["h", "e", "l", "l", "o"]
   * Iter.from(new Set([1, 2, 3])).filter(x => x > 1).collect(); // [2, 3]
   * Iter.from([1, 2, 3], x => x * 2).collect(); // [2, 4, 6]
   * Iter.from("abc", (c, i) => `${i}:${c}`).collect(); // ["0:a", "1:b", "2:c"]
   * ```
   */
  static from<T>(source: Iterable<T>): Iter<T>;
  static from<T, U>(
    source: Iterable<T>,
    mapFn: (value: T, index: number) => U
  ): Iter<U>;
  static from<T, U>(
    source: Iterable<T>,
    mapFn?: (value: T, index: number) => U
  ): Iter<T> | Iter<U> {
    if (mapFn === undefined) {
      return new Iter(source);
    }
    const srcIter = source[Symbol.iterator]();
    let i = 0;
    return new Iter<U>(() => ({
      next(): IteratorResult<U> {
        const r = srcIter.next();
        if (r.done) return r as unknown as IteratorResult<U>;
        return { done: false, value: mapFn(r.value, i++) };
      },
    }));
  }

  constructor(source: Iterable<T> | (() => Iterator<T>)) {
    if (typeof source === "function") {
      this.#iter = source();
    } else {
      this.#iter = source[Symbol.iterator]();
    }
  }

  /**
   * Advances the iterator and returns `Option<T>` for the next value.
   * Returns `Some(value)` if there is a next element, or `None()` if exhausted.
   *
   * @example
   * ```ts
   * const it = iter([1, 2]);
   * it.next(); // Some(1)
   * it.next(); // Some(2)
   * it.next(); // None
   * ```
   */
  next(): AnyOption<T> {
    const result = this.#iter.next();
    if (result.done) {
      return None();
    }
    return Some(result.value);
  }

  [Symbol.iterator](): Iterator<T> {
    return this.#iter;
  }

  // ── Adapters (lazy) ──────────────────────────────────────────────

  /**
   * Creates an iterator that transforms each element using `fn`.
   *
   * @example
   * ```ts
   * iter([1, 2, 3]).map(x => x * 2).collect(); // [2, 4, 6]
   * ```
   */
  map<U>(fn: (value: T) => U): Iter<U> {
    const source = this.#iter;
    return new Iter<U>(() => {
      // Reuse a single result object — safe because consumers read .value before
      // calling next() again (collect/fold/filter/etc. all follow this pattern).
      const yieldResult: IteratorYieldResult<U> = {
        done: false,
        value: undefined as unknown as U,
      };
      return {
        next(): IteratorResult<U> {
          const r = source.next();
          if (r.done) return r as unknown as IteratorResult<U>;
          yieldResult.value = fn(r.value);
          return yieldResult;
        },
      };
    });
  }

  /**
   * Creates an iterator that only yields elements matching the predicate.
   *
   * @example
   * ```ts
   * iter([1, 2, 3, 4]).filter(x => x % 2 === 0).collect(); // [2, 4]
   * ```
   */
  filter<S extends T>(fn: (value: T) => value is S): Iter<S>;
  filter(fn: (value: T) => boolean): Iter<T>;
  filter(fn: (value: T) => boolean): Iter<T> {
    const source = this.#iter;
    return new Iter<T>(() => ({
      next(): IteratorResult<T> {
        while (true) {
          const r = source.next();
          if (r.done) return r;
          if (fn(r.value)) return r;
        }
      },
    }));
  }

  /**
   * Creates an iterator that yields `[index, value]` tuples.
   *
   * @example
   * ```ts
   * iter(["a", "b"]).enumerate().collect(); // [[0, "a"], [1, "b"]]
   * ```
   */
  enumerate(): Iter<[number, T]> {
    const source = this.#iter;
    return new Iter<[number, T]>(() => {
      let i = 0;
      return {
        next(): IteratorResult<[number, T]> {
          const r = source.next();
          if (r.done) return r as unknown as IteratorResult<[number, T]>;
          return { done: false, value: [i++, r.value] };
        },
      };
    });
  }

  /**
   * Creates an iterator that yields at most `n` elements.
   *
   * @example
   * ```ts
   * iter([1, 2, 3, 4, 5]).take(3).collect(); // [1, 2, 3]
   * ```
   */
  take(n: number): Iter<T> {
    const source = this.#iter;
    return new Iter<T>(() => {
      let remaining = n;
      return {
        next(): IteratorResult<T> {
          if (remaining <= 0)
            return { done: true, value: undefined as unknown as T };
          const r = source.next();
          if (r.done) {
            remaining = 0;
            return r;
          }
          remaining--;
          return r;
        },
      };
    });
  }

  /**
   * Creates an iterator that skips the first `n` elements.
   *
   * @example
   * ```ts
   * iter([1, 2, 3, 4, 5]).skip(2).collect(); // [3, 4, 5]
   * ```
   */
  skip(n: number): Iter<T> {
    const source = this.#iter;
    return new Iter<T>(() => {
      let skipped = false;
      return {
        next(): IteratorResult<T> {
          if (!skipped) {
            for (let i = 0; i < n; i++) {
              const r = source.next();
              if (r.done) return r;
            }
            skipped = true;
          }
          return source.next();
        },
      };
    });
  }

  /**
   * Creates an iterator that yields elements while the predicate returns true.
   * Stops at the first element that doesn't match.
   *
   * @example
   * ```ts
   * iter([1, 2, 3, 4, 1]).takeWhile(x => x < 3).collect(); // [1, 2]
   * ```
   */
  takeWhile(fn: (value: T) => boolean): Iter<T> {
    const source = this.#iter;
    return new Iter<T>(() => {
      let done = false;
      return {
        next(): IteratorResult<T> {
          if (done) return { done: true, value: undefined as unknown as T };
          const r = source.next();
          if (r.done || !fn(r.value)) {
            done = true;
            return { done: true, value: undefined as unknown as T };
          }
          return r;
        },
      };
    });
  }

  /**
   * Creates an iterator that skips elements while the predicate returns true,
   * then yields all remaining elements.
   *
   * @example
   * ```ts
   * iter([1, 2, 3, 4, 1]).skipWhile(x => x < 3).collect(); // [3, 4, 1]
   * ```
   */
  skipWhile(fn: (value: T) => boolean): Iter<T> {
    const source = this.#iter;
    return new Iter<T>(() => {
      let skipping = true;
      return {
        next(): IteratorResult<T> {
          while (skipping) {
            const r = source.next();
            if (r.done) return r;
            if (!fn(r.value)) {
              skipping = false;
              return r;
            }
          }
          return source.next();
        },
      };
    });
  }

  /**
   * Creates an iterator that first yields all elements from this iterator,
   * then all elements from `other`.
   *
   * @example
   * ```ts
   * iter([1, 2]).chain(iter([3, 4])).collect(); // [1, 2, 3, 4]
   * ```
   */
  chain(other: Iterable<T>): Iter<T> {
    const source = this.#iter;
    return new Iter<T>(() => {
      let onSecond = false;
      let otherIter: Iterator<T>;
      return {
        next(): IteratorResult<T> {
          if (!onSecond) {
            const r = source.next();
            if (!r.done) return r;
            onSecond = true;
            otherIter = other[Symbol.iterator]();
          }
          return otherIter.next();
        },
      };
    });
  }

  /**
   * Creates an iterator that pairs elements from this iterator with elements
   * from `other`. Stops when either iterator is exhausted.
   *
   * @example
   * ```ts
   * iter([1, 2, 3]).zip(["a", "b"]).collect(); // [[1, "a"], [2, "b"]]
   * ```
   */
  zip<U>(other: Iterable<U>): Iter<[T, U]> {
    const source = this.#iter;
    return new Iter<[T, U]>(() => {
      const otherIter = other[Symbol.iterator]();
      return {
        next(): IteratorResult<[T, U]> {
          const a = source.next();
          if (a.done) return a as unknown as IteratorResult<[T, U]>;
          const b = otherIter.next();
          if (b.done) return b as unknown as IteratorResult<[T, U]>;
          return { done: false, value: [a.value, b.value] };
        },
      };
    });
  }

  /**
   * Creates an iterator that maps each element to an iterable, then flattens
   * the results one level.
   *
   * @example
   * ```ts
   * iter([1, 2, 3]).flatMap(x => [x, x * 10]).collect(); // [1, 10, 2, 20, 3, 30]
   * ```
   */
  flatMap<U>(fn: (value: T) => Iterable<U>): Iter<U> {
    const source = this.#iter;
    return new Iter<U>(() => {
      let inner: Iterator<U> | undefined;
      return {
        next(): IteratorResult<U> {
          while (true) {
            if (inner !== undefined) {
              const r = inner.next();
              if (!r.done) return r;
              inner = undefined;
            }
            const outer = source.next();
            if (outer.done) return outer as unknown as IteratorResult<U>;
            inner = fn(outer.value)[Symbol.iterator]();
          }
        },
      };
    });
  }

  /**
   * Creates an iterator that applies `fn` to each element and yields only
   * the values inside `Some`, skipping `None` results.
   *
   * This is equivalent to `.map(fn).filter(x => x.isSome()).map(x => x.unwrap())`
   * but more concise.
   *
   * @example
   * ```ts
   * import { Some, None } from "@rslike/std";
   *
   * iter([1, 2, 3, 4, 5])
   *   .filter_map(x => x > 3 ? Some(x * 10) : None())
   *   .collect();
   * // [40, 50]
   * ```
   */
  filter_map<U>(fn: (value: T) => AnyOption<U>): Iter<U> {
    const source = this.#iter;
    return new Iter<U>(() => {
      const yieldResult: IteratorYieldResult<U> = {
        done: false,
        value: undefined as unknown as U,
      };
      return {
        next(): IteratorResult<U> {
          while (true) {
            const r = source.next();
            if (r.done) return r as unknown as IteratorResult<U>;
            const result = fn(r.value);
            if (result.isSome()) {
              yieldResult.value = result.unwrap();
              return yieldResult;
            }
          }
        },
      };
    });
  }

  /**
   * Creates an iterator that both filters and maps.
   * `fn` returns `Some(value)` to yield the value, or `None()` to end iteration.
   *
   * Modeled after Rust's `map_while`.
   *
   * @example
   * ```ts
   * import { Some, None } from "@rslike/std";
   *
   * iter(["1", "2", "x", "3"])
   *   .mapWhile(s => /^\d+$/.test(s) ? Some(Number(s)) : None())
   *   .collect();
   * // [1, 2]
   * ```
   */
  mapWhile<U>(fn: (value: T) => AnyOption<U>): Iter<U> {
    const source = this.#iter;
    return new Iter<U>(() => {
      let done = false;
      return {
        next(): IteratorResult<U> {
          if (done) return { done: true, value: undefined as unknown as U };
          const r = source.next();
          if (r.done) {
            done = true;
            return r as unknown as IteratorResult<U>;
          }
          const mapped = fn(r.value);
          if (mapped.isNone()) {
            done = true;
            return { done: true, value: undefined as unknown as U };
          }
          return { done: false, value: mapped.unwrap() };
        },
      };
    });
  }

  /**
   * Creates an iterator that maintains internal state and yields the result
   * of `fn` at each step. `fn` receives the current state and the next element,
   * and returns `Some([newState, output])` to yield `output`, or `None()` to
   * end iteration.
   *
   * Modeled after Rust's `scan`.
   *
   * @example
   * ```ts
   * import { Some, None } from "@rslike/std";
   *
   * // running total
   * iter([1, 2, 3, 4])
   *   .scan(0, (acc, x) => Some([acc + x, acc + x]))
   *   .collect();
   * // [1, 3, 6, 10]
   *
   * // stop when the total exceeds 5
   * iter([1, 2, 3, 4])
   *   .scan(0, (acc, x) => acc + x > 5 ? None() : Some([acc + x, acc + x]))
   *   .collect();
   * // [1, 3]
   * ```
   */
  scan<S, U>(
    init: S,
    fn: (acc: S, value: T) => AnyOption<readonly [S, U]>
  ): Iter<U> {
    const source = this.#iter;
    return new Iter<U>(() => {
      let acc = init;
      let done = false;
      return {
        next(): IteratorResult<U> {
          if (done) return { done: true, value: undefined as unknown as U };
          const r = source.next();
          if (r.done) {
            done = true;
            return r as unknown as IteratorResult<U>;
          }
          const out = fn(acc, r.value);
          if (out.isNone()) {
            done = true;
            return { done: true, value: undefined as unknown as U };
          }
          const [nextAcc, value] = out.unwrap();
          acc = nextAcc;
          return { done: false, value };
        },
      };
    });
  }

  /**
   * Creates an iterator that places a copy of `separator` between adjacent
   * elements.
   *
   * Modeled after Rust's `intersperse`.
   *
   * @example
   * ```ts
   * iter([1, 2, 3]).intersperse(0).collect(); // [1, 0, 2, 0, 3]
   * iter([1]).intersperse(0).collect();       // [1]
   * iter([]).intersperse(0).collect();        // []
   * ```
   */
  intersperse(separator: T): Iter<T> {
    const source = this.#iter;
    return new Iter<T>(() => {
      let ahead: IteratorResult<T> | undefined;
      let wantSep = false;
      return {
        next(): IteratorResult<T> {
          if (wantSep) {
            wantSep = false;
            return { done: false, value: separator };
          }
          let r: IteratorResult<T>;
          if (ahead !== undefined) {
            r = ahead;
            ahead = undefined;
          } else {
            r = source.next();
          }
          if (r.done) return r;
          const next = source.next();
          if (!next.done) {
            ahead = next;
            wantSep = true;
          }
          return r;
        },
      };
    });
  }

  /**
   * Creates an iterator that repeats the elements endlessly.
   * Elements are buffered on the first pass; an empty source stays empty.
   *
   * Pair it with `take()` to avoid an infinite loop.
   *
   * Modeled after Rust's `cycle`.
   *
   * @example
   * ```ts
   * iter([1, 2, 3]).cycle().take(7).collect(); // [1, 2, 3, 1, 2, 3, 1]
   * iter([]).cycle().take(3).collect();        // []
   * ```
   */
  cycle(): Iter<T> {
    const source = this.#iter;
    return new Iter<T>(() => {
      const buf: T[] = [];
      let idx = 0;
      let sourceDone = false;
      return {
        next(): IteratorResult<T> {
          if (!sourceDone) {
            const r = source.next();
            if (!r.done) {
              buf.push(r.value);
              return r;
            }
            sourceDone = true;
          }
          if (buf.length === 0) {
            return { done: true, value: undefined as unknown as T };
          }
          const value = buf[idx];
          idx = (idx + 1) % buf.length;
          return { done: false, value };
        },
      };
    });
  }

  /**
   * Flattens one level of nested iterables.
   *
   * @example
   * ```ts
   * iter([[1, 2], [3, 4]]).flatten().collect(); // [1, 2, 3, 4]
   * ```
   */
  flatten<U>(this: Iter<Iterable<U>>): Iter<U> {
    const source = this.#iter as Iterator<Iterable<U>>;
    return new Iter<U>(() => {
      let inner: Iterator<U> | undefined;
      return {
        next(): IteratorResult<U> {
          while (true) {
            if (inner !== undefined) {
              const r = inner.next();
              if (!r.done) return r;
              inner = undefined;
            }
            const outer = source.next();
            if (outer.done) return outer as unknown as IteratorResult<U>;
            inner = outer.value[Symbol.iterator]();
          }
        },
      };
    });
  }

  /**
   * Creates an iterator that yields arrays of at most `n` elements.
   * The last chunk may be smaller than `n`.
   *
   * Modeled after Rust's `slice::chunks`.
   *
   * @example
   * ```ts
   * iter([1, 2, 3, 4, 5]).chunks(2).collect(); // [[1, 2], [3, 4], [5]]
   * ```
   */
  chunks(n: number): Iter<T[]> {
    if (n < 1) {
      throw new RangeError("chunks: chunk size must be >= 1");
    }
    const source = this.#iter;
    return new Iter<T[]>(() => ({
      next(): IteratorResult<T[]> {
        const chunk: T[] = [];
        while (chunk.length < n) {
          const r = source.next();
          if (r.done) break;
          chunk.push(r.value);
        }
        if (chunk.length === 0) {
          return { done: true, value: undefined as unknown as T[] };
        }
        return { done: false, value: chunk };
      },
    }));
  }

  /**
   * Creates an iterator that calls `fn` on each element before yielding it.
   * Useful for debugging iterator chains.
   *
   * @example
   * ```ts
   * iter([1, 2, 3])
   *   .inspect(x => console.log("before:", x))
   *   .map(x => x * 2)
   *   .inspect(x => console.log("after:", x))
   *   .collect();
   * ```
   */
  inspect(fn: (value: T) => void): Iter<T> {
    const source = this.#iter;
    return new Iter<T>(() => ({
      next(): IteratorResult<T> {
        const r = source.next();
        if (!r.done) fn(r.value);
        return r;
      },
    }));
  }

  /**
   * Creates an iterator that yields every `n`-th element, starting from the first.
   *
   * @example
   * ```ts
   * iter([0, 1, 2, 3, 4, 5]).stepBy(2).collect(); // [0, 2, 4]
   * ```
   */
  stepBy(n: number): Iter<T> {
    if (n < 1) {
      throw new RangeError("stepBy: step must be >= 1");
    }
    const source = this.#iter;
    return new Iter<T>(() => {
      let first = true;
      return {
        next(): IteratorResult<T> {
          if (first) {
            first = false;
            return source.next();
          }
          // skip n-1 elements, then return the n-th
          for (let i = 1; i < n; i++) {
            const r = source.next();
            if (r.done) return r;
          }
          return source.next();
        },
      };
    });
  }

  /**
   * Creates a `Peekable` iterator that allows looking at the next element
   * without consuming it.
   *
   * @example
   * ```ts
   * const p = iter([1, 2, 3]).peekable();
   * p.peek(); // Some(1)
   * p.next(); // Some(1)
   * p.peek(); // Some(2)
   * ```
   */
  peekable(): Peekable<T> {
    return new Peekable<T>(this.#iter);
  }

  // ── Consumers (eager) ────────────────────────────────────────────

  /**
   * Collects all remaining elements into an array.
   *
   * Optionally accepts a constructor to collect into a specific collection:
   * `Array` returns a plain array, `Map` requires an iterator of `[K, V]` pairs,
   * and any class constructible from `T[]` works — `Set`, `WeakSet`, `Iter`,
   * `DoubleEndedIter`, or the `@rslike/collections` classes
   * (`Array`, `ReadonlyArray`, `Map`, `ReadonlyMap`, `Set`, `ReadonlySet`).
   *
   * Modeled after Rust's `collect`, which collects into a type chosen by the caller.
   *
   * @example
   * ```ts
   * iter([1, 2, 3]).collect();        // [1, 2, 3]
   * iter([1, 2, 3]).collect(Array);   // [1, 2, 3]
   * iter([1, 2, 2]).collect(Set);     // Set(2) { 1, 2 }
   * iter([["a", 1]] as ["a" | "b", number][]).collect(Map); // Map { "a" => 1 }
   * iter([1, 2, 3]).collect(Iter);    // Iter<number> — re-iterable
   * ```
   */
  collect(): T[];
  collect(ctor: ArrayConstructor): T[];
  collect<K, V>(this: Iter<readonly [K, V]>, ctor: MapConstructor): Map<K, V>;
  collect<C>(ctor: new (items: T[]) => C): C;
  collect(
    ctor?: ArrayConstructor | MapConstructor | (new (items: T[]) => unknown)
  ): unknown {
    const result: T[] = [];
    let r = this.#iter.next();
    while (!r.done) {
      result.push(r.value);
      r = this.#iter.next();
    }
    if (ctor === undefined || ctor === Array) {
      return result;
    }
    return new (ctor as new (items: T[]) => unknown)(result);
  }

  /**
   * Alias for `collect()`.
   */
  toArray(): T[] {
    return this.collect();
  }

  /**
   * Folds every element into an accumulator by applying `fn`, returning the final value.
   *
   * @example
   * ```ts
   * iter([1, 2, 3]).fold(0, (acc, x) => acc + x); // 6
   * ```
   */
  fold<U>(init: U, fn: (acc: U, value: T) => U): U {
    let acc = init;
    let r = this.#iter.next();
    while (!r.done) {
      acc = fn(acc, r.value);
      r = this.#iter.next();
    }
    return acc;
  }

  /**
   * Reduces the iterator to a single value using `fn`.
   * Returns `None()` if the iterator is empty.
   *
   * @example
   * ```ts
   * iter([1, 2, 3]).reduce((a, b) => a + b); // Some(6)
   * iter([]).reduce((a, b) => a + b);         // None
   * ```
   */
  reduce(fn: (acc: T, value: T) => T): AnyOption<T> {
    const first = this.#iter.next();
    if (first.done) return None();
    let acc = first.value;
    let r = this.#iter.next();
    while (!r.done) {
      acc = fn(acc, r.value);
      r = this.#iter.next();
    }
    return Some(acc);
  }

  /**
   * Calls `fn` on each remaining element.
   *
   * @example
   * ```ts
   * iter([1, 2, 3]).forEach(x => console.log(x));
   * ```
   */
  forEach(fn: (value: T) => void): void {
    let r = this.#iter.next();
    while (!r.done) {
      fn(r.value);
      r = this.#iter.next();
    }
  }

  /**
   * Counts the number of remaining elements by consuming the iterator.
   *
   * @example
   * ```ts
   * iter([1, 2, 3]).count(); // 3
   * ```
   */
  count(): number {
    let count = 0;
    let r = this.#iter.next();
    while (!r.done) {
      count++;
      r = this.#iter.next();
    }
    return count;
  }

  /**
   * Returns the last element as `Option<T>`.
   *
   * @example
   * ```ts
   * iter([1, 2, 3]).last(); // Some(3)
   * iter([]).last();        // None
   * ```
   */
  last(): AnyOption<T> {
    let last: T | undefined;
    let hasValue = false;
    let r = this.#iter.next();
    while (!r.done) {
      last = r.value;
      hasValue = true;
      r = this.#iter.next();
    }
    return hasValue ? Some(last as T) : None();
  }

  /**
   * Returns the `n`-th element (0-indexed) as `Option<T>`.
   *
   * @example
   * ```ts
   * iter([10, 20, 30]).nth(1); // Some(20)
   * iter([10]).nth(5);         // None
   * ```
   */
  nth(n: number): AnyOption<T> {
    let i = 0;
    let r = this.#iter.next();
    while (!r.done) {
      if (i === n) return Some(r.value);
      i++;
      r = this.#iter.next();
    }
    return None();
  }

  /**
   * Returns the first element matching the predicate as `Option<T>`.
   *
   * @example
   * ```ts
   * iter([1, 2, 3]).find(x => x > 1); // Some(2)
   * iter([1, 2, 3]).find(x => x > 5); // None
   * ```
   */
  find(fn: (value: T) => boolean): AnyOption<T> {
    let r = this.#iter.next();
    while (!r.done) {
      if (fn(r.value)) return Some(r.value);
      r = this.#iter.next();
    }
    return None();
  }

  /**
   * Returns the first `Some` produced by `fn` as `Option<U>`.
   * Short-circuits at the first non-`None` result.
   *
   * Modeled after Rust's `find_map`.
   *
   * @example
   * ```ts
   * import { Some, None } from "@rslike/std";
   *
   * iter(["a", "1", "b", "2"])
   *   .findMap(s => /^\d+$/.test(s) ? Some(Number(s)) : None());
   * // Some(1)
   * ```
   */
  findMap<U>(fn: (value: T) => AnyOption<U>): AnyOption<U> {
    let r = this.#iter.next();
    while (!r.done) {
      const mapped = fn(r.value);
      if (mapped.isSome()) return mapped;
      r = this.#iter.next();
    }
    return None();
  }

  /**
   * Returns `true` if any element matches the predicate.
   *
   * @example
   * ```ts
   * iter([1, 2, 3]).any(x => x > 2); // true
   * iter([1, 2, 3]).any(x => x > 5); // false
   * ```
   */
  any(fn: (value: T) => boolean): boolean {
    let r = this.#iter.next();
    while (!r.done) {
      if (fn(r.value)) return true;
      r = this.#iter.next();
    }
    return false;
  }

  /**
   * Returns `true` if all elements match the predicate.
   * Returns `true` for an empty iterator.
   *
   * @example
   * ```ts
   * iter([2, 4, 6]).all(x => x % 2 === 0); // true
   * iter([2, 3, 6]).all(x => x % 2 === 0); // false
   * ```
   */
  all(fn: (value: T) => boolean): boolean {
    let r = this.#iter.next();
    while (!r.done) {
      if (!fn(r.value)) return false;
      r = this.#iter.next();
    }
    return true;
  }

  /**
   * Sums all elements. Elements must be numbers.
   *
   * @example
   * ```ts
   * iter([1, 2, 3]).sum(); // 6
   * ```
   */
  sum(this: Iter<number>): number {
    return this.fold(0, (acc, x) => acc + x);
  }

  /**
   * Returns the product of all elements. Elements must be numbers.
   *
   * @example
   * ```ts
   * iter([1, 2, 3, 4]).product(); // 24
   * ```
   */
  product(this: Iter<number>): number {
    return this.fold(1, (acc, x) => acc * x);
  }

  /**
   * Returns the minimum element as `Option<T>`.
   * Compares using the `<` operator.
   *
   * @example
   * ```ts
   * iter([3, 1, 2]).min(); // Some(1)
   * iter([]).min();        // None
   * ```
   */
  min(): AnyOption<T> {
    return this.reduce((a, b) => (b < a ? b : a));
  }

  /**
   * Returns the maximum element as `Option<T>`.
   * Compares using the `>` operator.
   *
   * @example
   * ```ts
   * iter([3, 1, 2]).max(); // Some(3)
   * iter([]).max();        // None
   * ```
   */
  max(): AnyOption<T> {
    return this.reduce((a, b) => (b > a ? b : a));
  }

  /**
   * Returns the index of the first element matching the predicate as `Option<number>`.
   *
   * @example
   * ```ts
   * iter([10, 20, 30]).position(x => x === 20); // Some(1)
   * iter([10, 20, 30]).position(x => x === 99); // None
   * ```
   */
  position(fn: (value: T) => boolean): AnyOption<number> {
    let i = 0;
    let r = this.#iter.next();
    while (!r.done) {
      if (fn(r.value)) return Some(i);
      i++;
      r = this.#iter.next();
    }
    return None();
  }

  /**
   * Consumes the iterator and splits its elements into two arrays:
   * elements matching the predicate and elements that don't.
   *
   * Modeled after Rust's `partition`.
   *
   * @example
   * ```ts
   * iter([1, 2, 3, 4, 5]).partition(x => x % 2 === 0);
   * // [[2, 4], [1, 3, 5]]
   * ```
   */
  partition(fn: (value: T) => boolean): [T[], T[]] {
    const yes: T[] = [];
    const no: T[] = [];
    let r = this.#iter.next();
    while (!r.done) {
      (fn(r.value) ? yes : no).push(r.value);
      r = this.#iter.next();
    }
    return [yes, no];
  }

  /**
   * Splits an iterator of pairs into two arrays.
   *
   * @example
   * ```ts
   * iter([[1, "a"], [2, "b"]] as [number, string][]).unzip();
   * // [[1, 2], ["a", "b"]]
   * ```
   */
  unzip<A, B>(this: Iter<[A, B]>): [A[], B[]] {
    const as: A[] = [];
    const bs: B[] = [];
    let r = this.#iter.next();
    while (!r.done) {
      const [a, b] = r.value;
      as.push(a);
      bs.push(b);
      r = this.#iter.next();
    }
    return [as, bs];
  }

  // ── Comparison (cmp) ─────────────────────────────────────────────

  /**
   * Returns the minimum element using `@rslike/cmp` `compare()`.
   * Elements must implement the `Ord` trait (`[Symbol.compare]`).
   *
   * @example
   * ```ts
   * iter(items).minCmp(); // Some(smallest)
   * ```
   */
  minCmp(): AnyOption<T> {
    return this.reduce((a, b) => (compare(a as any, b as any) <= 0 ? a : b));
  }

  /**
   * Returns the maximum element using `@rslike/cmp` `compare()`.
   * Elements must implement the `Ord` trait (`[Symbol.compare]`).
   *
   * @example
   * ```ts
   * iter(items).maxCmp(); // Some(largest)
   * ```
   */
  maxCmp(): AnyOption<T> {
    return this.reduce((a, b) => (compare(a as any, b as any) >= 0 ? a : b));
  }

  /**
   * Returns the minimum element by applying `fn` to extract a comparison key,
   * then comparing keys using `@rslike/cmp` `compare()`.
   * The key type must implement the `Ord` trait.
   *
   * @example
   * ```ts
   * iter([{ name: "b", age: 20 }, { name: "a", age: 30 }])
   *   .minByKey(x => x.age)
   * // Some({ name: "b", age: 20 })
   * ```
   */
  minByKey<K extends Ord>(fn: (value: T) => K): AnyOption<T> {
    return this.reduce((a, b) => (compare(fn(a), fn(b)) <= 0 ? a : b));
  }

  /**
   * Returns the maximum element by applying `fn` to extract a comparison key,
   * then comparing keys using `@rslike/cmp` `compare()`.
   * The key type must implement the `Ord` trait.
   *
   * @example
   * ```ts
   * iter([{ name: "b", age: 20 }, { name: "a", age: 30 }])
   *   .maxByKey(x => x.age)
   * // Some({ name: "a", age: 30 })
   * ```
   */
  maxByKey<K extends Ord>(fn: (value: T) => K): AnyOption<T> {
    return this.reduce((a, b) => (compare(fn(a), fn(b)) >= 0 ? a : b));
  }

  /**
   * Returns the minimum element using a custom comparator function.
   * The comparator should return a negative number if `a < b`, zero if `a == b`,
   * and a positive number if `a > b`.
   *
   * @example
   * ```ts
   * iter([3, 1, 2]).minBy((a, b) => a - b); // Some(1)
   * ```
   */
  minBy(fn: (a: T, b: T) => number): AnyOption<T> {
    return this.reduce((a, b) => (fn(a, b) <= 0 ? a : b));
  }

  /**
   * Returns the maximum element using a custom comparator function.
   * The comparator should return a negative number if `a < b`, zero if `a == b`,
   * and a positive number if `a > b`.
   *
   * @example
   * ```ts
   * iter([3, 1, 2]).maxBy((a, b) => a - b); // Some(3)
   * ```
   */
  maxBy(fn: (a: T, b: T) => number): AnyOption<T> {
    return this.reduce((a, b) => (fn(a, b) >= 0 ? a : b));
  }

  /**
   * Collects and sorts elements using `@rslike/cmp` `compare()`.
   * Elements must implement the `Ord` trait (`[Symbol.compare]`).
   *
   * Note: this is an eager operation that collects all elements.
   *
   * @example
   * ```ts
   * iter(items).sorted().collect();
   * ```
   */
  sorted(): Iter<T> {
    const arr = this.collect();
    arr.sort((a, b) => compare(a as any, b as any));
    return new Iter(arr);
  }

  /**
   * Collects and sorts elements using a custom comparator function.
   *
   * Note: this is an eager operation that collects all elements.
   *
   * @example
   * ```ts
   * iter([3, 1, 2]).sortBy((a, b) => a - b).collect(); // [1, 2, 3]
   * ```
   */
  sortBy(fn: (a: T, b: T) => number): Iter<T> {
    const arr = this.collect();
    arr.sort(fn);
    return new Iter(arr);
  }

  /**
   * Compares two iterators lexicographically using `@rslike/cmp` `compare()`.
   * Elements must implement the `Ord` trait (`[Symbol.compare]`).
   *
   * Returns a negative number if `this < other`, zero if equal,
   * and a positive number if `this > other`.
   *
   * @example
   * ```ts
   * iter([1, 2, 3]).cmp(iter([1, 2, 4])); // -1 (less)
   * iter([1, 2]).cmp(iter([1, 2]));        // 0  (equal)
   * ```
   */
  cmp(other: Iterable<T>): number {
    const otherIter = other[Symbol.iterator]();
    let r = this.#iter.next();
    while (!r.done) {
      const b = otherIter.next();
      if (b.done) return 1;
      const c = compare(r.value as any, b.value as any);
      if (c !== 0) return c;
      r = this.#iter.next();
    }
    return otherIter.next().done ? 0 : -1;
  }

  /**
   * Checks if two iterators are equal element-by-element using `@rslike/cmp` `equals()`.
   * Elements must implement the `Eq` trait (`[Symbol.equals]`).
   *
   * @example
   * ```ts
   * iter(items1).eqBy(items2); // true or false
   * ```
   */
  eqBy(other: Iterable<T>): boolean {
    const otherIter = other[Symbol.iterator]();
    let r = this.#iter.next();
    while (!r.done) {
      const b = otherIter.next();
      if (b.done) return false;
      if (!equals(r.value as any, b.value as any)) return false;
      r = this.#iter.next();
    }
    return otherIter.next().done === true;
  }

  /**
   * Creates an iterator that removes consecutive duplicate elements
   * using `@rslike/cmp` `equals()`.
   * Elements must implement the `Eq` trait (`[Symbol.equals]`).
   *
   * @example
   * ```ts
   * iter(items).dedup().collect();
   * ```
   */
  dedup(): Iter<T> {
    const source = this.#iter;
    return new Iter<T>(() => {
      let hasPrev = false;
      let prev: T;
      return {
        next(): IteratorResult<T> {
          while (true) {
            const r = source.next();
            if (r.done) return r;
            const v = r.value;
            if (!hasPrev || !equals(prev as any, v as any)) {
              hasPrev = true;
              prev = v;
              return r;
            }
          }
        },
      };
    });
  }

  /**
   * Creates an iterator that removes consecutive duplicate elements
   * using a custom equality function.
   *
   * @example
   * ```ts
   * iter([1, 1, 2, 3, 3]).dedupBy((a, b) => a === b).collect(); // [1, 2, 3]
   * ```
   */
  dedupBy(fn: (a: T, b: T) => boolean): Iter<T> {
    const source = this.#iter;
    return new Iter<T>(() => {
      let hasPrev = false;
      let prev: T;
      return {
        next(): IteratorResult<T> {
          while (true) {
            const r = source.next();
            if (r.done) return r;
            const v = r.value;
            if (!hasPrev || !fn(prev, v)) {
              hasPrev = true;
              prev = v;
              return r;
            }
          }
        },
      };
    });
  }

  /**
   * Eagerly collects all remaining elements and returns a new `Iter`
   * that yields them in reverse order.
   *
   * @example
   * ```ts
   * iter([1, 2, 3]).rev().collect(); // [3, 2, 1]
   * iter([1, 2, 3]).skip(1).rev().collect(); // [3, 2]
   * ```
   */
  rev(): Iter<T> {
    const arr = this.collect();
    arr.reverse();
    return new Iter(arr);
  }
}

/**
 * A peekable iterator that allows looking at the next element without consuming it.
 *
 * The peek buffer is managed at the raw-iterator level so that all consumers
 * (`collect`, `fold`, `forEach`, etc.) correctly see the peeked element.
 *
 * @example
 * ```ts
 * const p = iter([1, 2, 3]).peekable();
 * p.peek(); // Some(1)
 * p.next(); // Some(1)
 * p.peek(); // Some(2)
 * ```
 */
export class Peekable<const T> extends Iter<T> {
  // Shared buffer between the wrapped raw-iterator and peek().
  readonly #buf: { v: IteratorResult<T> | undefined };
  readonly #src: Iterator<T>;

  constructor(src: Iterator<T>) {
    const buf: { v: IteratorResult<T> | undefined } = { v: undefined };
    // Wrap the source so that the peek buffer is drained before calling src.next().
    // This means ALL consumers (collect, fold, find, …) pick up the peeked element.
    super(() => ({
      next(): IteratorResult<T> {
        if (buf.v !== undefined) {
          const v = buf.v;
          buf.v = undefined;
          return v;
        }
        return src.next();
      },
    }));
    this.#buf = buf;
    this.#src = src;
  }

  /**
   * Returns `Option<T>` of the next element without consuming it.
   * Subsequent calls to `peek()` return the same value until `next()` is called.
   *
   * @example
   * ```ts
   * const p = iter([1, 2]).peekable();
   * p.peek(); // Some(1)
   * p.peek(); // Some(1) — same value
   * p.next(); // Some(1) — consumed
   * p.peek(); // Some(2)
   * ```
   */
  peek(): AnyOption<T> {
    if (this.#buf.v === undefined) {
      this.#buf.v = this.#src.next();
    }
    const r = this.#buf.v;
    return r.done ? None() : Some(r.value);
  }
}
