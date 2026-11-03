import { GlobalOptions } from "../cli.js";
import { styleText } from "util";
import { confirmPrompt } from "../utils/cli.js";
import { parseTplConfigFile } from "../utils/self/config.js";
import { TplSecrets } from "../utils/self/secrets.js";
import { createTplResources } from "../utils/self/resolve.js";

export type PurgeSecretsOptions = GlobalOptions & {
  confirm?: boolean;
};

export default async function purgeSecrets(options: PurgeSecretsOptions) {
  const config = await parseTplConfigFile(options.config);
  const { secrets: newSecrets } = await createTplResources(config, {
    secrets: {},
  });
  const manager = new TplSecrets(config.paths.secrets);
  const { secrets, deletions } = await manager.purge(newSecrets);

  if (!deletions.length) {
    console.info(styleText("green", "Secrets file is ok."));
    return { exitCode: 0 };
  }

  console.info();
  console.info(styleText("yellow", "The next secrets are no longer in use:"));
  for (const path of deletions) console.info(styleText("yellow", `- ${path}`));
  console.info();

  if (!options.confirm) {
    const confirm = await confirmPrompt(
      "Do you want to remove those secrets from the rtpl secrets file?",
    );
    if (!confirm) return { exitCode: 1 };
  }

  await manager.write(secrets);
  console.info(styleText("green", "Secret file purged."));
  return { exitCode: 0 };
}
