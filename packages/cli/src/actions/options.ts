import { GlobalOptions } from "../cli.js";
import { parseTplConfigFile } from "../utils/self/config.js";
import { stringify } from "yaml";

export type OptionsOptions = GlobalOptions & {
  format: "json" | "js" | "yaml";
};

export default async function options(options: OptionsOptions) {
  const config = await parseTplConfigFile(options.config);
  const templates = await Promise.all(config.templates);
  const tplOptions: Record<string, any> = {};
  for (const tpl of templates) {
    tplOptions[tpl.name] = tpl.options;
  }
  if (options.format === "yaml") {
    console.info(stringify(tplOptions, { version: "1.1" }));
  } else if (options.format === "json") {
    console.info(JSON.stringify(tplOptions, null, 2));
  } else {
    throw new Error(`Invalid format: ${options.format}`);
  }
  return { exitCode: 0 };
}
