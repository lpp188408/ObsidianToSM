import { describe, expect, it } from "vitest";
import { getLayout, LAYOUTS } from "../layouts";
import { getTheme } from "../themes";

describe("getLayout", () => {
  it("提供基础排版和五套内置模板", () => {
    expect(LAYOUTS.map((layout) => layout.id)).toEqual([
      "none",
      "editorial-magazine",
      "modern-business",
      "reading-notes",
      "technical-blueprint",
      "minimal"
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

  it("简洁留白模板使用轻量阅读样式", () => {
    const styles = getLayout("minimal").styles(getTheme("tech-blue"));

    expect(styles.section).toContain("line-height:1.75");
    expect(styles.h2).toContain("border-bottom:1px solid #1769aa");
    expect(styles.blockquote).toContain("border-left:3px solid #1769aa");
    expect(styles.th).toContain("background:#ffffff");
    expect(styles.th).toContain("border:1px solid #d9dee7");
  });

  it.each(LAYOUTS.filter((layout) => !["none", "minimal"].includes(layout.id)))("$name 使用紧凑正文组件间距", (layout) => {
    const styles = layout.styles(getTheme("tech-blue"));

    expect(styles.p).toContain("margin:.65em 0");
    expect(styles.ul).toContain("margin:.65em 0");
    expect(styles.ol).toContain("margin:.65em 0");
    expect(styles.li).toContain("margin:.15em 0");
    expect(styles.table).toContain("margin:.8em 0");
    expect(styles.th).toContain("padding:.42em .55em");
    expect(styles.td).toContain("padding:.42em .55em");
  });
});
