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

/**
 * Common error. Usually throws when something is not defined.
 * @see {@link https://github.com/vitalics/rslike/wiki/UndefinedBehaviorError Wiki}
 */
export class UndefinedBehaviorError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
  }
}

/** Node.js inspection symbol */
export const customInspectSymbol = Symbol.for("nodejs.util.inspect.custom");

type TypeofResult =
  | "string"
  | "number"
  | "bigint"
  | "boolean"
  | "symbol"
  | "undefined"
  | "object"
  | "function";

export const assertArgument = <Methods extends string>(
  method: Methods,
  value: unknown,
  expectedType: TypeofResult,
) => {
  if (typeof value !== expectedType) {
    throw new UndefinedBehaviorError(
      `Method "${String(method)}" should accepts ${expectedType}`,
      { cause: { value, type: typeof value } },
    );
  }
};
