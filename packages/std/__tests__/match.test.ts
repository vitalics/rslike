/**
MIT License

Copyright (c) 2023 Vitali Haradkou

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

/* eslint-disable @typescript-eslint/ban-ts-comment */

import { match } from "../src/match";
import { UndefinedBehaviorError } from "../src/utils";
import { Err, Ok, Result } from "../src/result";
import { Some, None, Option } from "../src/option";
import { Bind } from "../src/bind";

test("match should throw an error for non option and non Result instance", () => {
  expect(() =>
    match(
      // @ts-expect-error
      4,
      () => 2,
      () => 3,
    ),
  ).toThrow(UndefinedBehaviorError);
});

test("match should throw an error for non function Ok callback", () => {
  // @ts-expect-error
  expect(() => match(Some(5), 2, 3)).toThrow(UndefinedBehaviorError);
});

test("match should throw an error for non function Err callback", () => {
  // @ts-expect-error
  expect(() => match(Some(5), () => 2, 3)).toThrow(UndefinedBehaviorError);
});

test("match should return ok funtion result for Ok", () => {
  const fn = jest.fn((a) => a);
  const res = match(Ok(5), fn, () => 1);

  expect(res).toBe(5);
  expect(fn).toBeCalledTimes(1);
  expect(fn).toBeCalledWith(5);
});

test("match should return err funtion result for Err", () => {
  const fn = jest.fn((a) => a);
  const res = match(Err(5), () => 2, fn);

  expect(res).toBe(5);
  expect(fn).toBeCalledTimes(1);
  expect(fn).toBeCalledWith(5);
});

test("match should return value funtion result for Some", () => {
  const fn = jest.fn((a) => a);
  const res = match(Some(5), fn, () => 1);

  expect(res).toBe(5);
  expect(fn).toBeCalledTimes(1);
  expect(fn).toBeCalledWith(5);
});

test("match should return value funtion result for None", () => {
  const fn = jest.fn(() => 1 as const);
  const res = match(None(), fn, fn);

  expect(res).toBe(1);
  expect(fn).toBeCalledTimes(1);
});

test("match should work with bind without double unwrapping", async () => {
  const asyncFn = jest.fn(async (v: number) => v * v);

  const safeFn = Bind(asyncFn);

  const res = await safeFn(3);

  const matchRes = match(
    res,
    (v) => {
      expect(v).toBe(9);
      return v;
    },
    () => {
      return -1;
    },
  );

  expect(asyncFn).toBeCalledWith(3);
  expect(asyncFn).toBeCalledTimes(1);
  expect(matchRes).toBe(9);
});

test("match should work for true result", () => {
  const res = match(
    true,
    (v) => v,
    (e) => e,
  );
  expect(res).toBe(true);
});

test("match should work for false result", () => {
  const res = match(
    false,
    (v) => v,
    (e) => e,
  );
  expect(res).toBe(false);
});

test("match should call error cb for Ok(None)", () => {
  const fn = jest.fn(() => null);
  const fnAsync = Bind(fn);
  const errCb = jest.fn();
  const okCb = jest.fn();
  match(fnAsync(), okCb, errCb);
  expect(errCb).toBeCalled();
  expect(okCb).not.toBeCalled();
});
