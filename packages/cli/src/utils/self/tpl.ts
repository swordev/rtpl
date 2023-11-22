import { DirRes, MinimalDirRes } from "../../resources/DirRes.js";
import { clone, merge } from "../object.js";
import { DeepPartial } from "../ts.js";
import {
  MinimalTpl,
  MinimalTplConfig,
  ResourcesResultItem,
} from "./minimal-tpl.js";
import { z } from "zod";

export type TplDeps = { [name: string]: Tpl };

export type TplDepsRes<T extends { [name: string]: Tpl }> = {
  [name in keyof T]: T[name] extends Tpl<unknown, infer R> ? R : never;
};

export type TplResResult<
  R,
  D extends { [name: string]: Tpl },
> = R extends DirRes<infer RData>
  ? DirRes<RData & TplDepsRes<D>>
  : R & TplDepsRes<D>;

export type TplDepsOptions<T extends { [name: string]: Tpl }> = {
  [name in keyof T]: T[name] extends Tpl<infer O, infer R, infer D>
    ? TplOptions<O, D>
    : never;
};

export type TplResourcesSelf<D extends TplDeps = {}> = {
  depNames: (keyof D)[];
  deps: {
    [K in keyof D]: D[K] extends Tpl<infer O, infer R>
      ? (options?: DeepPartial<O>) => Promise<R>
      : never;
  };
};

export type TplOptions<O, D extends TplDeps = {}> = O & {
  enabled?: { [k in keyof D]?: boolean };
  deps?: TplDepsOptions<D>;
};

export interface TplConfig<O = any, R = any, D extends TplDeps = {}>
  extends MinimalTplConfig<O, R> {
  deps?: D;
  schema?: z.ZodType<O>;
  defaultOptions?: DeepPartial<TplOptions<O, D>>;
  options?:
    | DeepPartial<TplOptions<O, D>>
    | ((
        o: DeepPartial<TplOptions<O, D>>,
        cast: (
          o: DeepPartial<TplOptions<O, D>>,
        ) => DeepPartial<TplOptions<O, D>>,
      ) => Promise<DeepPartial<TplOptions<O, D>>>);
  resources?: (this: TplResourcesSelf<D>, o: TplOptions<O, D>) => Promise<R>;
}

export class Tpl<O = any, R = any, D extends TplDeps = any>
  implements MinimalTpl
{
  #options: TplOptions<O, D> | undefined;
  protected deps: D;
  constructor(readonly config: TplConfig<O, R, D>) {
    this.deps = Object.entries<Tpl>(config.deps || {}).reduce(
      (deps, [name, tpl]) => {
        (deps as any)[name] = tpl.fork();
        return deps;
      },
      {} as D,
    );
  }

  private createResourcesSelf(
    items: ResourcesResultItem[],
  ): TplResourcesSelf<D> {
    const self: TplResourcesSelf<D> = {
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
    o?: DeepPartial<TplOptions<O, D>>,
  ): Promise<TplOptions<O, D>> {
    o = this.config.defaultOptions
      ? merge(clone(this.config.defaultOptions), o)
      : o;
    const { config } = this;
    const cast = (o: DeepPartial<TplOptions<O, D>>) => o;
    let configOptions: TplOptions<O, D>;

    if (typeof config.options === "function") {
      const cb = config.options;
      configOptions = ((await cb(o! || {}, cast)) ?? {}) as any;
    } else if (config.options) {
      configOptions = merge({}, config.options) as any;
    } else {
      configOptions = {} as any;
    }

    configOptions = merge(configOptions, o);

    const depsOptions: Record<string, unknown> = {} as any;

    for (const [depName, depTpl] of Object.entries<Tpl>(this.deps)) {
      if (configOptions.enabled?.[depName]) {
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

  async updateOptions(
    o?: DeepPartial<TplOptions<O, D>>,
  ): Promise<TplOptions<O, D>> {
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

  async options(): Promise<TplOptions<O, D>> {
    return this.#options ?? (await this.setOptions());
  }

  async resources(
    items: ResourcesResultItem[] = [],
  ): Promise<TplResResult<R, D>> {
    const { config } = this;
    const options = await this.options();
    const self = this.createResourcesSelf(items);
    const res =
      (await config.resources?.bind(self as any)(options)) || ({} as R);
    const depRes: Record<string, any> = {};

    for (const [depName] of Object.entries<Tpl>(this.deps)) {
      if (!self.depNames.includes(depName) && options.enabled?.[depName])
        depRes[depName] = await self.deps[depName]();
    }

    const resources = MinimalDirRes.isInstance(res)
      ? ((res as any as MinimalDirRes).add(depRes) as TplResResult<R, D>)
      : ({ ...res, ...depRes } as TplResResult<R, D>);

    items.push({ tpl: this, resources });

    return resources;
  }

  fork(defaultOptions?: DeepPartial<TplOptions<O, D>>): Tpl<O, R, D> {
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
  config: TplConfig<O, R, D>,
) => Tpl<O, R, D>;
export function createTpl<O, R, D extends { [name: string]: Tpl } = any>(
  config: TplConfig<O, R, D>,
): Tpl<O, R, D>;
export function createTpl(config?: TplConfig<any, any, any>): any {
  if (arguments.length === 0) {
    return (config: TplConfig) => new Tpl(config);
  } else {
    return new Tpl(config!);
  }
}
