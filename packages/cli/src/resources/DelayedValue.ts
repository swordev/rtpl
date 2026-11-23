import { Writable } from "../utils/ts.js";

type Resolver<T> = (value: T) => any;

export class DelayedValue<T = any> {
  protected static _tplDelayedValue = 1;
  readonly value!: T;
  readonly resolved: boolean = false;
  constructor(protected readonly resolver?: Resolver<T>) {}
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
    if (!this.resolved) throw new Error(`Value is not resolved yet`);
    return this.value;
  }
  toString(): string {
    if (!this.resolved) throw new Error(`Value is not resolved yet`);
    return String(this.value);
  }
}

export function setDelayedValue<T>(instance: DelayedValue<T>, value: T) {
  const writable = instance as Writable<typeof instance>;
  const resolver: Resolver<T> | undefined = (writable as any)["resolver"];
  writable.value = resolver ? resolver(value) : value;
  writable.resolved = true;
}
