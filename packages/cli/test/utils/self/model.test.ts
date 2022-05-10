import { JsonModel } from "../../../src";
import { extractMap } from "../../../src/utils/self/model";

describe("extractMap", () => {
  it("shoulds filter by name", () => {
    const model1 = new JsonModel({});
    const model2 = new JsonModel({});
    expect(
      extractMap(
        {
          model1,
          model2,
        },
        {
          name: "model1",
        }
      )
    ).toMatchObject({
      model1: {},
    });
  });

  it("shoulds filter by spec instance", () => {
    class Spec {}
    const spec = new Spec();
    const model1 = new JsonModel({
      spec,
    });
    const model2 = new JsonModel({});
    expect(
      extractMap(
        {
          model1,
          model2,
        },
        {
          instanceSpecOf: Spec,
        }
      )
    ).toMatchObject({
      model1: spec,
    });
  });

  it("shoulds filter by instance", () => {
    class CustomModel extends JsonModel<{
      a: number;
    }> {}

    const model1 = new CustomModel({
      spec: {
        a: 1,
      },
    });
    const model2 = new JsonModel({});
    expect(
      extractMap(
        {
          model1,
          model2,
        },
        {
          instanceOf: CustomModel,
        }
      )
    ).toMatchObject({
      model1: {},
    });
  });

  it("shoulds filter by test function", () => {
    const model1 = new JsonModel({ spec: "a" });
    const model2 = new JsonModel({ spec: "b" });
    const extracted = extractMap(
      {
        model1,
        model2,
      },
      {
        test: (model) => model.spec === "b",
      }
    );
    expect(Object.keys(extracted)).toMatchObject(["model2"]);
    expect(extracted["model2"] === model2).toBeTruthy();
  });
});
