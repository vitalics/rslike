import type { Result } from "@rslike/std";

import type { StreamBase } from "../stream-base.js";
import type { Sink } from "../sink.js";
import { okVoid } from "../shared.js";

export type PipeOptions = {
  /**
   * Number of items pulled and sent between `ready()` backpressure checks.
   *
   * With `batchSize > 1`, sends inside a batch are initiated without
   * awaiting each one individually — their results are checked at the end
   * of the batch, so item order is preserved but up to `batchSize` items
   * may be in flight before a send error is observed.
   *
   * Defaults to `1` — the strict sequential protocol
   * (`ready → next → send` per item).
   */
  batchSize?: number;
};

/** Awaits initiated sends in order; returns the first `Err`, or `null`. */
async function flushSends<E>(
  pending: Promise<Result<void, E>>[]
): Promise<Result<void, E> | null> {
  let failed: Result<void, E> | null = null;
  for (const p of pending) {
    const s = await p;
    if (s.isErr() && failed === null) failed = s;
  }
  return failed;
}

export async function pipe<T, E>(
  source: StreamBase<T, E>,
  sink: Sink<T, E>,
  options?: PipeOptions
): Promise<Result<void, E>> {
  const batchSize = options?.batchSize ?? 1;
  if (!Number.isInteger(batchSize) || batchSize < 1) {
    throw new TypeError(
      `pipe: batchSize must be a positive integer, got ${batchSize}`
    );
  }

  while (true) {
    const ready = await sink.ready();
    if (ready.isErr()) return ready;

    const pending: Promise<Result<void, E>>[] = [];
    let done = false;

    for (let i = 0; i < batchSize; i++) {
      const item = source.pollNext?.() ?? (await source.next());
      if (item.isErr()) {
        const failedSend = await flushSends(pending);
        await sink.close();
        return failedSend ?? (item as never);
      }
      const opt = item.unwrap();
      if (opt.isNone()) {
        done = true;
        break;
      }
      pending.push(sink.send(opt.unwrap()));
    }

    const failedSend = await flushSends(pending);
    if (failedSend) {
      await sink.close();
      return failedSend;
    }

    if (done) {
      const r = await sink.close();
      if (r.isErr()) return r;
      return okVoid();
    }
  }
}
