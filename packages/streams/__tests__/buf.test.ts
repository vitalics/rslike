import { test, expect } from "vitest";

import { Err, Ok, type Result } from "@rslike/std";

import type { AsyncRead } from "../src/async-read.js";
import type { AsyncWrite } from "../src/async-write.js";
import { BufReader } from "../src/buf/reader.js";
import { BufWriter } from "../src/buf/writer.js";

/** In-memory AsyncRead over a byte array, reading at most `chunkSize` bytes per call. */
class MemoryAsyncRead implements AsyncRead {
  private pos = 0;
  constructor(private data: Uint8Array, private chunkSize = Infinity) {}

  async read(buf: Uint8Array): Promise<Result<number, Error>> {
    const n = Math.min(buf.length, this.chunkSize, this.data.length - this.pos);
    buf.set(this.data.subarray(this.pos, this.pos + n), 0);
    this.pos += n;
    return Ok(n);
  }
  async readToEnd(): Promise<Result<Uint8Array, Error>> {
    const out = this.data.subarray(this.pos);
    this.pos = this.data.length;
    return Ok(out);
  }
  async readExact(buf: Uint8Array): Promise<Result<void, Error>> {
    return this.read(buf).then((r) => r as never);
  }
  async readToString(): Promise<Result<string, Error>> {
    const r = await this.readToEnd();
    if (r.isErr()) return r as never;
    return Ok(new TextDecoder().decode(r.unwrap()));
  }
}

class FailingAsyncRead implements AsyncRead {
  async read(): Promise<Result<number, Error>> {
    return Err(new Error("read failed"));
  }
  async readToEnd(): Promise<Result<Uint8Array, Error>> {
    return Err(new Error("read failed"));
  }
  async readExact(): Promise<Result<void, Error>> {
    return Err(new Error("read failed"));
  }
  async readToString(): Promise<Result<string, Error>> {
    return Err(new Error("read failed"));
  }
}

/** In-memory AsyncWrite collecting written bytes. */
class MemoryAsyncWrite implements AsyncWrite {
  chunks: Uint8Array[] = [];
  flushed = false;
  closed = false;

  async write(buf: Uint8Array): Promise<Result<number, Error>> {
    this.chunks.push(buf.slice());
    return Ok(buf.length);
  }
  async writeAll(buf: Uint8Array): Promise<Result<void, Error>> {
    this.chunks.push(buf.slice());
    return Ok(undefined);
  }
  async writeStr(s: string): Promise<Result<void, Error>> {
    return this.writeAll(new TextEncoder().encode(s));
  }
  async flush(): Promise<Result<void, Error>> {
    this.flushed = true;
    return Ok(undefined);
  }
  async close(): Promise<Result<void, Error>> {
    this.closed = true;
    return Ok(undefined);
  }
}

const enc = (s: string) => new TextEncoder().encode(s);
const dec = (b: Uint8Array) => new TextDecoder().decode(b);

// ── BufReader ──────────────────────────────────────────────────────

test("BufReader.read reads through the internal buffer", async () => {
  const r = new BufReader(new MemoryAsyncRead(enc("hello world")));
  const buf = new Uint8Array(5);
  expect((await r.read(buf)).unwrap()).toBe(5);
  expect(dec(buf)).toBe("hello");
  expect((await r.read(buf)).unwrap()).toBe(5);
  expect(dec(buf)).toBe(" worl");
});

test("BufReader.read returns 0 at EOF", async () => {
  const r = new BufReader(new MemoryAsyncRead(enc("ab")));
  const buf = new Uint8Array(8);
  expect((await r.read(buf)).unwrap()).toBe(2);
  expect((await r.read(buf)).unwrap()).toBe(0);
});

test("BufReader.fillBuf + consume", async () => {
  const r = new BufReader(new MemoryAsyncRead(enc("abcdef")));
  expect(dec((await r.fillBuf()).unwrap())).toBe("abcdef");
  r.consume(2);
  expect(dec((await r.fillBuf()).unwrap())).toBe("cdef");
  r.consume(10); // clamped to cap
  expect((await r.fillBuf()).unwrap().length).toBe(0);
});

test("BufReader.readUntil stops at separator inclusive", async () => {
  const r = new BufReader(new MemoryAsyncRead(enc("one\ntwo\nthree")));
  expect(dec((await r.readUntil(0x0a)).unwrap())).toBe("one\n");
  expect(dec((await r.readUntil(0x0a)).unwrap())).toBe("two\n");
  expect(dec((await r.readUntil(0x0a)).unwrap())).toBe("three");
});

