import { GlobalOptions } from "../cli.js";
import { confirmPrompt } from "../utils/cli.js";
import { styleText } from "util";
import { parseTplConfigFile } from "../utils/self/config.js";
import { existsSync } from "fs";
import { TplLock } from "../utils/self/lock.js";

export type RepairLockOptions = GlobalOptions & {};

export default async function repairLock(options: RepairLockOptions) {
  const config = await parseTplConfigFile(options.config);
  const lock = new TplLock(config.paths.lock);
  const lockData = await lock.read();

  const notfounds: string[] = [];

  for (const path in lockData.files) {
    if (!existsSync(path)) {
      delete lockData.files[path];
      if (!notfounds.length)
        console.info(styleText("yellow", "Files not found:"));
      console.info(styleText("yellow", `- ${path}`));
      notfounds.push(path);
    }
  }

  if (notfounds.length) console.info();

  if (!notfounds.length) {
    console.info(styleText("green", "Lock file is correct."));
    return { exitCode: 0 };
  }

  const confirm = await confirmPrompt(
    "Do you want to remove those files from the rtpl lock file?",
  );

  if (!confirm) return { exitCode: 1 };

  await lock.write(lockData);

  console.info(styleText("green", "Lock file repared."));

  return { exitCode: 0 };
}
