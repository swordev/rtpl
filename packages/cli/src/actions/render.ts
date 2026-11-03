import { styleText } from "node:util";
import { GlobalOptions } from "../cli.js";
import { parseTplConfigFile } from "../utils/self/config.js";
import { createTplResources } from "../utils/self/resolve.js";

export default async function render(options: GlobalOptions) {
  const config = await parseTplConfigFile(options.config);
  const { resources } = await createTplResources(config);
  for (const path in resources) {
    const res = resources[path];
    console.info(styleText("cyan", path));
    console.info(res.toString());
    console.info();
  }
  return { exitCode: 0 };
}
