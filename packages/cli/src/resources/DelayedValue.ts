import { Writable } from "../utils/ts.js";

type Resolver<T> = (value: T) => any;

export class DelayedValue<T = any> {
  protected static _tplDelayedValue = 1;
  readonly value!: T;
  constructor(
    protected readonly resolver?: Resolver<T>,
    readonly stack?: string,
  ) {}
  static isInstance(value: unknown): value is DelayedValue {
    if (value instanceof this) return true;
    return (
      (
        (value as DelayedValue | undefined)?.constructor as
          | typeof DelayedValue
          | undefined
      )?._tplDelayedValue === 1
    );
  }
  toJSON() {
    return this.toString();
  }
  toString() {
    if (!this.value) {
      const error = new Error(`Value is not resolved yet`);
      if (this.stack) {
        error.stack = `Error: ${error.message}\n` + this.stack;
      }

      throw error;
    }
    return this.value;
  }
}

export function setDelayedValue<T>(instance: DelayedValue<T>, value: T) {
  const writable = instance as Writable<typeof instance>;
  const resolver: Resolver<T> | undefined = (writable as any)["resolver"];
  writable.value = resolver ? resolver(value) : value;
}
