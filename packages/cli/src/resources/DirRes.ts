import { Callable } from "../utils/object";
import { AbstractRes, ResType } from "./AbstractRes";
import { Writable } from "ts-essentials";

export class DirRes<
  T extends Callable<Record<string, unknown> | unknown[] | undefined, any[]>,
  TConf extends Record<string, unknown> = {},
> extends AbstractRes<T, TConf> {
  protected static _tplResType = ResType.Dir;
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
    return this as any as DirRes<TData>;
  }
}
