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
