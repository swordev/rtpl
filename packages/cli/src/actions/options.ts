import { GlobalOptions } from "../cli";
import { readTplFile } from "../utils/self/resolve";
import camelCase from "lodash.camelcase";
import { stringify } from "yaml";

export type OptionsOptions = GlobalOptions & {
  format: "json" | "js" | "yaml";
};

export default async function options(options: OptionsOptions) {
  const tpl = await readTplFile(options.templatePath);
  const tplOptions = tpl.options();

  if (options.format === "yaml") {
    console.info(
      stringify(tplOptions, {
        version: "1.1",
      })
    );
  } else if (options.format === "json") {
    console.info(JSON.stringify(tplOptions, null, 2));
  } else if (options.format === "js") {
    const items = Object.entries(tplOptions).reduce(
      (items, [name, options]) => {
        const tplName = camelCase(name);
        items.push(`${tplName}Tpl(${JSON.stringify(options, null, 2)})`);
        return items;
      },
      [] as string[]
    );
    console.info(`[${items.join(",\n")}]`);
  } else {
    throw new Error(`Invalid format: ${options.format}`);
  }
  return { exitCode: 0 };
}
