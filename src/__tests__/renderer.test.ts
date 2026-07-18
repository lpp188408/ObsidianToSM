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
  });
});
