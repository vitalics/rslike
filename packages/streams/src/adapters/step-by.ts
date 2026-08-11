import { okNone } from "../shared.js";
import type { Stream } from "../stream.js";
import type { AdapterFns } from "./map.js";

export function stepByAdapter<T, E>(
  inner: Stream<T, E>,
  step: number,
): AdapterFns<T, E> {
  if (step < 1) {
    throw new RangeError("stepBy: step must be >= 1");
  }
  // Items still to discard before the next emit; survives poll pending.
  let toSkip = 0;
  return {
    next: async () => {
      while (toSkip > 0) {
        const r = inner.pollNext?.() ?? (await inner.next());
        if (r.isErr()) return r;
        if (r.unwrap().isNone()) return okNone();
        toSkip--;
      }
      const r = inner.pollNext?.() ?? (await inner.next());
      if (r.isErr()) return r;
      if (r.unwrap().isNone()) return okNone();
      toSkip = step - 1;
      return r;
    },
    poll: () => {
      while (toSkip > 0) {
        const r = inner.pollNext?.();
        if (r === undefined) return undefined;
        if (r.isErr()) return r;
        if (r.unwrap().isNone()) return okNone();
        toSkip--;
      }
      const r = inner.pollNext?.();
      if (r === undefined) return undefined;
      if (r.isErr()) return r;
      if (r.unwrap().isNone()) return okNone();
      toSkip = step - 1;
      return r;
    },
  };
}
