import { describe, expect, it } from "vitest";
import { extractWechatMetadata } from "../metadata";

describe("extractWechatMetadata", () => {
  it("reads Chinese frontmatter fields and removes them from the article body", () => {
    const result = extractWechatMetadata(
      "---\n标题: 自定义标题\n作者: 李雷\n摘要: 一句话摘要\n封面: \"![[cover.png]]\"\n打开评论: false\n仅粉丝可评论: true\n---\n# 正文标题\n\n正文内容",
      { author: "默认作者", title: "文件名" }
    );

    expect(result.metadata).toEqual({
      title: "自定义标题",
      author: "李雷",
      digest: "一句话摘要",
      cover: "cover.png",
      needOpenComment: false,
      onlyFansCanComment: true
    });
    expect(result.body).toBe("# 正文标题\n\n正文内容");
  });

  it("uses the first H1 and defaults when frontmatter is absent", () => {
    const result = extractWechatMetadata("# 笔记标题\n\n内容", { author: "默认作者", title: "文件名" });

    expect(result.metadata.title).toBe("笔记标题");
    expect(result.metadata.author).toBe("默认作者");
    expect(result.metadata.needOpenComment).toBe(true);
    expect(result.metadata.onlyFansCanComment).toBe(false);
  });
});
