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

type InspectionString<
  Delimiter extends string = typeof DEFAULT_DELIMITER,
  Prefix extends string = typeof DEFAULT_PREFIX
> = `${Prefix}${string}${Delimiter}${string}`;
type InspectionResult<
  Delimiter extends string = typeof DEFAULT_DELIMITER,
  Prefix extends string = typeof DEFAULT_PREFIX,
> = {
  /**
   * Print message that using for `console.log`.
   * 
   * You can disable `console.log` printing by using {@link Options.skipConsoleLog} in options.
   * 
   * @type string
   */
  message: InspectionString<Delimiter, Prefix>;
  /**
   * incoming variable name
   */
  name: string;
  /**
   * Result of the `typeof` operator for incoming value
   */
  type: 'number' | 'string' | 'boolean' | 'bigint' | 'symbol' | 'function' | 'object' | 'null' | 'undefined'
  /**
   * variable value.
   */
  value: unknown;
  delimiter: Delimiter,
  prefix: Prefix;
  // prototype?: unknown;
  // constructor?: unknown;
};

// type Result<Delimiter extends string = typeof DEFAULT_DELIMITER> = `${string}${Delimiter}${string}`;

const USAGE = `
const a = 123;
dbg(() => a); // a: 123
`

export const DEFAULT_DELIMITER = ': ';

export const DEFAULT_PREFIX = 'dbg | ';

type Options<
  Delimiter extends string = typeof DEFAULT_DELIMITER,
  Prefix extends string = typeof DEFAULT_PREFIX,
> = {

  /**
   * symbol which appends before expression: `{name}{delimiter}{value}`
   *
   * @type {Prefix}
   */
  prefix?: Prefix;

  /**
   * symbol which joins your key and value strings
   * @example
   * const abc = 123;
   * dbg(() => abc, {delimiter: '='}) // abd=123
   * @default
   * ': '
   * @type {string}
   */
  delimiter?: Delimiter;

  /**
   * Output function
   *
   * @default
   * console.log
   */
  outputFunction?: (...args: unknown[]) => void
}


/**
 * Uses `console.log` for printing information about your variable.
 * 
 * **NOTE:** always need to use anonumous arrow function. See examples for more.
 * 
 * ## Performance Awarenes
 * Since `dbg` prints all information about variable as `String`.
 * Your whole function with it's body will be printed in console.
 * 
 * ## override delimiter
 * You can pass second argument as options. It supportrs custom `delimiter` and `skipConsoleLog`
 * 
 * Default delimiter is `:(space)`
 *
 * @example
 * // basic usage
 * const a = 123;
 * dbg(() => a) // a: 123
 * // cusom delimiter
 * const abc = 123;
 * dbg(() => abc, {delimiter: '='}) // abd=123
 * // performance lag
 * function myLongFunction(){
 * // long body
 * }
 * dbg(() => myLongFunction) // prints a function body.
 * @export
 * @param {() => unknown} f
 * @return {*}  {InspectionResult}
 */
export function dbg<
  Delimiter extends string = typeof DEFAULT_DELIMITER,
  Prefix extends string = typeof DEFAULT_PREFIX,
>(
  f: () => unknown,
  options?: Options<Delimiter, Prefix>,
): InspectionResult<Delimiter, Prefix> {
  if (!isLambda(f)) {
    throw new TypeError(`Cannot print debug info for not for an arrow function.`, { cause: { value: f, type: typeof f, usage: USAGE } })
  }
  const nameOf = f.toString().replace(/(\(\) => )/g, '');
  const originalValue = f();
  const type = typeof originalValue;

  const delimiter = options?.delimiter ?? DEFAULT_DELIMITER as Delimiter;
  const prefix = options?.prefix ?? DEFAULT_PREFIX as Prefix;
  const outputFunction = options?.outputFunction ?? console.log;

  let value = originalValue;

  let useStringify = true;

  if (typeof originalValue === 'number' && !Number.isSafeInteger(originalValue)) {
    value = `${originalValue} (unsafe)`;
    useStringify = false;
  }
  if (typeof originalValue === 'number' && Number.POSITIVE_INFINITY === originalValue) {
    value = `Infinity`;
    useStringify = false;
  }
  if (typeof originalValue === 'number' && Number.NEGATIVE_INFINITY === originalValue) {
    value = `-Infinity`;
    useStringify = false;
  }

  if (typeof originalValue === 'number' && Number.isNaN(originalValue)) {
    value = `NaN`;
    useStringify = false;
  }

  if (typeof originalValue === 'symbol') {
    value = String(originalValue);
    useStringify = false;
  }
  if (typeof originalValue === 'bigint') {
    value = `${originalValue}n`;
    useStringify = false;
  }
  if (typeof originalValue === 'function') {
    value = originalValue.toString();
    useStringify = false;
  }

  const valueStr = useStringify ? JSON.stringify(value) : value as string;

  const message: InspectionString<Delimiter, Prefix> = `${prefix}${nameOf}${delimiter}${valueStr}`;
  outputFunction(message);

  const result: InspectionResult<Delimiter, Prefix> = {
    message,
    delimiter,
    prefix,
    type,
    name: nameOf,
    value: originalValue,
  }

  return result;
}

// https://stackoverflow.com/a/65570273
function isLambda(func: unknown): func is () => unknown {
  return typeof func === 'function' && func.prototype === undefined
}