test("BufReader.readUntil without separator reads to EOF", async () => {
  const r = new BufReader(new MemoryAsyncRead(enc("no newlines here")));
  expect(dec((await r.readUntil(0x0a)).unwrap())).toBe("no newlines here");
});

test("BufReader.readLine strips \\n and \\r\\n", async () => {
  const r = new BufReader(new MemoryAsyncRead(enc("unix\nwin\r\nlast")));
  expect((await r.readLine()).unwrap()).toBe("unix");
  expect((await r.readLine()).unwrap()).toBe("win");
  expect((await r.readLine()).unwrap()).toBe("last");
});

test("BufReader.readLine across small source chunks", async () => {
  const r = new BufReader(new MemoryAsyncRead(enc("ab\ncd\n"), 2));
  expect((await r.readLine()).unwrap()).toBe("ab");
  expect((await r.readLine()).unwrap()).toBe("cd");
});

test("BufReader.readToEnd reads everything", async () => {
  const r = new BufReader(new MemoryAsyncRead(enc("all of it"), 3));
  expect(dec((await r.readToEnd()).unwrap())).toBe("all of it");
});

test("BufReader.readExact fills the buffer or fails", async () => {
  const r = new BufReader(new MemoryAsyncRead(enc("exactly"), 2));
  const buf = new Uint8Array(5);
  expect((await r.readExact(buf)).isOk()).toBe(true);
  expect(dec(buf)).toBe("exact");
  expect((await r.readExact(new Uint8Array(10))).isErr()).toBe(true); // EOF
});

test("BufReader.readToString decodes everything", async () => {
  const r = new BufReader(new MemoryAsyncRead(enc("hello 🌍"), 4));
  expect((await r.readToString()).unwrap()).toBe("hello 🌍");
});

test("BufReader propagates inner read errors", async () => {
  const r = new BufReader(new FailingAsyncRead());
  expect((await r.read(new Uint8Array(4))).isErr()).toBe(true);
  expect((await r.readToEnd()).isErr()).toBe(true);
  expect((await r.readToString()).isErr()).toBe(true);
});

// ── BufWriter ──────────────────────────────────────────────────────

test("BufWriter.write buffers small chunks and flushes on overflow", async () => {
  const inner = new MemoryAsyncWrite();
  const w = new BufWriter(inner, 4);
  await w.write(enc("ab"));
  expect(inner.chunks.length).toBe(0); // still buffered
  await w.write(enc("cd")); // exactly fills → next write flushes
  await w.write(enc("e"));
  expect(inner.chunks.length).toBeGreaterThan(0);
});

test("BufWriter.write bypasses buffer for large chunks", async () => {
  const inner = new MemoryAsyncWrite();
  const w = new BufWriter(inner, 4);
  await w.write(enc("123456")); // larger than buffer → direct write
  expect(inner.chunks.length).toBe(1);
  expect(dec(inner.chunks[0])).toBe("123456");
});

test("BufWriter.writeAll writes everything", async () => {
  const inner = new MemoryAsyncWrite();
  const w = new BufWriter(inner, 4);
  expect((await w.writeAll(enc("abcdefg"))).isOk()).toBe(true);
  await w.flush();
  const all = inner.chunks.map(dec).join("");
  expect(all).toBe("abcdefg");
});

test("BufWriter.writeStr encodes UTF-8", async () => {
  const inner = new MemoryAsyncWrite();
  const w = new BufWriter(inner);
  await w.writeStr("hi 🌍");
  await w.flush();
  expect(dec(inner.chunks[0])).toBe("hi 🌍");
});

test("BufWriter.flush writes buffered bytes to inner", async () => {
  const inner = new MemoryAsyncWrite();
  const w = new BufWriter(inner, 8);
  await w.write(enc("abc"));
  expect(inner.chunks.length).toBe(0);
  await w.flush();
  expect(inner.chunks.length).toBe(1);
  expect(dec(inner.chunks[0])).toBe("abc");
});

test("BufWriter.close flushes then closes inner", async () => {
  const inner = new MemoryAsyncWrite();
  const w = new BufWriter(inner, 8);
  await w.write(enc("abc"));
  await w.close();
  expect(dec(inner.chunks[0])).toBe("abc");
  expect(inner.closed).toBe(true);
});
