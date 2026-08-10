import { test, expect } from "vitest";
import {
  ReadableStream,
  TransformStream,
  WritableStream,
} from "node:stream/web";
import { PassThrough, Transform } from "node:stream";
import {
  Channel,
  PureDuplex,
  duplexPair,
  transform,
  fromArray,
} from "../src/index";
import {
  fromWebReadable,
  fromWebWritable,
  fromWebTransform,
} from "../src/runtime/web";
import {
  fromNodeReadable,
  fromNodeWritable,
  fromNodeDuplex,
} from "../src/runtime/node";

// ── duplexPair ─────────────────────────────────────────────────────

test("duplexPair: a.sink feeds b.source and vice versa", async () => {
  const [a, b] = duplexPair<number>();
  await a.sink.send(1);
  await b.sink.send(2);
  expect((await b.source.next()).unwrap().unwrap()).toBe(1);
  expect((await a.source.next()).unwrap().unwrap()).toBe(2);
});

test("duplexPair: b.source waits for a.sink", async () => {
  const [a, b] = duplexPair<string>();
  const pending = b.source.next();
  await a.sink.send("hello");
  expect((await pending).unwrap().unwrap()).toBe("hello");
});

test("duplexPair: closing a.sink ends b.source", async () => {
  const [a, b] = duplexPair<number>();
  await a.sink.send(1);
  await a.sink.close();
  expect((await b.source.next()).unwrap().unwrap()).toBe(1);
  expect((await b.source.next()).unwrap().isNone()).toBe(true);
});

test("duplexPair: works with pipe from a stream", async () => {
  const [a, b] = duplexPair<number>();
  const { pipe } = await import("../src/index.js");
  const done = pipe(fromArray([1, 2, 3]), a.sink);
  expect((await b.source.collect()).unwrap()).toEqual([1, 2, 3]);
  await done;
});

// ── transform (fn-based duplex) ────────────────────────────────────

test("transform maps sink values through fn", async () => {
  const d = transform((n: number) => n * 2);
  await d.sink.send(21);
  expect((await d.source.next()).unwrap().unwrap()).toBe(42);
});

test("transform supports async fn", async () => {
  const d = transform(async (s: string) => s.toUpperCase());
  await d.sink.send("hi");
  expect((await d.source.next()).unwrap().unwrap()).toBe("HI");
});

test("transform closes output when input closes", async () => {
  const d = transform((n: number) => n * 2);
  await d.sink.send(1);
  await d.sink.close();
  expect((await d.source.collect()).unwrap()).toEqual([2]);
});

test("transform closes output when fn throws", async () => {
  const d = transform((n: number): number => {
    if (n === 2) throw new Error("bad value");
    return n * 10;
  });
  await d.sink.send(1);
  await d.sink.send(2);
  expect((await d.source.collect()).unwrap()).toEqual([10]);
});

// ── PureDuplex structure ───────────────────────────────────────────

test("PureDuplex exposes source and sink", () => {
  const ch1 = new Channel<number>();
  const ch2 = new Channel<string>();
  const d = new PureDuplex<number, string>(ch2, ch1);
  expect(d.source).toBe(ch2);
  expect(d.sink).toBe(ch1);
});

// ── Web runtime ────────────────────────────────────────────────────

test("fromWebReadable reads all chunks", async () => {
  const rs = new ReadableStream<number>({
    start(controller) {
      controller.enqueue(1);
      controller.enqueue(2);
      controller.close();
    },
  });
  expect((await fromWebReadable(rs).collect()).unwrap()).toEqual([1, 2]);
});

test("fromWebWritable writes all chunks", async () => {
  const written: number[] = [];
  const ws = new WritableStream<number>({
    write(chunk) {
      written.push(chunk);
    },
  });
  const sink = fromWebWritable(ws);
  expect((await sink.send(1)).isOk()).toBe(true);
  expect((await sink.send(2)).isOk()).toBe(true);
  expect((await sink.close()).isOk()).toBe(true);
  expect(written).toEqual([1, 2]);
});

test("WebSinkAdapter.sendAll drains a stream", async () => {
  const written: number[] = [];
  const ws = new WritableStream<number>({
    write(chunk) {
      written.push(chunk);
    },
  });
  const sink = fromWebWritable(ws);
  const r = await sink.sendAll(fromArray([1, 2, 3]));
  expect(r.isOk()).toBe(true);
  expect(written).toEqual([1, 2, 3]);
});

test("fromWebTransform wraps TransformStream into a Duplex", async () => {
  const ts = new TransformStream<number, string>({
    transform(chunk, controller) {
      controller.enqueue(String(chunk * 2));
    },
  });
  const d = fromWebTransform(ts);
  // TransformStream readable side has HWM=0 — the write resolves only
  // once a reader pulls, so start reading first
  const pending = d.source.next();
  await d.sink.send(21);
  expect((await pending).unwrap().unwrap()).toBe("42");
});

// ── Node runtime ───────────────────────────────────────────────────

test("fromNodeReadable reads a Node Readable", async () => {
  const { Readable } = await import("node:stream");
  const r = await fromNodeReadable(Readable.from([1, 2, 3])).collect();
  expect(r.unwrap()).toEqual([1, 2, 3]);
});

test("fromNodeWritable writes into a Node Writable", async () => {
  const { Writable } = await import("node:stream");
  const written: unknown[] = [];
  const w = new Writable({
    objectMode: true,
    write(chunk, _enc, cb) {
      written.push(chunk);
      cb();
    },
  });
  const sink = fromNodeWritable(w);
  expect((await sink.send("a")).isOk()).toBe(true);
  expect((await sink.send("b")).isOk()).toBe(true);
  await sink.close();
  expect(written).toEqual(["a", "b"]);
});

test("NodeSinkAdapter.sendAll drains a stream", async () => {
  const { Writable } = await import("node:stream");
  const written: unknown[] = [];
  const w = new Writable({
    objectMode: true,
    write(chunk, _enc, cb) {
      written.push(chunk);
      cb();
    },
  });
  const r = await fromNodeWritable<number>(w).sendAll(fromArray([1, 2]));
  expect(r.isOk()).toBe(true);
  expect(written).toEqual([1, 2]);
});

test("fromNodeDuplex wraps a Node Transform", async () => {
  const upper = new Transform({
    objectMode: true,
    transform(chunk, _enc, cb) {
      cb(null, String(chunk).toUpperCase());
    },
  });
  const d = fromNodeDuplex<string>(upper);
  await d.sink.send("hello");
  expect((await d.source.next()).unwrap().unwrap()).toBe("HELLO");
});

test("fromNodeDuplex with PassThrough echoes values", async () => {
  const pt = new PassThrough({ objectMode: true });
  const d = fromNodeDuplex<number>(pt);
  await d.sink.send(7);
  expect((await d.source.next()).unwrap().unwrap()).toBe(7);
});
