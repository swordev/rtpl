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

function createFileName(tag: string, input: AbstractRes) {
  const defaultExtension = input["onDefaultExtension"]();
  if (
    typeof defaultExtension === "string" &&
    !tag.includes(".") &&
    !input.name
  ) {
    return `${tag}.${defaultExtension}`;
  }
  return tag;
}

function* iterateResources(
  inResources: TplResources,
  parentPath: string[],
): Generator<[string, AbstractRes]> {
  for (const key in inResources) {
    const value = (inResources as any)[key];
    if (DirRes.isInstance(value)) {
      const path = [...parentPath, value.name ?? createFileName(key, value)];
      yield [path.join("/"), value];
      yield* iterateResources(value.data, path);
    } else if (value instanceof AbstractRes) {
      const outPath = [...parentPath, value.name ?? createFileName(key, value)]
        .join("/")
        .split("/")
        .filter((f) => !f.startsWith("_"));
      yield [outPath.join("/"), value];
    } else if (isPlainObject(value)) {
      yield* iterateResources(value as TplResources, [...parentPath, key]);
    }
  }
}

export async function createTplResources(
  config: ResolvedTplConfig,
  options: { secrets?: Record<string, string>; includeDirs?: boolean } = {},
) {
  const templates = await Promise.all(config.templates);
  const ctx = new ResReadyContext({
    secrets:
      options.secrets ||
      (config.secrets.enabled
        ? await new TplSecrets(config.paths.secrets).read()
        : undefined),
    initialSecrets: !(await checkPath(config.paths.secrets)),
  });
  const resources: Record<string, AbstractRes> = {};
  const resourcesByTemplate: Record<string, any> = {};
  for (const tpl of templates) {
    resourcesByTemplate[tpl.name] = await tpl.resources();
    for (const [path, res] of iterateResources(resourcesByTemplate[tpl.name], [
      config.resourcesDir,
      tpl.name,
    ])) {
      resources[path] = res;
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
  for (const path in resources) {
    const isValidPath =
      path.startsWith(config.resourcesDir) ||
      config.resourcePathAllowlist?.includes(path);
    if (!isValidPath) {
      throw new Error(
        `Resource path "${path}" is outside of the resources directory`,
      );
    }

    const res = resources[path];
    await res["onReady"]?.(path, ctx);
    if (DirRes.isInstance(res) && !options.includeDirs) delete resources[path];
  }

  return { resources, secrets: ctx.data.secrets };
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
      return [
        path,
        DirRes.isInstance(res) ? undefined : (res as any).toString(),
      ] as [string, string];
    }),
  );
}
