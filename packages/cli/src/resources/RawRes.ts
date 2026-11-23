import { stringify } from "../utils/object.js";
import { AbstractRes } from "./AbstractRes.js";

export class RawRes<T = any> extends AbstractRes<T> {
  override toString() {
    return Array.isArray(this.data)
      ? this.data.map(stringify).join("\n")
      : stringify(this.data).toString();
  }
}
