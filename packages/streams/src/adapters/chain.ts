import type { Stream } from "../stream.js";
import type { AdapterFns } from "./map.js";

export function chainAdapter<T, E>(
  first: Stream<T, E>,
  second: Stream<T, E>,
): AdapterFns<T, E> {
  let onSecond = false;
  return {
    next: async () => {
      if (!onSecond) {
        const r = first.pollNext?.() ?? (await first.next());
        if (r.isErr()) return r;
        if (r.unwrap().isSome()) return r;
        onSecond = true;
      }
      return second.pollNext?.() ?? second.next();
    },
    poll: () => {
      if (!onSecond) {
        const r = first.pollNext?.();
        if (r === undefined) return undefined;
        if (r.isErr()) return r;
        if (r.unwrap().isSome()) return r;
        onSecond = true;
      }
      return second.pollNext?.();
    },
  };
}
