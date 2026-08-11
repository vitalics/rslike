import type { AnyOption, IterLike } from "@rslike/iter";

/**
 * Analog of TypeScript's built-in `ArrayLike<T>` — a `length` plus
 * numeric indexed access — with one difference: it extends
 * {@link IterLike}, so every `RsArrayLike` is also a pull-based
 * iterator (`next(): Option<T>` by default).
 *
 * Like `IterLike`, the second type parameter fixes the wrapper `next()`
 * returns, so async instantiations work the same way:
 * `RsArrayLike<T, Promise<AnyOption<T>>>`.
 *
 * Because it satisfies `IterLike`, any `RsArrayLike<T>` is a valid
 * {@link IterSource} and can be passed directly to collection
 * constructors or `toIterable`.
 *
 * @example
 * ```ts
 * import type { RsArrayLike } from "@rslike/collections";
 * import { Some, None, type Option } from "@rslike/std";
 *
 * function windowed<T>(items: T[]): RsArrayLike<T> {
 *   let i = 0;
 *   return {
 *     length: items.length,
 *     ...items,
 *     next(): Option<T> {
 *       return i < items.length ? Some(items[i++]) : None();
 *     },
 *   };
 * }
 *
 * const w = windowed(["a", "b"]);
 * w.length; // 2
 * w[0];     // "a" — indexed access, like ArrayLike
 * w.next(); // Some("a") — pull-based iteration, like IterLike
 * ```
 */
export interface RsArrayLike<T, TNext = AnyOption<T>>
  extends IterLike<T, TNext> {
  /** Number of elements addressable via the numeric index. */
  readonly length: number;
  readonly [index: number]: T;
}
