import chalk from "chalk";
import { createInterface, Interface } from "readline";

export async function prompt(text: string, rl?: Interface) {
  if (!rl)
    rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  return new Promise<string>((resolve) => {
    rl?.on("SIGINT", () => {
      console.info();
      process.exit(1);
    });
    rl!.question(text, (value: string) => {
      rl!.close();
      resolve(value.trim());
    });
  });
}

export async function confirmPrompt(
  text: string,
  defaults = true,
  rl?: Interface,
) {
  const ynText = defaults ? "Y/n" : "y/N";
  const result = await prompt(
    `${chalk.cyan("?")} ${text} ${chalk.grey(`(${ynText})`)}: `,
    rl,
  );

  const yesRegex = /^y(es)?$/i;
  const noRegex = /^n(o)?$/i;

  if (result.trim() === "") {
    return defaults;
  } else if (yesRegex.test(result)) {
    return true;
  } else if (noRegex.test(result)) {
    return false;
  } else {
    return undefined;
  }
}
