import { Callable, stringify } from "../utils/object";
import { StringifyClass } from "../utils/self/model";
import { AbstractModel, TypeEnum } from "./AbstractModel";

type SpecValue = string | number | StringifyClass | { toString(): string };

export class RawModel extends AbstractModel<
  | Callable<SpecValue | SpecValue[]>
  | Callable<SpecValue | SpecValue[]>[]
  | undefined
> {
  protected static _tplModelType = TypeEnum.Raw;
  toString() {
    return Array.isArray(this.spec)
      ? this.spec.map(stringify).join("\n")
      : stringify(this.spec).toString();
  }
}
