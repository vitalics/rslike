import type { Stream } from "../stream.js";
import type { AdapterFns } from "./map.js";
import { okNone } from "../shared.js";

export function skipAdapter<T, E>(
  inner: Stream<T, E>,
  n: number
): AdapterFns<T, E> {
  // Shared countdown: a poll that goes pending mid-skip resumes where it left off.
  let remaining = n;
  return {
    next: async () => {
      while (remaining > 0) {
        const r = inner.pollNext?.() ?? (await inner.next());
        if (r.isErr()) return r;
        if (r.unwrap().isNone()) return okNone();
        remaining--;
      }
      return inner.pollNext?.() ?? inner.next();
    },
    poll: () => {
      while (remaining > 0) {
        const r = inner.pollNext?.();
        if (r === undefined) return undefined;
        if (r.isErr()) return r;
        if (r.unwrap().isNone()) return okNone();
        remaining--;
      }
      return inner.pollNext?.();
    },
  };
}
