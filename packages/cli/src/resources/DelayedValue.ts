export class DelayedValue<T = any> {
  readonly value!: T;
  readonly resolved: boolean = false;
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
  const writable = instance as { -readonly [K in "value" | "resolved"]: any };
  writable.value = value;
  writable.resolved = true;
}
