import { bench, describe } from "vitest";
import { Readable, PassThrough, Transform, Writable } from "node:stream";
import { pipeline as pipelineCb } from "node:stream";
import { promisify } from "node:util";

import { Channel, fromArray, fromIterable, pipe } from "../src/index";
import { fromNodeReadable } from "../src/runtime/node";

const pipeline = promisify(pipelineCb);

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const N = 10_000;
const ARR = Array.from({ length: N }, (_, i) => i);

// ─── Iteration / collect ──────────────────────────────────────────────────────

describe("streams collect (10 000 items)", () => {
  bench("node Readable.from + for-await", async () => {
    const out: number[] = [];
    for await (const v of Readable.from(ARR, { objectMode: true })) {
      out.push(v);
    }
  });

  bench("rslike Readable.from + for-await", async () => {
    const out: number[] = [];
    const readable = fromNodeReadable(Readable.from(ARR, { objectMode: true }));
    for await (const v of readable) {
      out.push(v);
    }
  });

  bench("rslike fromArray + collect", async () => {
    await fromArray(ARR).collect();
  });

  bench("rslike fromIterable + collect", async () => {
    await fromIterable(ARR).collect();
  });

  bench("rslike fromNodeReadable + collect", async () => {
    await fromNodeReadable(Readable.from(ARR, { objectMode: true })).collect();
  });
});

// ─── Transform pipelines (map ×2) ─────────────────────────────────────────────

describe("streams map ×2 (10 000 items)", () => {
  bench("node Transform ×2 + for-await", async () => {
    const double = new Transform({
      objectMode: true,
      transform(v, _e, cb) {
        cb(null, (v as number) * 2);
      },
    });
    const plusOne = new Transform({
      objectMode: true,
      transform(v, _e, cb) {
        cb(null, (v as number) + 1);
      },
    });
    const out: number[] = [];
    for await (const v of Readable.from(ARR, { objectMode: true })
      .pipe(double)
      .pipe(plusOne)) {
      out.push(v as number);
    }
  });

  bench("rslike map ×2 + collect", async () => {
    await fromArray(ARR)
      .map((v) => v * 2)
      .map((v) => v + 1)
      .collect();
  });
});

// ─── filter + map pipeline ────────────────────────────────────────────────────

describe("streams filter + map (10 000 items)", () => {
  bench("node pipeline API", async () => {
    const evens = new Transform({
      objectMode: true,
      transform(v, _e, cb) {
        if ((v as number) % 2 === 0) cb(null, v);
        else cb();
      },
    });
    const double = new Transform({
      objectMode: true,
      transform(v, _e, cb) {
        cb(null, (v as number) * 2);
      },
    });
    const sink = new Writable({
      objectMode: true,
      write(_v, _e, cb) {
        cb();
      },
    });
    await pipeline(
      Readable.from(ARR, { objectMode: true }),
      evens,
      double,
      sink
    );
  });

  bench("rslike filter + map + forEach", async () => {
    await fromArray(ARR)
      .filter((v) => v % 2 === 0)
      .map((v) => v * 2)
      .forEach(() => {});
  });
});

// ─── Channel vs PassThrough (1 000 items) ─────────────────────────────────────

describe("channel throughput (1 000 items)", () => {
  const M = 1_000;

  bench("rslike Channel send/next", async () => {
    const ch = new Channel<number>();
    const reader = (async () => {
      for (let i = 0; i < M; i++) await ch.next();
    })();
    for (let i = 0; i < M; i++) await ch.send(i);
    await reader;
  });

  bench("node PassThrough write/read", async () => {
    const pt = new PassThrough({ objectMode: true });
    const reader = (async () => {
      let n = 0;
      for await (const _ of pt) n++;
    })();
    for (let i = 0; i < M; i++) pt.write(i);
    pt.end();
    await reader;
  });
});

// ─── pipe (10 000 items) ──────────────────────────────────────────────────────

describe("streams pipe (10 000 items)", () => {
  bench("node Readable.pipe(Writable)", async () => {
    const sink = new Writable({
      objectMode: true,
      write(_v, _e, cb) {
        cb();
      },
    });
    await pipeline(Readable.from(ARR, { objectMode: true }), sink);
  });

  bench("rslike pipe(stream, Channel)", async () => {
    const ch = new Channel<number>();
    const drained = ch.count();
    await pipe(fromArray(ARR), ch);
    await drained;
  });

  bench("rslike pipe(stream, Channel, batchSize=32)", async () => {
    const ch = new Channel<number>();
    const drained = ch.count();
    await pipe(fromArray(ARR), ch, { batchSize: 32 });
    await drained;
  });

  bench("rslike pipe(stream, Channel, batchSize=256)", async () => {
    const ch = new Channel<number>();
    const drained = ch.count();
    await pipe(fromArray(ARR), ch, { batchSize: 256 });
    await drained;
  });
});
