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
    expect(html).not.toContain("</span>\n<span class=\"code-line\"");
  });

  it("将列表输出为兼容微信公众号的项目段落", () => {
    const html = renderMarkdownToWechatHtml("- 第一项\n- 第二项\n\n1. 第一条\n2. 第二条", {
      customCss: "",
      enableLineNumbers: false
    });

    expect(html).toContain('class="obsidian-to-sm-list-item"');
    expect(html).toContain(">•</span>第一项");
    expect(html).toContain(">1.</span>第一条");
    expect(html).not.toContain("<ul");
    expect(html).not.toContain("<ol");
  });

  it("松散编号列表的编号与正文保持同行", () => {
    const html = renderMarkdownToWechatHtml("1. 第一项\n\n2. 第二项", {
      customCss: "",
      enableLineNumbers: false
    });

    expect(html).toContain(">1.</span>第一项");
    expect(html).not.toContain(">1.</span><p");
  });

  it("短文本表格首列按内容单行自适应", () => {
    const html = renderMarkdownToWechatHtml("| 项目 | 内容 |\n| --- | --- |\n| 书名 | 示例 |", {
      customCss: "",
      enableLineNumbers: false
    });

    expect(html).toContain("table-layout:auto");
    expect(html.match(/width:1%;white-space:nowrap/g)).toHaveLength(2);
  });

  it("长文本表格首列最多占四分之一并允许换行", () => {
    const html = renderMarkdownToWechatHtml("| 第一阶段：创业与发展 | 内容 |\n| --- | --- |\n| 第二阶段：全球扩张 | 示例 |", {
      customCss: "",
      enableLineNumbers: false
    });

    expect(html.match(/width:25%;white-space:normal;word-break:break-word/g)).toHaveLength(2);
  });

  it("移除引用块内部段落的首尾边距", () => {
    const html = renderMarkdownToWechatHtml("> 引用内容", {
      customCss: "",
      enableLineNumbers: false
    });

    expect(html).toContain('<blockquote style=');
    expect(html).toContain('margin:.65em 0;color:#202124;margin:0;');
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
    expect(html).toContain('class="obsidian-to-sm-list-item"');
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
