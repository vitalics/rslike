import type { Option } from "@rslike/std";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyOption<T> = Option<T, any>;

/**
 * A generic pull-based iterator capability interface — the common
 * `next()` protocol shared by every iterator abstraction in the ecosystem.
 *
 * `TNext` is the (possibly wrapped) result of one pull:
 *
 * | Implementation | `IterLike` instantiation | `next()` returns |
 * |---|---|---|
 * | `Iter`, `Peekable`, `DoubleEndedIter` | `IterLike<T>` (default) | `Option<T>` |
 * | `AsyncIter` | `IterLike<T, Promise<AnyOption<T>>>` | `Promise<Option<T>>` |
 * | fallible streams (`@rslike/streams`) | `IterLike<T, Promise<Result<Option<T>, E>>>` | `Promise<Result<Option<T>, E>>` |
 *
 * Classes satisfy this interface **structurally** — no `implements` clause
 * is required. Use it in function parameters to accept any pull-based
 * iterator:
 *
 * @example
 * ```ts
 * import { iter, asyncIter, type IterLike } from "@rslike/iter";
 *
 * function drainSync(it: IterLike<number>): number {
 *   let sum = 0;
 *   for (let r = it.next(); r.isSome(); r = it.next()) {
 *     sum += r.unwrap();
 *   }
 *   return sum;
 * }
 *
 * async function drainAsync(
 *   it: IterLike<number, Promise<AnyOption<number>>>
 * ): Promise<number> {
 *   let sum = 0;
 *   for (let r = await it.next(); r.isSome(); r = await it.next()) {
 *     sum += r.unwrap();
 *   }
 *   return sum;
 * }
 *
 * drainSync(iter([1, 2, 3]));       // 6 — Iter satisfies IterLike<T>
 * await drainAsync(asyncIter([1, 2])); // 3 — AsyncIter satisfies the async instantiation
 * ```
 */
export interface IterLike<T, TNext = AnyOption<T>> {
  /**
   * Advances the iterator and returns the next (possibly wrapped) value.
   * The concrete wrapper (`Option`, `Promise<Option>`, `Promise<Result<Option, E>>`)
   * is fixed by the `TNext` type parameter.
   */
  next(): TNext;
}

/**
 * Analog of Rust's `IntoIterator` — a value that can produce a fresh
 * pull-based iterator over its contents.
 *
 * Collections implement this instead of {@link IterLike} itself: a
 * container holds data, it is not a cursor. Each `iter()` call returns an
 * independent iterator, so concurrent consumers and repeated passes never
 * share state.
 *
 * @example
 * ```ts
 * import type { IntoIterLike, IterLike } from "@rslike/iter";
 *
 * function sum(source: IntoIterLike<number>): number {
 *   const it = source.iter();
 *   let acc = 0;
 *   for (let r = it.next(); r.isSome(); r = it.next()) acc += r.unwrap();
 *   return acc;
 * }
 * ```
 */
export interface IntoIterLike<T, TNext = AnyOption<T>> {
  /** Returns a fresh, independent pull-based iterator over the contents. */
  iter(): IterLike<T, TNext>;
}
