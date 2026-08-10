import { type Result, type Option, Ok, None, Some, Err } from "@rslike/std";

import { StreamBase } from "../stream-base.js";
import type { Sink } from "../sink.js";
import type { AsyncRead } from "../async-read.js";
import type { Stream } from "../stream.js";
import type { Duplex } from "../duplex.js";
import { PureDuplex } from "./pure.js";

class NodeStreamAdapter<T> extends StreamBase<T, Error> {
  private iter: AsyncIterator<T> | null = null;

  constructor(private source: AsyncIterable<T>) {
    super();
  }

  async next(): Promise<Result<Option<T>, Error>> {
    if (!this.iter) this.iter = this.source[Symbol.asyncIterator]();
    try {
      const { done, value } = await this.iter.next();
      if (done) return Ok(None());
      return Ok(Some(value));
    } catch (e) {
      return Err(e as Error);
    }
  }
}

class NodeSinkAdapter<T> implements Sink<T, Error> {
  constructor(private stream: NodeJS.WritableStream) {
    // Write failures are reported as Err from send()/close(), but Node also
    // emits 'error' on the stream; without a listener that crashes the
    // process. Swallow it here — other listeners still receive the event.
    stream.on("error", () => {});
  }

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
    if ((this.stream as any).writableNeedDrain) {
      await new Promise<void>((r) => this.stream.once("drain", r));
    }
    return Ok(undefined);
  }

  async send(item: T): Promise<Result<void, Error>> {
    return new Promise((resolve) => {
      const ok = (this.stream as any).write(item, (err: Error | null) => {
        if (err) resolve(Err(err));
        else resolve(Ok(undefined));
      });
      if (!ok) this.stream.once("drain", () => resolve(Ok(undefined)));
    });
  }

  async flush(): Promise<Result<void, Error>> {
    return Ok(undefined);
  }

  async close(): Promise<Result<void, Error>> {
    return new Promise((r) => this.stream.end(() => r(Ok(undefined))));
  }
}

// Byte-oriented adapter for node:stream.Readable
class NodeAsyncRead implements AsyncRead {
  constructor(private stream: NodeJS.ReadableStream) {}

  async read(buf: Uint8Array): Promise<Result<number, Error>> {
    return new Promise((resolve) => {
      const chunk = (this.stream as any).read(buf.length);
      if (chunk) {
        const n = Math.min(chunk.length, buf.length);
        buf.set(chunk.subarray(0, n), 0);
        resolve(Ok(n));
      } else {
        const onData = () => {
          const c = (this.stream as any).read(buf.length);
          cleanup();
          if (!c) {
            resolve(Ok(0));
            return;
          }
          const n = Math.min(c.length, buf.length);
          buf.set(c.subarray(0, n), 0);
          resolve(Ok(n));
        };
        const onEnd = () => {
          cleanup();
          resolve(Ok(0));
        };
        const onErr = (e: Error) => {
          cleanup();
          resolve(Err(e));
        };
        const cleanup = () => {
          this.stream.off("readable", onData);
          this.stream.off("end", onEnd);
          this.stream.off("error", onErr);
        };
        this.stream.once("readable", onData);
        this.stream.once("end", onEnd);
        this.stream.once("error", onErr);
      }
    });
  }

  async readToEnd(): Promise<Result<Uint8Array, Error>> {
    const chunks: Uint8Array[] = [];
    let total = 0;
    const tmp = new Uint8Array(4096);
    while (true) {
      const r = await this.read(tmp);
      if (r.isErr()) return r as never;
      const n = r.unwrap();
      if (n === 0) break;
      chunks.push(tmp.slice(0, n));
      total += n;
    }
    const out = new Uint8Array(total);
    let off = 0;
    for (const c of chunks) {
      out.set(c, off);
      off += c.length;
    }
    return Ok(out);
  }

  async readExact(buf: Uint8Array): Promise<Result<void, Error>> {
    let read = 0;
    while (read < buf.length) {
      const r = await this.read(buf.subarray(read));
      if (r.isErr()) return r as never;
      const n = r.unwrap();
      if (n === 0) return Err(new Error("Unexpected EOF"));
      read += n;
    }
    return Ok(undefined);
  }

  async readToString(): Promise<Result<string, Error>> {
    const r = await this.readToEnd();
    if (r.isErr()) return r as never;
    return Ok(new TextDecoder().decode(r.unwrap()));
  }
}

export const fromNodeReadable = <T>(
  s: AsyncIterable<T>
): StreamBase<T, Error> => new NodeStreamAdapter(s);

export const fromNodeWritable = <T>(s: NodeJS.WritableStream): Sink<T, Error> =>
  new NodeSinkAdapter(s);

export const nodeAsyncRead = (s: NodeJS.ReadableStream): AsyncRead =>
  new NodeAsyncRead(s);

/**
 * Wraps a Node.js `Duplex`/`Transform` stream (a `ReadWriteStream`) into a
 * {@link Duplex}: the readable side becomes the source, the writable side
 * becomes the sink.
 *
 * @example
 * ```ts
 * import { Transform } from "node:stream";
 *
 * const upper = new Transform({
 *   transform(chunk, _enc, cb) {
 *     cb(null, chunk.toString().toUpperCase());
 *   },
 * });
 * const d = fromNodeDuplex(upper);
 * await d.sink.send("hello");
 * await d.source.next(); // Ok(Some(Buffer("HELLO")))
 * ```
 */
export const fromNodeDuplex = <T>(
  s: NodeJS.ReadWriteStream
): Duplex<T, T, Error> =>
  new PureDuplex(
    new NodeStreamAdapter(s as AsyncIterable<T>),
    new NodeSinkAdapter<T>(s)
  );
