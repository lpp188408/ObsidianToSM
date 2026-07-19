import { describe, expect, it } from "vitest";
import { renderMarkdownToWechatHtml } from "../renderer";

describe("renderMarkdownToWechatHtml", () => {
  it("wraps article HTML and highlights code", () => {
    const html = renderMarkdownToWechatHtml("# 标题\n\n```ts\nconst x = 1;\n```", {
      customCss: "",
      enableLineNumbers: true
    });

    expect(html).toContain('class="obsidian-to-sm"');
    expect(html).toContain("font-family");
    expect(html).toContain("<h1 style=");
    expect(html).toContain("标题</h1>");
    expect(html).toContain("hljs");
    expect(html).toContain('data-line="1"');
    expect(html).not.toContain(".code-line::before");
  });

  const sample = `# 主标题

## 二级标题

> 引用内容

- 列表一
- 列表二

行内代码 \`const value = 1\`

| 项目 | 内容 |
| --- | --- |
| 模板 | 测试 |

\`\`\`ts
const x = 1;
\`\`\``;

  it.each([
    ["editorial-magazine", "font-family:Georgia"],
    ["modern-business", "border-left:5px solid #1769aa"],
    ["reading-notes", "background:#fffdf8"],
    ["technical-blueprint", "background:#101820"]
  ])("应用 %s 排版模板", (layoutId, marker) => {
    const html = renderMarkdownToWechatHtml(sample, {
      customCss: "",
      enableLineNumbers: true,
      themeId: "tech-blue",
      layoutId
    });

    expect(html).toContain(marker);
    expect(html).toContain("<ul style=");
    expect(html).toContain("<li style=");
    expect(html).toContain("<table style=");
    expect(html).toContain("<th style=");
    expect(html).toContain("<td style=");
    expect(html).toContain("#1769aa");
  });

  it("不套用模板时保持基础排版", () => {
    const html = renderMarkdownToWechatHtml("## 标题", {
      customCss: "",
      enableLineNumbers: false,
      themeId: "business-green",
      layoutId: "none"
    });

    expect(html).toContain("border-bottom:2px solid #2f8f6f");
  });
});
