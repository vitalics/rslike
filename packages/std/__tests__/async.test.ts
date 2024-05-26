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

import { Async } from "../src/async";

/* eslint-disable @typescript-eslint/ban-ts-comment */

test("Async should resolves undefined as Ok(None())", async () => {
  const a = await Async(undefined);

  expect(a.isOk()).toBeTruthy();
  expect(a.unwrap().isNone()).toBeTruthy();
});

test("Async should resolves Promise.resolve(undefined) as Ok(None())", async () => {
  const a = await Async(Promise.resolve(undefined));

  expect(a.isOk()).toBeTruthy();
  expect(a.unwrap().isNone()).toBeTruthy();
});

test('Async should resolves Promise.reject(undefined) as Err("undefined")', async () => {
  const a = await Async(Promise.reject(undefined));

  expect(a.isErr()).toBeTruthy();
  expect(a.unwrapErr()).toBe(undefined);
});

test("Async should resolves Promise.reject(null) as Err(null)", async () => {
  const a = await Async(Promise.reject(null));

  expect(a.isErr()).toBeTruthy();
  expect(a.unwrapErr()).toBe(null);
});
