import { Secrets } from "../utils/self/secrets.js";
import { Call, getLastStacks } from "../utils/stack.js";
import { DelayedValue, setDelayedValue } from "./DelayedValue.js";
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

const kindType = "_tplRes";

export class MinimalRes<T = any, D = any> {
  protected [kindType] = true;
  protected readonly type!: T;
  protected readonly _data!: D;
}

export abstract class AbstractRes<
  Type = any,
  TData = any,
  TConf extends Record<string, unknown> = {},
> extends MinimalRes<Type, TData> {
  protected static type = ResType.Abstract;
  readonly name: string | undefined;
  readonly data: TData;
  readonly config: TConf;
  readonly lastStacks: Call[];
  readonly path: DelayedValue<string>;
  readonly dirname: DelayedValue<string>;
  readonly resolved: boolean | undefined;
  symbol: symbol | undefined;
  constructor(
    readonly options: ResOptions<TData, TConf>,
    symbol?: symbol,
  ) {
    super();
    this.name = options.name;
    this.data = options.data as any;
    this.symbol = symbol;
    this.config = Object.keys(options).reduce((config, key) => {
      if (key !== "name" && key !== "data") (config as any)[key] = options[key];
      return config;
    }, {} as TConf);
    this.lastStacks = getLastStacks(
      [{ startsWith: new URL(".", import.meta.url).href }],
      true,
    );
    this.path = new DelayedValue((path) => `./${path}`, this.lastStacks);
    this.dirname = new DelayedValue(
      (path) => `./${posix.dirname(path)}`,
      this.lastStacks,
    );
  }

  getDefaultExtension(): string | void {}
  abstract toString(): string;

  static isInstance(value: unknown): value is AbstractRes {
    if (value instanceof this) return true;

    const isThis = (type: ResType) =>
      this.type === type && this.name === `${ResType[type]}Res`;

    const instanceType = (value?.constructor as typeof AbstractRes | undefined)
      ?.type;

    return (
      !!instanceType &&
      !!value &&
      (value as any)[kindType] &&
      (isThis(ResType.Abstract) || isThis(instanceType))
    );
  }

  async onReady(path: string, secrets: Secrets) {
    setDelayedValue(this.path, path);
    setDelayedValue(this.dirname, path);
  }
}
