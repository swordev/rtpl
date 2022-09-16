import { RawModel } from "../../../src/models/RawModel";
import { it, describe, expect } from "vitest";

describe("RawModel.toString", () => {
  it("resolves all values", () => {
    class C {
      toString() {
        return this.toJSON();
      }
      toJSON() {
        return "3";
      }
    }
    const model = new RawModel({
      spec: [() => "1", 2, new C(), () => new C()],
    });
    expect(model.toString()).toBe(["1", "2", "3", "3"].join("\n"));
  });
});
