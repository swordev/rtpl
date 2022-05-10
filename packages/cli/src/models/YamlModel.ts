import { TypeEnum } from "./AbstractModel";
import { JsonModel, JSONValue, toString } from "./JsonModel";
import { stringify } from "yaml";

export type Config = {
  format?: {
    documents?: boolean;
  };
};

export class YamlModel<T extends JSONValue | undefined> extends JsonModel<
  T,
  Config
> {
  protected static _tplModelType = TypeEnum.Yaml;
  toString() {
    const toYaml = (input: any) => {
      const json = toString(input);
      const object = JSON.parse(json);
      return stringify(object, {
        version: "1.1",
      });
    };
    const input = typeof this.spec === "function" ? this.spec() : this.spec;
    if (this.data.format?.documents && Array.isArray(input)) {
      return input.map((doc) => toYaml(doc)).join("---\n");
    } else {
      return toYaml(input);
    }
  }
}
