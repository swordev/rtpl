import { GlobalOptions } from "../cli.js";
import install, { InstallActionOptions } from "./install.js";

export type CheckOptions = GlobalOptions & Omit<InstallActionOptions, "dryRun">;

export default async function check(options: CheckOptions) {
  const { changes, exitCode } = await install({
    ...options,
    dryRun: true,
  });
  if (exitCode) {
    return { exitCode };
  } else if (changes) {
    return { exitCode: 1 };
  } else {
    return { exitCode: 0 };
  }
}
