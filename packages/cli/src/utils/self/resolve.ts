import { AbstractRes, ResReadyContext } from "../../resources/AbstractRes.js";
import { TplResources } from "./tpl.js";
import { DirRes } from "../../resources/DirRes.js";
import {
  defineTplConfig,
  InTplConfig,
  ResolvedTplConfig,
  resolveTplConfig,
  TplConfig,
} from "./config.js";
import { TplSecrets } from "./secrets.js";
import { checkPath } from "../fs.js";
import { createResourceSystem } from "./rs.js";
import { isPlainObject } from "../object.js";
import { RawRes } from "../../resources/RawRes.js";
import { SecretRes } from "../../resources/SecretRes.js";
import { posix } from "path";

const normalizePath = (value: string) =>
  posix.normalize(value.replaceAll("\\", "/")).replace(/\/+$/, "");

function isInsideDir(path: string, dir: string) {
  const normalizedPath = normalizePath(path);
  if (normalizedPath.split("/").includes("..")) return false;
  const normalizedDir = normalizePath(dir);
  if (normalizedDir === ".") return normalizedPath !== ".";
  return normalizedPath.startsWith(`${normalizedDir}/`);
}

function createFileName(tag: string, input: AbstractRes) {
  return input.extension && !tag.includes(".")
    ? `${tag}.${input.extension}`
    : tag;
}

/**
 * Plain object keys starting with `_` group resources without adding a path
 * segment. Resource names (and keys used as resource names) are kept as is.
 */
function* iterateResources(
  inResources: TplResources,
  parentPath: string[] = [],
  parentKeyPath: string[] = [],
): Generator<{
  keyPath: string;
  path: string;
  res: AbstractRes;
}> {
  for (const key in inResources) {
    const value = (inResources as any)[key];
    const keyPath = [...parentKeyPath, key];
    if (value instanceof DirRes) {
      const path = [...parentPath, value.name ?? createFileName(key, value)];
      yield {
        keyPath: keyPath.join("/"),
        path: path.join("/"),
        res: value,
      };
      yield* iterateResources(value.data, path, keyPath);
    } else if (value instanceof AbstractRes) {
      yield {
        keyPath: keyPath.join("/"),
        path: [...parentPath, value.name ?? createFileName(key, value)].join(
          "/",
        ),
        res: value,
      };
    } else if (isPlainObject(value)) {
      yield* iterateResources(
        value as TplResources,
        key.startsWith("_") ? parentPath : [...parentPath, key],
        keyPath,
      );
    }
  }
}

export async function createTplResources(
  config: ResolvedTplConfig,
  options: { secrets?: Record<string, string>; includeDirs?: boolean } = {},
) {
  const templates = await Promise.all(config.templates);
  const ctx: ResReadyContext = {
    root: config.paths.root,
    secrets:
      options.secrets ||
      (config.secrets.enabled
        ? await new TplSecrets(config.paths.secrets).read()
        : undefined),
    initialSecrets: !(await checkPath(config.paths.secrets)),
  };
  const resources: Record<string, AbstractRes> = {};
  const resourcesByTemplate: Record<string, any> = {};
  for (const tpl of templates) {
    if (tpl.name in resourcesByTemplate)
      throw new Error(`Duplicate template name "${tpl.name}"`);
    resourcesByTemplate[tpl.name] = await tpl.resources();
    const usedCustomResources = new Set<string>();
    const parentPath = [config.resourcesDir, tpl.name];
    for (const { path, keyPath, res } of iterateResources(
      resourcesByTemplate[tpl.name],
    )) {
      const absPath = [...parentPath, path].join("/");
      if (absPath in resources)
        throw new Error(`Duplicate resource path "${absPath}"`);
      const customRes = tpl.customResources?.[keyPath];
      if (customRes !== undefined) usedCustomResources.add(keyPath);
      if (typeof customRes === "function") {
        resources[absPath] = customRes(res);
      } else if (typeof customRes === "string") {
        if (res instanceof SecretRes) {
          res.data ??= {};
          res.data.value = customRes;
          resources[absPath] = res;
        } else {
          resources[absPath] = new RawRes({
            data: customRes,
            mode: res.mode,
            owner: res.owner,
            group: res.group,
          });
        }
      } else {
        resources[absPath] = res;
      }
    }
    for (const keyPath in tpl.customResources) {
      if (!usedCustomResources.has(keyPath))
        throw new Error(
          `Custom resource "${keyPath}" not found in template "${tpl.name}"`,
        );
    }
  }
  const fs = createResourceSystem(resources);
  for (const tpl of templates) {
    await tpl.onResolve?.({
      name: tpl.name,
      options: tpl.options,
      resources: resourcesByTemplate[tpl.name],
      fs,
    });
  }
  const allowlist = new Set(
    config.resourcePathAllowlist?.map((path) => normalizePath(path)),
  );
  for (const path in resources) {
    const isValidPath =
      isInsideDir(path, config.resourcesDir) ||
      allowlist.has(normalizePath(path));
    if (!isValidPath) {
      throw new Error(
        `Resource path "${path}" is outside of the resources directory`,
      );
    }
  }

  for (const path in resources) {
    const res = resources[path];
    await res["onReady"](path, ctx);
    if (res instanceof DirRes && !options.includeDirs) delete resources[path];
  }

  return { resources, secrets: ctx.secrets };
}

export async function resolveTplResources(
  input: TplConfig["templates"] | InTplConfig,
  secrets?: Record<string, string>,
) {
  const inConfig = defineTplConfig(
    Array.isArray(input) ? { templates: input } : input,
  );
  const config = resolveTplConfig(inConfig);
  const { resources } = await createTplResources(config, {
    secrets,
    includeDirs: true,
  });
  return Object.fromEntries(
    Object.entries(resources).map(([path, res]) => {
      return [path, res instanceof DirRes ? undefined : res.toString()] as [
        string,
        string,
      ];
    }),
  );
}
