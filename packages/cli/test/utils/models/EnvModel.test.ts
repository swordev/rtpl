import { EnvModel } from "../../../src/models/EnvModel";
import { it, describe, expect } from "vitest";

describe("EnvModel.toString", () => {
  it("resolves all values", () => {
    class C {
      toString() {
        return this.toJSON();
      }
      toJSON() {
        return "3";
      }
    }
    const model = new EnvModel({
      spec: {
        a: () => 1,
        b: 2,
        c: new C(),
        d: () => new C(),
      },
    });
    expect(model.toString()).toBe(["a=1", "b=2", "c=3", "d=3"].join("\n"));
  });
});
