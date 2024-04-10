import { UndefinedBehaviorError } from "@rslike/std";

import { kCompare, kEquals, kPartialEquals } from "./symbols";

declare global {
  interface BooleanConstructor {
    [Symbol.partialEquals](
      this: Boolean,
      another:
        | boolean
        | { [Symbol.partialEquals](another: unknown): boolean }
        | unknown,
    ): boolean;
    [Symbol.equals](
      this: Boolean,
      another:
        | boolean
        | { [Symbol.equals](another: unknown): boolean }
        | unknown,
    ): boolean;
    [Symbol.compare](
      this: Boolean,
      another:
        | boolean
        | { [Symbol.compare](another: unknown): number }
        | unknown,
    ): number;
  }
  interface Boolean {
    [Symbol.partialEquals](
      this: Boolean,
      another:
        | boolean
        | { [Symbol.partialEquals](another: unknown): boolean }
        | unknown,
    ): boolean;
    [Symbol.equals](
      this: Boolean,
      another:
        | boolean
        | { [Symbol.equals](another: unknown): boolean }
        | unknown,
    ): boolean;
    [Symbol.compare](
      this: Boolean,
      another:
        | boolean
        | { [Symbol.compare](another: unknown): number }
        | unknown,
    ): number;
  }

  interface NumberConstructor {
    [Symbol.partialEquals](
      this: Number,
      another:
        | number
        | { [Symbol.partialEquals](another: unknown): boolean }
        | unknown,
    ): boolean;

    [Symbol.equals](
      this: Number,
      another:
        | number
        | { [Symbol.equals](another: unknown): boolean }
        | unknown,
    ): boolean;

    [Symbol.compare](
      this: Number,
      another:
        | number
        | { [Symbol.compare](another: unknown): number }
        | unknown,
    ): number;
  }
  interface Number {
    [Symbol.partialEquals](
      this: Number,
      another:
        | number
        | { [Symbol.partialEquals](another: unknown): boolean }
        | unknown,
    ): boolean;

    [Symbol.equals](
      this: Number,
      another:
        | number
        | { [Symbol.equals](another: unknown): boolean }
        | unknown,
    ): boolean;

    [Symbol.compare](
      this: Number,
      another:
        | number
        | { [Symbol.compare](another: unknown): number }
        | unknown,
    ): number;
  }

  interface StringConstructor {
    [Symbol.partialEquals](
      this: String,
      another:
        | string
        | { [Symbol.partialEquals](another: unknown): boolean }
        | unknown,
    ): boolean;

    [Symbol.equals](
      this: String,
      another:
        | string
        | { [Symbol.equals](another: unknown): boolean }
        | unknown,
    ): boolean;

    [Symbol.compare](
      this: String,
      another: string,
      locales?: string | string[],
      opts?: Intl.CollatorOptions,
    ): number;
    [Symbol.compare](
      this: String,
      another:
        | string
        | {
            [Symbol.compare](another: unknown): number;
          }
        | unknown,
    ): number;
  }
  interface String {
    [Symbol.partialEquals](
      this: String,
      another:
        | string
        | { [Symbol.partialEquals](another: unknown): boolean }
        | unknown,
    ): boolean;

    [Symbol.equals](
      this: String,
      another:
        | string
        | { [Symbol.equals](another: unknown): boolean }
        | unknown,
    ): boolean;

    [Symbol.compare](
      this: String,
      another: string,
      locales?: string | string[],
      opts?: Intl.CollatorOptions,
    ): number;
    [Symbol.compare](
      this: String,
      another:
        | {
            [Symbol.compare](another: unknown): number;
          }
        | unknown,
    ): number;
  }

  interface DateConstructor {
    [Symbol.partialEquals](
      this: Date,
      another:
        | Date
        | string
        | number
        | { [Symbol.partialEquals](another: unknown): boolean }
        | unknown,
    ): boolean;

    [Symbol.equals](
      this: Date,
      another:
        | Date
        | string
        | number
        | { [Symbol.equals](another: unknown): boolean }
        | unknown,
    ): boolean;

    [Symbol.compare](
      this: Date,
      another:
        | Date
        | string
        | number
        | { [Symbol.compare](another: unknown): number }
        | unknown,
    ): number;
  }
  interface Date {
    [Symbol.partialEquals](
      this: Date,
      another:
        | Date
        | string
        | number
        | { [Symbol.partialEquals](another: unknown): boolean }
        | unknown,
    ): boolean;

    [Symbol.equals](
      this: Date,
      another:
        | Date
        | string
        | number
        | { [Symbol.equals](another: unknown): boolean }
        | unknown,
    ): boolean;

    [Symbol.compare](
      this: Date,
      another:
        | Date
        | string
        | number
        | { [Symbol.compare](another: unknown): number }
        | unknown,
    ): number;
  }
}

