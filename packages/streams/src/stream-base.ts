import type { Stream } from "./stream.js";
import { type Result, type Option, Ok, None, Some } from "@rslike/std";
import { AsyncIter } from "@rslike/iter";

import { mapAdapter, type NextFn, type AdapterFns } from "./adapters/map.js";
import { filterAdapter } from "./adapters/filter.js";
import { takeAdapter } from "./adapters/take.js";
import { skipAdapter } from "./adapters/skip.js";
import { stepByAdapter } from "./adapters/step-by.js";
import { chainAdapter } from "./adapters/chain.js";
import { zipAdapter } from "./adapters/zip.js";
import { enumerateAdapter } from "./adapters/enumerate.js";
import { inspectAdapter } from "./adapters/inspect.js";
import { throttleAdapter } from "./adapters/throttle.js";
import { bufferAdapter } from "./adapters/buffer.js";
import { fuseAdapter } from "./adapters/fuse.js";

/**
 * Base class for all streams — implements every `Stream` adapter and
 * terminator on top of a single abstract `next()`.
 *
 * Modeled after Rust's `futures::Stream` + `StreamExt`, with a fallible
 * pull protocol: `Ok(Some(v))` — value, `Ok(None())` — end of stream,
 * `Err(e)` — error.
 */
export abstract class StreamBase<T, E = Error> implements Stream<T, E> {
  abstract next(): Promise<Result<Option<T>, E>>;

  /**
   * Optional synchronous fast path (`Poll::Ready` analog) — see
   * {@link Stream.pollNext}. Sources able to answer without awaiting
   * (in-memory arrays, buffered channels) override this.
   */
  pollNext?(): Result<Option<T>, E> | undefined;

  /**
   * Wraps a `next` function into a full `StreamBase`.
   * An optional `pollFn` provides the synchronous fast path.
   */
  static fromNext<T, E>(
    nextFn: NextFn<T, E>,
    pollFn?: () => Result<Option<T>, E> | undefined
  ): StreamBase<T, E> {
    return new FnStream(nextFn, pollFn);
  }

  // --- Adapters (lazy, return new Stream types) ---
  // Each adapter carries both pull paths (async `next` + sync `poll`),
  // so the fast path propagates through arbitrarily long chains.
  map<U>(f: (item: T) => U): Stream<U, E> {
    return FnStream.of(mapAdapter(this, f));
  }

  filter(pred: (item: T) => boolean): Stream<T, E> {
    return FnStream.of(filterAdapter(this, pred));
  }

  take(n: number): Stream<T, E> {
    return FnStream.of(takeAdapter(this, n));
  }

  skip(n: number): Stream<T, E> {
    return FnStream.of(skipAdapter(this, n));
  }

  stepBy(step: number): Stream<T, E> {
    return FnStream.of(stepByAdapter(this, step));
  }

  chain(other: Stream<T, E>): Stream<T, E> {
    return FnStream.of(chainAdapter(this, other));
  }

  zip<U>(other: Stream<U, E>): Stream<[T, U], E> {
    return FnStream.of(zipAdapter(this, other));
  }

  enumerate(): Stream<[number, T], E> {
    return FnStream.of(enumerateAdapter(this));
  }

  inspect(f: (item: T) => void): Stream<T, E> {
    return FnStream.of(inspectAdapter(this, f));
  }

  throttle(ms: number): Stream<T, E> {
    return FnStream.of(throttleAdapter(this, ms));
  }

  buffer(size: number): Stream<T[], E> {
    return FnStream.of(bufferAdapter(this, size));
  }

  fuse(): Stream<T, E> {
    return FnStream.of(fuseAdapter(this));
  }

