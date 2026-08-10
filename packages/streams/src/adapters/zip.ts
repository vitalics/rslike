import { Ok, Some } from "@rslike/std";

import type { Stream } from "../stream.js";
import type { AdapterFns } from "./map.js";
import { okNone } from "../shared.js";

export function zipAdapter<T, U, E>(
  a: Stream<T, E>,
  b: Stream<U, E>
): AdapterFns<[T, U], E> {
  // When poll pulled a's value but b was pending, the value is stashed
  // so nothing is lost between pulls.
  let stash: { value: T } | null = null;

  return {
    next: async () => {
      let va: T;
      if (stash !== null) {
        va = stash.value;
        stash = null;
      } else {
        const ra = a.pollNext?.() ?? (await a.next());
        if (ra.isErr()) return ra as never;
        const optA = ra.unwrap();
        if (optA.isNone()) return okNone();
        va = optA.unwrap();
      }
      const rb = b.pollNext?.() ?? (await b.next());
      if (rb.isErr()) return rb as never;
      const optB = rb.unwrap();
      if (optB.isNone()) return okNone();
      return Ok(Some([va, optB.unwrap()] as [T, U]));
    },
    poll: () => {
      let va: T;
      if (stash !== null) {
        va = stash.value;
        stash = null;
      } else {
        const ra = a.pollNext?.();
        if (ra === undefined) return undefined;
        if (ra.isErr()) return ra as never;
        const optA = ra.unwrap();
        if (optA.isNone()) return okNone();
        va = optA.unwrap();
      }
      const rb = b.pollNext?.();
      if (rb === undefined) {
        stash = { value: va };
        return undefined;
      }
      if (rb.isErr()) return rb as never;
      const optB = rb.unwrap();
      if (optB.isNone()) return okNone();
      return Ok(Some([va, optB.unwrap()] as [T, U]));
    },
  };
}
