import { type Result, Ok, Err } from "@rslike/std";

import type { AsyncWrite } from "../async-write.js";

export class BufWriter implements AsyncWrite {
  private buf: Uint8Array;
  private pos = 0;

  constructor(private inner: AsyncWrite, size = 8192) {
    this.buf = new Uint8Array(size);
  }

  async write(p: Uint8Array): Promise<Result<number, Error>> {
    if (p.length > this.buf.length - this.pos) {
      const r = await this.flush();
      if (r.isErr()) return r as never;
    }
    if (p.length >= this.buf.length) {
      return this.inner.write(p);
    }
    this.buf.set(p, this.pos);
    this.pos += p.length;
    return Ok(p.length);
  }

  async writeAll(p: Uint8Array): Promise<Result<void, Error>> {
    let written = 0;
    while (written < p.length) {
      const r = await this.write(p.subarray(written));
      if (r.isErr()) return r as never;
      const n = r.unwrap();
      if (n === 0) return Err(new Error("write returned 0"));
      written += n;
    }
    return Ok(undefined);
  }

  async writeStr(s: string): Promise<Result<void, Error>> {
    return this.writeAll(new TextEncoder().encode(s));
  }

  async flush(): Promise<Result<void, Error>> {
    if (this.pos === 0) return Ok(undefined);
    const r = await this.inner.writeAll(this.buf.subarray(0, this.pos));
    if (r.isErr()) return r;
    this.pos = 0;
    return Ok(undefined);
  }

  async close(): Promise<Result<void, Error>> {
    const r = await this.flush();
    if (r.isErr()) return r;
    return this.inner.close();
  }
}
