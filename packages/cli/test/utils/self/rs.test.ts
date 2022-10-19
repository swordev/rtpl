import { JsonRes } from "../../../src";
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
      })
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
      })
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
      })
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
