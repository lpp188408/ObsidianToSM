import { describe, expect, it } from "vitest";
import { buildArticlePdfDocument, buildStickerPdfDocument } from "../pdf";

describe("PDF 打印文档", () => {
  it("保留公众号文章 HTML 并转义标题", () => {
    const document = buildArticlePdfDocument("书评 <测试>", "<section>正文</section>");

    expect(document).toContain("<title>书评 &lt;测试&gt;</title>");
    expect(document).toContain("<section>正文</section>");
    expect(document).toContain("window.print()");
  });

  it("将贴图页生成可分页打印的图片文档", () => {
    const document = buildStickerPdfDocument("贴图", ["data:image/png;base64,one", "data:image/png;base64,two"]);

    expect(document).toContain('src="data:image/png;base64,one"');
    expect(document).toContain('src="data:image/png;base64,two"');
    expect(document).toContain("page-break-after:always");
  });
});
