import { stringify } from "../utils/object";
import { AbstractRes, ResType } from "./AbstractRes";

export class RawRes<T = any> extends AbstractRes<T> {
  protected static _tplResType = ResType.Raw;
  override toString() {
    return Array.isArray(this.data)
      ? this.data.map(stringify).join("\n")
      : stringify(this.data).toString();
  }
}
