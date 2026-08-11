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

import { WELL_KNOWN_CLONE_API } from "./symbols.ts";
import { UndefinedBehaviorError } from "./utils.ts";

export type { Cloneable } from "./types.ts";
export { WELL_KNOWN_CLONE_API };

/**
 * Clones a value — modeled after Rust's `Clone::clone`.
 *
 * Resolution order:
 * 1. Primitives (`string`, `number`, `boolean`, `bigint`, `symbol`,
 *    `undefined`, `null`) and functions are returned as-is.
 * 2. If the value implements the {@link Cloneable} trait (has a `clone()`
 *    method), that method is called. `Option` and `Result` implement
 *    `Cloneable`, so `clone(Some({ x: 1 }))` deep-clones the inner value.
 * 3. Otherwise the value is deep-cloned via `structuredClone`
 *    (handles plain objects, arrays, `Map`, `Set`, `Date`, typed arrays, ...).
 *
 * @throws {UndefinedBehaviorError} if the value is not structured-cloneable
 *   (e.g. contains functions or class instances with prototypes) and does
 *   not implement the {@link Cloneable} trait.
 *
 * @example
 * ```ts
 * clone(42);                    // 42
 * clone({ a: [1, 2] });         // deep copy via structuredClone
 * clone(Some({ x: 1 }));        // Some({ x: 1 }) — Option implements Cloneable
 * clone(new Point(1, 2));       // Point — via its clone() method
 * ```
 */
export function clone<T>(value: T): T {
  if (
    value === null ||
    (typeof value !== "object" && typeof value !== "function")
  ) {
    return value;
  }
  if (typeof value === "function") {
    return value;
  }
  const maybeWellKnownCloneable = value as Record<PropertyKey, unknown>;
  if (typeof maybeWellKnownCloneable[WELL_KNOWN_CLONE_API] === "function") {
    return (maybeWellKnownCloneable[WELL_KNOWN_CLONE_API] as () => T).call(
      value,
    );
  }
  const maybeCloneable = value as { clone?: unknown };
  if (typeof maybeCloneable.clone === "function") {
    return (maybeCloneable.clone as () => T).call(value);
  }
  try {
    return structuredClone(value);
  } catch (e) {
    throw new UndefinedBehaviorError(
      'Value is not cloneable. Implement the "Cloneable<T>" interface (a "clone()" method) or pass a structuredClone-compatible value.',
      {
        cause: {
          value,
          type: typeof value,
          ctor: value?.constructor,
          originalError: e,
        },
      },
    );
  }
}
