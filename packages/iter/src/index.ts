export { Iter, Peekable } from "./iter.ts";
export { DoubleEndedIter } from "./double-ended-iter.ts";
export { ParIter } from "./parIter.ts";
export { WorkerParIter } from "./workerParIter.ts";
export { AsyncIter } from "./asyncIter.ts";
export type { AnyOption, IterLike, IntoIterLike } from "./types.ts";

import { Iter } from "./iter.ts";
import { DoubleEndedIter } from "./double-ended-iter.ts";
import { ParIter } from "./parIter.ts";

/**
 * Creates an `Iter<T>` from any iterable source.
 *
 * @example
 * ```ts
 * import { iter } from "@rslike/iter";
 *
 * // From array
 * iter([1, 2, 3]).map(x => x * 2).collect();
 *
 * // From string
 * iter("hello").enumerate().collect();
 *
 * // From Set
 * iter(new Set([1, 2, 3])).filter(x => x > 1).collect();
 *
 * // From Map
 * iter(new Map([["a", 1], ["b", 2]])).collect();
 *
 * // From generator
 * function* naturals() { let i = 0; while (true) yield i++; }
 * iter(naturals()).take(5).collect(); // [0, 1, 2, 3, 4]
 * ```
 */
export function iter<T>(source: Iterable<T>): Iter<T> {
  return new Iter(source);
}

/**
 * Creates a `DoubleEndedIter<T>` from an array, allowing iteration
 * from both the front and the back.
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
export function doubleEndedIter<T>(items: T[]): DoubleEndedIter<T> {
  return new DoubleEndedIter(items);
}

/**
 * Creates a `ParIter<T>` from any iterable source.
 *
 * Adapters (`map`, `filter`, `chunks`) are **lazy** and return a new
 * `ParIter` without executing anything. Only terminal operations
 * (`collect`, `forEach`, `fold`) materialize the source and run all
 * pipeline stages concurrently via `Promise.all`.
 *
 * @param source - Any iterable to wrap (array, Set, Map, generator, etc.)
 * @returns A `ParIter<T>` wrapping the given source.
 *
 * @example
 * ```ts
 * import { parIter } from "@rslike/iter";
 *
 * // Basic concurrent map
 * const doubled = await parIter([1, 2, 3])
 *   .map(async v => v * 2)
 *   .collect();
 * // [2, 4, 6]
 *
 * // Chained filter + map
 * const result = await parIter([1, 2, 3, 4, 5, 6])
 *   .filter(v => v % 2 === 0)
 *   .map(v => v * 10)
 *   .collect();
 * // [20, 40, 60]
 *
 * // Controlled concurrency with chunks
 * await parIter(urls)
 *   .chunks(3)
 *   .forEach(async batch => Promise.all(batch.map(fetch)));
 *
 * // Reduction
 * const sum = await parIter([1, 2, 3, 4])
 *   .fold(0, (acc, v) => acc + v);
 * // 10
 * ```
 */
export function parIter<T>(source: Iterable<T>): ParIter<T> {
  return new ParIter(source);
}

export { workerParIter } from "./workerParIter.ts";
export { asyncIter } from "./asyncIter.ts";
