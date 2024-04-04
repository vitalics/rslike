import { UndefinedBehaviorError } from "@rslike/std";

Number.prototype[Symbol.compare] = function (this, another) {
  if (typeof another === "number") {
    const res = this.valueOf() - another;
    if (res > 0) {
      return 1;
    } else if (res < 0) {
      return -1;
    }
    return res;
  }
  if (
    typeof another === "object" &&
    another !== null &&
    typeof another[Symbol.compare] === "function"
  ) {
    return another[Symbol.compare](this.valueOf());
  }
  throw new UndefinedBehaviorError(
    '"Symbol.compare" can acept numeric value or object with implementation of "Symbol.compare"',
    {
      cause: {
        value: another,
        type: typeof another,
      },
    },
  );
};

Number.prototype[Symbol.partialEquals] = function (this, another) {
  if (typeof another === "number") {
    return this.valueOf() == another;
  }
  if (
    typeof another === "object" &&
    another !== null &&
    typeof another[Symbol.partialEquals] === "function"
  ) {
    return another[Symbol.partialEquals](this.valueOf());
  }
  return false;
};

Number.prototype[Symbol.equals] = function (this, another) {
  if (typeof another === "number") {
    return this.valueOf() === another;
  }
  if (
    typeof another === "object" &&
    another !== null &&
    typeof another[Symbol.equals] === "function"
  ) {
    return another[Symbol.equals](this.valueOf());
  }
  return false;
};

String.prototype[Symbol.compare] = function (
  this,
  another: unknown,
  locales?: string | string[],
  options?: Intl.CollatorOptions,
) {
  if (typeof another === "string") {
    return this.toString().localeCompare(another, locales, options);
  }
  if (
    typeof another === "object" &&
    another !== null &&
    Symbol.compare in another &&
    typeof another[Symbol.compare] === "function"
  ) {
    return (another as any)[Symbol.compare](this.valueOf());
  }
  return false;
};

String.prototype[Symbol.partialEquals] = function (this, another) {
  if (typeof another === "string") {
    return this.valueOf() == another;
  }
  if (
    typeof another === "object" &&
    another !== null &&
    typeof another[Symbol.partialEquals] === "function"
  ) {
    return another[Symbol.partialEquals](this.valueOf());
  }
  return false;
};

String.prototype[Symbol.equals] = function (this, another) {
  if (typeof another === "string") {
    return this.valueOf() === another;
  }
  if (
    typeof another === "object" &&
    another !== null &&
    typeof another[Symbol.equals] === "function"
  ) {
    return (another as any)[Symbol.equals](this.valueOf());
  }
  return false;
};

Boolean.prototype[Symbol.compare] = function (this, another) {
  if (typeof another === "boolean") {
    if (another === true && this.valueOf() === false) {
      return 1;
    } else if (this.valueOf() === true && another === false) {
      return -1;
    }
    return 0;
  } else if (typeof another === "number") {
    return another[Symbol.compare](Number(this.valueOf()));
  } else if (typeof another === "string") {
    const strAsBoolean = !!another;
    return this[Symbol.compare](strAsBoolean);
  }
  if (
    typeof another === "object" &&
    another !== null &&
    typeof another[Symbol.compare] === "function"
  ) {
    return another[Symbol.compare](this.valueOf());
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

Boolean.prototype[Symbol.equals] = function (this, another) {
  if (typeof another === "boolean") {
    return this.valueOf() === another;
  }
  if (
    typeof another === "object" &&
    another !== null &&
    typeof another[Symbol.equals] === "function"
  ) {
    return another[Symbol.equals](this.valueOf());
  }
  return false;
};

Boolean.prototype[Symbol.partialEquals] = function (this, another) {
  if (
    typeof another === "boolean" ||
    typeof another === "string" ||
    typeof another === "number"
  ) {
    return this.valueOf() == another;
  }
  if (
    typeof another === "object" &&
    another !== null &&
    typeof another[Symbol.partialEquals] === "function"
  ) {
    return another[Symbol.partialEquals](this.valueOf());
  }
  return false;
};

Date.prototype[Symbol.compare] = function (this, another) {
  if (
    typeof another === "number" ||
    typeof another === "string" ||
    another instanceof Date
  ) {
    const asDate = new Date(another);
    if (this.valueOf() > asDate.valueOf()) {
      return 1;
    } else if (this.valueOf() < asDate.valueOf()) {
      return -1;
    }
    if (this.valueOf() === asDate.valueOf()) {
      return 0;
    }
    return NaN;
  }
  if (
    typeof another === "object" &&
    another !== null &&
    typeof another[Symbol.compare] === "function"
  ) {
    return another[Symbol.compare](this.valueOf());
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

Date.prototype[Symbol.equals] = function (this, another) {
  if (
    typeof another === "string" ||
    typeof another === "number" ||
    another instanceof Date
  ) {
    const asDate = new Date(another);
    return this.valueOf() === asDate.valueOf();
  }
  if (
    typeof another === "object" &&
    another !== null &&
    typeof another[Symbol.equals] === "function"
  ) {
    return another[Symbol.equals](this.valueOf());
  }
  return false;
};

Date.prototype[Symbol.partialEquals] = function (this, another) {
  if (
    typeof another === "string" ||
    typeof another === "number" ||
    another instanceof Date
  ) {
    const asDate = new Date(another);
    return this.valueOf() == asDate.valueOf();
  }
  if (
    typeof another === "object" &&
    another !== null &&
    typeof another[Symbol.partialEquals] === "function"
  ) {
    return another[Symbol.partialEquals](this.valueOf());
  }
  return false;
};
