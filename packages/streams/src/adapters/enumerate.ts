import { Ok, type Option, type Result, Some } from "@rslike/std";

import { okNone } from "../shared.js";
import type { Stream } from "../stream.js";
import type { AdapterFns } from "./map.js";

export function enumerateAdapter<T, E>(
  inner: Stream<T, E>,
): AdapterFns<[number, T], E> {
  let index = 0;
  const transform = (
    r: Result<Option<T>, E>,
  ): Result<Option<[number, T]>, E> => {
    if (r.isErr()) return r as never;
    const opt = r.unwrap();
    if (opt.isNone()) return okNone();
    return Ok(Some([index++, opt.unwrap()] as [number, T]));
  };
  return {
    next: async () => transform(inner.pollNext?.() ?? (await inner.next())),
    poll: () => {
      const r = inner.pollNext?.();
      return r === undefined ? undefined : transform(r);
    },
  };
}
