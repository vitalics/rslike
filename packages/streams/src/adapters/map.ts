import { type Result, type Option, Ok, Some } from "@rslike/std";

import type { Stream } from "../stream.js";
import { okNone } from "../shared.js";

export type NextFn<T, E> = () => Promise<Result<Option<T>, E>>;

/** Sync fast path: a ready value, or `undefined` when the caller must await. */
export type PollFn<T, E> = () => Result<Option<T>, E> | undefined;

/**
 * An adapter is a pair of pull functions sharing one closure state:
 * `next` — the async protocol, `poll` — the optional sync fast path.
 * `poll` must return exactly what `next` would resolve with, or
 * `undefined` when the inner stream cannot answer synchronously
 * (state is never lost on `undefined` — the next pull continues).
 */
export type AdapterFns<T, E> = {
  next: NextFn<T, E>;
  poll?: PollFn<T, E>;
};

export function mapAdapter<T, U, E>(
  inner: Stream<T, E>,
  f: (item: T) => U
): AdapterFns<U, E> {
  const transform = (r: Result<Option<T>, E>): Result<Option<U>, E> => {
    if (r.isErr()) return r as never;
    const opt = r.unwrap();
    if (opt.isNone()) return okNone();
    return Ok(Some(f(opt.unwrap())));
  };
  return {
    next: async () => transform(inner.pollNext?.() ?? (await inner.next())),
    poll: () => {
      const r = inner.pollNext?.();
      return r === undefined ? undefined : transform(r);
    },
  };
}
