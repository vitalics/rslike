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

import { Ordering, maxBy, minBy } from '../src/cmp';

import { Errors } from '@rslike/std';

test('minBy should throws an error for not a function', () => {
  // @ts-expect-error
  expect(() => minBy(1, '2', 123)).toThrow(Errors.UndefinedBehavior);
});

test('minBy should return seconds argument when returns 1 or greater', () => {
  // @ts-expect-error
  const res = minBy(1, '2', () => 2);

  expect(res).toBe('2');
});

test('minBy should return should throw an error when function returns not a number', () => {
  // @ts-expect-error
  expect(() => minBy(1, '2', () => "str")).toThrow(Errors.UndefinedBehavior);
});

test('minBy should return seconds argument when returns 1 or greater', () => {
  // @ts-expect-error
  const res = minBy(1, '2', () => -1);

  expect(res).toBe(1);
});

test('maxBy should throws an error for not a function', () => {
  // @ts-expect-error
  expect(() => maxBy(1, '2', 123)).toThrow(Errors.UndefinedBehavior);
});


test('maxBy should throws an error for a function which is returns string', () => {
  // @ts-expect-error
  expect(() => maxBy(1, '2', () => 'some string')).toThrow(Errors.UndefinedBehavior);
});

test('partialEq should returns boolean result', () => {
  const a = Ordering.Equal;
  const res = a.partialEquals(132);

  expect(res).toBe(false);
});

test('ne should returns boolean result', () => {
  const a = Ordering.Equal;
  const res = a.notEquals(132);

  expect(res).toBeTruthy();
});

test('eq should thows an error for non Ordering class', () => {
  const a = Ordering.Equal;

  // @ts-expect-error
  expect(() => a.eq(123)).toThrow(Errors.UndefinedBehavior);
});


test('eq should return euqlity for Equal, Equal pair', () => {
  const a = Ordering.Equal;
  const b = Ordering.Equal;

  const eq = a.equals(b);
  expect(eq).toBe(true);
});
