import { AbstractRes, ResType } from "./AbstractRes.js";
import { JSONValue, toString } from "./JsonRes.js";
import { stringify } from "yaml";

export type Config = {
  format?: {
    documents?: boolean;
  };
};

export class YamlRes<
  T extends JSONValue | undefined = JSONValue | undefined,
> extends AbstractRes<ResType.Yaml, T, Config> {
  protected static override type = ResType.Yaml;
  protected override readonly type = ResType.Yaml;
  protected override onDefaultExtension() {
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
  toJSON() {
    return JSON.parse(this.toString());
  }
}
