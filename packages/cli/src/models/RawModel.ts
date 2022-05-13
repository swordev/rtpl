import { stringify } from "../utils/object";
import { AbstractModel, TypeEnum } from "./AbstractModel";

export class RawModel<T = any> extends AbstractModel<T> {
  protected static _tplModelType = TypeEnum.Raw;
  toString() {
    return Array.isArray(this.spec)
      ? this.spec.map(stringify).join("\n")
      : stringify(this.spec).toString();
  }
}
