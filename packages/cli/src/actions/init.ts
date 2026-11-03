import { styleText } from "util";
import { GlobalOptions } from "../cli.js";
import { checkPath } from "../utils/fs.js";
import { writeFile } from "fs/promises";
import { join } from "path";

export type CheckOptions = GlobalOptions;

export default async function init(options: CheckOptions) {
  const code = `
import { defineTplConfig, defineTpl, JsonRes, defineTplSchema } from "rtpl";

const tpl = defineTpl({
  name: "app",
  schema: defineTplSchema<{ version: string }>(),
  defaultOptions: { version: "1.0.0" },
  resources: (o) => ({
    config: new JsonRes({ data: { version: o.version } }),
  }),
});

export default defineTplConfig({
  templates: [tpl.with({})],
});

`;
  const base = `rtpl.config.ts`;
  const path = join(process.cwd(), base);
  if (await checkPath(path)) {
    console.error(`[${styleText("yellow", "!")}] "${base}" already exists`);
    return { exitCode: 1 };
  }
  await writeFile(path, code);
}
