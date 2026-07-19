import { describe, expect, it } from "vitest";
import { getLayout, LAYOUTS } from "../layouts";
import { getTheme } from "../themes";

describe("getLayout", () => {
  it("提供基础排版和四套内置模板", () => {
    expect(LAYOUTS.map((layout) => layout.id)).toEqual([
      "none",
      "editorial-magazine",
      "modern-business",
      "reading-notes",
      "technical-blueprint"
    ]);
  });

  it("未知模板回退为不套用模板", () => {
    expect(getLayout("unknown").id).toBe("none");
  });

  it("模板样式使用当前颜色主题的强调色", () => {
    const styles = getLayout("editorial-magazine").styles(getTheme("tech-blue"));
    expect(styles.h2).toContain("#1769aa");
    expect(styles.a).toContain("#1769aa");
  });
});
