import { Iter } from "./iter.ts";
import { ParIter } from "./parIter.ts";

/**
 * Detect available parallelism across environments:
 *   browser  → navigator.hardwareConcurrency
 *   Node 19+ → os.availableParallelism()
 *   Node 18  → os.cpus().length
 *   fallback → 1
 */
function getParallelism(): number {
  if (
    typeof navigator !== "undefined" &&
    (navigator.hardwareConcurrency ?? 0) > 0
  ) {
    return navigator.hardwareConcurrency;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const os = require("node:os") as typeof import("node:os");
    const ap = (os as { availableParallelism?: () => number })
      .availableParallelism;
    return typeof ap === "function" ? ap() : os.cpus().length;
  } catch {
    return 1;
  }
}

/** A single lazy pipeline stage stored as a serializable descriptor. */
type WorkerStage = { method: "map" | "filter"; fnStr: string };

/**
 * Universal inline worker — applies the full pipeline in a single pass per chunk.
 * Detects Node.js worker_threads vs browser Web Worker at runtime.
 */
const WORKER_CODE = `(function(){
  function applyPipeline(items,pipeline){
    var result=items;
    for(var j=0;j<pipeline.length;j++){
      var fn=new Function("return("+pipeline[j].fnStr+")")();
      result=pipeline[j].method==="filter"?result.filter(fn):result.map(fn);
    }
    return result;
  }
  if(typeof process!=="undefined"&&process.versions&&process.versions.node){
    var wt=require("node:worker_threads");
    wt.parentPort.postMessage(applyPipeline(wt.workerData.items,wt.workerData.pipeline));
  }else{
    self.onmessage=function(e){self.postMessage(applyPipeline(e.data.items,e.data.pipeline));};
  }
})();`;

/**
 * Sends one chunk and its full pipeline to a single worker, returns the result.
 * Uses globalThis.Worker (browser) when available, otherwise Node.js worker_threads.
 */
function spawnWorker<T>(items: T[], pipeline: WorkerStage[]): Promise<T[]> {
  return new Promise((resolve, reject) => {
    if (typeof globalThis.Worker !== "undefined") {
      // Browser — Blob URL Web Worker
      const blob = new Blob([WORKER_CODE], { type: "application/javascript" });
      const url = URL.createObjectURL(blob);
      const worker = new globalThis.Worker(url);
      worker.addEventListener("message", (e: MessageEvent) => {
        URL.revokeObjectURL(url);
        worker.terminate();
        resolve(e.data as T[]);
      });
      worker.addEventListener("error", (e: ErrorEvent) => {
        URL.revokeObjectURL(url);
        reject(new Error(e.message));
      });
      worker.postMessage({ items, pipeline });
    } else {
      // Node.js — worker_threads
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Worker: NodeWorker } =
        require("node:worker_threads") as typeof import("node:worker_threads");
      const worker = new NodeWorker(WORKER_CODE, {
        eval: true,
        workerData: { items, pipeline },
      });
      worker.on("message", (result: T[]) => resolve(result));
      worker.on("error", reject);
      worker.on("exit", (code: number) => {
        if (code !== 0)
          reject(new Error(`Worker thread exited with code ${code}`));
      });
    }
  });
}

/**
 * A lazy, CPU-parallel iterator backed by worker threads.
 * Inspired by Rust's Rayon — splits work across OS threads for CPU-bound tasks.
 *
 * Adapters (`map`, `filter`) are **lazy** — they return a new `WorkerParIter`
 * without spawning any workers. Only terminal operations (`collect`, `forEach`)
 * materialize the source and distribute work across threads.
 *
 * The entire pipeline is serialized and sent to each worker chunk in one shot,
 * avoiding intermediate round-trips between the main thread and workers.
 *
 * **Constraints on the callback functions:**
 * - Must be **pure** — no external variables, imports, or closures.
 * - Data must be **structuredClone-able** (plain objects, arrays, primitives).
 * - For IO-bound concurrency, prefer `ParIter` (Promise.all) instead.
 *
 * @example
 * ```ts
 * import { workerParIter } from "@rslike/iter";
 *
 * // CPU-bound: filter primes then square them — pipeline runs in workers
 * const result = await workerParIter([2, 3, 4, 5, 6, 7, 8, 9])
 *   .filter(n => { for (let i = 2; i * i <= n; i++) if (n % i === 0) return false; return true; })
 *   .map(n => n ** 2)
 *   .collect();
 * // [4, 9, 25, 49]
 * ```
 */
