import type { ResourceSystem } from "./rs.js";

export type Resources = Record<string, unknown>;
export type ResourcesResultItem = {
  tpl: MinimalTpl;
  resources: unknown;
};

export interface MinimalTplConfig {
  name: string;
  onResolve?: (
    this: ResourceSystem,
    items: any,
    options: any,
  ) => Promise<void | undefined>;
}

export interface MinimalTpl<O = unknown, R = unknown> {
  readonly config: MinimalTplConfig;
  resources(items?: ResourcesResultItem[]): Promise<R>;
  options(): Promise<O>;
}
