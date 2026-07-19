import { describe, expect, it } from "vitest";
import { markdownToStickerPlainText, renderMarkdownToStickerHtml } from "../sticker-renderer";

describe("贴图渲染", () => {
  it("输出独立的简洁贴图 HTML", () => {
    const html = renderMarkdownToStickerHtml("# 标题\n\n正文 **重点**\n\n---\n\n|项目|内容|\n|-|-|\n|A|B|");
    expect(html).toContain('class="obsidian-to-sm-sticker-content"');
    expect(html).toContain("<h1>标题</h1>");
    expect(html).toContain("<strong>重点</strong>");
    expect(html).toContain("<table>");
  });

  it("复制文案时移除 Markdown 标记并保留段落内容", () => {
    expect(markdownToStickerPlainText("# 标题\n\n- 第一项\n- **第二项**\n\n[链接](https://example.com)")).toBe(
      "标题\n\n第一项\n第二项\n\n链接"
    );
  });

  it("纯文本描述清理 Obsidian 双链和图片嵌入", () => {
    expect(markdownToStickerPlainText("参见 [[目标笔记|显示名称]]。\n\n![[封面.png]]")).toBe("参见 显示名称。");
  });
});
