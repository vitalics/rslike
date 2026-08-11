import { test, expect } from "vitest";

import { ReadableStream, WritableStream } from "node:stream/web";
import { Readable, Writable } from "node:stream";

import { Channel, fromArray, pipe } from "../src/index";
import { fromWebReadable, fromWebWritable } from "../src/runtime/web";
import {
  fromNodeReadable,
  fromNodeWritable,
  nodeAsyncRead,
} from "../src/runtime/node";

// ── Web runtime: error paths & lifecycle ───────────────────────────

test("fromWebReadable surfaces stream errors as Err", async () => {
  const rs = new ReadableStream<number>({
    start(controller) {
      controller.enqueue(1);
      controller.error(new Error("web boom"));
    },
  });
  const s = fromWebReadable(rs);
  // when a web stream errors, queued chunks are discarded — an Err
  // surfaces within the first pulls
  const r1 = await s.next();
  const r2 = await s.next();
  expect(r1.isErr() || r2.isErr()).toBe(true);
});

test("WebStreamAdapter.cancel and releaseLock", async () => {
  let cancelled = false;
  const rs = new ReadableStream<number>({
    cancel() {
      cancelled = true;
    },
  });
  const s = fromWebReadable(rs) as unknown as {
    cancel(): Promise<{ isOk(): boolean }>;
    releaseLock(): void;
  };
  const r = await s.cancel();
  expect(r.isOk()).toBe(true);
  expect(cancelled).toBe(true);
  s.releaseLock();
});

test("WebSinkAdapter surfaces write errors", async () => {
  const ws = new WritableStream<number>({
    write() {
      throw new Error("write boom");
    },
  });
  const sink = fromWebWritable(ws);
  expect((await sink.send(1)).isErr()).toBe(true);
});

test("WebSinkAdapter.ready waits for backpressure", async () => {
  const ws = new WritableStream<number>({
    write() {
      return new Promise((r) => setTimeout(r, 10));
    },
  });
  const sink = fromWebWritable(ws);
  expect((await sink.ready()).isOk()).toBe(true);
});

// ── Node runtime: error paths ──────────────────────────────────────

test("fromNodeReadable surfaces stream errors as Err", async () => {
  const rs = new Readable({
    objectMode: true,
    read() {
      this.destroy(new Error("node boom"));
    },
  });
  const s = fromNodeReadable<number>(rs);
  expect((await s.next()).isErr()).toBe(true);
});

test("NodeSinkAdapter.send surfaces write errors", async () => {
  const ws = new Writable({
    write(_chunk, _enc, cb) {
      cb(new Error("sink boom"));
    },
  });
  const sink = fromNodeWritable(ws);
  expect((await sink.send("x")).isErr()).toBe(true);
});

test("NodeSinkAdapter.close ends the stream", async () => {
  let finished = false;
  const ws = new Writable({
    write(_chunk, _enc, cb) {
      cb();
    },
  });
  ws.on("finish", () => {
    finished = true;
  });
  const sink = fromNodeWritable(ws);
  expect((await sink.close()).isOk()).toBe(true);
  expect(finished).toBe(true);
});

// ── nodeAsyncRead ──────────────────────────────────────────────────

const enc = (s: string) => new TextEncoder().encode(s);

test("nodeAsyncRead.read fills the buffer", async () => {
  const ar = nodeAsyncRead(Readable.from([enc("hello")]));
  const buf = new Uint8Array(5);
  expect((await ar.read(buf)).unwrap()).toBe(5);
  expect(new TextDecoder().decode(buf)).toBe("hello");
});

test("nodeAsyncRead.read returns 0 at EOF", async () => {
  const ar = nodeAsyncRead(Readable.from([enc("ab")]));
  const buf = new Uint8Array(8);
  await ar.read(buf);
  expect((await ar.read(buf)).unwrap()).toBe(0);
});

test("nodeAsyncRead.readToEnd reads everything", async () => {
  const ar = nodeAsyncRead(Readable.from([enc("he"), enc("llo")]));
  const r = await ar.readToEnd();
  expect(new TextDecoder().decode(r.unwrap())).toBe("hello");
});

test("nodeAsyncRead.readExact fills exactly or errors", async () => {
  const ar = nodeAsyncRead(Readable.from([enc("exactly")]));
  const buf = new Uint8Array(5);
  expect((await ar.readExact(buf)).isOk()).toBe(true);
  expect(new TextDecoder().decode(buf)).toBe("exact");
  expect((await ar.readExact(new Uint8Array(10))).isErr()).toBe(true);
});

test("nodeAsyncRead.readToString decodes UTF-8", async () => {
  const ar = nodeAsyncRead(Readable.from([enc("hi 🌍")]));
  expect((await ar.readToString()).unwrap()).toBe("hi 🌍");
});

test("nodeAsyncRead propagates errors", async () => {
  const rs = new Readable({
    read() {
      this.destroy(new Error("read boom"));
    },
  });
  const ar = nodeAsyncRead(rs);
  expect((await ar.read(new Uint8Array(4))).isErr()).toBe(true);
});

// ── pipe ready() error path ────────────────────────────────────────

test("pipe returns Err when sink rejects a send", async () => {
  const ch = new Channel<number>();
  await ch.close();
  // ready() on a closed (non-errored) channel is still Ok, so pipe proceeds
  // to send(1), which fails on the closed channel and aborts the pipe.
  const r = await pipe(fromArray([1]), ch);
  expect(r.isErr()).toBe(true);
  expect((r.unwrapErr() as Error).message).toBe("send on closed channel");
});

// ── Integration pipelines ──────────────────────────────────────────

test("long adapter chain integration", async () => {
  const r = await fromArray([1, 2, 3, 4, 5, 6, 7, 8])
    .map((v) => v * 2)
    .filter((v) => v % 4 === 0)
    .enumerate()
    .map(([i, v]) => `${i}:${v}`)
    .take(2)
    .collect();
  expect(r.unwrap()).toEqual(["0:4", "1:8"]);
});

test("stream → channel via sendAll → adapters integration", async () => {
  const ch = new Channel<number>();
  // sendAll does not close the sink — close explicitly so collect() sees None.
  const produced = ch
    .sendAll(fromArray([1, 2, 3, 4]))
    .then(() => ch.close());
  const r = await ch
    .map((v) => v * 3)
    .filter((v) => v > 3)
    .collect();
  await produced;
  expect(r.unwrap()).toEqual([6, 9, 12]);
});
