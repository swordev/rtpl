import { stringify } from "../utils/object.js";
import { AbstractRes, ResType } from "./AbstractRes.js";

export class RawRes<T = any> extends AbstractRes<ResType.Raw, T> {
  protected static override type = ResType.Raw;
  protected override readonly type = ResType.Raw;
  override toString() {
    return Array.isArray(this.data)
      ? this.data.map(stringify).join("\n")
      : stringify(this.data).toString();
  }
}
