import { DirRes } from "../../resources/DirRes";
import { clone, merge } from "../object";
import { DeepPartial } from "../ts";
import { createResourceSystem, ResourceSystem } from "./rs";
import { Builtin } from "ts-essentials";
import { z } from "zod";

export type Resources = Record<string, unknown>;
export type PartialOptions<O> = DeepPartial<O, Builtin>;
export type DepsTpl = { [name: string]: Tpl };
export type Enabled<
  T extends string | number | symbol = string | number | symbol
> =
  | {
      [N in T]?: boolean;
    }
  | T[];

function normalizeEnabled<
  T extends string | number | symbol = string | number | symbol
>(input: Enabled<T>): T[] {
  if (Array.isArray(input)) return input;
  return Object.keys(input).filter(
    (name) => input[name as keyof typeof input]
  ) as T[];
}

export function createEnabledArray<
  T extends string | number | symbol = string | number | symbol
>(enabled: Enabled<T> | undefined) {
  const enabledArray = normalizeEnabled(enabled ?? []);
  return {
    values: enabledArray,
    includes: (name: T) => (enabled ? enabledArray.includes(name) : true),
  };
}

export type DepsResources<T extends { [name: string]: Tpl }> = {
  [name in keyof T]: T[name] extends Tpl<unknown, infer R> ? R : never;
};

export type ResResult<R, D extends { [name: string]: Tpl }> = R extends DirRes<
  infer RData
>
  ? DirRes<RData & DepsResources<D>>
  : R & DepsResources<D>;

export type DepsOptions<T extends { [name: string]: Tpl }> = {
  [name in keyof T]: T[name] extends Tpl<infer O, unknown> ? O : never;
};

export type TplSelf<D extends DepsTpl = {}> = {
  isEnabled: (name: keyof D) => boolean;
};

export type TplOptionsSelf<D extends DepsTpl = {}> = TplSelf<D> & {
  createDefaultsEnabled: (defaults: Enabled<keyof D>) => {
    enabled: Enabled<keyof D>;
    isEnabled: (name: keyof D) => boolean;
  };
};

export type TplTransformerSelf<D extends DepsTpl = {}> = TplSelf<D> &
  ResourceSystem;

export type TplResourcesSelf<D extends DepsTpl = {}> = TplSelf<D> & {
  depNames: (keyof D)[];
  deps: {
    [K in keyof D]: D[K] extends Tpl<infer O, infer R>
      ? (options?: PartialOptions<O>) => Promise<R>
      : never;
  };
};

export type TplOptions<O, D extends DepsTpl = {}> = O & {
  enabled?: Enabled<keyof D>;
  deps?: DepsOptions<D>;
};

export type TplConfig<O = any, R = any, D extends DepsTpl = {}> = {
  name: string;
  deps?: D;
  schema?: z.ZodType<O>;
  defaultOptions?: PartialOptions<TplOptions<O, D>>;
  options?:
    | PartialOptions<TplOptions<O, D>>
    | ((
        this: TplOptionsSelf<D>,
        o: PartialOptions<TplOptions<O, D>>,
        cast: (
          o: PartialOptions<TplOptions<O, D>>
        ) => PartialOptions<TplOptions<O, D>>
      ) => Promise<PartialOptions<TplOptions<O, D>>>);
  resources?: (this: TplResourcesSelf<D>, o: TplOptions<O, D>) => Promise<R>;
  transformer?: (this: TplTransformerSelf<D>) => Promise<void | undefined>;
};

export class Tpl<O = any, R = any, D extends DepsTpl = any> {
  #options: TplOptions<O, D> | undefined;
  protected deps: D;
  constructor(readonly config: TplConfig<O, R, D>) {
    this.deps = Object.entries<Tpl>(config.deps || {}).reduce(
      (deps, [name, tpl]) => {
        (deps as any)[name] = tpl.fork();
        return deps;
      },
      {} as D
    );
  }

  private createOptionsSelf(
    o?: PartialOptions<TplOptions<O, D>>
  ): TplOptionsSelf<D> {
    const enabled = createEnabledArray<keyof D>(o?.enabled as any);

    return {
      isEnabled: (name) => enabled.includes(name),
      createDefaultsEnabled: (defaults) => {
        const enabled = createEnabledArray<keyof D>(
          (o?.enabled ?? defaults) as any
        );

        return {
          enabled: enabled.values,
          isEnabled: (name) => enabled.includes(name),
        };
      },
    };
  }

