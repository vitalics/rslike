import { Some, None, UndefinedBehaviorError } from "@rslike/std";
import type { AnyOption } from "./types.ts";

type AnySource<T> = Iterable<T> | AsyncIterable<T>;

type SyncChannel = {
  iterator: Iterator<unknown>;
  /** `true` when channel values may be `PromiseLike` (async fns upstream). */
  promiseMode: boolean;
};

type AsyncIterChannels<T> = {
  async: AsyncIterator<T>;
  sync: SyncChannel | null;
};

function isThenable(v: unknown): v is PromiseLike<unknown> {
  return (
    v !== null &&
    (typeof v === "object" || typeof v === "function") &&
    typeof (v as PromiseLike<unknown>).then === "function"
  );
}

function isAsyncFn(fn: unknown): boolean {
  return (
    typeof fn === "function" &&
    fn.constructor !== undefined &&
    fn.constructor.name === "AsyncFunction"
  );
}

function asyncIterationRequired(): UndefinedBehaviorError {
  return new UndefinedBehaviorError(
    "Sync iteration is not supported for truly-async pipelines. " +
      "Use `for await...of` or an async consumer (`collect`, `fold`, ...) instead.",
  );
}

function assertFunction(value: unknown, method: string): void {
  if (typeof value !== "function") {
    throw new UndefinedBehaviorError(
      `"AsyncIter.${method}" expects function, got ${typeof value}`,
      { cause: { value, type: typeof value } },
    );
  }
}

async function* liftSync<T>(it: Iterator<T>): AsyncGenerator<T> {
  for (;;) {
    const r = it.next();
    if (r.done) return;
    yield r.value;
  }
}

/**
 * A lazy async iterator — mirrors `Iter<T>` for asynchronous sources,
 * modeled after Rust's `Stream` trait (`futures` crate).
 *
 * Wraps any `AsyncIterable<T>` (async generators, Node.js streams) or plain
 * `Iterable<T>` (arrays, `Iter`, ...) and provides the same chainable
 * adapter/consumer API as `Iter`, but every consumer returns a `Promise`
 * and adapter callbacks may be async.
 *
 * Unlike `ParIter` (which materializes the whole source and runs stages
 * concurrently via `Promise.all`), `AsyncIter` is **pull-based**: elements
 * are produced and transformed one at a time, preserving laziness and
 * backpressure for infinite or IO-bound sources.
 *
 * Implements both `AsyncIterable<T>` (`for await...of`) and
 * `Iterable<PromiseLike<T>>`. Sync iteration is supported while the chain
 * is synchronously pullable (sync source + no async callbacks that affect
 * control flow); otherwise it throws `UndefinedBehaviorError`.
 *
 * @example
 * ```ts
 * import { asyncIter } from "@rslike/iter";
 *
 * // async generator source
 * async function* urls() { yield "a/1"; yield "a/2"; }
 * const bodies = await asyncIter(urls())
 *   .map(async u => fetch(u).then(r => r.text()))
 *   .filter(body => body.length > 0)
 *   .collect();
 *
 * // sync source, sync for...of yielding promises
 * for (const p of asyncIter([1, 2, 3]).map(async v => v * 2)) {
 *   console.log(await p); // 2, 4, 6
 * }
 * ```
 */