export class WorkerParIter<T> {
  #source: Iterable<unknown> | (() => Iterator<unknown>);
  #asyncSource: Promise<unknown[]> | null;
  #pipeline: WorkerStage[];
  #workerCount: number;

  constructor(
    source: Iterable<T> | (() => Iterator<T>) | ParIter<T>,
    pipeline: WorkerStage[] = [],
    workerCount = getParallelism(),
  ) {
    if (source instanceof ParIter) {
      this.#asyncSource = (source as ParIter<T>).collect() as Promise<
        unknown[]
      >;
      this.#source = [] as unknown as Iterable<unknown>;
    } else {
      this.#source = source as Iterable<unknown> | (() => Iterator<unknown>);
      this.#asyncSource = null;
    }
    this.#pipeline = pipeline;
    this.#workerCount = Math.max(1, workerCount);
  }

  // ── Private clone helper ─────────────────────────────────────────────────

  #clone<U>(pipeline: WorkerStage[]): WorkerParIter<U> {
    const inst = new WorkerParIter<U>(
      [] as unknown as Iterable<U>,
      pipeline,
      this.#workerCount,
    );
    if (this.#asyncSource !== null) {
      inst.#asyncSource = this.#asyncSource;
    } else {
      inst.#source = this.#source;
    }
    return inst;
  }

  // ── Lazy adapters ────────────────────────────────────────────────────────

  /**
   * Lazy — adds a map stage. Returns a new `WorkerParIter` without executing.
   * `fn` must be a **pure function** (no external closures or imports).
   *
   * @example
   * ```ts
   * const result = await workerParIter([1, 2, 3])
   *   .map(v => v * 2)
   *   .collect(); // [2, 4, 6]
   * ```
   */
  map<U>(fn: (value: T) => U): WorkerParIter<U> {
    return this.#clone<U>([
      ...this.#pipeline,
      { method: "map", fnStr: fn.toString() },
    ]);
  }

  /**
   * Lazy — adds a filter stage. Returns a new `WorkerParIter` without executing.
   * `fn` must be a **pure function** (no external closures or imports).
   *
   * @example
   * ```ts
   * const result = await workerParIter([1, 2, 3, 4])
   *   .filter(v => v % 2 === 0)
   *   .collect(); // [2, 4]
   * ```
   */
  filter(fn: (value: T) => boolean): WorkerParIter<T> {
    return this.#clone<T>([
      ...this.#pipeline,
      { method: "filter", fnStr: fn.toString() },
    ]);
  }

  // ── Terminal consumers ────────────────────────────────────────────────────

  /**
   * Terminal — materializes the source, distributes chunks across workers,
   * runs all pipeline stages in parallel, and returns a `Promise<T[]>`.
   *
   * Optionally accepts a constructor to collect into a specific collection
   * (`Array`, `Set`, `Map` for `[K, V]` pairs, `Iter`, `@rslike/collections`
   * classes). The constructor runs on the **main thread** after all workers
   * finish. See {@link Iter.collect}.
   *
   * @example
   * ```ts
   * const squares = await workerParIter([1, 2, 3, 4])
   *   .filter(v => v % 2 === 0)
   *   .map(v => v ** 2)
   *   .collect();
   * // [4, 16]
   * ```
   */
  collect(): Promise<T[]>;
  collect(ctor: ArrayConstructor): Promise<T[]>;
  collect<K, V>(
    this: WorkerParIter<readonly [K, V]>,
    ctor: MapConstructor,
  ): Promise<Map<K, V>>;
  collect<C>(ctor: new (items: T[]) => C): Promise<C>;
  async collect(
    ctor?: ArrayConstructor | MapConstructor | (new (items: T[]) => unknown),
  ): Promise<unknown> {
    const items = (await this.#materializeAsync()) as T[];

    if (this.#pipeline.length === 0) {
      if (ctor === undefined || ctor === Array) return items;
      return new (ctor as new (items: T[]) => unknown)(items);
    }
    if (items.length === 0) {
      const empty: T[] = [];
      if (ctor === undefined || ctor === Array) return empty;
      return new (ctor as new (items: T[]) => unknown)(empty);
    }

    const size = Math.max(1, Math.ceil(items.length / this.#workerCount));
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
      chunks.push(items.slice(i, i + size));
    }

    const results = await Promise.all(
      chunks.map((chunk) => spawnWorker<T>(chunk, this.#pipeline)),
    );

    const flat = results.flat();
    if (ctor === undefined || ctor === Array) return flat;
    return new (ctor as new (items: T[]) => unknown)(flat);
  }

  /**
   * Terminal — collects (workers execute the pipeline) then calls `fn` on each
   * item on the **main thread**. Unlike `map`/`filter`, `fn` may capture closures.
   *
   * @example
   * ```ts
   * const seen: number[] = [];
   * await workerParIter([1, 2, 3]).map(v => v * 2).forEach(v => seen.push(v));
   * // seen === [2, 4, 6]
   * ```
   */
  async forEach(fn: (value: T, index: number) => void): Promise<void> {
    const items = await this.collect();
    items.forEach(fn);
  }

  // ── Conversions ───────────────────────────────────────────────────────────

  /**
   * Materializes the **source only** (pipeline stages are NOT applied)
   * and returns a sequential `Iter<T>`.
   * Use `await collect()` first if you need to apply the pipeline.
   *
   * Throws if this instance was created from a `ParIter` source — use
   * `await collect()` first in that case.
   */
  iter(): Iter<T> {
    if (this.#asyncSource !== null) {
      throw new Error(
        "Cannot synchronously convert a WorkerParIter backed by a ParIter source to Iter. " +
          "Call `await collect()` first, then wrap in iter().",
      );
    }
    return Iter.from(this.#materialize() as T[]);
  }

  /**
   * Materializes the **source only** (pipeline stages are NOT applied)
   * and returns a concurrent `ParIter<T>`.
   * Use `await collect()` first if you need to apply the pipeline.
   *
   * Throws if this instance was created from a `ParIter` source — use
   * `await collect()` first in that case.
   */
  parIter(): ParIter<T> {
    if (this.#asyncSource !== null) {
      throw new Error(
        "Cannot synchronously convert a WorkerParIter backed by a ParIter source to ParIter. " +
          "Call `await collect()` first, then wrap in parIter().",
      );
    }
    return new ParIter<T>(this.#materialize() as T[]);
  }

  /**
   * Iterates the **source only** (pipeline stages are NOT applied).
   * Throws if pipeline stages are pending — use `await collect()` first.
   * Throws if this instance was created from a `ParIter` source.
   */
  [Symbol.iterator](): Iterator<T> {
    if (this.#asyncSource !== null) {
      throw new Error(
        "Cannot synchronously iterate a WorkerParIter backed by a ParIter source. " +
          "Call `await collect()` first, then iterate the resulting array.",
      );
    }
    if (this.#pipeline.length > 0) {
      throw new Error(
        "Cannot synchronously iterate a WorkerParIter with pending pipeline stages. " +
          "Call `await collect()` first, then iterate the resulting array.",
      );
    }
    return (this.#materialize() as T[])[Symbol.iterator]();
  }

  // ── Private ───────────────────────────────────────────────────────────────

  async #materializeAsync(): Promise<unknown[]> {
    if (this.#asyncSource !== null) return this.#asyncSource;
    return this.#materialize();
  }

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

/**
 * Creates a lazy `WorkerParIter<T>` from any iterable source.
 *
 * @param source - The data to iterate.
 * @param workerCount - Number of worker threads (default: detected automatically).
 *
 * @example
 * ```ts
 * import { workerParIter } from "@rslike/iter";
 *
 * const squared = await workerParIter([1, 2, 3, 4])
 *   .map(n => n ** 2)
 *   .collect();
 * // [1, 4, 9, 16]
 * ```
 */
export function workerParIter<T>(
  source: Iterable<T> | ParIter<T>,
  workerCount?: number,
): WorkerParIter<T> {
  return new WorkerParIter(source, [], workerCount);
}
