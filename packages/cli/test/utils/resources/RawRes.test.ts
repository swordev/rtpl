import { RawRes } from "../../../src/resources/RawRes";
import { it, describe, expect } from "vitest";

describe("RawRes.toString", () => {
  it("resolves all values", () => {
    class C {
      toString() {
        return this.toJSON();
      }
      toJSON() {
        return "3";
      }
    }
    const res = new RawRes({
      data: [() => "1", 2, new C(), () => new C()],
    });
    expect(res.toString()).toBe(["1", "2", "3", "3"].join("\n"));
  });
});
