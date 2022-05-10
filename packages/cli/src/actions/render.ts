import { GlobalOptions } from "../cli";
import { resolve } from "../utils/self/resolve";

export default async function render(options: GlobalOptions) {
  const allModels = await resolve({
    filter: options.filter,
    configPath: options.configPath,
    lockPath: options.lockPath,
    outPath: options.outPath,
  });
  for (const name in allModels) {
    const models = allModels[name];
    for (const path in models) {
      const model = models[path];
      console.info("\x1b[36m%s\x1b[0m", path);
      console.info(model.toString());
      console.info();
    }
  }
  return { exitCode: 0 };
}
