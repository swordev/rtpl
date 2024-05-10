import { Callable, isPlainObject } from "../utils/object.js";
import { AbstractRes, ResOptions, ResType } from "./AbstractRes.js";
import { Writable } from "ts-essentials";

export type DirData = Callable<
  Record<string, unknown> | unknown[] | undefined,
  any[]
>;

export abstract class MinimalDirRes<
  T = any,
  TConf extends Record<string, unknown> = any,
> extends AbstractRes<ResType.Dir, T, TConf> {
  protected static override type = ResType.Dir;
  protected override readonly type = ResType.Dir;
  protected attachSymbol(input: unknown, symbol: symbol) {
    if (Array.isArray(input)) {
      for (const item of input) this.attachSymbol(item, symbol);
    } else if (isPlainObject(input)) {
      for (const key in input) this.attachSymbol(input[key], symbol);
    } else if (input instanceof AbstractRes) {
      if (!input.symbol) {
        input.symbol = symbol;
        if (MinimalDirRes.isInstance(input))
          this.attachSymbol(input.data, symbol);
      }
    }
  }
  abstract add(data: unknown): any;
}

export class DirRes<
  T extends DirData = undefined,
  TConf extends Record<string, unknown> = {},
> extends MinimalDirRes<T, TConf> {
  constructor(
    readonly options: ResOptions<T, TConf>,
    symbol?: symbol,
  ) {
    super(options, symbol);
    if (this.symbol) this.attachSymbol(this.data, this.symbol);
  }
  toString(): string {
    throw new Error("Not implemented");
  }
  override add<ST extends Record<string, unknown>>(
    data: T extends (...args: any[]) => any ? never : ST,
  ): DirRes<
    T extends () => any ? any : T extends Record<string, unknown> ? T & ST : ST
  >;
  override add<ST extends unknown[]>(
    data: T extends (...args: any[]) => any ? never : ST,
  ): DirRes<
    T extends () => any
      ? any
      : T extends unknown[]
        ? (T[number] | ST[number])[]
        : ST
  >;
  override add<ST extends Record<string, unknown> | unknown[]>(
    data: ST,
  ): DirRes<T & ST> {
    return this.set(
      Array.isArray(data)
        ? Array.isArray(this.data)
          ? [...this.data, ...data]
          : [data]
        : Array.isArray(this.data)
          ? data
          : { ...this.data, ...data },
    ) as any;
  }
  set<TData extends Record<string, unknown> | unknown[]>(
    data: TData,
  ): DirRes<TData> {
    const self = this as Writable<typeof this>;
    self.data = self.options.data = data as any;

    if (this.symbol) this.attachSymbol(self.data, this.symbol);

    return this as any as DirRes<TData>;
  }
}
