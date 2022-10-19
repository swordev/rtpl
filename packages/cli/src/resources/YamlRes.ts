import { ResType } from "./AbstractRes";
import { JsonRes, JSONValue, toString } from "./JsonRes";
import { stringify } from "yaml";

export type Config = {
  format?: {
    documents?: boolean;
  };
};

export class YamlRes<T extends JSONValue | undefined> extends JsonRes<
  T,
  Config
> {
  protected static _tplResType = ResType.Yaml;
  override getDefaultExtension() {
    return "yaml";
  }
  override toString() {
    const toYaml = (input: any) => {
      const json = toString(input);
      const object = JSON.parse(json);
      return stringify(object, {
        version: "1.1",
      });
    };
    const input = typeof this.data === "function" ? this.data() : this.data;
    if (this.options.format?.documents && Array.isArray(input)) {
      return input.map((doc) => toYaml(doc)).join("---\n");
    } else {
      return toYaml(input);
    }
  }
}
