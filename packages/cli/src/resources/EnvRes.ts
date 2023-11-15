import { Callable, stringify } from "../utils/object.js";
import { StringifyClass } from "../utils/self/rs.js";
import { AbstractRes, ResType } from "./AbstractRes.js";

export type EnvData = Record<
  string,
  Callable<string | number | boolean | StringifyClass>
>;

export class EnvRes<
  T extends EnvData | undefined = EnvData | undefined,
> extends AbstractRes<ResType.Env, T> {
  protected static override type = ResType.Env;
  protected override readonly type = ResType.Env;
  override getDefaultExtension() {
    return "env";
  }
  override toString() {
    return Object.entries(this.data ?? {})
      .map(([k, v]) => `${k}=${stringify(v)}`)
      .join("\n");
  }
}
