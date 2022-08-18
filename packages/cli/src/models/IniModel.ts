import { Callable, resolve, stringify } from "../utils/object";
import { StringifyClass } from "../utils/self/model";
import { AbstractModel, DelayedValue, TypeEnum } from "./AbstractModel";

type Value = Callable<
  string | number | boolean | null | StringifyClass | undefined
>;

interface IniSpecRecord<T> {
  [key: string]: T;
}

export type IniSpec = IniSpecRecord<Value | IniSpec>;

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

export class IniModel<
  T extends IniSpec | IniSpec[] | undefined
> extends AbstractModel<T, Config> {
  protected static _tplModelType = TypeEnum.Ini;
  toString() {
    const format = Object.assign(
      {
        padding: true,
        assignChar: "=",
      } as ConfigFormat,
      this.data.format ?? {}
    );

    const isValue = (value: unknown): value is Value => {
      const type = typeof value;
      return (
        value === null ||
        AbstractModel.isInstance(value) ||
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
      value: IniSpec,
      level = 0
    ): string[] => {
      const values = Object.entries(value)
        .flatMap(([subkey, subvalue]) => render(subkey, subvalue, level))
        .filter((v) => !!v) as string[];
      return onRender(key, values, level);
    };

    const render = (key: string, value: Value | IniSpec, level: number) =>
      isValue(value)
        ? renderValue(key, value, level)
        : renderGroup(key, value, level + 1);

    const spec: IniSpec[] = Array.isArray(this.spec)
      ? this.spec
      : [this.spec ?? {}];

    return spec.flatMap((v) => renderGroup(null, v)).join("\n");
  }
}
