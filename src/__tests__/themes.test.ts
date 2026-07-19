import { describe, expect, it } from "vitest";
import { THEMES, getTheme } from "../themes";

describe("getTheme", () => {
  it("提供原始默认和六个颜色主题", () => {
    expect(THEMES.map((theme) => theme.id)).toEqual([
      "original-default",
      "minimal-mono",
      "tech-blue",
      "business-green",
      "ink",
      "editorial-red",
      "warm-orange"
    ]);
  });

  it("未知主题回退为原始默认", () => {
    expect(getTheme("unknown").id).toBe("original-default");
  });
});
