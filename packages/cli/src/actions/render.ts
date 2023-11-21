import { GlobalOptions } from "../cli.js";
import { parseConfigFile } from "../utils/self/config.js";
import { parseTplFile, resolveTpl } from "../utils/self/resolve.js";

export default async function render(options: GlobalOptions) {
  const config = await parseConfigFile(options.config);
  const tpl = await parseTplFile(config.template.path);
  const { resources } = await resolveTpl(tpl, {
    config,
    filter: options.filter,
  });
  for (const path in resources) {
    const res = resources[path];
    console.info("\x1b[36m%s\x1b[0m", path);
    console.info(res.toString());
    console.info();
  }
  return { exitCode: 0 };
}
