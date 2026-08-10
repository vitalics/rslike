import { bench, describe } from "vitest";
import { Some, None, Option } from "../src/option.ts";
import { Ok, Err, Result } from "../src/result.ts";

describe("Option construction", () => {
  bench("Some(number)", () => { void Some(42); });
  bench("Some(string)", () => { void Some("hello"); });
  bench("None()", () => { void None(); });
  bench("new Option(executor) — full path", () => {
    void new Option((some) => some(42));
  });
});

describe("Result construction", () => {
  bench("Ok(number)", () => { void Ok(42); });
  bench("Err(string)", () => { void Err("error"); });
  bench("new Result(executor) — full path", () => {
    void new Result((ok) => ok(42));
  });
});

describe("Option methods", () => {
  const s = Some(42);
  const n = None<number>();
  bench("Some.isSome()", () => { void s.isSome(); });
  bench("Some.isNone()", () => { void s.isNone(); });
  bench("None.isSome()", () => { void n.isSome(); });
  bench("Some.unwrap()", () => { void s.unwrap(); });
  bench("Some.unwrapOr(0)", () => { void s.unwrapOr(0); });
  bench("None.unwrapOr(0)", () => { void n.unwrapOr(0); });
  bench("Some.map(x => x * 2)", () => { void s.map(x => x * 2); });
});

describe("Result methods", () => {
  const ok = Ok(42);
  const err = Err<number>("oops");
  bench("Ok.isOk()", () => { void ok.isOk(); });
  bench("Ok.isErr()", () => { void ok.isErr(); });
  bench("Ok.unwrap()", () => { void ok.unwrap(); });
  bench("Ok.map(x => x * 2)", () => { void ok.map(x => x * 2); });
  bench("Err.isErr()", () => { void err.isErr(); });
  bench("Err.unwrapOr(0)", () => { void err.unwrapOr(0); });
});
