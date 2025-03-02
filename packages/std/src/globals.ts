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
import  { None, Option, Some, Err, Ok, Result, Bind, Async } from "./index";

type NoneFn = typeof None;
type OptionCtor = typeof Option;
type SomeFn = typeof Some;

type ErrFn = typeof Err;
type OkFn = typeof Ok;
type ResultCtor = typeof Result;
type BindFn = typeof Bind;
type AsyncFn = typeof Async;

// eslint-disable-next-line @typescript-eslint/no-namespace
declare namespace globalThis {
  let Some: SomeFn;
  let None: NoneFn;
  let Option: OptionCtor;
  let Err: ErrFn;
  let Ok: OkFn;
  let Result: ResultCtor;
  let Bind: BindFn;
  let Async: AsyncFn;
}

declare global {
  // biome-ignore lint/suspicious/noRedeclare: <explanation>
  let Some: SomeFn;
  // biome-ignore lint/suspicious/noRedeclare: <explanation>
  let None: NoneFn;
  // biome-ignore lint/suspicious/noRedeclare: <explanation>
  let Option: OptionCtor;
  // biome-ignore lint/suspicious/noRedeclare: <explanation>
  let Err: ErrFn;
  // biome-ignore lint/suspicious/noRedeclare: <explanation>
  let Ok: OkFn;
  // biome-ignore lint/suspicious/noRedeclare: <explanation>
  let Result: ResultCtor;
  // biome-ignore lint/suspicious/noRedeclare: <explanation>
  let Bind: BindFn;
  // biome-ignore lint/suspicious/noRedeclare: <explanation>
  let Async: AsyncFn;
}

globalThis.Ok = Ok;
globalThis.None = None;
globalThis.Option = Option;

globalThis.Some = Some;
globalThis.Err = Err;
globalThis.Result = Result;

globalThis.Bind = Bind;
globalThis.Async = Async;
