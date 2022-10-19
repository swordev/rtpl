import { merge } from "../object";
import { DeepPartial } from "../ts";
import { createResourceSystem, ResourceSystem } from "./rs";
import { Builtin } from "ts-essentials";
import { z } from "zod";

export type Resources = Record<string, unknown>;
export type PartialOptions<O> = DeepPartial<O, Builtin>;
export type DepsTpl = { [name: string]: Tpl };

export type DepsResources<T extends { [name: string]: Tpl }> = {
  [name in keyof T]: T[name] extends Tpl<unknown, infer R> ? R : never;
};

export type DepsOptions<T extends { [name: string]: Tpl }> = {
  [name in keyof T]: T[name] extends Tpl<infer O, unknown> ? O : never;
};

export type TplOptions<O, D extends DepsTpl = {}> = O & {
  enabled?: {
    [N in keyof D]?: boolean;
  };
  deps?: DepsOptions<D>;
};

export type TplConfig<O = any, R = any, D extends DepsTpl = {}> = {
  name: string;
  deps?: D;
  groups?: Record<string, (keyof D)[]>;
  schema?: z.ZodType<O>;
  options?:
    | PartialOptions<TplOptions<O, D>>
    | ((
        options: PartialOptions<TplOptions<O, D>>,
        cast: (
          options: PartialOptions<TplOptions<O, D>>
        ) => PartialOptions<TplOptions<O, D>>
      ) => Promise<PartialOptions<TplOptions<O, D>>>);
  resources?: (options: O) => Promise<R>;
  transformer?: ($: ResourceSystem) => void | undefined;
};

export type Tpl<O = any, R = any, D extends DepsTpl = any> = {
  config: TplConfig<O, R, D>;
  options: (
    options?: PartialOptions<TplOptions<O, D>>
  ) => Promise<TplOptions<O, D>>;
  resources: (
    options?: PartialOptions<TplOptions<O, D>>
  ) => Promise<R & DepsResources<D>>;
  transformer: (resources: Resources) => void | undefined;
};

function createTplObject<O = any, R = any, D extends DepsTpl = any>(
  config: TplConfig<O, R, D>
): Tpl<O, R, D> {
  const tpl: Tpl<O, R, D> = {
    config,
    options: async (o) => {
      const deps: Record<string, unknown> = {};
      if (config.deps) {
        for (const [depName, depTpl] of Object.entries<Tpl>(config.deps)) {
          const depOptions = (o?.deps as any)?.[depName];
          deps[depName] = await depTpl.options(depOptions);
        }
      }
      let defaults: O = { deps } as O;
      if (typeof config.options === "function") {
        defaults = ((await config.options((o as any) || {}, (o) => o)) ??
          {}) as O;
      } else if (config.options) {
        defaults = merge({}, config.options) as O;
      }
      const options = merge(defaults, o) as TplOptions<O, D>;
      if (config.schema) config.schema.parse(options);
      return options;
    },
    resources: async (o) => {
      const depResMap: Record<string, any> = {};
      if (config.deps) {
        for (const [depName, depTpl] of Object.entries<Tpl>(config.deps)) {
          const depOptions = (o?.deps as any)?.[depName];
          depResMap[depName] = await depTpl.resources(depOptions);
        }
      }
      return {
        ...((await config.resources?.(await tpl.options(o))) || ({} as R)),
        ...depResMap,
      } as R & DepsResources<D>;
    },
    transformer: (r) => {
      const $ = createResourceSystem(r);
      if (config.deps) {
        for (const [, depTpl] of Object.entries<Tpl>(config.deps)) {
          depTpl.transformer($);
        }
      }
      config.transformer?.($);
    },
  };
  return tpl;
}

export function createTpl<O>(): <R, D extends { [name: string]: Tpl } = any>(
  data: TplConfig<O, R, D>
) => Tpl<O, R, D>;
export function createTpl<O, R, D extends { [name: string]: Tpl } = any>(
  data: TplConfig<O, R, D>
): Tpl<O, R, D>;
export function createTpl(data?: TplConfig): any {
  if (arguments.length === 0) {
    return (data: TplConfig) => createTplObject(data);
  } else {
    return createTplObject(data!);
  }
}
