import { describe, expect, it } from "vitest";
import {
  defineTpl,
  defineTplSchema,
  DirRes,
  JsonRes,
  RawRes,
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
          data: {
            password: new SecretRes({}),
          },
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
        "resources/test1/.config": undefined,
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

  it("rejects resource paths outside of the resources directory", async () => {
    for (const name of ["../../evil.json", "../../../evil.json"]) {
      const tpl = defineTpl({
        name: "test",
        resources: () => ({ a: new JsonRes({ name, data: {} }) }),
      });
      await expect(resolveTplResources([tpl])).rejects.toThrow(
        /outside of the resources directory/,
      );
    }
    const prefixTpl = defineTpl({
      name: "test",
      resources: () => ({ a: new JsonRes({ name: "a.json", data: {} }) }),
      onResolve: ({ fs }) => {
        fs.move({ name: "a.json" }, "resources-other");
      },
    });
    await expect(resolveTplResources([prefixTpl])).rejects.toThrow(
      /outside of the resources directory/,
    );
  });
});

describe("resolveTplResources paths", () => {
  it("keeps '_'-prefixed keys and names for files and dirs", async () => {
    const tpl = defineTpl({
      name: "app",
      resources: () => ({
        _private: new JsonRes({ data: {} }),
        redirects: new RawRes({ name: "_redirects", data: "/a /b" }),
        _dir: new DirRes({}).add({ file: new JsonRes({ data: {} }) }),
      }),
    });
    expect(Object.keys(await resolveTplResources([tpl])).sort()).toEqual([
      "resources/app/_dir",
      "resources/app/_dir/file.json",
      "resources/app/_private.json",
      "resources/app/_redirects",
    ]);
  });

  it("rejects duplicate resource paths", async () => {
    const tpl = defineTpl({
      name: "app",
      resources: () => ({
        config: new JsonRes({ data: { a: 1 } }),
        other: new JsonRes({ name: "config.json", data: { b: 2 } }),
      }),
    });
    await expect(resolveTplResources([tpl])).rejects.toThrow(
      /Duplicate resource path "resources\/app\/config.json"/,
    );
  });

  it("rejects duplicate template names", async () => {
    const tpl = defineTpl({
      name: "app",
      resources: () => ({ config: new JsonRes({ data: {} }) }),
    });
    await expect(resolveTplResources([tpl, tpl])).rejects.toThrow(
      /Duplicate template name "app"/,
    );
  });

  it("normalizes allowlisted paths", async () => {
    const tpl = defineTpl({
      name: "app",
      resources: () => ({
        config: new JsonRes({ name: "root.json", data: {} }),
      }),
      onResolve: ({ fs }) => {
        fs.move({ name: "root.json" }, ".");
      },
    });
    expect(
      await resolveTplResources({
        templates: [tpl],
        resourcePathAllowlist: ["./root.json"],
      }),
    ).toEqual({ "root.json": "{}" });
  });

  it("resolves dirname of root-level files as '.'", async () => {
    const root = new JsonRes({ name: "root.json", data: {} });
    const nested = new JsonRes({ name: "nested.json", data: {} });
    const tpl = defineTpl({
      name: "app",
      resources: () => ({ root, nested }),
      onResolve: ({ fs }) => {
        fs.move({ name: "root.json" }, ".");
      },
    });
    await resolveTplResources({
      templates: [tpl],
      resourcePathAllowlist: ["root.json"],
    });
    expect(root.path.toString()).toBe("./root.json");
    expect(root.path.dirname.toString()).toBe(".");
    expect(nested.path.dirname.toString()).toBe("./resources/app");
  });
});
