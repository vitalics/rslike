import { type Result, type Option, Ok, Some, Err } from "@rslike/std";

import { StreamBase } from "../stream-base.js";
import type { Sink } from "../sink.js";
import type { Stream } from "../stream.js";
import type { Duplex } from "../duplex.js";
import { okNone, okVoid } from "../shared.js";

/**
 * Amortized O(1) FIFO queue backed by an array with a head cursor —
 * avoids the O(n) cost of `Array.prototype.shift()` on every dequeue
 * (quadratic behavior for burst queues). Compacts periodically.
 */
class RingQueue<T> {
  #items: (T | undefined)[] = [];
  #head = 0;

  get length(): number {
    return this.#items.length - this.#head;
  }

  push(item: T): void {
    this.#items.push(item);
  }

  shift(): T | undefined {
    if (this.#head >= this.#items.length) return undefined;
    const v = this.#items[this.#head];
    this.#items[this.#head] = undefined; // free the slot for the GC
    this.#head++;
    if (this.#head >= 1024 && this.#head * 2 >= this.#items.length) {
      this.#items = this.#items.slice(this.#head);
      this.#head = 0;
    }
    return v;
  }

  drain(): T[] {
    const out = this.#items.slice(this.#head) as T[];
    this.#items = [];
    this.#head = 0;
    return out;
  }
}

/**
 * Analog of `tokio::sync::mpsc::channel` or `std::sync::mpsc`.
 * Works in any runtime without platform dependencies.
 */
export class Channel<T> extends StreamBase<T, Error> implements Sink<T, Error> {
  private queue = new RingQueue<T>();
  private resolvers = new RingQueue<(r: Result<Option<T>, Error>) => void>();
  private closed = false;
  private error: Error | null = null;

  async next(): Promise<Result<Option<T>, Error>> {
    if (this.queue.length > 0) return Ok(Some(this.queue.shift() as T));
    if (this.closed || this.error) {
      return this.error ? Err(this.error) : okNone();
    }
    return new Promise((resolve) => this.resolvers.push(resolve));
  }

  /**
   * Sync fast path: a buffered item, an error, or end-of-stream can be
   * answered without awaiting. Returns `undefined` while the channel is
   * open and empty — the caller falls back to `await next()`.
   */
  pollNext(): Result<Option<T>, Error> | undefined {
    if (this.queue.length > 0) return Ok(Some(this.queue.shift() as T));
    if (this.closed || this.error) {
      return this.error ? Err(this.error) : okNone();
    }
    return undefined;
  }

  async ready(): Promise<Result<void, Error>> {
    if (this.error) return Err(this.error);
    return okVoid();
  }

  async send(item: T): Promise<Result<void, Error>> {
    if (this.closed) return Err(new Error("send on closed channel"));
    if (this.error) return Err(this.error);

    if (this.resolvers.length > 0) {
      this.resolvers.shift()!(Ok(Some(item)));
    } else {
      this.queue.push(item);
    }
    return okVoid();
  }

  async sendAll(source: StreamBase<T, Error>): Promise<Result<void, Error>> {
    while (true) {
      const r = await source.next();
      if (r.isErr()) return r as never;
      const opt = r.unwrap();
      if (opt.isNone()) break;
      const s = await this.send(opt.unwrap());
      if (s.isErr()) return s;
    }
    return okVoid();
  }

  async flush(): Promise<Result<void, Error>> {
    return okVoid();
  }

  async close(): Promise<Result<void, Error>> {
    this.closed = true;
    for (const r of this.resolvers.drain()) r(okNone());
    return okVoid();
  }
}

/**
 * A pure in-memory {@link Duplex} — pairs a `Stream` source with a `Sink`.
 *
 * Created by {@link duplexPair}: each end's `send` feeds the other end's
 * `next`, like a socket pair. Works in any runtime.
 */
export class PureDuplex<I, O = I> implements Duplex<I, O, Error> {
  constructor(
    readonly source: Stream<O, Error>,
    readonly sink: Sink<I, Error>
  ) {}
}

/**
 * Creates two connected in-memory duplex ends: `a.send(x)` is received by
 * `b.next()` and vice versa. Backed by two unbounded {@link Channel}s.
 *
 * @example
 * ```ts
 * const [a, b] = duplexPair<number>();
 * await a.sink.send(1);
 * await b.source.next(); // Ok(Some(1))
 * ```
 */
export function duplexPair<I = unknown, O = I>(): [
  PureDuplex<I, O>,
  PureDuplex<O, I>,
] {
  const ab = new Channel<I>();
  const ba = new Channel<O>();
  const a = new PureDuplex<I, O>(ba, ab);
  const b = new PureDuplex<O, I>(ab, ba);
  return [a, b];
}

/**
 * Creates a function-based {@link Duplex} transform: values sent to the
 * sink are mapped through `f` and emitted from the source — an in-process
 * analog of Web `TransformStream`.
 *
 * Closing the input side closes the output side. If `f` throws,
 * the output side is closed (readers observe `Ok(None())`).
 *
 * @example
 * ```ts
 * const d = transform((n: number) => n * 2);
 * await d.sink.send(21);
 * await d.source.next(); // Ok(Some(42))
 * ```
 */
export function transform<I, O>(
  f: (item: I) => O | Promise<O>
): PureDuplex<I, O> {
  const input = new Channel<I>();
  const output = new Channel<O>();
  (async () => {
    for (;;) {
      const r = await input.next();
      if (r.isErr()) break;
      const opt = r.unwrap();
      if (opt.isNone()) break;
      try {
        const mapped = await f(opt.unwrap());
        const sent = await output.send(mapped);
        if (sent.isErr()) break;
      } catch {
        break;
      }
    }
    await output.close();
  })();
  return new PureDuplex<I, O>(output, input);
}
