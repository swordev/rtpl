import { JsonRes, YamlRes } from "../../../src/index.js";
import { describe, expect, it } from "vitest";

describe("YamlRes.toString", () => {
  it("renders an empty document without data", () => {
    expect(new YamlRes({ data: undefined }).toString()).toBe("");
  });

  it("quotes YAML 1.1 boolean-like strings", () => {
    const out = new YamlRes({ data: { a: "on", b: "yes" } }).toString();
    expect(out).toMatch(/a: ["']on["']/);
    expect(out).toMatch(/b: ["']yes["']/);
  });

  it("renders multiple documents", () => {
    const out = new YamlRes({
      data: [{ a: 1 }, { b: 2 }],
      format: { documents: true },
    }).toString();
    expect(out).toBe("a: 1\n---\nb: 2\n");
  });
});

describe("YamlRes.toJSON", () => {
  it("can be embedded in a JsonRes", () => {
    const inner = new YamlRes({ data: { x: 1, list: ["a"] } });
    const outer = new JsonRes({ data: { inner } });
    expect(JSON.parse(outer.toString())).toEqual({
      inner: { x: 1, list: ["a"] },
    });
  });
});
