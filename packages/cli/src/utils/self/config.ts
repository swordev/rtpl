import { AbstractModel } from "../..";
import { InstallActionOptions } from "../../actions/install";
import { parseJsonFile, resolveIndexPath } from "../fs";
import { merge } from "../object";
import { DeepPartial } from "../ts";
import { CallOptions } from "./resolve";
import { Builtin } from "ts-essentials";

export type Models = Record<string, unknown>;
export type PartialOptions<T> = DeepPartial<T, Builtin | AbstractModel>;

export type UseOptions<TOptions> = (
  input: PartialOptions<TOptions>
) => Promise<TOptions>;

export type UseModel<TOptions, TModel> = (
  options?: PartialOptions<TOptions>,
  defaultOptions?: PartialOptions<TOptions>
) => Promise<TModel>;

export type UseTransformer<TOptions> = (
  models: Record<string, Record<string, AbstractModel<any>>>,
  data: {
    modelName: string;
    options: CallOptions;
  }
) => Models | void;

export type Template<TOptions = any, TModel = any> = {
  name: string;
  options?: PartialOptions<TOptions>;
  useOptions?: UseOptions<TOptions>;
  useModel?: UseModel<TOptions, TModel>;
  useTransformer?: UseTransformer<TOptions>;
  onBeforeInstall?: (options: InstallActionOptions) => Promise<void>;
  onInstall?: (options: InstallActionOptions) => Promise<void>;
};

export type Config = {
  templates: Template<any>[];
};

export function defineTemplate<TOptions>(
  data: Template<TOptions>
): typeof data {
  return data;
}

export function defineConfig(config: Config) {
  return config;
}

export async function parseConfigFile(path: string | undefined) {
  const config: Config = {
    templates: [],
  };
  let configFromFile: Config | undefined;
  if (path) {
    path = await resolveIndexPath(path, true);
    if (path) {
      try {
        configFromFile = await parseJsonFile<Config>(path);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
    }
  }
  return configFromFile ? merge(config, configFromFile) : config;
}
