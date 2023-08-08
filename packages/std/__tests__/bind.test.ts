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

import { Bind } from '../src/bind';
import { Option } from '../src/option';
import { Result } from '../src/result';

test('Bind should throw undefined behavior when not a function is provided', () => {
  // @ts-expect-error
  expect(() => Bind(123)).toThrow(Error);
});

test('Bind should returns a new function', () => {

  const a = () => 4;

  const b = Bind(a);

  const res = b();

  expect(typeof b).toBe('function');
  expect(res).toBeInstanceOf(Result);
  expect(res.unwrap()).toBeInstanceOf(Option)
});

test('Bind should handle async function', async () => {
  const a = () => Promise.resolve(123);

  const b = Bind(a);

  const res = await b();

  expect(res).toBeInstanceOf(Result);
  expect(res.unwrap().unwrap()).toBe(123);
});

test('Bind should not throw for async function', async () => {
  const a = () => Promise.reject<number>(123);

  const b = Bind(a);

  const res = await b();

  expect(res.isErr()).toBeTruthy();
  expect(res.unwrapErr()).toBe(123);
});

test('Bind should use this argument correctly', () => {
  function a(this: { b: number }): number {
    return this.b + 1;
  }

  const b = Bind(a, { b: 2 });

  const res = b();

  expect(res.unwrap().unwrap()).toBe(3);
})


test('Bind should not throw an error', () => {
  function a(): number {
    throw "qwe"
  }

  const b = Bind(a);

  const res = b();

  expect(res.isErr()).toBe(true);
})

