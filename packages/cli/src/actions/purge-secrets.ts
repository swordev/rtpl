import { GlobalOptions } from "../cli.js";
import { confirmPrompt } from "../utils/cli.js";
import { parseConfigFile } from "../utils/self/config.js";
import { parseTplFile, resolveTpl } from "../utils/self/resolve.js";
import {
  parseSecretsFile,
  Secrets,
  writeSecretsFile,
} from "../utils/self/secrets.js";
import chalk from "chalk";

export type PurgeSecretsOptions = GlobalOptions & {
  confirm?: boolean;
};

export default async function purgeSecrets(options: PurgeSecretsOptions) {
  const config = await parseConfigFile(options.config);
  const tpl = await parseTplFile(config.template.path);
  const { secrets: newSecrets } = await resolveTpl(tpl, {
    config,
    secrets: {},
  });
  const currentSecrets = await parseSecretsFile(config.secrets.path);
  const secrets: Secrets = {};
  const deletions: string[] = [];
  for (const path in currentSecrets) {
    if (path in (newSecrets || {})) {
      secrets[path] = currentSecrets[path];
    } else {
      deletions.push(path);
    }
  }

  if (!deletions.length) {
    console.info(chalk.green("Secrets file is ok."));
    return { exitCode: 0 };
  }

  console.info();
  console.info(chalk.yellow("The next secrets are no longer in use:"));
  for (const path of deletions) console.info(chalk.yellow(`- ${path}`));
  console.info();

  if (!options.confirm) {
    const confirm = await confirmPrompt(
      "Do you want to remove those secrets from the rtpl secrets file?",
    );
    if (!confirm) return { exitCode: 1 };
  }

  await writeSecretsFile(config.secrets.path, secrets);
  console.info(chalk.green("Secret file purged."));
  return { exitCode: 0 };
}
