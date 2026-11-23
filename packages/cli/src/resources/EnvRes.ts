import { Callable, resolve, stringify } from "../utils/object.js";
import type { StringifyClass } from "../utils/self/rs.js";
import { AbstractRes } from "./AbstractRes.js";

export type EnvData = Record<
  string,
  Callable<string | number | boolean | undefined | StringifyClass>
>;

export class EnvRes<
  T extends EnvData | undefined = EnvData | undefined,
> extends AbstractRes<T> {
  override readonly extension = "env";
  override toString() {
    return Object.entries(this.data ?? {})
      .map(([k, v]) => [k, resolve(v)] as const)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${k}=${stringify(v)}`)
      .join("\n");
  }
}
