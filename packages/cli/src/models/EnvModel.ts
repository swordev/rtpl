import { Callable, stringify } from "../utils/object";
import { StringifyClass } from "../utils/self/model";
import { AbstractModel, TypeEnum } from "./AbstractModel";

export type EnvSpec = Record<
  string,
  Callable<string | number | boolean | StringifyClass>
>;

export class EnvModel<T extends EnvSpec | undefined> extends AbstractModel<T> {
  protected static _tplModelType = TypeEnum.Env;
  toString() {
    return Object.entries(this.spec ?? {})
      .map(([k, v]) => `${k}=${stringify(v)}`)
      .join("\n");
  }
}
