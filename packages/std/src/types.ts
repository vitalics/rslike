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

export type Fn<
  R = unknown,
  A extends readonly unknown[] = [],
  This = void
> = Function & ((this: This, ...args: A) => R);

export type AsyncFn<R = unknown, A extends unknown[] = [], This = void> = Fn<
  Promise<R>,
  A,
  This
>;

export type Box<T> = {
  expect(reason: string): T;
  unwrap(): T;
};

export type ComparatorFn<Self, Other = Self> = (
  self: Self,
  other: Other
) => boolean;

export type IsNever<T> = [T] extends [never] ? true : false;

export type IsPromise<T> = T extends Promise<any> ? true : false;

type ErrorLike = {
  readonly name: string;
  readonly message: string;
  readonly stack?: string;
  readonly cause?: unknown;
};

export type TError<ErrLike extends ErrorLike> = Error & ErrLike;

export type TUndefinedBehaviorError<ErrLike extends Omit<ErrorLike, "name">> =
  TError<
    {
      readonly name: "UndefinedBehaviorError";
    } & ErrLike
  >;

export type ToStack<
  Messages extends readonly string[] = readonly [],
  R extends string = ""
> = Messages extends readonly [
  infer Head extends string,
  ...infer Tail extends string[]
]
  ? `${Head}
  ${ToStack<Tail, R>}`
  : R;