  // --- Terminators ---
  // Each pull goes through the `pollNext?.() ?? await next()` fast path:
  // synchronously-ready sources skip the per-item microtask tick entirely.
  async forEach(
    f: (item: T) => void | Promise<void>
  ): Promise<Result<void, E>> {
    while (true) {
      const r = this.pollNext?.() ?? (await this.next());
      if (r.isErr()) return r as never;
      const opt = r.unwrap();
      if (opt.isNone()) return Ok(undefined as void);
      await f(opt.unwrap());
    }
  }

  async fold<U>(init: U, f: (acc: U, item: T) => U): Promise<Result<U, E>> {
    let acc = init;
    while (true) {
      const r = this.pollNext?.() ?? (await this.next());
      if (r.isErr()) return r as never;
      const opt = r.unwrap();
      if (opt.isNone()) return Ok(acc) as unknown as Result<U, E>;
      acc = f(acc, opt.unwrap());
    }
  }

  async collect(): Promise<Result<T[], E>> {
    const out: T[] = [];
    while (true) {
      const r = this.pollNext?.() ?? (await this.next());
      if (r.isErr()) return r as never;
      const opt = r.unwrap();
      if (opt.isNone()) return Ok(out);
      out.push(opt.unwrap());
    }
  }

  async find(pred: (item: T) => boolean): Promise<Result<Option<T>, E>> {
    while (true) {
      const r = this.pollNext?.() ?? (await this.next());
      if (r.isErr()) return r as never;
      const opt = r.unwrap();
      if (opt.isNone()) return Ok(None());
      const v = opt.unwrap();
      if (pred(v)) return Ok(Some(v));
    }
  }

  async any(pred: (item: T) => boolean): Promise<Result<boolean, E>> {
    const r = await this.find(pred);
    if (r.isErr()) return r as never;
    return Ok(r.unwrap().isSome());
  }

  async all(pred: (item: T) => boolean): Promise<Result<boolean, E>> {
    while (true) {
      const r = this.pollNext?.() ?? (await this.next());
      if (r.isErr()) return r as never;
      const opt = r.unwrap();
      if (opt.isNone()) return Ok(true);
      if (!pred(opt.unwrap())) return Ok(false);
    }
  }

  async count(): Promise<Result<number, E>> {
    return this.fold(0, (acc) => acc + 1);
  }

  // --- Interop ---

  /**
   * Converts this stream into an `AsyncIter<T>` from `@rslike/iter`.
   * Errors are thrown (the `E` channel is lost) — mirrors
   * `[Symbol.asyncIterator]` behavior.
   */
  asyncIter(): AsyncIter<T> {
    const stream = this;
    return new AsyncIter<T>({
      [Symbol.asyncIterator](): AsyncIterator<T> {
        return {
          async next(): Promise<IteratorResult<T>> {
            const r = await stream.next();
            if (r.isErr()) throw r.unwrapErr();
            const opt = r.unwrap();
            if (opt.isNone()) return { done: true, value: undefined };
            return { done: false, value: opt.unwrap() };
          },
        };
      },
    });
  }

  [Symbol.asyncIterator](): AsyncIterator<T> {
    const stream = this;
    return {
      async next(): Promise<IteratorResult<T>> {
        const r = await stream.next();
        if (r.isErr()) throw r.unwrapErr();
        const opt = r.unwrap();
        if (opt.isNone()) return { done: true, value: undefined };
        return { done: false, value: opt.unwrap() };
      },
    };
  }
}

/**
 * A concrete `StreamBase` backed by a plain `next` function.
 * Created by adapter methods; see {@link StreamBase.fromNext}.
 */
class FnStream<T, E> extends StreamBase<T, E> {
  static of<T, E>(fns: AdapterFns<T, E>): FnStream<T, E> {
    return new FnStream(fns.next, fns.poll);
  }

  constructor(
    private nextFn: NextFn<T, E>,
    private pollFn?: () => Result<Option<T>, E> | undefined
  ) {
    super();
  }

  next(): Promise<Result<Option<T>, E>> {
    return this.nextFn();
  }

  pollNext(): Result<Option<T>, E> | undefined {
    return this.pollFn?.();
  }
}
