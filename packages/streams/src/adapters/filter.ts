import { Ok, Some } from "@rslike/std";

import type { Stream } from "../stream.js";
import type { AdapterFns } from "./map.js";
import { okNone } from "../shared.js";

export function filterAdapter<T, E>(
  inner: Stream<T, E>,
  pred: (item: T) => boolean
): AdapterFns<T, E> {
  return {
    next: async () => {
      for (;;) {
        const r = inner.pollNext?.() ?? (await inner.next());
        if (r.isErr()) return r;
        const opt = r.unwrap();
        if (opt.isNone()) return okNone();
        const v = opt.unwrap();
        if (pred(v)) return Ok(Some(v));
      }
    },
    poll: () => {
      for (;;) {
        const r = inner.pollNext?.();
        if (r === undefined) return undefined;
        if (r.isErr()) return r;
        const opt = r.unwrap();
        if (opt.isNone()) return okNone();
        const v = opt.unwrap();
        if (pred(v)) return Ok(Some(v));
      }
    },
  };
}
