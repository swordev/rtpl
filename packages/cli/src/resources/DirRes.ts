import { Callable } from "../utils/object.js";
import { AbstractRes, ResOptions } from "./AbstractRes.js";

export type DirData = Callable<
  Record<string, unknown> | unknown[] | undefined,
  any[]
>;

export type DirConfig<TConf> = Omit<TConf, "name" | "data">;

export class DirRes<
  T extends DirData = undefined,
  TConf extends Record<string, unknown> = {},
> extends AbstractRes<T> {
  /**
   * Custom options (everything except `name` and `data`).
   */
  readonly config: DirConfig<TConf>;
  constructor(options: ResOptions<T> & TConf) {
    super(options);
    const { name, data, ...config } = options;
    this.config = config as DirConfig<TConf>;
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
          : [...data]
        : Array.isArray(this.data)
          ? data
          : { ...this.data, ...data },
    ) as any;
  }
  set<TData extends Record<string, unknown> | unknown[]>(
    data: TData,
  ): DirRes<TData> {
    (this as AbstractRes).data = data;
    return this as any;
  }
}
