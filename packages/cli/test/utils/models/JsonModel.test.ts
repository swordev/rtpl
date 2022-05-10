import { RawModel } from "../../../src";
import { JsonModel } from "../../../src/models/JsonModel";

describe("JsonModel.toString", () => {
  it("resolves all values", () => {
    class C {
      toJSON() {
        return 3;
      }
    }

    const model = new JsonModel({
      spec: {
        a: () => 1,
        b: 2,
        c: new C(),
        d: () => new C(),
        e: () => () => () => 1,
        f: new JsonModel({
          spec: {
            a: 1,
          },
        }),
        g: new RawModel({
          spec: "test",
        }),
      },
    });
    expect(model.toString()).toBe(
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
        2
      )
    );
  });
});
