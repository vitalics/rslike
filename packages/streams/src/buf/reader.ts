import { Err, Ok, type Result } from "@rslike/std";

import type { AsyncBufRead, AsyncRead } from "../async-read.js";

export class BufReader implements AsyncBufRead {
  private buf: Uint8Array;
  private pos = 0;
  private cap = 0;
  private eof = false;

  constructor(
    private inner: AsyncRead,
    size = 8192,
  ) {
    this.buf = new Uint8Array(size);
  }

  async read(p: Uint8Array): Promise<Result<number, Error>> {
    if (this.pos >= this.cap && !this.eof) {
      const r = await this.fill();
      if (r.isErr()) return r as never;
    }
    const n = Math.min(p.length, this.cap - this.pos);
    p.set(this.buf.subarray(this.pos, this.pos + n), 0);
    this.pos += n;
    return Ok(n);
  }

  async fill(): Promise<Result<void, Error>> {
    const r = await this.inner.read(this.buf);
    if (r.isErr()) return r as never;
    this.pos = 0;
    this.cap = r.unwrap();
    if (this.cap === 0) this.eof = true;
    return Ok(undefined);
  }

  async fillBuf(): Promise<Result<Uint8Array, Error>> {
    if (this.pos >= this.cap && !this.eof) {
      const r = await this.fill();
      if (r.isErr()) return r as never;
    }
    return Ok(this.buf.subarray(this.pos, this.cap));
  }

  consume(amt: number): Result<void, Error> {
    this.pos = Math.min(this.pos + amt, this.cap);
    return Ok(undefined);
  }

  async readUntil(sep: number): Promise<Result<Uint8Array, Error>> {
    const chunks: Uint8Array[] = [];
    let total = 0;

    while (true) {
      const buf = await this.fillBuf();
      if (buf.isErr()) return buf;
      const data = buf.unwrap();
      if (data.length === 0) break;

      const idx = data.indexOf(sep);
      if (idx >= 0) {
        const slice = data.slice(0, idx + 1);
        chunks.push(slice);
        total += slice.length;
        this.consume(idx + 1);
        break;
      }
      chunks.push(data.slice());
      total += data.length;
      this.consume(data.length);
    }

    const out = new Uint8Array(total);
    let off = 0;
    for (const c of chunks) {
      out.set(c, off);
      off += c.length;
    }
    return Ok(out);
  }

  async readLine(): Promise<Result<string, Error>> {
    const r = await this.readUntil(0x0a);
    if (r.isErr()) return r as never;
    let buf = r.unwrap();
    if (buf.length > 0 && buf[buf.length - 1] === 0x0a) {
      buf = buf.subarray(0, buf.length - 1);
      if (buf.length > 0 && buf[buf.length - 1] === 0x0d) {
        buf = buf.subarray(0, buf.length - 1);
      }
    }
    return Ok(new TextDecoder().decode(buf));
  }

  async readToEnd(): Promise<Result<Uint8Array, Error>> {
    const chunks: Uint8Array[] = [];
    let total = 0;
    const tmp = new Uint8Array(4096);
    while (true) {
      const r = await this.read(tmp);
      if (r.isErr()) return r as never;
      if (r.unwrap() === 0) break;
      chunks.push(tmp.slice(0, r.unwrap()));
      total += r.unwrap();
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
