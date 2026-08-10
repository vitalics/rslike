import type { Stream } from "../stream.js";
import type { AdapterFns } from "./map.js";

/**
 * Yields at most one item per `ms` milliseconds.
 * The first item is emitted immediately; each subsequent item waits
 * until the interval since the previous emission has elapsed.
 *
 * Time-based — no sync fast path: waiting requires a timer, so `poll`
 * is not provided and consumers always go through `next()`.
 */
export function throttleAdapter<T, E>(
  inner: Stream<T, E>,
  ms: number
): AdapterFns<T, E> {
  let lastEmit = 0;
  return {
    next: async () => {
      const r = inner.pollNext?.() ?? (await inner.next());
      if (r.isErr()) return r;
      const now = Date.now();
      const elapsed = now - lastEmit;
      if (lastEmit !== 0 && elapsed < ms) {
        await new Promise((resolve) => setTimeout(resolve, ms - elapsed));
      }
      lastEmit = Date.now();
      return r;
    },
  };
}
