import { Call, getLastStacks } from "../utils/stack";
import { posix } from "path";
import { Writable } from "ts-essentials";

export type SpecObject<TSpec> = TSpec extends undefined
  ? { spec?: TSpec }
  : { spec: TSpec };

export type Data<TSpec, TConf extends Record<string, unknown> = {}> = {
  name?: string;
} & SpecObject<TSpec> &
  TConf;

export type Source = {
  path: string;
  line: number;
};

type Resolver<T> = (value: T) => any;

export class DelayedValue<T = any> {
  protected static _tplDelayedValue = 1;
  readonly value!: T;
  constructor(
    protected readonly resolver?: Resolver<T>,
    readonly lastStacks?: Call[]
  ) {}
  static isInstance(value: unknown): value is DelayedValue {
    if (value instanceof this) return true;
    return (
      (
        (value as DelayedValue | undefined)?.constructor as
          | typeof DelayedValue
          | undefined
      )?._tplDelayedValue === 1
    );
  }
  toJSON() {
    return this.toString();
  }
  toString() {
    if (!this.value) {
      const error = new Error(`Value is not resolved yet`);
      if (this.lastStacks) {
        error.stack =
          `Error: ${error.message}\n` +
          this.lastStacks
            .filter((v) => !!v.getFileName())
            .map((v) => `\t at ${v.getFileName()}:${v.getLineNumber()}`)
            .join("\n");
      }

      throw error;
    }
    return this.value;
  }
}

export function setDelayedValue<T>(instance: DelayedValue<T>, value: T) {
  const writable = instance as Writable<typeof instance>;
  const resolver: Resolver<T> | undefined = (writable as any)["resolver"];
  writable.value = resolver ? resolver(value) : value;
}

export enum TypeEnum {
  Abstract = 1,
  Cron,
  Dir,
  Env,
  Ini,
  Json,
  Raw,
  Secret,
  Yaml,
}

export abstract class AbstractModel<
  TSpec = any,
  TConf extends Record<string, unknown> = {}
> {
  protected static _tplModelType = TypeEnum.Abstract;
  readonly name: string | undefined;
  readonly spec: TSpec;
  readonly config: TConf;
  readonly lastStacks: Call[];
  readonly path: DelayedValue<string>;
  readonly dirname: DelayedValue<string>;
  readonly resolved: boolean | undefined;
  symbol: Symbol | undefined;
  protected pathValue: string | undefined;

  constructor(readonly data: Data<TSpec, TConf>) {
    this.name = data.name;
    this.spec = data.spec as any;
    this.config = Object.keys(data).reduce((config, key) => {
      if (key !== "name" && key !== "spec") (config as any)[key] = data[key];
      return config;
    }, {} as TConf);
    this.lastStacks = getLastStacks([{ startsWith: __dirname }], true);
    this.path = new DelayedValue((path) => `./${path}`, this.lastStacks);
    this.dirname = new DelayedValue(
      (path) => `./${posix.dirname(path)}`,
      this.lastStacks
    );
  }

  abstract toString(): string;

  static isInstance(value: unknown): value is AbstractModel {
    if (value instanceof this) return true;
    const instanceType = (
      (value as AbstractModel | undefined)?.constructor as
        | typeof AbstractModel
        | undefined
    )?._tplModelType;
    return (
      (this._tplModelType === TypeEnum.Abstract && !!instanceType) ||
      (this._tplModelType === instanceType &&
        this.name === `${TypeEnum[this._tplModelType]}Model`)
    );
  }

  async onReady(path: string) {
    this.pathValue = path;
    setDelayedValue(this.path, path);
    setDelayedValue(this.dirname, path);
  }
}
