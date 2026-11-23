import { describe, expect, it } from "vitest";
import { merge } from "../../src/utils/object.js";

describe("merge", () => {
  it("merges multiple sources into a new object without mutating sources", () => {
    const source1 = { a: 1, nested: { x: 1 }, items: [1] };
    const source2 = { b: 2, nested: { y: 2 }, items: [2] };

    const output = merge({}, source1, source2);

    expect(output).toEqual({
      a: 1,
      b: 2,
      nested: { x: 1, y: 2 },
      items: [2],
    });
    expect(source1).toEqual({ a: 1, nested: { x: 1 }, items: [1] });
    expect(source2).toEqual({ b: 2, nested: { y: 2 }, items: [2] });
    expect(output.nested).not.toBe(source1.nested);
    expect(output.nested).not.toBe(source2.nested);
    expect(output.items).not.toBe(source2.items);
  });

  it("keeps mutating the first object for backward compatibility", () => {
    const target = { a: 1 };
    const output = merge(target, { b: 2 }, { c: 3 });

    expect(output).toBe(target);
    expect(target).toEqual({ a: 1, b: 2, c: 3 });
  });
});

describe("merge safety", () => {
  it("ignores undefined source values", () => {
    expect(
      merge({}, { a: 1, b: { c: 2 } }, { a: undefined, b: { c: undefined } }),
    ).toEqual({ a: 1, b: { c: 2 } });
  });

  it("is not vulnerable to prototype pollution", () => {
    const payload = JSON.parse(
      '{"__proto__": {"rtplPolluted": true}, "constructor": {"prototype": {"rtplPolluted": true}}}',
    );
    try {
      const output = merge({}, payload);
      expect(({} as any).rtplPolluted).toBeUndefined();
      expect(Object.getPrototypeOf(output)).toBe(Object.prototype);
    } finally {
      delete (Object.prototype as any).rtplPolluted;
    }
  });
});
