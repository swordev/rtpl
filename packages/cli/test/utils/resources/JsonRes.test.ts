import { RawRes } from "../../../src/index.js";
import { JsonRes } from "../../../src/resources/JsonRes.js";
import { it, describe, expect } from "vitest";

describe("JsonRes.toString", () => {
  it("resolves all values", () => {
    class C {
      toJSON() {
        return 3;
      }
    }

    const res = new JsonRes({
      data: {
        a: () => 1,
        b: 2,
        c: new C(),
        d: () => new C(),
        e: () => () => () => 1,
        f: new JsonRes({
          data: {
            a: 1,
          },
        }),
        g: new RawRes({
          data: "test",
        }),
      },
    });
    expect(res.toString()).toBe(
      JSON.stringify(
        {
          a: 1,
          b: 2,
          c: 3,
          d: 3,
          e: 1,
          f: {
            a: 1,
          },
          g: "test",
        },
        null,
        2,
      ),
    );
  });
});