Number.prototype[Symbol.compare] = function (this, another) {
  if (
    typeof another === "object" &&
    another !== null &&
    Symbol.compare in another &&
    typeof another[Symbol.compare] === "function"
  ) {
    const res = Reflect.apply((another as any)[Symbol.compare], another, [
      this.valueOf(),
    ]);
    if (typeof res === "number") {
      return res;
    }
    throw new UndefinedBehaviorError(
      `[Symbol.compare] should returns number type. Got "${typeof res}"`,
      { cause: { value: res, type: typeof res } },
    );
  }
  if (typeof another === "number") {
    if (!Number.isFinite(this.valueOf()) || !Number.isFinite(another)) {
      return NaN;
    }
    const res = this.valueOf() - another;
    if (res > 0) {
      return 1;
    } else if (res < 0) {
      return -1;
    }
    return res;
  }
  throw new UndefinedBehaviorError(
    "[Symbol.compare] can acept numeric value or object with implementation of [Symbol.compare]",
    {
      cause: {
        value: another,
        type: typeof another,
      },
    },
  );
};

Number.prototype[kPartialEquals] = function (this, another) {
  if (
    typeof another === "object" &&
    another !== null &&
    Symbol.partialEquals in another &&
    typeof another[Symbol.partialEquals] === "function"
  ) {
    const res = Reflect.apply((another as any)[Symbol.partialEquals], another, [
      this.valueOf(),
    ]);
    if (typeof res === "boolean") {
      return res;
    }
    throw new UndefinedBehaviorError(
      `Symbol.partialEquals trait expected to returns boolean type. Got "${typeof res}"`,
      {
        cause: {
          value: res,
          type: typeof res,
        },
      },
    );
  }
  return this.valueOf() == another;
};

Number.prototype[kEquals] = function (this, another) {
  if (
    typeof another === "object" &&
    another !== null &&
    Symbol.equals in another &&
    typeof another[Symbol.equals] === "function"
  ) {
    const res = Reflect.apply((another as any)[Symbol.equals], another, [
      this.valueOf(),
    ]);
    if (typeof res === "boolean") {
      return res;
    }
    throw new UndefinedBehaviorError(
      `[Symbol.equals] trait expected to returns number type. Got "${typeof res}"`,
      {
        cause: {
          value: res,
          type: typeof res,
        },
      },
    );
  }
  return this.valueOf() === another;
};

String.prototype[kCompare] = function (
  this,
  another: unknown,
  locales?: string | string[],
  options?: Intl.CollatorOptions,
) {
  if (
    typeof another === "object" &&
    another !== null &&
    Symbol.compare in another &&
    typeof another[Symbol.compare] === "function"
  ) {
    const res = Reflect.apply((another as any)[Symbol.compare], another, [
      this.valueOf(),
    ]);
    if (typeof res === "number") {
      return res;
    }
    throw new UndefinedBehaviorError(
      `Symbol.compare trait expected to returns number type. Got "${typeof res}"`,
    );
  }
  if (typeof another === "number" || typeof another === "boolean") {
    const asStr = String(another);
    return this.toString().localeCompare(asStr, locales, options);
  }
  if (typeof another === "string") {
    return this.toString().localeCompare(another, locales, options);
  }
  throw new UndefinedBehaviorError(
    '"Symbol.compare" can acept string value or object with implementation of "Symbol.compare" trait',
    {
      cause: {
        value: another,
        type: typeof another,
      },
    },
  );
};

String.prototype[kPartialEquals] = function (this, another) {
  if (
    typeof another === "object" &&
    another !== null &&
    Symbol.partialEquals in another &&
    typeof another[Symbol.partialEquals] === "function"
  ) {
    const res = Reflect.apply((another as any)[Symbol.partialEquals], another, [
      this.valueOf(),
    ]);
    if (typeof res === "boolean") {
      return res;
    }
    throw new UndefinedBehaviorError(
      `Symbol.partialEquals trait expected to returns number type. Got "${typeof res}"`,
    );
  }
  return this.valueOf() == another;
};

String.prototype[kEquals] = function (this, another) {
  if (
    typeof another === "object" &&
    another !== null &&
    Symbol.equals in another &&
    typeof another[Symbol.equals] === "function"
  ) {
    const res = Reflect.apply((another as any)[Symbol.equals], another, [
      this.valueOf(),
    ]);
    if (typeof res === "boolean") {
      return res;
    }
    throw new UndefinedBehaviorError(
      `Symbol.equals trait expected to returns number type. Got "${typeof res}"`,
    );
  }
  return this.valueOf() === another;
};

