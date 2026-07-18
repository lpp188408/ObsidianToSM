import { describe, expect, it } from "vitest";
import { THEMES, getTheme } from "../themes";

describe("getTheme", () => {
  it("提供六个可选内置主题", () => {
    expect(THEMES.map((theme) => theme.id)).toEqual([
      "minimal-mono",
      "tech-blue",
      "business-green",
      "ink",
      "editorial-red",
      "warm-orange"
    ]);
  });

  it("未知主题回退为简约黑白", () => {
    expect(getTheme("unknown").id).toBe("minimal-mono");
  });
});
