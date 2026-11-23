import {
  AbstractRes,
  defineTpl,
  DirRes,
  JsonRes,
  RawRes,
  resolveTplResources,
} from "../../../src/index.js";
import { createResourceSystem } from "../../../src/utils/self/rs.js";
import { it, describe, expect } from "vitest";

describe("extractMap", () => {
  it("shoulds filter by name", () => {
    const res1 = new JsonRes({});
    const res2 = new JsonRes({});
    const rs = createResourceSystem({
      res1,
      res2,
    });
    expect(rs.remove({ name: "res1" }, true)).toMatchObject({
      res1: {},
    });
  });

  it("shoulds filter by data instance", () => {
    class Data {}
    const data = new Data();
    const res1 = new JsonRes({
      data,
    });
    const res2 = new JsonRes({});
    const rs = createResourceSystem({
      res1,
      res2,
    });
    expect(rs.remove({ instanceOf: { data: Data } }, true)).toMatchObject({
      res1: data,
    });
  });

  it("shoulds filter by instance", () => {
    class CustomRes extends JsonRes<{
      a: number;
    }> {}

    const res1 = new CustomRes({
      data: {
        a: 1,
      },
    });
    const res2 = new JsonRes({});
    const rs = createResourceSystem({
      res1,
      res2,
    });
    expect(rs.remove({ instanceOf: CustomRes }, true)).toMatchObject({
      res1: {},
    });
  });

  it("shoulds filter by test function", () => {
    const res1 = new JsonRes({ data: "a" });
    const res2 = new JsonRes({ data: "b" });
    const rs = createResourceSystem({
      res1,
      res2,
    });
    const extracted = rs.remove(
      { test: (res) => res instanceof JsonRes && res.data === "b" },
      true,
    );
    expect(Object.keys(extracted)).toMatchObject(["res2"]);
    expect(extracted["res2"] === res2).toBeTruthy();
  });
});

describe("filter", () => {
  it("filters by custom resource", () => {
    class CustomRes extends AbstractRes<number> {
      toString(): string {
        return this.data.toString();
      }
    }

    const res = createResourceSystem({
      res1: new JsonRes({ data: "a" }),
      res2: new CustomRes({ data: 1 }),
    }).filter({ instanceOf: CustomRes });

    expect(res.length).toBe(1);
    expect(res[0].data).toBe(1);
  });
  it("filters by string resource", () => {
    class CustomRes extends AbstractRes<number> {
      toString(): string {
        return this.data.toString();
      }
    }

    const res = createResourceSystem({
      res1: new RawRes({ data: "a" }),
      res2: new CustomRes({ data: 1 }),
    }).filter({ instanceOf: RawRes });

    expect(res.length).toBe(1);
    expect(res[0].data).toBe("a");
  });
});

describe("resource system inside onResolve", () => {
  it("does not return duplicates for resources nested in a DirRes", async () => {
    let found: unknown[] = [];
    const tpl = defineTpl({
      name: "app",
      resources: () => ({
        dir: new DirRes({}).add({ config: new JsonRes({ data: { a: 1 } }) }),
      }),
      onResolve: ({ fs }) => {
        found = fs.filter({ instanceOf: JsonRes });
      },
    });
    await resolveTplResources([tpl]);
    expect(found).toHaveLength(1);
  });

  it("moves a resource nested in a DirRes once", async () => {
    const tpl = defineTpl({
      name: "app",
      resources: () => ({
        dir: new DirRes({}).add({
          config: new JsonRes({ name: "config.json", data: { a: 1 } }),
        }),
      }),
      onResolve: ({ fs }) => {
        fs.move({ instanceOf: JsonRes }, "resources/moved");
      },
    });
    const resources = await resolveTplResources([tpl]);
    expect(Object.keys(resources).sort()).toEqual([
      "resources/app/dir",
      "resources/moved/config.json",
    ]);
  });

  it("stops iterating nested resources when the callback returns false", () => {
    const rs = createResourceSystem({
      dir: new DirRes({
        data: { a: new RawRes({}), b: new RawRes({}) },
      }),
      c: new RawRes({}),
    });
    const visited: string[] = [];
    rs.forEach({ instanceOf: RawRes }, ({ ref }) => {
      visited.push(ref);
      return false;
    });
    expect(visited).toEqual(["a"]);
  });
});
