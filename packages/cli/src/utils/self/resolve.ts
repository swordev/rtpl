import { AbstractModel } from "../..";
import { DirModel } from "../../models/DirModel";
import { isPlainObject } from "../object";
import { makeFilter } from "../string";
import { Config, parseConfigFile } from "./config";
import { global } from "./global";
import { isMatch } from "micromatch";
import { basename, dirname, join, relative } from "path";
import { Awaited } from "ts-essentials";

export type CallOptions = {
  configPath?: string;
  filter?: string[];
  outPath: string;
  lockPath: string;
};

export function resolvePath(data: {
  path: string;
  outPath: string;
  lockDir: string;
}) {
  let path = join(data.outPath, data.path);
  path = relative(data.lockDir, path);
  return path.replace(/\\/g, "/");
}

export async function resolveModels(options: {
  input: unknown;
  outPath?: string;
  lockDir?: string;
  filter?: string[];
  onValue?: (
    key: string,
    value: AbstractModel,
    actions: { process: boolean; add: boolean }
  ) => Promise<void | false>;
}) {
  const values: Record<string, AbstractModel> = {};
  const patterns = options?.filter?.flatMap((v) => makeFilter(v));
  const isPath = (name: string) => name.includes("/");
  const isDir = (name: string) => name.endsWith("/");

  const process = async (input: unknown, levels: string[]) => {
    if (isPlainObject(input)) {
      for (const name in input) {
        const value = input[name];
        await process(value, [...levels, name]);
      }
    } else if (typeof input === "function") {
      if (input.length === 0) {
        const value = await input();
        await process(value, levels);
      }
    } else if (Array.isArray(input)) {
      let index = 0;
      for (const value of input) {
        await process(value, [...levels, (index++).toString()]);
      }
    } else if (AbstractModel.isInstance(input)) {
      const modelName = input.name;

      if (modelName) {
        const modelNameBase = basename(modelName);
        if (modelName !== modelNameBase)
          throw new Error(`Invalid model name: ${modelName}`);
      }

      const pathLevels = levels.slice(0, -1);
      const tag = levels.slice(-1)[0] ?? "_";

      if (isPath(tag)) {
        if (isDir(tag)) {
          pathLevels.push(tag, input.name ?? "_");
        } else {
          pathLevels.push(tag);
        }
      } else {
        pathLevels.push(input.name ?? tag);
      }

      const path = resolvePath({
        path: pathLevels.join("/"),
        lockDir: options.lockDir ?? ".",
        outPath: options.outPath ?? ".",
      });

      if (
        patterns &&
        !isMatch(path, patterns, {
          dot: true,
        })
      )
        return;
      const actions = { process: true, add: true };
      const result = await options.onValue?.(path, input, actions);
      if (result === false) actions.add = actions.process = false;
      if (actions.add) {
        if (path in values) throw new Error(`Duplicated model path: ${path}`);
        values[path] = input as any;
      }
      if (actions.process && DirModel.isInstance(input))
        await process(input.spec, pathLevels);
    }
  };
  await process(options.input, []);
  return values;
}

export async function resolve(options: CallOptions, config?: Config) {
  global.lastCallOptions = options;
  if (!config) config = await parseConfigFile(options.configPath);
  let result: Record<string, Awaited<ReturnType<typeof resolveModels>>> = {};
  const lockDir = dirname(options.lockPath);
  const outPath = options.outPath;
  const filter = options.filter;

  for (const tpl of config.templates) {
    const modelOptions = tpl.options ?? {};
    let input = tpl.useModel ? await tpl.useModel(modelOptions) : {};
    result[tpl.name] = await resolveModels({
      input,
      lockDir,
      outPath,
      filter,
      onValue: async (path, model, actions) => {
        if (model.resolved === false) {
          actions.process = false;
        } else {
          (model as { resolved: boolean }).resolved = true;
        }
      },
    });
  }

  for (const tpl of config.templates) {
    if (tpl.useTransformer) {
      const tmp = tpl.useTransformer(result, {
        modelName: tpl.name,
        options,
      });
      if (tmp) result = tmp as typeof result;
    }
  }

  for (const name in result) {
    result[name] = await resolveModels({
      input: result[name],
      lockDir,
      outPath,
      filter,
      onValue: async (path, model, actions) => {
        await model.onReady(path);
        if (DirModel.isInstance(model)) {
          actions.add = false;
          actions.process = !model.resolved;
        }
      },
    });
  }

  const paths: string[] = [];
  for (const name in result) {
    for (const path in result[name]) {
      if (paths.includes(path)) throw new Error(`Duplicated path: ${path}`);
      paths.push(path);
    }
  }
  return result;
}
