import { DirRes } from "../../resources/DirRes.js";
import { clone, merge } from "../object.js";
import { DeepPartial } from "../ts.js";
import { ResourceSystem } from "./rs.js";
import { MinimalTpl, ResourcesResultItem } from "./tpl.js";
import { Builtin } from "ts-essentials";
import { z } from "zod";

export type PartialOptions<O> = DeepPartial<O, Builtin>;
export type DepsTpl = { [name: string]: Tpl };
export type Enabled<
  T extends string | number | symbol = string | number | symbol,
> =
  | {
      [N in T]?: boolean;
    }
  | T[];

function normalizeEnabled<
  T extends string | number | symbol = string | number | symbol,
>(input: Enabled<T>): T[] {
  if (Array.isArray(input)) return input;
  return Object.keys(input).filter(
    (name) => input[name as keyof typeof input],
  ) as T[];
}

export function createEnabledArray<
  T extends string | number | symbol = string | number | symbol,
>(
  enabled: Enabled<T> | undefined,
  groups: Record<string, Enabled<T>> | undefined,
) {
  const enabledArray = normalizeEnabled(enabled ?? []);
  const groupsArrays: Record<string, T[]> = {};
  for (const name in groups) {
    groupsArrays[name] = normalizeEnabled(groups[name]);
  }

  const values = enabledArray.flatMap(
    (v) => groupsArrays[v as keyof typeof groupsArrays] ?? v,
  );
  return {
    values,
    includes: (name: T) => (enabled ? values.includes(name) : true),
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
  [name in keyof T]: T[name] extends Tpl<infer O, infer R, infer D, infer DG>
    ? TplOptions<O, D, DG>
    : never;
};

export type TplSelf<D extends DepsTpl = {}, DG extends string = never> = {
  isEnabled: (name: DG | keyof D) => boolean;
};

export type TplOptionsSelf<
  D extends DepsTpl = {},
  DG extends string = never,
> = TplSelf<D, DG> & {
  createDefaultsEnabled: (defaults: Enabled<DG | keyof D>) => {
    enabled: Enabled<DG | keyof D>;
    isEnabled: (name: DG | keyof D) => boolean;
  };
};

export type TplResourcesSelf<D extends DepsTpl = {}> = TplSelf<D> & {
  depNames: (keyof D)[];
  deps: {
    [K in keyof D]: D[K] extends Tpl<infer O, infer R>
      ? (options?: PartialOptions<O>) => Promise<R>
      : never;
  };
};

export type TplOptions<
  O,
  D extends DepsTpl = {},
  DG extends string = string,
> = O & {
  enabled?: Enabled<DG | keyof D>;
  deps?: DepsOptions<D>;
};

export type TplConfig<
  O = any,
  R = any,
  D extends DepsTpl = {},
  DG extends string = never,
> = {
  name: string;
  deps?: D;
  depGroups?: { [name in DG]: Enabled<keyof D> };
  schema?: z.ZodType<O>;
  defaultOptions?: PartialOptions<TplOptions<O, D, DG>>;
  options?:
    | PartialOptions<TplOptions<O, D, DG>>
    | ((
        this: TplOptionsSelf<D, DG>,
        o: PartialOptions<TplOptions<O, D, DG>>,
        cast: (
          o: PartialOptions<TplOptions<O, D, DG>>,
        ) => PartialOptions<TplOptions<O, D, DG>>,
      ) => Promise<PartialOptions<TplOptions<O, D, DG>>>);
  resources?: (
    this: TplResourcesSelf<D>,
    o: TplOptions<O, D, DG>,
  ) => Promise<R>;
  onResolve?: (
    this: ResourceSystem,
    r: R,
    o: TplOptions<O, D, DG>,
  ) => Promise<void | undefined>;
};

export class Tpl<
  O = any,
  R = any,
  D extends DepsTpl = any,
  DG extends string = never,
> implements MinimalTpl
{
  #options: TplOptions<O, D> | undefined;
  protected deps: D;
  constructor(readonly config: TplConfig<O, R, D, DG>) {
    this.deps = Object.entries<Tpl>(config.deps || {}).reduce(
      (deps, [name, tpl]) => {
        (deps as any)[name] = tpl.fork();
        return deps;
      },
      {} as D,
    );
  }

  private createOptionsSelf(
    o?: PartialOptions<TplOptions<O, D, DG>>,
  ): TplOptionsSelf<D, DG> {
    const enabled = createEnabledArray<DG | keyof D>(
      o?.enabled as any,
      this.config.depGroups,
    );

    return {
      isEnabled: (name) => enabled.includes(name),
      createDefaultsEnabled: (defaults) => {
        const enabled = createEnabledArray<DG | keyof D>(
          (o?.enabled ?? defaults) as any,
          this.config.depGroups,
        );

        return {
          enabled: enabled.values,
          isEnabled: (name) => enabled.includes(name),
        };
      },
    };
  }

  private createResourcesSelf(
    o: TplOptions<O, D, DG>,
    items: ResourcesResultItem[],
  ): TplResourcesSelf<D> {
    const enabled = createEnabledArray(o.enabled, this.config.depGroups);
    const self: TplResourcesSelf<D> = {
      isEnabled: (name) => enabled.includes(name),
      depNames: [],
      deps: {} as any,
    };

    for (const [depName, depTpl] of Object.entries<Tpl>(this.deps)) {
      (self.deps as any)[depName] = async (o: any) => {
        self.depNames.push(depName);
        await depTpl.updateOptions(o);
        return depTpl.resources(items);
      };
    }

    return self;
  }

  async setOptions(
    o?: PartialOptions<TplOptions<O, D, DG>>,
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
    const enabled = createEnabledArray(
      configOptions.enabled,
      this.config.depGroups,
    );

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

  async updateOptions(o?: PartialOptions<TplOptions<O, D, DG>>) {
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

  async resources(items: ResourcesResultItem[] = []) {
    const { config } = this;
    const options = await this.options();
    const self = this.createResourcesSelf(options, items);
    const res =
      (await config.resources?.bind(self as any)(options)) || ({} as R);
    const depRes: Record<string, any> = {};

    for (const [depName] of Object.entries<Tpl>(this.deps)) {
      if (!self.depNames.includes(depName) && self.isEnabled(depName))
        depRes[depName] = await self.deps[depName]();
    }

    const resources =
      res instanceof DirRes
        ? (res.add(depRes) as ResResult<R, D>)
        : ({ ...res, ...depRes } as ResResult<R, D>);

    items.push({ tpl: this, resources });

    return resources;
  }

  fork(defaultOptions?: PartialOptions<TplOptions<O, D, DG>>) {
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

export function createTpl<O>(): <
  R,
  D extends { [name: string]: Tpl } = any,
  DG extends string = never,
>(
  config: TplConfig<O, R, D, DG>,
) => Tpl<O, R, D, DG>;
export function createTpl<
  O,
  R,
  D extends { [name: string]: Tpl } = any,
  DG extends string = never,
>(config: TplConfig<O, R, D, DG>): Tpl<O, R, D, DG>;
export function createTpl(config?: TplConfig<any, any, any, any>): any {
  if (arguments.length === 0) {
    return (config: TplConfig) => new Tpl(config);
  } else {
    return new Tpl(config!);
  }
}
