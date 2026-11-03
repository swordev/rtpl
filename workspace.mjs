// @ts-check
import { createTSConfigFiles, defineConfig } from "@dreamkit/workspace";

export default defineConfig(({ pkg, packages }) => {
  return {
    files: createTSConfigFiles({
      pkg,
      packages,
      cjs: false,
      base: {
        include: ["src", "test"],
        compilerOptions: {
          rootDir: ".",
          noEmit: true,
        },
      },
      build: {
        extends: ["@tsconfig/node24"],
        include: ["src"],
        compilerOptions: {
          rootDir: "src",
          types: ["node"],
          outDir: "lib",
        },
      },
    }),
  };
});
