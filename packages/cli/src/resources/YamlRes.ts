import { AbstractRes, ResOptions } from "./AbstractRes.js";
import { JSONValue, toString } from "./JsonRes.js";
import { stringify } from "yaml";

export type YamlFormat = {
  documents?: boolean;
};

export class YamlRes<
  T extends JSONValue | undefined = JSONValue | undefined,
> extends AbstractRes<T> {
  override readonly extension = "yaml";
  readonly format: YamlFormat | undefined;
  constructor(options: ResOptions<T> & { format?: YamlFormat }) {
    super(options);
    this.format = options.format;
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
    if (input === undefined) return "";
    if (this.format?.documents && Array.isArray(input)) {
      return input.map((doc) => toYaml(doc)).join("---\n");
    } else {
      return toYaml(input);
    }
  }
  toJSON() {
    return JSON.parse(toString(this.data));
  }
}