  private createResourcesSelf(o: TplOptions<O, D>): TplResourcesSelf<D> {
    const enabled = createEnabledArray(o.enabled);
    const self: TplResourcesSelf<D> = {
      isEnabled: (name) => enabled.includes(name),
      depNames: [],
      deps: {} as any,
    };

    for (const [depName, depTpl] of Object.entries<Tpl>(this.deps)) {
      (self.deps as any)[depName] = async (o: any) => {
        self.depNames.push(depName);
        await depTpl.updateOptions(o);
        return await depTpl.resources();
      };
    }

    return self;
  }

  private createTransformSelf(
    o: TplOptions<O, D>,
    resources: Resources
  ): TplTransformerSelf<D> {
    const enabled = createEnabledArray(o.enabled);
    const self: TplTransformerSelf<D> = {
      isEnabled: (name) => enabled.includes(name),
      ...createResourceSystem(resources),
    };
    return self;
  }

  async setOptions(
    o?: PartialOptions<TplOptions<O, D>>
  ): Promise<TplOptions<O, D>> {
    o = this.config.defaultOptions
      ? merge(clone(this.config.defaultOptions), o)
      : o;
    const { config } = this;
    const self = this.createOptionsSelf(o);
    const cast = (o: DeepPartial<TplOptions<O, D>>) => o;
    let configOptions: TplOptions<O, D>;

    if (typeof config.options === "function") {
      const cb = config.options.bind(self);
      configOptions = ((await cb(o! || {}, cast)) ?? {}) as any;
    } else if (config.options) {
      configOptions = merge({}, config.options) as any;
    } else {
      configOptions = {} as any;
    }

    configOptions = merge(configOptions, o);

    const depsOptions: Record<string, unknown> = {} as any;
    const enabled = createEnabledArray(configOptions.enabled);

    for (const [depName, depTpl] of Object.entries<Tpl>(this.deps)) {
      if (enabled.includes(depName)) {
        const depOptions = configOptions.deps?.[depName];

        depsOptions[depName] = await depTpl.setOptions(depOptions);
      }
    }

    const options = {
      ...configOptions,
      deps: depsOptions,
    } as TplOptions<O, D>;

    if (config.schema) config.schema.parse(options);
    return (this.#options = options);
  }

  async updateOptions(o?: PartialOptions<TplOptions<O, D>>) {
    if (this.#options) {
      if (o) {
        return this.setOptions(merge(this.#options, o));
      } else {
        return this.#options;
      }
    } else {
      return await this.setOptions(o);
    }
  }

  async options() {
    return this.#options ?? (await this.setOptions());
  }

  async resources() {
    const { config } = this;
    const options = await this.options();
    const self = this.createResourcesSelf(options);
    const res =
      (await config.resources?.bind(self as any)(options)) || ({} as R);
    const depRes: Record<string, any> = {};

    for (const [depName] of Object.entries<Tpl>(this.deps)) {
      if (!self.depNames.includes(depName) && self.isEnabled(depName))
        depRes[depName] = await self.deps[depName]();
    }

    if (res instanceof DirRes) {
      return res.add(depRes) as ResResult<R, D>;
    } else {
      return {
        ...res,
        ...depRes,
      } as ResResult<R, D>;
    }
  }

  async transformer(resources: Resources) {
    const { config } = this;
    const options = await this.options();
    const self = this.createTransformSelf(options, resources);
    const enabled = createEnabledArray(options.enabled);

    for (const [depName, depTpl] of Object.entries<Tpl>(this.deps)) {
      if (enabled.includes(depName)) await depTpl.transformer(self);
    }

    await config.transformer?.bind(self)();
  }

  fork(defaultOptions?: PartialOptions<TplOptions<O, D>>) {
    return new Tpl({
      ...this.config,
      defaultOptions: this.config.defaultOptions
        ? defaultOptions
          ? merge(clone(this.config.defaultOptions), defaultOptions)
          : clone(this.config.defaultOptions)
        : defaultOptions
        ? clone(defaultOptions)
        : undefined,
    });
  }
}

export function createTpl<O>(): <R, D extends { [name: string]: Tpl } = any>(
  config: TplConfig<O, R, D>
) => Tpl<O, R, D>;
export function createTpl<O, R, D extends { [name: string]: Tpl } = any>(
  config: TplConfig<O, R, D>
): Tpl<O, R, D>;
export function createTpl(config?: TplConfig<any, any, any>): any {
  if (arguments.length === 0) {
    return (config: TplConfig) => new Tpl(config);
  } else {
    return new Tpl(config!);
  }
}
