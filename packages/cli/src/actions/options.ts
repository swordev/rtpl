import { GlobalOptions } from "../cli";
import { parseConfigFile } from "../utils/self/config";
import camelCase from "lodash.camelcase";
import { stringify } from "yaml";

export type OptionsOptions = GlobalOptions & {
  format: "json" | "js" | "yaml";
};

export default async function options(options: OptionsOptions) {
  const config = await parseConfigFile(options.configPath);
  let result: Record<string, any> = {};

  for (const tpl of config.templates) {
    if (!tpl.useModel) throw new Error(`'useModel' not found`);

    const modelOptions = tpl.options ?? {};
    result[tpl.name] = tpl.useOptions
      ? await tpl.useOptions(modelOptions)
      : modelOptions;
  }

  if (options.format === "yaml") {
    console.info(
      stringify(result, {
        version: "1.1",
      })
    );
  } else if (options.format === "json") {
    console.info(JSON.stringify(result, null, 2));
  } else if (options.format === "js") {
    const items = Object.entries(result).reduce((items, [name, options]) => {
      const tplName = camelCase(name);
      items.push(`${tplName}Tpl(${JSON.stringify(options, null, 2)})`);
      return items;
    }, [] as string[]);
    console.info(`[${items.join(",\n")}]`);
  } else {
    throw new Error(`Invalid format: ${options.format}`);
  }
  return { exitCode: 0 };
}
