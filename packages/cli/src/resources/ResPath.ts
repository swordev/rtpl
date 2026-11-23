import { DelayedValue, setDelayedValue } from "./DelayedValue.js";
import { posix } from "path";

/**
 * Relative path of a resource (`./resources/app/file.json`), resolved once
 * the resource is ready.
 */
export class ResPath extends DelayedValue<string> {
  readonly dirname = new DelayedValue<string>();
}

export function setResPath(target: ResPath, path: string) {
  const dirname = posix.dirname(path);
  setDelayedValue(target, `./${path}`);
  setDelayedValue(target.dirname, dirname === "." ? "." : `./${dirname}`);
}
