import { Callable } from "../utils/object";
import { AbstractModel, TypeEnum } from "./AbstractModel";
import { Writable } from "ts-essentials";

export class DirModel<
  T extends Callable<Record<string, unknown> | unknown[] | undefined, any[]>,
  TConf extends Record<string, unknown> = {}
> extends AbstractModel<T, TConf> {
  protected static _tplModelType = TypeEnum.Dir;
  toString(): string {
    throw new Error("Not implemented");
  }
  add<ST extends Record<string, unknown>>(
    spec: T extends (...args: any[]) => any ? never : ST
  ): DirModel<
    T extends () => any ? any : T extends Record<string, unknown> ? T & ST : ST
  >;
  add<ST extends unknown[]>(
    spec: T extends (...args: any[]) => any ? never : ST
  ): DirModel<
    T extends () => any
      ? any
      : T extends unknown[]
      ? (T[number] | ST[number])[]
      : ST
  >;
  add<ST extends Record<string, unknown> | unknown[]>(spec: ST) {
    const self = this as Writable<typeof this>;
    if (Array.isArray(spec)) {
      if (Array.isArray(self.spec)) {
        self.spec = [...self.spec, ...spec] as any;
      } else {
        self.spec = [spec] as any;
      }
    } else {
      if (Array.isArray(self.spec)) {
        self.spec = spec as any;
      } else {
        self.spec = { ...self.spec, ...spec } as any;
      }
    }
    return this as any as DirModel<T & ST>;
  }
  set<ST extends Record<string, unknown> | unknown[]>(spec: ST) {
    const self = this as Writable<typeof this>;
    self.spec = self.data.spec = spec as any;
    return this as any as DirModel<ST>;
  }
}
