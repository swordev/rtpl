import { cyan, grey } from "chalk";
import { createInterface, Interface } from "readline";

export async function prompt(text: string, rl?: Interface) {
  if (!rl)
    rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  return new Promise<string>((resolve) => {
    rl!.question(text, (value: string) => {
      rl!.close();
      resolve(value.trim());
    });
  });
}

export async function confirmPrompt(text: string, rl?: Interface) {
  const result = await prompt(`${cyan("?")} ${text} ${grey("(Y/n)")}: `, rl);

  const yesRegex = /^y(es)?$/i;
  const noRegex = /^n(o)?$/i;
  if (yesRegex.test(result) || result.trim() === "") {
    return true;
  } else if (noRegex.test(result)) {
    return false;
  } else {
    return undefined;
  }
}
