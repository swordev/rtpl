import { AbstractRes, DirRes, JsonRes, RawRes } from "../../../src";
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

  it("filters with symbols", () => {
    const res = {
      r1: new RawRes({}, Symbol()),
      r2: new DirRes(
        {
          data: {
            r3: new RawRes({}),
            r4: new RawRes({}, Symbol()),
          },
        },
        Symbol(),
      ),
    };

    const rs = createResourceSystem(res);

    const f1 = rs.filter({ symbol: res.r1.symbol });
    expect(f1.length).toBe(1);
    expect(f1.includes(res.r1)).toBeTruthy();

    const f2 = rs.filter({ symbol: res.r2.symbol });
    expect(f2.length).toBe(2);
    expect(f2.includes(res.r2)).toBeTruthy();
    expect(f2.includes(res.r2.data.r3)).toBeTruthy();

    const f3 = rs.filter({ symbol: res.r2.symbol, instanceOf: DirRes });
    expect(f3.length).toBe(1);
    expect(f3.includes(res.r2)).toBeTruthy();
  });
});
