import { normalize } from "path";

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
