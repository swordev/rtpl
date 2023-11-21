import { normalize } from "path";

export function isPath(path: string) {
  return path.includes("/");
}

export function isDir(path: string) {
  return path.endsWith("/");
}

export function stripRootBackPaths(path: string) {
  const folders = normalize(path).replaceAll("\\", "/").split("/");
  let pass = false;
  return folders
    .filter((v) => {
      if (v === "..") {
        return pass;
      } else if (!pass) {
        return (pass = true);
      } else {
        return true;
      }
    })
    .join("/");
}

export function expandPaths(
  path: string,
  ext: { js?: boolean; ts?: boolean; json?: boolean },
) {
  const exts: string[] = [
    ...(ext.js ? ["js", "cjs", "mjs"] : []),
    ...(ext.ts ? ["ts", "cts", "mts"] : []),
    ...(ext.json ? ["json"] : []),
  ];
  return path.includes("*") ? exts.map((e) => path.replace("*", e)) : [path];
}
