import { Some, None } from "@rslike/std";
import { compare, equals, type Ord } from "@rslike/cmp";
import type { AnyOption } from "./types.ts";

/**
 * A lazy iterator class providing Rust-like chainable adapter and consumer methods.
 *
 * Wraps any `Iterable<T>` or iterator factory and provides methods like
 * `map`, `filter`, `take`, `fold`, `collect`, etc. Adapter methods are lazy —
 * they return new `Iter` instances backed by generators. Consumer methods are
 * eager and execute the full chain.
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
export class Iter<const T> implements Iterable<T> {
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
  static from<T, U>(source: Iterable<T>, mapFn: (value: T, index: number) => U): Iter<U>;
  static from<T, U>(
    source: Iterable<T>,
    mapFn?: (value: T, index: number) => U,
  ): Iter<T> | Iter<U> {
    if (mapFn === undefined) {
      return new Iter(source);
    }
    return new Iter(function* () {
      let i = 0;
      for (const value of source) {
        yield mapFn(value, i++);
      }
    });
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
    return new Iter(function* () {
      for (const value of { [Symbol.iterator]: () => source }) {
        yield fn(value);
      }
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
    return new Iter(function* () {
      for (const value of { [Symbol.iterator]: () => source }) {
        if (fn(value)) {
          yield value;
        }
      }
    });
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
    return new Iter(function* () {
      let i = 0;
      for (const value of { [Symbol.iterator]: () => source }) {
        yield [i, value] as [number, T];
        i++;
      }
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
    return new Iter(function* () {
      for (let i = 0; i < n; i++) {
        const result = source.next();
        if (result.done) break;
        yield result.value;
      }
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
    return new Iter(function* () {
      let skipped = 0;
      for (const value of { [Symbol.iterator]: () => source }) {
        if (skipped < n) {
          skipped++;
          continue;
        }
        yield value;
      }
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
    return new Iter(function* () {
      while (true) {
        const result = source.next();
        if (result.done) break;
        if (!fn(result.value)) break;
        yield result.value;
      }
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
    return new Iter(function* () {
      let skipping = true;
      for (const value of { [Symbol.iterator]: () => source }) {
        if (skipping && fn(value)) continue;
        skipping = false;
        yield value;
      }
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
    return new Iter(function* () {
      yield* { [Symbol.iterator]: () => source };
      yield* other;
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
    return new Iter(function* () {
      const otherIter = other[Symbol.iterator]();
      for (const value of { [Symbol.iterator]: () => source }) {
        const otherResult = otherIter.next();
        if (otherResult.done) break;
        yield [value, otherResult.value] as [T, U];
      }
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
    return new Iter(function* () {
      for (const value of { [Symbol.iterator]: () => source }) {
        yield* fn(value);
      }
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
    return new Iter(function* () {
      for (const value of { [Symbol.iterator]: () => source }) {
        const result = fn(value);
        if (result.isSome()) {
          yield result.unwrap();
        }
      }
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
    const source = this.#iter;
    return new Iter(function* () {
      for (const value of { [Symbol.iterator]: () => source }) {
        yield* value;
      }
    });
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
    return new Iter(function* () {
      for (const value of { [Symbol.iterator]: () => source }) {
        fn(value);
        yield value;
      }
    });
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
    return new Iter(function* () {
      let i = 0;
      for (const value of { [Symbol.iterator]: () => source }) {
        if (i % n === 0) {
          yield value;
        }
        i++;
      }
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
    const it = this.#iter;
    return new Peekable(() => it);
  }

  // ── Consumers (eager) ────────────────────────────────────────────

  /**
   * Collects all remaining elements into an array.
   *
   * @example
   * ```ts
   * iter([1, 2, 3]).collect(); // [1, 2, 3]
   * ```
   */
  collect(): T[] {
    return [...{ [Symbol.iterator]: () => this.#iter }];
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
    for (const value of { [Symbol.iterator]: () => this.#iter }) {
      acc = fn(acc, value);
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
    for (const value of { [Symbol.iterator]: () => this.#iter }) {
      acc = fn(acc, value);
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
    for (const value of { [Symbol.iterator]: () => this.#iter }) {
      fn(value);
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
    for (const _ of { [Symbol.iterator]: () => this.#iter }) {
      count++;
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
    let last: { value: T } | undefined;
    for (const value of { [Symbol.iterator]: () => this.#iter }) {
      last = { value };
    }
    return last ? Some(last.value) : None();
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
    for (const value of { [Symbol.iterator]: () => this.#iter }) {
      if (i === n) return Some(value);
      i++;
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
    for (const value of { [Symbol.iterator]: () => this.#iter }) {
      if (fn(value)) return Some(value);
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
    for (const value of { [Symbol.iterator]: () => this.#iter }) {
      if (fn(value)) return true;
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
    for (const value of { [Symbol.iterator]: () => this.#iter }) {
      if (!fn(value)) return false;
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
    for (const value of { [Symbol.iterator]: () => this.#iter }) {
      if (fn(value)) return Some(i);
      i++;
    }
    return None();
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
    for (const [a, b] of { [Symbol.iterator]: () => this.#iter }) {
      as.push(a);
      bs.push(b);
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
    for (const a of { [Symbol.iterator]: () => this.#iter }) {
      const b = otherIter.next();
      if (b.done) return 1;
      const c = compare(a as any, b.value as any);
      if (c !== 0) return c;
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
    for (const a of { [Symbol.iterator]: () => this.#iter }) {
      const b = otherIter.next();
      if (b.done) return false;
      if (!equals(a as any, b.value as any)) return false;
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
    return new Iter(function* () {
      let prev: { value: T } | undefined;
      for (const value of { [Symbol.iterator]: () => source }) {
        if (prev === undefined || !equals(prev.value as any, value as any)) {
          yield value;
          prev = { value };
        }
      }
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
    return new Iter(function* () {
      let prev: { value: T } | undefined;
      for (const value of { [Symbol.iterator]: () => source }) {
        if (prev === undefined || !fn(prev.value, value)) {
          yield value;
          prev = { value };
        }
      }
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
 * @example
 * ```ts
 * const p = iter([1, 2, 3]).peekable();
 * p.peek(); // Some(1)
 * p.next(); // Some(1)
 * p.peek(); // Some(2)
 * ```
 */
export class Peekable<const T> extends Iter<T> {
  #peeked: AnyOption<T> | undefined;

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
    if (this.#peeked === undefined) {
      this.#peeked = super.next();
    }
    return this.#peeked;
  }

  override next(): AnyOption<T> {
    if (this.#peeked !== undefined) {
      const val = this.#peeked;
      this.#peeked = undefined;
      return val;
    }
    return super.next();
  }
}
