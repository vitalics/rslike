import type { IterLike } from "@rslike/iter";

/**
 * Any value a collection can be built from:
 * - a native `Iterable<T>` — arrays, `Map`, `Set`, generators, `Iter`, …
 * - a pull-based {@link IterLike} — anything exposing `next(): Option<T>`
 *   without `Symbol.iterator` (e.g. a hand-rolled cursor or an adapter
 *   from another ecosystem).
 */
export type IterSource<T> = Iterable<T> | IterLike<T>;

/**
 * Normalizes an {@link IterSource} to a native `Iterable`.
 *
 * Iterables are returned as-is. A bare `IterLike` is wrapped into a
 * lazy iterable that drains `next()` until `None` — consuming it
 * advances (and exhausts) the underlying iterator.
 */
export function toIterable<T>(source: IterSource<T>): Iterable<T> {
  if (Symbol.iterator in (source as object)) return source as Iterable<T>;
  const it = source as IterLike<T>;
  return {
    *[Symbol.iterator]() {
      for (let r = it.next(); r.isSome(); r = it.next()) {
        yield r.unwrap();
      }
    },
  };
}
