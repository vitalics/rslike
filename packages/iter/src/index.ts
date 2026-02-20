export { Iter, Peekable } from "./iter.ts";
export { DoubleEndedIter } from "./double-ended-iter.ts";
export type { AnyOption } from "./types.ts";

import { Iter } from "./iter.ts";
import { DoubleEndedIter } from "./double-ended-iter.ts";

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
