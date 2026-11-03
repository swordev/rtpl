/** @type {import("npm-check-updates").RunOptions} */
export default {
  workspaces: true,
  root: true,
  cooldown: "1440m",
  dep: "dev,optional,prod,bundle,peer",
};
