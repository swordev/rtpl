import {
  defineTpl,
  defineTplSchema,
  JsonRes,
  RawRes,
  resolveTplResources,
} from "../../../src/index.js";
import { describe, expect, it } from "vitest";

describe("defineTpl options", () => {
  it("keeps defaults when an option is explicitly undefined", async () => {
    const tpl = defineTpl({
      name: "app",
      schema: defineTplSchema<{ port: number }>(),
      defaultOptions: { port: 80 },
      resources: (o) => ({ o: new JsonRes({ data: o }) }),
    });
    expect((await tpl.withOptions({ port: undefined })).options.port).toBe(80);
  });

  it("reports invalid options with the template name", async () => {
    const tpl = defineTpl({
      name: "app",
      schema: defineTplSchema<{ port: number }>((value: any) =>
        typeof value.port === "number"
          ? { value }
          : { issues: [{ message: "port required" }] },
      ),
      resources: (o) => ({ o: new JsonRes({ data: o }) }),
    });
    await expect(tpl.withOptions({})).rejects.toThrow(/"app".*port required/);
  });
});

describe("defineTpl custom resources", () => {
  it("rejects unknown keys", async () => {
    const tpl = defineTpl({
      name: "app",
      resources: () => ({ config: new JsonRes({ data: {} }) }),
    });
    await expect(
      resolveTplResources([tpl.with({ resources: { typo: "x" } as any })]),
    ).rejects.toThrow(/Custom resource "typo" not found/);
  });

  it("uses object keys (not resource names) as key paths", async () => {
    const tpl = defineTpl({
      name: "app",
      resources: () => ({
        group: { config: new JsonRes({ name: "settings.json", data: {} }) },
      }),
    });
    expect(
      await resolveTplResources([
        tpl.with({ resources: { "group/config": "raw" } }),
      ]),
    ).toEqual({ "resources/app/group/settings.json": "raw" });
  });

  it("exposes replacements to onResolve", async () => {
    let seen: unknown;
    const tpl = defineTpl({
      name: "app",
      resources: () => ({ config: new JsonRes({ data: { a: 1 } }) }),
      onResolve: ({ fs }) => {
        seen = fs.find({ name: "config.json" });
      },
    });
    await resolveTplResources([tpl.with({ resources: { config: "raw" } })]);
    expect(seen).toBeInstanceOf(RawRes);
  });
});
