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

// biome-ignore lint/style/useImportType: this is not types. set in globalThis
import {
  AsyncIter,
  DoubleEndedIter,
  Iter,
  ParIter,
  Peekable,
  WorkerParIter,
  asyncIter,
  doubleEndedIter,
  iter,
  parIter,
  workerParIter,
} from "./index";

type IterCtor = typeof Iter;
type PeekableCtor = typeof Peekable;
type DoubleEndedIterCtor = typeof DoubleEndedIter;
type ParIterCtor = typeof ParIter;
type WorkerParIterCtor = typeof WorkerParIter;
type AsyncIterCtor = typeof AsyncIter;

type IterFn = typeof iter;
type DoubleEndedIterFn = typeof doubleEndedIter;
type ParIterFn = typeof parIter;
type WorkerParIterFn = typeof workerParIter;
type AsyncIterFn = typeof asyncIter;

// eslint-disable-next-line @typescript-eslint/no-namespace
declare namespace globalThis {
  let Iter: IterCtor;
  let Peekable: PeekableCtor;
  let DoubleEndedIter: DoubleEndedIterCtor;
  let ParIter: ParIterCtor;
  let WorkerParIter: WorkerParIterCtor;
  let AsyncIter: AsyncIterCtor;

  let iter: IterFn;
  let doubleEndedIter: DoubleEndedIterFn;
  let parIter: ParIterFn;
  let workerParIter: WorkerParIterFn;
  let asyncIter: AsyncIterFn;
}

declare global {
  // biome-ignore lint/suspicious/noRedeclare: set in globalThis
  let Iter: IterCtor;
  // biome-ignore lint/suspicious/noRedeclare: set in globalThis
  let Peekable: PeekableCtor;
  // biome-ignore lint/suspicious/noRedeclare: set in globalThis
  let DoubleEndedIter: DoubleEndedIterCtor;
  // biome-ignore lint/suspicious/noRedeclare: set in globalThis
  let ParIter: ParIterCtor;
  // biome-ignore lint/suspicious/noRedeclare: set in globalThis
  let WorkerParIter: WorkerParIterCtor;
  // biome-ignore lint/suspicious/noRedeclare: set in globalThis
  let AsyncIter: AsyncIterCtor;

  // biome-ignore lint/suspicious/noRedeclare: set in globalThis
  let iter: IterFn;
  // biome-ignore lint/suspicious/noRedeclare: set in globalThis
  let doubleEndedIter: DoubleEndedIterFn;
  // biome-ignore lint/suspicious/noRedeclare: set in globalThis
  let parIter: ParIterFn;
  // biome-ignore lint/suspicious/noRedeclare: set in globalThis
  let workerParIter: WorkerParIterFn;
  // biome-ignore lint/suspicious/noRedeclare: set in globalThis
  let asyncIter: AsyncIterFn;
}

globalThis.Iter = Iter;
globalThis.Peekable = Peekable;
globalThis.DoubleEndedIter = DoubleEndedIter;
globalThis.ParIter = ParIter;
globalThis.WorkerParIter = WorkerParIter;
globalThis.AsyncIter = AsyncIter;

globalThis.iter = iter;
globalThis.doubleEndedIter = doubleEndedIter;
globalThis.parIter = parIter;
globalThis.workerParIter = workerParIter;
globalThis.asyncIter = asyncIter;