export class AsyncIter<const T>
  implements Iterable<PromiseLike<T>>, AsyncIterable<T>
{
  #channels: AsyncIterChannels<T>;

  /**
   * Creates an `AsyncIter<T>` from any async or sync iterable source.
   * Provides an API similar to `Iter.from()`.
   *
   * @example
   * ```ts
   * AsyncIter.from([1, 2, 3]).map(v => v * 2).collect(); // Promise<[2, 4, 6]>
   * AsyncIter.from(["a", "b"], (c, i) => `${i}:${c}`).collect(); // Promise<["0:a", "1:b"]>
   * ```
   */
  static from<T>(source: AnySource<T>): AsyncIter<T>;
  static from<T, U>(
    source: AnySource<T>,
    mapFn: (value: T, index: number) => U | Promise<U>,
  ): AsyncIter<U>;
  static from<T, U>(
    source: AnySource<T>,
    mapFn?: (value: T, index: number) => U | Promise<U>
  ): AsyncIter<T> | AsyncIter<U> {
    const it = new AsyncIter(source);
    if (mapFn === undefined) return it;
    return it.map(mapFn);
  }

  constructor(source: AnySource<T> | AsyncIterChannels<T>) {
    const maybeChannels = source as AsyncIterChannels<T>;
    if (
      maybeChannels !== null &&
      typeof maybeChannels === "object" &&
      typeof (maybeChannels.async as AsyncIterator<T> | undefined)?.next ===
        "function"
    ) {
      this.#channels = maybeChannels;
      return;
    }
    const src = source as AnySource<T>;
    if (typeof (src as AsyncIterable<T>)[Symbol.asyncIterator] === "function") {
      this.#channels = {
        async: (src as AsyncIterable<T>)[Symbol.asyncIterator](),
        sync: null,
      };
    } else {
      const it = (src as Iterable<T>)[Symbol.iterator]();
      this.#channels = {
        async: liftSync(it),
        sync: { iterator: it as Iterator<unknown>, promiseMode: false },
      };
    }
  }

  #derive<U>(
    asyncWrap: (src: AsyncIterator<T>) => AsyncIterator<U>,
    syncWrap:
      | ((src: Iterator<unknown>, promiseMode: boolean) => SyncChannel | null)
      | null
  ): AsyncIter<U> {
    const sync = this.#channels.sync;
    return new AsyncIter<U>({
      async: asyncWrap(this.#channels.async),
      sync: sync && syncWrap ? syncWrap(sync.iterator, sync.promiseMode) : null,
    });
  }

  /**
   * Advances the iterator and returns `Promise<Option<T>>` for the next value.
   *
   * @example
   * ```ts
   * const it = asyncIter([1, 2]);
   * await it.next(); // Some(1)
   * await it.next(); // Some(2)
   * await it.next(); // None
   * ```
   */
  async next(): Promise<AnyOption<T>> {
    const r = await this.#channels.async.next();
    if (r.done) return None();
    return Some(r.value);
  }

  [Symbol.asyncIterator](): AsyncIterator<T> {
    return this.#channels.async;
  }

  /**
   * Sync iteration yielding `PromiseLike<T>` per element.
   *
   * Supported while the chain is synchronously pullable: a sync source and
   * no async callbacks affecting control flow (`filter` with async predicate,
   * async flatMap, ...). `map` with an async fn is fine — yielded promises
   * are chained per element.
   *
   * @throws {UndefinedBehaviorError} for truly-async pipelines — use
   *   `for await...of` instead.
   */
  *[Symbol.iterator](): Iterator<PromiseLike<T>> {
    const sync = this.#channels.sync;
    if (sync === null) {
      throw asyncIterationRequired();
    }
    for (;;) {
      const r = sync.iterator.next();
      if (r.done) return;
      yield Promise.resolve(r.value) as PromiseLike<T>;
    }
  }

  // ── Adapters (lazy) ──────────────────────────────────────────────

  /**
   * Lazy — transforms each element using `fn` (may be async).
   *
   * @example
   * ```ts
   * await asyncIter([1, 2, 3]).map(async v => v * 2).collect(); // [2, 4, 6]
   * ```
   */
  map<U>(fn: (value: T, index: number) => U | Promise<U>): AsyncIter<U> {
    assertFunction(fn, "map");
    return this.#derive<U>(
      (src) =>
        (async function* () {
          let i = 0;
          for (;;) {
            const r = await src.next();
            if (r.done) return;
            yield await fn(r.value, i++);
          }
        })(),
      (src, promiseMode) => ({
        promiseMode: promiseMode || isAsyncFn(fn),
        iterator: (function* () {
          let i = 0;
          for (;;) {
            const r = src.next();
            if (r.done) return;
            const v = r.value;
            yield isThenable(v)
              ? v.then((x) => fn(x as T, i++))
              : fn(v as T, i++);
          }
        })(),
      })
    );
  }

  /**
   * Lazy — yields only elements matching the **synchronous** predicate.
   * For async predicates use {@link filterAsync}.
   *
   * @example
   * ```ts
   * await asyncIter([1, 2, 3, 4]).filter(v => v % 2 === 0).collect(); // [2, 4]
   * ```
   */
  filter<S extends T>(
    fn: (value: T, index: number) => value is S
  ): AsyncIter<S>;
  filter(fn: (value: T, index: number) => boolean): AsyncIter<T>;
  filter(fn: (value: T, index: number) => boolean): AsyncIter<T> {
    assertFunction(fn, "filter");
    return this.#derive<T>(
      (src) =>
        (async function* () {
          let i = 0;
          for (;;) {
            const r = await src.next();
            if (r.done) return;
            if (fn(r.value, i++)) yield r.value;
          }
        })(),
      (src, promiseMode) => {
        if (promiseMode) return null;
        return {
          promiseMode,
          iterator: (function* () {
            let i = 0;
            for (;;) {
              const r = src.next();
              if (r.done) return;
              if (isThenable(r.value)) throw asyncIterationRequired();
              if (fn(r.value as T, i++)) yield r.value;
            }
          })(),
        };
      }
    );
  }

  /**
   * Lazy — yields only elements matching the **async** predicate.
   * Disables sync iteration for the rest of the chain.
   *
   * @example
   * ```ts
   * await asyncIter([1, 2, 3, 4])
   *   .filterAsync(async v => v % 2 === 0)
   *   .collect(); // [2, 4]
   * ```
   */
  filterAsync(fn: (value: T, index: number) => Promise<boolean>): AsyncIter<T> {
    assertFunction(fn, "filterAsync");
    return this.#derive<T>(
      (src) =>
        (async function* () {
          let i = 0;
          for (;;) {
            const r = await src.next();
            if (r.done) return;
            if (await fn(r.value, i++)) yield r.value;
          }
        })(),
      null
    );
  }

  /**
   * Lazy — applies `fn` (synchronous, returns `Option<U>`) to each element
   * and yields only the unwrapped `Some` values.
   *
   * @example
   * ```ts
   * import { Some, None } from "@rslike/std";
   *
   * await asyncIter([1, 2, 3, 4])
   *   .filterMap(v => v > 2 ? Some(v * 10) : None())
   *   .collect(); // [30, 40]
   * ```
   */
  filterMap<U>(fn: (value: T) => AnyOption<U>): AsyncIter<U> {
    assertFunction(fn, "filterMap");
    return this.#derive<U>(
      (src) =>
        (async function* () {
          for (;;) {
            const r = await src.next();
            if (r.done) return;
            const mapped = fn(r.value);
            if (mapped.isSome()) yield mapped.unwrap();
          }
        })(),
      (src, promiseMode) => {
        if (promiseMode) return null;
        return {
          promiseMode,
          iterator: (function* () {
            for (;;) {
              const r = src.next();
              if (r.done) return;
              if (isThenable(r.value)) throw asyncIterationRequired();
              const mapped = fn(r.value as T);
              if (mapped.isSome()) yield mapped.unwrap();
            }
          })(),
        };
      }
    );
  }

  /**
   * Lazy — maps each element to a sync iterable and flattens one level.
   *
   * @example
   * ```ts
   * await asyncIter([1, 2, 3]).flatMap(v => [v, v * 10]).collect();
   * // [1, 10, 2, 20, 3, 30]
   * ```
   */
  flatMap<U>(fn: (value: T) => Iterable<U>): AsyncIter<U> {
    assertFunction(fn, "flatMap");
    return this.#derive<U>(
      (src) =>
        (async function* () {
          for (;;) {
            const r = await src.next();
            if (r.done) return;
            yield* fn(r.value);
          }
        })(),
      (src, promiseMode) => {
        if (promiseMode) return null;
        return {
          promiseMode,
          iterator: (function* () {
            for (;;) {
              const r = src.next();
              if (r.done) return;
              if (isThenable(r.value)) throw asyncIterationRequired();
              yield* fn(r.value as T) as Generator<unknown>;
            }
          })(),
        };
      }
    );
  }

  /**
   * Lazy — flattens one level of nested **sync** iterables.
   *
   * @example
   * ```ts
   * await asyncIter([[1, 2], [3, 4]]).flatten().collect(); // [1, 2, 3, 4]
   * ```
   */
  flatten<U>(this: AsyncIter<Iterable<U>>): AsyncIter<U> {
    // biome-ignore lint/correctness/noFlatMapIdentity: fix later?
    return (this as AsyncIter<Iterable<U>>).flatMap((inner) => inner);
  }

  /**
   * Lazy — yields `[index, value]` pairs.
   *
   * @example
   * ```ts
   * await asyncIter(["a", "b"]).enumerate().collect(); // [[0, "a"], [1, "b"]]
   * ```
   */
  enumerate(): AsyncIter<[number, T]> {
    return this.map((v, i) => [i, v] as [number, T]);
  }

  /**
   * Lazy — yields at most `n` elements.
   *
   * @example
   * ```ts
   * await asyncIter([1, 2, 3, 4]).take(2).collect(); // [1, 2]
   * ```
   */
  take(n: number): AsyncIter<T> {
    return this.#derive<T>(
      (src) =>
        (async function* () {
          let remaining = n;
          while (remaining > 0) {
            const r = await src.next();
            if (r.done) return;
            remaining--;
            yield r.value;
          }
        })(),
      (src, promiseMode) => ({
        promiseMode,
        iterator: (function* () {
          let remaining = n;
          while (remaining > 0) {
            const r = src.next();
            if (r.done) return;
            remaining--;
            yield r.value;
          }
        })(),
      })
    );
  }

  /**
   * Lazy — skips the first `n` elements.
   *
   * @example
   * ```ts
   * await asyncIter([1, 2, 3, 4]).skip(2).collect(); // [3, 4]
   * ```
   */
  skip(n: number): AsyncIter<T> {
    return this.#derive<T>(
      (src) =>
        (async function* () {
          for (let i = 0; i < n; i++) {
            const r = await src.next();
            if (r.done) return;
          }
          for (;;) {
            const r = await src.next();
            if (r.done) return;
            yield r.value;
          }
        })(),
      (src, promiseMode) => ({
        promiseMode,
        iterator: (function* () {
          for (let i = 0; i < n; i++) {
            const r = src.next();
            if (r.done) return;
          }
          for (;;) {
            const r = src.next();
            if (r.done) return;
            yield r.value;
          }
        })(),
      })
    );
  }

  /**
   * Lazy — yields elements while the **synchronous** predicate holds,
   * stops at the first failure.
   *
   * @example
   * ```ts
   * await asyncIter([1, 2, 3, 1]).takeWhile(v => v < 3).collect(); // [1, 2]
   * ```
   */
  takeWhile(fn: (value: T) => boolean): AsyncIter<T> {
    assertFunction(fn, "takeWhile");
    return this.#derive<T>(
      (src) =>
        (async function* () {
          for (;;) {
            const r = await src.next();
            if (r.done || !fn(r.value)) return;
            yield r.value;
          }
        })(),
      (src, promiseMode) => {
        if (promiseMode) return null;
        return {
          promiseMode,
          iterator: (function* () {
            for (;;) {
              const r = src.next();
              if (r.done) return;
              if (isThenable(r.value)) throw asyncIterationRequired();
              if (!fn(r.value as T)) return;
              yield r.value;
            }
          })(),
        };
      }
    );
  }

  /**
   * Lazy — skips elements while the **synchronous** predicate holds,
   * then yields the rest.
   *
   * @example
   * ```ts
   * await asyncIter([1, 2, 3, 1]).skipWhile(v => v < 3).collect(); // [3, 1]
   * ```
   */
  skipWhile(fn: (value: T) => boolean): AsyncIter<T> {
    assertFunction(fn, "skipWhile");
    return this.#derive<T>(
      (src) =>
        (async function* () {
          for (;;) {
            const r = await src.next();
            if (r.done) return;
            if (!fn(r.value)) {
              yield r.value;
              break;
            }
          }
          for (;;) {
            const r = await src.next();
            if (r.done) return;
            yield r.value;
          }
        })(),
      (src, promiseMode) => {
        if (promiseMode) return null;
        return {
          promiseMode,
          iterator: (function* () {
            for (;;) {
              const r = src.next();
              if (r.done) return;
              if (isThenable(r.value)) throw asyncIterationRequired();
              if (!fn(r.value as T)) {
                yield r.value;
                break;
              }
            }
            for (;;) {
              const r = src.next();
              if (r.done) return;
              yield r.value;
            }
          })(),
        };
      }
    );
  }

  /**
   * Lazy — yields this iterator's elements, then the elements of `other`
   * (a sync iterable).
   *
   * @example
   * ```ts
   * await asyncIter([1, 2]).chain([3, 4]).collect(); // [1, 2, 3, 4]
   * ```
   */
  chain(other: Iterable<T>): AsyncIter<T> {
    return this.#derive<T>(
      (src) =>
        (async function* () {
          for (;;) {
            const r = await src.next();
            if (r.done) break;
            yield r.value;
          }
          yield* other;
        })(),
      (src, promiseMode) => {
        if (promiseMode) return null;
        return {
          promiseMode,
          iterator: (function* () {
            for (;;) {
              const r = src.next();
              if (r.done) break;
              yield r.value;
            }
            yield* other as Generator<unknown>;
          })(),
        };
      }
    );
  }

  /**
   * Lazy — pairs elements with elements of `other` (a sync iterable).
   * Stops when either side is exhausted.
   *
   * @example
   * ```ts
   * await asyncIter([1, 2, 3]).zip(["a", "b"]).collect(); // [[1, "a"], [2, "b"]]
   * ```
   */
  zip<U>(other: Iterable<U>): AsyncIter<[T, U]> {
    return this.#derive<[T, U]>(
      (src) =>
        (async function* () {
          const otherIt = other[Symbol.iterator]();
          for (;;) {
            const a = await src.next();
            if (a.done) return;
            const b = otherIt.next();
            if (b.done) return;
            yield [a.value, b.value];
          }
        })(),
      (src, promiseMode) => {
        if (promiseMode) return null;
        return {
          promiseMode,
          iterator: (function* () {
            const otherIt = other[Symbol.iterator]();
            for (;;) {
              const a = src.next();
              if (a.done) return;
              if (isThenable(a.value)) throw asyncIterationRequired();
              const b = otherIt.next();
              if (b.done) return;
              yield [a.value as T, b.value];
            }
          })(),
        };
      }
    );
  }

  /**
   * Lazy — calls `fn` on each element before yielding it (debugging).
   *
   * @example
   * ```ts
   * await asyncIter([1, 2])
   *   .inspect(v => console.log("seen:", v))
   *   .collect();
   * ```
   */
  inspect(fn: (value: T) => void): AsyncIter<T> {
    assertFunction(fn, "inspect");
    return this.#derive<T>(
      (src) =>
        (async function* () {
          for (;;) {
            const r = await src.next();
            if (r.done) return;
            fn(r.value);
            yield r.value;
          }
        })(),
      (src, promiseMode) => ({
        promiseMode,
        iterator: (function* () {
          for (;;) {
            const r = src.next();
            if (r.done) return;
            const v = r.value;
            if (isThenable(v)) {
              yield v.then((x) => {
                fn(x as T);
                return x;
              });
            } else {
              fn(v as T);
              yield v;
            }
          }
        })(),
      })
    );
  }

  /**
   * Lazy — yields every `n`-th element, starting from the first.
   *
   * @example
   * ```ts
   * await asyncIter([0, 1, 2, 3, 4, 5]).stepBy(2).collect(); // [0, 2, 4]
   * ```
   */
  stepBy(n: number): AsyncIter<T> {
    if (n < 1) {
      throw new RangeError("stepBy: step must be >= 1");
    }
    return this.#derive<T>(
      (src) =>
        (async function* () {
          let first = true;
          for (;;) {
            if (!first) {
              for (let i = 1; i < n; i++) {
                const s = await src.next();
                if (s.done) return;
              }
            }
            first = false;
            const r = await src.next();
            if (r.done) return;
            yield r.value;
          }
        })(),
      (src, promiseMode) => ({
        promiseMode,
        iterator: (function* () {
          let first = true;
          for (;;) {
            if (!first) {
              for (let i = 1; i < n; i++) {
                const s = src.next();
                if (s.done) return;
              }
            }
            first = false;
            const r = src.next();
            if (r.done) return;
            yield r.value;
          }
        })(),
      })
    );
  }

  // ── Consumers (async, eager) ─────────────────────────────────────

  /**
   * Drains the iterator into an array — or into a constructor, exactly like
   * `Iter.collect`: `Array` returns a plain array, `Map` requires an
   * iterator of `[K, V]` pairs, and any class constructible from `T[]`
   * works (`Set`, `Iter`, `DoubleEndedIter`, `@rslike/collections` classes).
   *
   * @example
   * ```ts
   * await asyncIter([1, 2, 2]).collect();      // [1, 2, 2]
   * await asyncIter([1, 2, 2]).collect(Set);   // Set(2) { 1, 2 }
   * ```
   */
  collect(): Promise<T[]>;
  collect(ctor: ArrayConstructor): Promise<T[]>;
  collect<K, V>(
    this: AsyncIter<readonly [K, V]>,
    ctor: MapConstructor
  ): Promise<Map<K, V>>;
  collect<C>(ctor: new (items: T[]) => C): Promise<C>;
  async collect(
    ctor?: ArrayConstructor | MapConstructor | (new (items: T[]) => unknown)
  ): Promise<unknown> {
    const result: T[] = [];
    const src = this.#channels.async;
    for (;;) {
      const r = await src.next();
      if (r.done) break;
      result.push(r.value);
    }
    if (ctor === undefined || ctor === Array) {
      return result;
    }
    return new (ctor as new (items: T[]) => unknown)(result);
  }

  /**
   * Alias for `collect()`.
   */
  toArray(): Promise<T[]> {
    return this.collect();
  }

  /**
   * Calls `fn` on each remaining element, sequentially awaiting each call.
   * For concurrent execution use `ParIter` instead.
   *
   * @example
   * ```ts
   * await asyncIter([1, 2, 3]).forEach(async v => console.log(v));
   * ```
   */
  async forEach(
    fn: (value: T, index: number) => void | Promise<void>
  ): Promise<void> {
    assertFunction(fn, "forEach");
    const src = this.#channels.async;
    let i = 0;
    for (;;) {
      const r = await src.next();
      if (r.done) return;
      await fn(r.value, i++);
    }
  }

  /**
   * Folds every element into an accumulator, awaiting `fn` per element.
   *
   * @example
   * ```ts
   * await asyncIter([1, 2, 3]).fold(0, async (acc, v) => acc + v); // 6
   * ```
   */
  async fold<U>(
    init: U,
    fn: (acc: U, value: T, index: number) => U | Promise<U>
  ): Promise<U> {
    assertFunction(fn, "fold");
    const src = this.#channels.async;
    let acc = init;
    let i = 0;
    for (;;) {
      const r = await src.next();
      if (r.done) return acc;
      acc = await fn(acc, r.value, i++);
    }
  }

  /**
   * Reduces the iterator to a single value. Returns `None()` if empty.
   *
   * @example
   * ```ts
   * await asyncIter([1, 2, 3]).reduce((a, b) => a + b); // Some(6)
   * ```
   */
  async reduce(
    fn: (acc: T, value: T) => T | Promise<T>
  ): Promise<AnyOption<T>> {
    assertFunction(fn, "reduce");
    const src = this.#channels.async;
    const first = await src.next();
    if (first.done) return None();
    let acc = first.value;
    for (;;) {
      const r = await src.next();
      if (r.done) return Some(acc);
      acc = await fn(acc, r.value);
    }
  }

  /**
   * Counts the remaining elements.
   */
  async count(): Promise<number> {
    const src = this.#channels.async;
    let count = 0;
    for (;;) {
      const r = await src.next();
      if (r.done) return count;
      count++;
    }
  }

  /**
   * Returns the last element as `Option<T>`.
   */
  async last(): Promise<AnyOption<T>> {
    const src = this.#channels.async;
    let last: T | undefined;
    let hasValue = false;
    for (;;) {
      const r = await src.next();
      if (r.done) return hasValue ? Some(last as T) : None();
      last = r.value;
      hasValue = true;
    }
  }

  /**
   * Returns the `n`-th element (0-indexed) as `Option<T>`.
   */
  async nth(n: number): Promise<AnyOption<T>> {
    const src = this.#channels.async;
    let i = 0;
    for (;;) {
      const r = await src.next();
      if (r.done) return None();
      if (i === n) return Some(r.value);
      i++;
    }
  }

  /**
   * Returns the first element matching the predicate (may be async)
   * as `Option<T>`.
   */
  async find(
    fn: (value: T, index: number) => boolean | Promise<boolean>
  ): Promise<AnyOption<T>> {
    assertFunction(fn, "find");
    const src = this.#channels.async;
    let i = 0;
    for (;;) {
      const r = await src.next();
      if (r.done) return None();
      if (await fn(r.value, i++)) return Some(r.value);
    }
  }

  /**
   * Returns the first `Some` produced by `fn` (may be async) as `Option<U>`.
   */
  async findMap<U>(
    fn: (value: T, index: number) => AnyOption<U> | Promise<AnyOption<U>>
  ): Promise<AnyOption<U>> {
    assertFunction(fn, "findMap");
    const src = this.#channels.async;
    let i = 0;
    for (;;) {
      const r = await src.next();
      if (r.done) return None();
      const mapped = await fn(r.value, i++);
      if (mapped.isSome()) return mapped;
    }
  }

  /**
   * Returns the index of the first element matching the predicate
   * (may be async) as `Option<number>`.
   */
  async position(
    fn: (value: T) => boolean | Promise<boolean>
  ): Promise<AnyOption<number>> {
    assertFunction(fn, "position");
    const src = this.#channels.async;
    let i = 0;
    for (;;) {
      const r = await src.next();
      if (r.done) return None();
      if (await fn(r.value)) return Some(i);
      i++;
    }
  }

  /**
   * Returns `true` if any element matches the predicate (may be async).
   */
  async any(
    fn: (value: T, index: number) => boolean | Promise<boolean>
  ): Promise<boolean> {
    assertFunction(fn, "any");
    const src = this.#channels.async;
    let i = 0;
    for (;;) {
      const r = await src.next();
      if (r.done) return false;
      if (await fn(r.value, i++)) return true;
    }
  }

  /**
   * Returns `true` if all elements match the predicate (may be async).
   */
  async all(
    fn: (value: T, index: number) => boolean | Promise<boolean>
  ): Promise<boolean> {
    assertFunction(fn, "all");
    const src = this.#channels.async;
    let i = 0;
    for (;;) {
      const r = await src.next();
      if (r.done) return true;
      if (!(await fn(r.value, i++))) return false;
    }
  }

  /**
   * Sums all elements. Elements must be numbers.
   */
  async sum(this: AsyncIter<number>): Promise<number> {
    return this.fold(0, (acc, v) => acc + v);
  }

  /**
   * Returns the product of all elements. Elements must be numbers.
   */
  async product(this: AsyncIter<number>): Promise<number> {
    return this.fold(1, (acc, v) => acc * v);
  }

  /**
   * Returns the minimum element as `Option<T>`, comparing with `<`.
   */
  async min(): Promise<AnyOption<T>> {
    return this.reduce((a, b) => (b < a ? b : a));
  }

  /**
   * Returns the maximum element as `Option<T>`, comparing with `>`.
   */
  async max(): Promise<AnyOption<T>> {
    return this.reduce((a, b) => (b > a ? b : a));
  }

  /**
   * Returns the minimum element using a custom comparator.
   */
  async minBy(fn: (a: T, b: T) => number): Promise<AnyOption<T>> {
    assertFunction(fn, "minBy");
    return this.reduce((a, b) => (fn(a, b) <= 0 ? a : b));
  }

  /**
   * Returns the maximum element using a custom comparator.
   */
  async maxBy(fn: (a: T, b: T) => number): Promise<AnyOption<T>> {
    assertFunction(fn, "maxBy");
    return this.reduce((a, b) => (fn(a, b) >= 0 ? a : b));
  }

  /**
   * Splits the remaining elements into `[matching, rest]` using a
   * predicate (may be async).
   *
   * @example
   * ```ts
   * await asyncIter([1, 2, 3, 4]).partition(v => v % 2 === 0);
   * // [[2, 4], [1, 3]]
   * ```
   */
  async partition(
    fn: (value: T, index: number) => boolean | Promise<boolean>
  ): Promise<[T[], T[]]> {
    assertFunction(fn, "partition");
    const src = this.#channels.async;
    const yes: T[] = [];
    const no: T[] = [];
    let i = 0;
    for (;;) {
      const r = await src.next();
      if (r.done) return [yes, no];
      ((await fn(r.value, i++)) ? yes : no).push(r.value);
    }
  }

  /**
   * Splits an iterator of pairs into two arrays.
   *
   * @example
   * ```ts
   * await asyncIter([[1, "a"], [2, "b"]] as [number, string][]).unzip();
   * // [[1, 2], ["a", "b"]]
   * ```
   */
  async unzip<A, B>(this: AsyncIter<[A, B]>): Promise<[A[], B[]]> {
    const src = (this as AsyncIter<[A, B]>).#channels.async;
    const as: A[] = [];
    const bs: B[] = [];
    for (;;) {
      const r = await src.next();
      if (r.done) return [as, bs];
      as.push(r.value[0]);
      bs.push(r.value[1]);
    }
  }
}

/**
 * Creates a lazy `AsyncIter<T>` from any async or sync iterable source.
 *
 * @example
 * ```ts
 * import { asyncIter } from "@rslike/iter";
 *
 * // sync source
 * await asyncIter([1, 2, 3]).map(async v => v * 2).collect(); // [2, 4, 6]
 *
 * // async generator source
 * async function* naturals() { let i = 0; while (true) yield i++; }
 * await asyncIter(naturals()).take(3).collect(); // [0, 1, 2]
 * ```
 */
export function asyncIter<T>(source: AnySource<T>): AsyncIter<T> {
  return new AsyncIter(source);
}
