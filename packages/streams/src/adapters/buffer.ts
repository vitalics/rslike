import { Ok, type Option, type Result, Some } from "@rslike/std";

import { okNone } from "../shared.js";
import type { Stream } from "../stream.js";
import type { AdapterFns } from "./map.js";

/**
 * Accumulates items into arrays of at most `size` elements.
 * The last chunk may be smaller than `size`.
 *
 * If the inner stream errors mid-chunk, the buffered partial chunk is
 * yielded first; the error is surfaced on the next pull.
 *
 * The accumulator lives in the closure, so a `poll` that goes pending
 * mid-chunk keeps what it gathered — the next pull continues the chunk.
 */
export function bufferAdapter<T, E>(
  inner: Stream<T, E>,
  size: number,
): AdapterFns<T[], E> {
  if (size < 1) {
    throw new RangeError("buffer: size must be >= 1");
  }
  let pendingErr: Result<Option<T>, E> | null = null;
  let chunk: T[] = [];

  const finishChunk = (): Result<Option<T[]>, E> => {
    const c = chunk;
    chunk = [];
    return Ok(Some(c));
  };

  return {
    next: async () => {
      if (pendingErr !== null) {
        const err = pendingErr;
        pendingErr = null;
        return err as never;
      }
      while (chunk.length < size) {
        const r = inner.pollNext?.() ?? (await inner.next());
        if (r.isErr()) {
          if (chunk.length > 0) {
            pendingErr = r;
            return finishChunk();
          }
          return r as never;
        }
        const opt = r.unwrap();
        if (opt.isNone()) {
          return chunk.length > 0 ? finishChunk() : okNone();
        }
        chunk.push(opt.unwrap());
      }
      return finishChunk();
    },
    poll: () => {
      if (pendingErr !== null) {
        const err = pendingErr;
        pendingErr = null;
        return err as never;
      }
      while (chunk.length < size) {
        const r = inner.pollNext?.();
        if (r === undefined) return undefined;
        if (r.isErr()) {
          if (chunk.length > 0) {
            pendingErr = r;
            return finishChunk();
          }
          return r as never;
        }
        const opt = r.unwrap();
        if (opt.isNone()) {
          return chunk.length > 0 ? finishChunk() : okNone();
        }
        chunk.push(opt.unwrap());
      }
      return finishChunk();
    },
  };
}
