import { Callable, isPlainObject } from "../utils/object";
import { AbstractRes, ResOptions, ResType } from "./AbstractRes";
import { Writable } from "ts-essentials";

export type DirData = Callable<
  Record<string, unknown> | unknown[] | undefined,
  any[]
>;
export class DirRes<
  T extends DirData,
  TConf extends Record<string, unknown> = {},
> extends AbstractRes<T, TConf> {
  protected static _tplResType = ResType.Dir;
  constructor(
    readonly options: ResOptions<T, TConf>,
    symbol?: symbol,
  ) {
    super(options, symbol);
    if (this.symbol) attachSymbol(this.data, this.symbol);
  }
  toString(): string {
    throw new Error("Not implemented");
  }
  add<ST extends Record<string, unknown>>(
    data: T extends (...args: any[]) => any ? never : ST,
  ): DirRes<
    T extends () => any ? any : T extends Record<string, unknown> ? T & ST : ST
  >;
  add<ST extends unknown[]>(
    data: T extends (...args: any[]) => any ? never : ST,
  ): DirRes<
    T extends () => any
      ? any
      : T extends unknown[]
      ? (T[number] | ST[number])[]
      : ST
  >;
  add<ST extends Record<string, unknown> | unknown[]>(
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

    if (this.symbol) attachSymbol(self.data, this.symbol);

    return this as any as DirRes<TData>;
  }
}

function attachSymbol(input: unknown, symbol: symbol) {
  if (Array.isArray(input)) {
    for (const item of input) attachSymbol(item, symbol);
  } else if (isPlainObject(input)) {
    for (const key in input) attachSymbol(input[key], symbol);
  } else if (AbstractRes.isInstance(input)) {
    if (!input.symbol) {
      input.symbol = symbol;
      if (DirRes.isInstance(input)) attachSymbol(input.data, symbol);
    }
  }
}
