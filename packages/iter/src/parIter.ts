import { Iter } from "./iter.ts";

type PipelineStage = (
  items: readonly unknown[]
) => Promise<readonly unknown[]>;

/**
 * A lazy parallel iterator inspired by Rust's Rayon crate.
 *
 * Adapters (`map`, `filter`, `chunks`) are **lazy** — they return a new
 * `ParIter` without executing anything. Only terminal operations
 * (`collect`, `forEach`, `fold`) materialize the source and run all
 * pipeline stages concurrently via `Promise.all`.
 *
 * This makes it possible to build complex concurrent pipelines:
 * ```ts
 * const result = await parIter([1, 2, 3, 4, 5, 6])
 *   .filter(v => v % 2 === 0)   // lazy
 *   .map(v => v * 10)           // lazy
 *   .collect();                 // executes everything → [20, 40, 60]
 * ```
 */
export class ParIter<T> {
  #source: Iterable<unknown> | (() => Iterator<unknown>);
  #pipeline: PipelineStage[];

  /**
   * @param source - An iterable or a zero-argument factory function returning an `Iterator<T>`.
   * @param pipeline - Internal pipeline stages accumulated by lazy adapters. Defaults to `[]`.
   *
   * Prefer the {@link parIter} factory function over calling this constructor directly.
   */
  constructor(
    source: Iterable<T> | (() => Iterator<T>),
    pipeline: PipelineStage[] = []
  ) {
    this.#source = source as Iterable<unknown>;
    this.#pipeline = pipeline;
  }

  // ── Lazy adapters ─────────────────────────────────────────────────

  /**
   * Lazy — adds a concurrent map stage.
   * All `fn` calls run concurrently via `Promise.all` when collected.
   *
   * @example
   * ```ts
   * const result = await parIter([1, 2, 3])
   *   .map(async v => v * 2)
   *   .collect();
   * // [2, 4, 6]
   * ```
   */
  map<U>(fn: (value: T, index: number) => Promise<U> | U): ParIter<U> {
    const stage: PipelineStage = (items) =>
      Promise.all((items as T[]).map((v, i) => fn(v, i)));
    return new ParIter<U>(this.#source as Iterable<U>, [
      ...this.#pipeline,
      stage,
    ]);
  }

  /**
   * Lazy — adds a concurrent filter stage.
   * All predicates run concurrently via `Promise.all` when collected.
   *
   * @example
   * ```ts
   * const evens = await parIter([1, 2, 3, 4])
   *   .filter(v => v % 2 === 0)
   *   .collect();
   * // [2, 4]
   * ```
   */
  filter(
    fn: (value: T, index: number) => Promise<boolean> | boolean
  ): ParIter<T> {
    const stage: PipelineStage = async (items) => {
      const flags = await Promise.all((items as T[]).map((v, i) => fn(v, i)));
      return (items as T[]).filter((_, i) => flags[i]);
    };
    return new ParIter<T>(this.#source as Iterable<T>, [...this.#pipeline, stage]);
  }

  /**
   * Lazy — adds a chunking stage.
   * Like Rayon's `chunks()` — splits items into batches for controlled concurrency.
   *
   * @example
   * ```ts
   * await parIter([1, 2, 3, 4, 5])
   *   .chunks(2)
   *   .forEach(async batch => processBatch(batch));
   * ```
   */
  chunks(size: number): ParIter<readonly T[]> {
    const stage: PipelineStage = (items) => {
      const chunks: (readonly unknown[])[] = [];
      for (let i = 0; i < items.length; i += size) {
        chunks.push(items.slice(i, i + size));
      }
      return Promise.resolve(chunks);
    };
    return new ParIter<readonly T[]>(
      this.#source as Iterable<readonly T[]>,
      [...this.#pipeline, stage]
    );
  }

  // ── Terminal consumers ────────────────────────────────────────────

  /**
   * Terminal — materializes the source and runs all pipeline stages.
   * Returns a `Promise<T[]>` with the final results.
   *
   * Optionally accepts a constructor to collect into a specific collection
   * (`Array`, `Set`, `Map` for `[K, V]` pairs, `Iter`, `@rslike/collections`
   * classes). See {@link Iter.collect}.
   *
   * @example
   * ```ts
   * const result = await parIter([1, 2, 3])
   *   .filter(v => v > 1)
   *   .map(v => v * 10)
   *   .collect();
   * // [20, 30]
   *
   * const unique = await parIter([1, 2, 2, 3]).collect(Set);
   * // Set(3) { 1, 2, 3 }
   * ```
   */
  collect(): Promise<T[]>;
  collect(ctor: ArrayConstructor): Promise<T[]>;
  collect<K, V>(this: ParIter<readonly [K, V]>, ctor: MapConstructor): Promise<Map<K, V>>;
  collect<C>(ctor: new (items: T[]) => C): Promise<C>;
  async collect(
    ctor?: ArrayConstructor | MapConstructor | (new (items: T[]) => unknown),
  ): Promise<unknown> {
    let items: readonly unknown[] = this.#materialize();
    for (const stage of this.#pipeline) {
      items = await stage(items);
    }
    if (ctor === undefined || ctor === Array) {
      return items as T[];
    }
    return new (ctor as new (items: T[]) => unknown)(items as T[]);
  }

  /**
   * Terminal — collects then calls `fn` on each result concurrently.
   *
   * @example
   * ```ts
   * await parIter(urls).forEach(async url => fetch(url));
   * ```
   */
  async forEach(fn: (value: T, index: number) => Promise<void> | void): Promise<void> {
    const items = await this.collect();
    await Promise.all(items.map((v, i) => fn(v, i)));
  }

  /**
   * Terminal — collects then sequentially folds into an accumulator.
   * General reduction cannot be parallelized without associativity guarantees.
   *
   * @example
   * ```ts
   * const sum = await parIter([1, 2, 3]).fold(0, async (acc, v) => acc + v);
   * // 6
   * ```
   */
  async fold<U>(
    init: U,
    fn: (acc: U, value: T, index: number) => Promise<U> | U
  ): Promise<U> {
    const items = await this.collect();
    let acc = init;
    for (let i = 0; i < items.length; i++) {
      acc = await fn(acc, items[i], i);
    }
    return acc;
  }

  // ── Conversions ───────────────────────────────────────────────────

  /**
   * Materializes the **source only** (pipeline stages are NOT applied)
   * and returns a sequential `Iter<T>`.
   * Use `await collect()` first if you need to apply the pipeline.
   */
  iter(): Iter<T> {
    return Iter.from(this.#materialize() as T[]);
  }

  /**
   * Iterates the **source only** (pipeline stages are NOT applied).
   * Throws if pipeline stages are pending — use `await collect()` first.
   */
  [Symbol.iterator](): Iterator<T> {
    if (this.#pipeline.length > 0) {
      throw new Error(
        "Cannot synchronously iterate a ParIter with pending async pipeline stages. " +
          "Call `await collect()` first, then iterate the resulting array."
      );
    }
    return (this.#materialize() as T[])[Symbol.iterator]();
  }

  // ── Private ───────────────────────────────────────────────────────

  #materialize(): unknown[] {
    const src = this.#source;
    if (typeof src === "function") {
      const iterator = (src as () => Iterator<unknown>)();
      const items: unknown[] = [];
      let r = iterator.next();
      while (!r.done) {
        items.push(r.value);
        r = iterator.next();
      }
      return items;
    }
    return [...(src as Iterable<unknown>)];
  }
}
