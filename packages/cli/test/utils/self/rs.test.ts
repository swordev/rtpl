import { AbstractRes, JsonRes, RawRes } from "../../../src";
import { createResourceSystem } from "../../../src/utils/self/rs";
import { it, describe, expect } from "vitest";

describe("extractMap", () => {
  it("shoulds filter by name", () => {
    const res1 = new JsonRes({});
    const res2 = new JsonRes({});
    const rs = createResourceSystem({
      res1,
      res2,
    });
    expect(
      rs.extractMap({
        name: "res1",
      }),
    ).toMatchObject({
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
    expect(
      rs.extractMap({
        instanceOf: { data: Data },
      }),
    ).toMatchObject({
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
    expect(
      rs.extractMap({
        instanceOf: CustomRes,
      }),
    ).toMatchObject({
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
    const extracted = rs.extractMap({
      test: (res) => res instanceof JsonRes && res.data === "b",
    });
    expect(Object.keys(extracted)).toMatchObject(["res2"]);
    expect(extracted["res2"] === res2).toBeTruthy();
  });
});

describe("findOne", () => {
  it("filters by custom resource", () => {
    class CustomRes extends AbstractRes<number> {
      toString(): string {
        return this.data.toString();
      }
    }

    const res = createResourceSystem({
      res1: new JsonRes({ data: "a" }),
      res2: new CustomRes({ data: 1 }),
    }).find({ instanceOf: CustomRes });

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
    }).find({ instanceOf: RawRes });

    expect(res.length).toBe(1);
    expect(res[0].data).toBe("a");
  });
});
