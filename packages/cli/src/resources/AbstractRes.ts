import { Call, getLastStacks } from "../utils/stack";
import { DelayedValue, setDelayedValue } from "./DelayedValue";
import { posix } from "path";

export type ResDataObject<TData> = TData extends undefined
  ? { data?: TData }
  : { data: TData };

export type ResOptions<TData, TConf extends Record<string, unknown> = {}> = {
  name?: string;
} & ResDataObject<TData> &
  TConf;

export enum ResType {
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

export abstract class AbstractRes<
  TData = any,
  TConf extends Record<string, unknown> = {}
> {
  protected static _tplResType = ResType.Abstract;
  readonly name: string | undefined;
  readonly data: TData;
  readonly config: TConf;
  readonly lastStacks: Call[];
  readonly path: DelayedValue<string>;
  readonly dirname: DelayedValue<string>;
  readonly resolved: boolean | undefined;
  symbol: Symbol | undefined;

  constructor(readonly options: ResOptions<TData, TConf>) {
    this.name = options.name;
    this.data = options.data as any;
    this.config = Object.keys(options).reduce((config, key) => {
      if (key !== "name" && key !== "data") (config as any)[key] = options[key];
      return config;
    }, {} as TConf);
    this.lastStacks = getLastStacks([{ startsWith: __dirname }], true);
    this.path = new DelayedValue((path) => `./${path}`, this.lastStacks);
    this.dirname = new DelayedValue(
      (path) => `./${posix.dirname(path)}`,
      this.lastStacks
    );
  }

  getDefaultExtension(): string | void {}
  abstract toString(): string;

  static isInstance(value: unknown): value is AbstractRes {
    if (value instanceof this) return true;
    const instanceType = (
      (value as AbstractRes | undefined)?.constructor as
        | typeof AbstractRes
        | undefined
    )?._tplResType;
    return (
      (this._tplResType === ResType.Abstract && !!instanceType) ||
      (this._tplResType === instanceType &&
        this.name === `${ResType[this._tplResType]}Res`)
    );
  }

  async onReady(path: string) {
    setDelayedValue(this.path, path);
    setDelayedValue(this.dirname, path);
  }
}
