import { None, Ok, Some, type Result, type Option } from "@rslike/std";
import type { IterLike } from "@rslike/iter";

import { StreamBase } from "../stream-base.js";
import { Channel } from "../runtime/pure.js";

/**
 * Creates a `Stream` from any sync or async iterable, or from an
 * `IterLike` (pull-based object exposing only `next()`).
 * Items are pumped into an unbounded `Channel` in the background.
 *
 * Note: the pump is eager — for lazy pull-based iteration of an in-memory
 * array prefer {@link fromArray}.
 */
export function fromIterable<T>(
  it: Iterable<T> | AsyncIterable<T> | IterLike<T>
): StreamBase<T, Error> {
  const src = new Channel<T>();
  (async () => {
    try {
      const obj = Object(it);
      if (
        Symbol.iterator in obj ||
        Symbol.asyncIterator in obj
      ) {
        for await (const x of it as Iterable<T> | AsyncIterable<T>) {
          const r = await src.send(x);
          if (r.isErr()) return;
        }
      } else {
        const like = it as IterLike<T>;
        for (let r = like.next(); r.isSome(); r = like.next()) {
          const s = await src.send(r.unwrap());
          if (s.isErr()) return;
        }
      }
      await src.close();
    } catch (e) {
      await src.close();
    }
  })();
  return src;
}

/**
 * Creates a `Stream` from an array.
 *
 * Lazy and pull-based — no background pump, no intermediate buffer:
 * each `next()` reads the next array slot directly. This preserves
 * backpressure and is significantly faster than pumping through a
 * channel (see `streams.bench.ts`).
 */
export function fromArray<T>(arr: T[]): StreamBase<T, Error> {
  let i = 0;
  const pull = (): Result<Option<T>, Error> =>
    i >= arr.length ? Ok(None()) : Ok(Some(arr[i++]));
  // pull is always synchronously ready — consumers never pay the
  // per-item microtask tick.
  return StreamBase.fromNext<T, Error>(async () => pull(), pull);
}
