import { okNone } from "../shared.js";
import type { Stream } from "../stream.js";
import type { AdapterFns } from "./map.js";

export function takeAdapter<T, E>(
  inner: Stream<T, E>,
  n: number,
): AdapterFns<T, E> {
  let taken = 0;
  return {
    next: async () => {
      if (taken >= n) return okNone();
      const r = inner.pollNext?.() ?? (await inner.next());
      taken++;
      return r;
    },
    poll: () => {
      if (taken >= n) return okNone();
      const r = inner.pollNext?.();
      if (r === undefined) return undefined;
      taken++;
      return r;
    },
  };
}
