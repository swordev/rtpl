import { GlobalOptions } from "../cli.js";
import install, { InstallActionOptions } from "./install.js";

export type CheckOptions = GlobalOptions &
  Omit<InstallActionOptions, "dryRun" | "confirm" | "backup">;

export default async function check(options: CheckOptions) {
  const { changes, exitCode } = await install({
    ...options,
    dryRun: true,
    confirm: true,
    backup: false,
  });
  if (exitCode) {
    return { exitCode };
  } else if (changes) {
    return { exitCode: 1 };
  } else {
    return { exitCode: 0 };
  }
}