Boolean.prototype[kCompare] = function (this, another) {
  if (typeof another === "boolean") {
    if (this.valueOf() > another) {
      return 1;
    } else if (this.valueOf() < another) {
      return -1;
    }
    return 0;
  } else if (typeof another === "number") {
    return another[Symbol.compare](Number(this.valueOf()));
  } else if (typeof another === "string") {
    return this[Symbol.compare](!!another);
  }
  if (
    typeof another === "object" &&
    another !== null &&
    typeof (another as any)[Symbol.compare] === "function"
  ) {
    const res = Reflect.apply((another as any)[Symbol.compare], another, [
      this.valueOf(),
    ]);
    if (typeof res === "number") {
      return res;
    }
    throw new UndefinedBehaviorError(
      `Symbol.compare trait expected to returns number type. Got "${typeof res}"`,
    );
  }
  throw new UndefinedBehaviorError(
    '"Symbol.compare" can acept only another string value or object with implementation of "Symbol.compare"',
    {
      cause: {
        value: another,
        type: typeof another,
      },
    },
  );
};

Boolean.prototype[kEquals] = function (this, another) {
  if (
    typeof another === "object" &&
    another !== null &&
    typeof (another as any)[Symbol.equals] === "function"
  ) {
    if (
      typeof another === "object" &&
      another !== null &&
      Symbol.equals in another &&
      typeof (another as any)[Symbol.equals] === "function"
    ) {
      const res = Reflect.apply((another as any)[Symbol.equals], another, [
        this.valueOf(),
      ]);
      if (typeof res === "boolean") {
        return res;
      }
      throw new UndefinedBehaviorError(
        `"Symbol.equals" trait expected to returns boolean type. Got "${typeof res}"`,
      );
    }
  }
  return this.valueOf() === another;
};

Boolean.prototype[kPartialEquals] = function (this, another) {
  if (
    typeof another === "object" &&
    another !== null &&
    Symbol.partialEquals in another &&
    typeof another[Symbol.partialEquals] === "function"
  ) {
    const res = Reflect.apply((another as any)[Symbol.partialEquals], another, [
      this.valueOf(),
    ]);
    if (typeof res === "boolean") {
      return res;
    }
    throw new UndefinedBehaviorError(
      `Symbol.partialEquals trait expected to returns boolean type. Got "${typeof res}"`,
    );
  }
  if (
    typeof another === "boolean" ||
    typeof another === "string" ||
    typeof another === "number"
  ) {
    return this.valueOf() == another;
  }
  return false;
};

Date.prototype[kCompare] = function (this, another) {
  if (
    typeof another === "number" ||
    typeof another === "string" ||
    another instanceof Date
  ) {
    const asDate = new Date(another);
    if (!Number.isFinite(asDate.valueOf())) {
      throw new UndefinedBehaviorError(
        `Incoming primitive is not finite after parsing to Date.`,
        {
          cause: {
            value: another,
            type: typeof another,
          },
        },
      );
    }
    if (this.valueOf() > asDate.valueOf()) {
      return 1;
    } else if (this.valueOf() < asDate.valueOf()) {
      return -1;
    } else {
      return 0;
    }
  }
  if (
    typeof another === "object" &&
    another !== null &&
    typeof (another as any)[Symbol.compare] === "function"
  ) {
    const res = Reflect.apply((another as any)[Symbol.compare], another, [
      this.valueOf(),
    ]);
    if (typeof res === "number") {
      return res;
    }
    throw new UndefinedBehaviorError(
      `Symbol.equals trait expected to returns boolean type. Got "${typeof res}"`,
    );
  }
  throw new UndefinedBehaviorError(
    '"Symbol.compare" can acept only string, number, Date value or object with implementation of "Symbol.compare"',
    {
      cause: {
        value: another,
        type: typeof another,
      },
    },
  );
};

Date.prototype[kEquals] = function (this, another) {
  if (
    typeof another === "string" ||
    typeof another === "number" ||
    another instanceof Date
  ) {
    const asDate = new Date(another);
    return this.valueOf()[Symbol.equals](asDate.valueOf());
  }
  if (
    typeof another === "object" &&
    another !== null &&
    typeof (another as any)[Symbol.equals] === "function"
  ) {
    const res = Reflect.apply((another as any)[Symbol.equals], another, [
      this.valueOf(),
    ]);
    if (typeof res === "boolean") {
      return res;
    }
    throw new UndefinedBehaviorError(
      `Symbol.equals trait expected to returns boolean type. Got "${typeof res}"`,
    );
  }
  return this.valueOf() === another;
};

Date.prototype[kPartialEquals] = function (this, another) {
  if (
    typeof another === "string" ||
    typeof another === "number" ||
    another instanceof Date
  ) {
    const asDate = new Date(another);
    return this.valueOf()[Symbol.partialEquals](asDate.valueOf());
  }
  if (
    typeof another === "object" &&
    another !== null &&
    Symbol.partialEquals in another &&
    typeof another[Symbol.partialEquals] === "function"
  ) {
    const res = Reflect.apply((another as any)[Symbol.partialEquals], another, [
      this.valueOf(),
    ]);
    if (typeof res === "boolean") {
      return res;
    }
    throw new UndefinedBehaviorError(
      `"Symbol.partialEquals" trait expected to returns boolean type. Got "${typeof res}"`,
    );
  }

  return this.valueOf() == another;
};
