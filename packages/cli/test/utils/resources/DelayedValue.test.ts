import {
  DelayedValue,
  setDelayedValue,
} from "../../../src/resources/DelayedValue.js";
import { describe, expect, it } from "vitest";

describe("DelayedValue", () => {
  it("throws while it is not resolved", () => {
    const value = new DelayedValue<string>();
    expect(() => value.toString()).toThrow(/not resolved/);
    expect(() => JSON.stringify(value)).toThrow(/not resolved/);
  });

  it("serializes falsy resolved values", () => {
    const bool = new DelayedValue<boolean>();
    const text = new DelayedValue<string>();
    setDelayedValue(bool, false);
    setDelayedValue(text, "");
    expect(JSON.stringify({ bool, text })).toBe('{"bool":false,"text":""}');
    expect(bool.toString()).toBe("false");
    expect(text.toString()).toBe("");
  });
});
