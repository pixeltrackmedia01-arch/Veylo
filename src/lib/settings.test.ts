import { describe, expect, it } from "vitest";
import { mergeSetting } from "./settings";

describe("mergeSetting", () => {
  it("fills missing object keys from the default", () => {
    expect(mergeSetting({ a: 1, b: 2 }, { b: 3 })).toEqual({ a: 1, b: 3 });
  });

  it("keeps lists, numbers and booleans as stored", () => {
    expect(mergeSetting(null, [{ text: "x" }])).toEqual([{ text: "x" }]);
    expect(mergeSetting([], [1, 2])).toEqual([1, 2]);
    expect(mergeSetting(20, 25)).toBe(25);
    expect(mergeSetting(false, true)).toBe(true);
  });

  it("uses a stored object even when there is no default", () => {
    expect(mergeSetting(null, { url: "" })).toEqual({ url: "" });
  });
});
