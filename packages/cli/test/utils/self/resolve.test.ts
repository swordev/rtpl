import { describe, expect, it } from "vitest";
import {
  defineTpl,
  defineTplSchema,
  DirRes,
  JsonRes,
  resolveTplResources,
  SecretRes,
  YamlRes,
} from "../../../src/index.js";

describe("resolveTplResources", () => {
  it("resolves template resources correctly", async () => {
    const tpl0 = defineTpl({
      name: "test0",
      schema: defineTplSchema<{ version: string }>(),
      defaultOptions: (o) => ({ version: o.version }),
      resources: (o) => {
        const password = new SecretRes({});
        return {
          password,
          config: new JsonRes({
            data: {
              version: o.version,
              password,
            },
          }),
        };
      },
    });

    const tpl1 = defineTpl({
      name: "test1",
      resources: () => ({
        x: new YamlRes({ data: { x: 1 } }),
        config: new DirRes({
          name: ".config",
          password: new SecretRes({}),
        }),
      }),
    });
    const resources = await resolveTplResources(
      [tpl0.with({ options: { version: "1" } }), tpl1],
      {
        "resources/test0/password.secret": "8YdCjcXIisJm400w",
        "resources/test1/.config/password.secret": "Gl3s8Ogqk14TZDDw",
      },
    );
    expect(resources).toMatchInlineSnapshot(`
      {
        "resources/test0/config.json": "{
        "version": "1",
        "password": "8YdCjcXIisJm400w"
      }",
        "resources/test0/password.secret": "8YdCjcXIisJm400w",
        "resources/test1/.config/password.secret": "Gl3s8Ogqk14TZDDw",
        "resources/test1/x.yaml": "x: 1
      ",
      }
    `);
  });
  it("skips private folders", async () => {
    const resources = await resolveTplResources([
      defineTpl({
        name: "test",
        resources: () => ({
          a: {
            b: {
              _c: {
                d: new JsonRes({ data: { value: 1 } }),
              },
            },
          },
        }),
      }),
    ]);

    expect(resources).toMatchInlineSnapshot(`
      {
        "resources/test/a/b/d.json": "{
        "value": 1
      }",
      }
    `);
  });
  it("move to prev folder", async () => {
    const tpl = defineTpl({
      name: "test",
      resources: () => ({
        a: new JsonRes({ name: "file1.json", data: { value: 1 } }),
        b: new JsonRes({ name: "file2.json", data: { value: 2 } }),
      }),
      onResolve: ({ fs }) => {
        fs.move({ name: "file1.json" }, ".");
      },
    });

    await expect(resolveTplResources([tpl])).rejects.toThrow();

    expect(
      await resolveTplResources({
        templates: [tpl],
        resourcePathAllowlist: ["file1.json"],
      }),
    ).toMatchInlineSnapshot(`
      {
        "file1.json": "{
        "value": 1
      }",
        "resources/test/file2.json": "{
        "value": 2
      }",
      }
    `);
  });
  it("uses defaults options", async () => {
    const tpl = defineTpl({
      name: "test",
      schema: defineTplSchema<{
        app: {
          name: string;
          version: string;
        };
      }>(),
      defaultOptions: { app: { version: "1" } },
      resources: (data) => ({ options: new JsonRes({ data }) }),
    });

    expect(
      await resolveTplResources([tpl.withOptions({ app: { name: "app1" } })]),
    ).toMatchInlineSnapshot(`
      {
        "resources/test/options.json": "{
        "app": {
          "version": "1",
          "name": "app1"
        }
      }",
      }
    `);

    expect(
      await resolveTplResources([tpl.withOptions({ app: { version: "2" } })]),
    ).toMatchInlineSnapshot(`
      {
        "resources/test/options.json": "{
        "app": {
          "version": "2"
        }
      }",
      }
    `);
  });
  it("uses on options", async () => {
    const tpl = defineTpl({
      name: "test",
      schema: defineTplSchema<{
        app: {
          name: string;
          version: string;
        };
      }>(),
      onOptions: (options) => {
        if (options.app?.name === "app1") {
          options.app.version = "1";
        }
        return options;
      },
      resources: (data) => ({ options: new JsonRes({ data }) }),
    });

    expect(
      await resolveTplResources([tpl.withOptions({ app: { name: "app1" } })]),
    ).toMatchInlineSnapshot(`
      {
        "resources/test/options.json": "{
        "app": {
          "name": "app1",
          "version": "1"
        }
      }",
      }
    `);

    expect(
      await resolveTplResources([tpl.withOptions({ app: { name: "app2" } })]),
    ).toMatchInlineSnapshot(`
      {
        "resources/test/options.json": "{
        "app": {
          "name": "app2"
        }
      }",
      }
    `);
  });
});
