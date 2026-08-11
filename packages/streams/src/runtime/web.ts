import type {
  ReadableStream,
  ReadableStreamDefaultReader,
  TransformStream,
  WritableStream,
  WritableStreamDefaultWriter,
} from "node:stream/web";

import { Err, None, Ok, type Option, type Result, Some } from "@rslike/std";

import type { Duplex } from "../duplex.js";
import type { Sink } from "../sink.js";
import { StreamBase } from "../stream-base.js";
import type { Stream } from "../stream.js";
import { PureDuplex } from "./pure.js";

class WebStreamAdapter<T> extends StreamBase<T, Error> {
  constructor(private reader: ReadableStreamDefaultReader<T>) {
    super();
  }

  async next(): Promise<Result<Option<T>, Error>> {
    try {
      const { done, value } = await this.reader.read();
      if (done) return Ok(None());
      return Ok(Some(value));
    } catch (e) {
      return Err(e as Error);
    }
  }

  cancel(): Promise<Result<void, Error>> {
    return this.reader.cancel().then(
      () => Ok<void>(undefined),
      (e) => Err(e as Error),
    );
  }

  releaseLock(): void {
    this.reader.releaseLock();
  }
}

class WebSinkAdapter<T> implements Sink<T, Error> {
  constructor(private writer: WritableStreamDefaultWriter<T>) {}

  async sendAll(source: Stream<T, Error>): Promise<Result<void, Error>> {
    for (;;) {
      const r = await source.next();
      if (r.isErr()) return r as never;
      const opt = r.unwrap();
      if (opt.isNone()) break;
      const s = await this.send(opt.unwrap());
      if (s.isErr()) return s;
    }
    return Ok(undefined);
  }

  async ready(): Promise<Result<void, Error>> {
    try {
      await this.writer.ready;
      return Ok(undefined);
    } catch (e) {
      return Err(e as Error);
    }
  }

  async send(item: T): Promise<Result<void, Error>> {
    try {
      await this.writer.write(item);
      return Ok(undefined);
    } catch (e) {
      return Err(e as Error);
    }
  }

  async flush(): Promise<Result<void, Error>> {
    return Ok(undefined);
  }

  async close(): Promise<Result<void, Error>> {
    try {
      await this.writer.close();
      return Ok(undefined);
    } catch (e) {
      return Err(e as Error);
    }
  }
}

export const fromWebReadable = <T>(
  s: ReadableStream<T>,
): StreamBase<T, Error> => new WebStreamAdapter(s.getReader());

export const fromWebWritable = <T>(s: WritableStream<T>): Sink<T, Error> =>
  new WebSinkAdapter(s.getWriter());

/**
 * Wraps a Web `TransformStream` into a {@link Duplex}: the writable side
 * becomes the sink, the readable side becomes the source.
 *
 * @example
 * ```ts
 * const ts = new TransformStream<number, string>({
 *   transform(chunk, controller) {
 *     controller.enqueue(String(chunk * 2));
 *   },
 * });
 * const d = fromWebTransform(ts);
 * await d.sink.send(21);
 * await d.source.next(); // Ok(Some("42"))
 * ```
 */
export const fromWebTransform = <I, O>(
  ts: TransformStream<I, O>,
): Duplex<I, O, Error> =>
  new PureDuplex(fromWebReadable(ts.readable), fromWebWritable(ts.writable));
