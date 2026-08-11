import { Ok, type Option, type Result, Some } from "@rslike/std";

import { okNone } from "../shared.js";
import type { Stream } from "../stream.js";
import type { AdapterFns } from "./map.js";

export function inspectAdapter<T, E>(
  inner: Stream<T, E>,
  f: (item: T) => void,
): AdapterFns<T, E> {
  const transform = (r: Result<Option<T>, E>): Result<Option<T>, E> => {
    if (r.isErr()) return r;
    const opt = r.unwrap();
    if (opt.isNone()) return okNone();
    const v = opt.unwrap();
    f(v);
    return Ok(Some(v));
  };
  return {
    next: async () => transform(inner.pollNext?.() ?? (await inner.next())),
    poll: () => {
      const r = inner.pollNext?.();
      return r === undefined ? undefined : transform(r);
    },
  };
}
