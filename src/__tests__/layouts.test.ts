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

    expect(styles.section).toContain("font-size:15px");
    expect(styles.section).toContain("line-height:1.7");
    expect(styles.h1).toContain("font-size:22px");
    expect(styles.h2).toContain("font-size:18px");
    expect(styles.p).toContain("margin:0 0 .55em");
    expect(styles.th).toContain("border:1px solid rgb(15 23 42 / 14%)");
    expect(styles.th).toContain("background:rgb(255 255 255 / 48%)");
    expect(styles.blockquote).toContain("background:#f3f4f6");
  });

  it("现代商务引用块使用主题色半像素实线边框", () => {
    const styles = getLayout("modern-business").styles(getTheme("tech-blue"));

    expect(styles.blockquote).toContain("border:0.5px solid #1769aa");
    expect(styles.blockquote).not.toContain("border-left:3px solid");
  });

  it.each(LAYOUTS)("$name 使用统一的紧凑字级", (layout) => {
    const styles = layout.styles(getTheme("tech-blue"));

    expect(styles.section).toContain("font-size:15px");
    expect(styles.section).toContain("line-height:1.7");
    expect(styles.h1).toContain("font-size:22px");
    expect(styles.h2).toContain("font-size:18px");
    expect(styles.h3).toContain("font-size:16px");
    expect(styles.blockquote).toContain("font-size:14px");
    expect(styles.blockquote).toContain("line-height:1.6");
  });

  it.each(LAYOUTS)("$name 的表格使用紧凑行距", (layout) => {
    const styles = layout.styles(getTheme("tech-blue"));

    expect(styles.table).toContain("table-layout:auto");
    expect(styles.table).toContain("font-size:14px");
    expect(styles.table).toContain("line-height:1.4");
    expect(styles.th).toContain("padding:.25em .4em");
    expect(styles.td).toContain("padding:.25em .4em");
  });

  it.each(LAYOUTS.filter((layout) => !["minimal"].includes(layout.id)))("$name 使用紧凑正文组件间距", (layout) => {
    const styles = layout.styles(getTheme("tech-blue"));

    expect(styles.p).toContain("margin:.55em 0");
    expect(styles.ul).toContain("margin:.55em 0");
    expect(styles.ol).toContain("margin:.55em 0");
    expect(styles.li).toContain("margin:.12em 0");
    expect(styles.table).toContain("margin:.65em 0");
    expect(styles.th).toContain("padding:.25em .4em");
    expect(styles.td).toContain("padding:.25em .4em");
  });
});
