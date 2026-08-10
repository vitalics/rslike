import type { Result, Option } from "@rslike/std";

import type { Stream } from "../stream.js";
import type { AdapterFns } from "./map.js";
import { okNone } from "../shared.js";

/**
 * Makes a stream "fused": after the first `None` or `Err`,
 * all subsequent pulls return `Ok(None())`.
 */
export function fuseAdapter<T, E>(inner: Stream<T, E>): AdapterFns<T, E> {
  let done = false;
  const transform = (r: Result<Option<T>, E>): Result<Option<T>, E> => {
    if (r.isErr()) {
      done = true;
      return r;
    }
    if (r.unwrap().isNone()) done = true;
    return r;
  };
  return {
    next: async () => {
      if (done) return okNone();
      return transform(inner.pollNext?.() ?? (await inner.next()));
    },
    poll: () => {
      if (done) return okNone();
      const r = inner.pollNext?.();
      return r === undefined ? undefined : transform(r);
    },
  };
}
