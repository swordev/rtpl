import { Callable, stringify } from "../utils/object";
import { StringifyClass } from "../utils/self/rs";
import { AbstractRes, ResType } from "./AbstractRes";

export type EnvData = Record<
  string,
  Callable<string | number | boolean | StringifyClass>
>;

export class EnvRes<T extends EnvData | undefined> extends AbstractRes<T> {
  protected static _tplResType = ResType.Env;

  override getDefaultExtension() {
    return "env";
  }

  override toString() {
    return Object.entries(this.data ?? {})
      .map(([k, v]) => `${k}=${stringify(v)}`)
      .join("\n");
  }
}
