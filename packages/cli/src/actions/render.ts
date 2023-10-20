import { GlobalOptions } from "../cli.js";
import { readTplFile, resolveTpl } from "../utils/self/resolve.js";

export default async function render(options: GlobalOptions) {
  const tpl = await readTplFile(options.templatePath);
  const resources = await resolveTpl(tpl, {
    filter: options.filter,
    lockPath: options.lockPath,
    outPath: options.outPath,
  });
  for (const path in resources) {
    const res = resources[path];
    console.info("\x1b[36m%s\x1b[0m", path);
    console.info(res.toString());
    console.info();
  }
  return { exitCode: 0 };
}
