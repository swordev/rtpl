import { Callable, resolve, stringify } from "../utils/object.js";
import { StringifyClass } from "../utils/self/rs.js";
import { AbstractRes, ResType } from "./AbstractRes.js";
import { DelayedValue } from "./DelayedValue.js";

type Value = Callable<
  string | number | boolean | null | StringifyClass | undefined
>;

interface IniDataRecord<T> {
  [key: string]: T;
}

export type IniData = IniDataRecord<Value | IniData>;

export type ConfigFormat = {
  groupBraces?: boolean;
  /**
   * @default true
   */
  padding?: boolean;
  /**
   * @default "="
   */
  assignChar?: string;
  onRender?: (key: string | null, block: string[], level: number) => string[];
};

export type Config = {
  format?: ConfigFormat;
};

export class IniRes<
  T extends IniData | IniData[] | undefined = IniData | IniData[] | undefined,
> extends AbstractRes<ResType.Ini, T, Config> {
  protected static override type = ResType.Ini;
  protected override readonly type = ResType.Ini;
  override getDefaultExtension() {
    return "ini";
  }
  override toString() {
    const format = Object.assign(
      {
        padding: true,
        assignChar: "=",
      } as ConfigFormat,
      this.options.format ?? {},
    );

    const isValue = (value: unknown): value is Value => {
      const type = typeof value;
      return (
        value === null ||
        value instanceof AbstractRes ||
        DelayedValue.isInstance(value) ||
        type === "function" ||
        type === "string" ||
        type === "number" ||
        type === "boolean" ||
        type === "undefined"
      );
    };

    const renderValue = (key: string, value: Value, level: number) => {
      value = resolve(value);
      if (typeof value === "undefined") return;
      if (value === null) value = "";
      value = stringify(value);
      const padding = format.padding ? "  ".repeat(level) : "";
      const assignChar = format.assignChar ? ` ${format.assignChar} ` : " ";
      return `${padding}${key}${assignChar}${value}`;
    };

    const onRender =
      format.onRender ??
      ((key: string | null, values: string[], level: number) => {
        if (key) {
          const padding = format.padding ? "  ".repeat(level - 1) : "";
          if (format.groupBraces) {
            return [`${padding}${key} {`, ...values, `${padding}}`];
          } else {
            return [`${padding}[${key}]`, ...values];
          }
        } else {
          return values;
        }
      });

    const renderGroup = (
      key: string | null,
      value: IniData,
      level = 0,
    ): string[] => {
      const values = Object.entries(value)
        .flatMap(([subkey, subvalue]) => render(subkey, subvalue, level))
        .filter((v) => !!v) as string[];
      return onRender(key, values, level);
    };

    const render = (key: string, value: Value | IniData, level: number) =>
      isValue(value)
        ? renderValue(key, value, level)
        : renderGroup(key, value, level + 1);

    const data: IniData[] = Array.isArray(this.data)
      ? this.data
      : [this.data ?? {}];

    return data.flatMap((v) => renderGroup(null, v)).join("\n");
  }
}
