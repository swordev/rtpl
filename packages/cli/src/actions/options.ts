import { GlobalOptions } from "../cli.js";
import { parseConfigFile } from "../utils/self/config.js";
import { parseTplFile, resolveTpl } from "../utils/self/resolve.js";
import { stringify } from "yaml";

export type OptionsOptions = GlobalOptions & {
  format: "json" | "js" | "yaml";
};

export default async function options(options: OptionsOptions) {
  const config = await parseConfigFile(options.config);
  const tpl = await parseTplFile(config.template.path);
  await resolveTpl(tpl, { config, filter: options.filter });
  const tplOptions = await tpl.options();

  if (options.format === "yaml") {
    console.info(stringify(tplOptions, { version: "1.1" }));
  } else if (options.format === "json") {
    console.info(JSON.stringify(tplOptions, null, 2));
  } else {
    throw new Error(`Invalid format: ${options.format}`);
  }
  return { exitCode: 0 };
}
