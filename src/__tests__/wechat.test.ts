import { describe, expect, it, vi } from "vitest";
import { publishWechatArticle, publishWechatDraft, replaceDataUrlImages, WechatClient, type WechatRequester } from "../wechat";

describe("replaceDataUrlImages", () => {
  it("uploads only data URL images and replaces their src values", async () => {
    const upload = vi.fn().mockResolvedValue("https://mmbiz.qpic.cn/article.png");
    const result = await replaceDataUrlImages(
      '<p><img src="data:image/png;base64,aGVsbG8=" /><img src="https://example.com/keep.png" /></p>',
      upload
    );

    expect(upload).toHaveBeenCalledOnce();
    expect(upload.mock.calls[0][0]).toMatchObject({ filename: "image-1.png", mimeType: "image/png" });
    expect(result).toContain('src="https://mmbiz.qpic.cn/article.png"');
    expect(result).toContain('src="https://example.com/keep.png"');
  });
});

describe("WechatClient", () => {
  it("uploads a cover and creates a draft with WeChat's required article fields", async () => {
    const requester: WechatRequester = vi
      .fn()
      .mockResolvedValueOnce({ json: { access_token: "token" } })
      .mockResolvedValueOnce({ json: { media_id: "cover-media-id" } })
      .mockResolvedValueOnce({ json: { media_id: "draft-media-id" } });
    const client = new WechatClient("app-id", "app-secret", requester);

    const coverId = await client.uploadCover({
      bytes: new TextEncoder().encode("cover").buffer,
      filename: "cover.png",
      mimeType: "image/png"
    });
    const draftId = await client.addDraft({
      title: "标题",
      author: "作者",
      digest: "摘要",
      content: "<p>正文</p>",
      thumbMediaId: coverId,
      needOpenComment: true,
      onlyFansCanComment: false
    });

    expect(coverId).toBe("cover-media-id");
    expect(draftId).toBe("draft-media-id");
    expect(requester).toHaveBeenCalledTimes(3);
    expect(requester).toHaveBeenNthCalledWith(2, expect.objectContaining({
      url: expect.stringContaining("material/add_material?access_token=token&type=image"),
      contentType: expect.stringContaining("multipart/form-data; boundary=")
    }));
    expect(JSON.parse((requester as ReturnType<typeof vi.fn>).mock.calls[2][0].body)).toEqual({
      articles: [{
        title: "标题",
        author: "作者",
        digest: "摘要",
        content: "<p>正文</p>",
        thumb_media_id: "cover-media-id",
        need_open_comment: 1,
        only_fans_can_comment: 0
      }]
    });
  });
});

describe("publishWechatDraft", () => {
  it("uploads inline and cover images before creating a draft", async () => {
    const requester: WechatRequester = vi
      .fn()
      .mockResolvedValueOnce({ json: { access_token: "token" } })
      .mockResolvedValueOnce({ json: { url: "https://mmbiz.qpic.cn/inline.png" } })
      .mockResolvedValueOnce({ json: { media_id: "cover-media-id" } })
      .mockResolvedValueOnce({ json: { media_id: "draft-media-id" } });

    const mediaId = await publishWechatDraft({
      appId: "app-id",
      appSecret: "app-secret",
      requester,
      html: '<p><img src="data:image/png;base64,aGVsbG8=" /></p>',
      metadata: {
        title: "标题",
        author: "作者",
        digest: "摘要",
        cover: "cover.png",
        needOpenComment: true,
        onlyFansCanComment: false
      },
      cover: { bytes: new TextEncoder().encode("cover").buffer, filename: "cover.png", mimeType: "image/png" },
      thumbMediaId: ""
    });

    expect(mediaId).toBe("draft-media-id");
    expect(requester).toHaveBeenCalledTimes(4);
    expect(JSON.parse((requester as ReturnType<typeof vi.fn>).mock.calls[3][0].body).articles[0]).toMatchObject({
      content: '<p><img src="https://mmbiz.qpic.cn/inline.png" /></p>',
      thumb_media_id: "cover-media-id"
    });
  });
});

describe("publishWechatArticle", () => {
  it("创建草稿后提交发布并返回已发布状态", async () => {
    const requester: WechatRequester = vi.fn()
      .mockResolvedValueOnce({ json: { access_token: "token" } })
      .mockResolvedValueOnce({ json: { media_id: "cover-media-id" } })
      .mockResolvedValueOnce({ json: { media_id: "draft-media-id" } })
      .mockResolvedValueOnce({ json: { publish_id: "publish-id" } })
      .mockResolvedValueOnce({ json: { publish_status: 0 } });

    const result = await publishWechatArticle({
      appId: "app-id", appSecret: "app-secret", requester, html: "<p>正文</p>", thumbMediaId: "",
      metadata: { title: "标题", author: "作者", digest: "", cover: "cover.png", needOpenComment: true, onlyFansCanComment: false },
      cover: { bytes: new TextEncoder().encode("cover").buffer, filename: "cover.png", mimeType: "image/png" }
    });

    expect(result).toEqual({ draftMediaId: "draft-media-id", publishId: "publish-id", status: "published" });
    expect((requester as ReturnType<typeof vi.fn>).mock.calls[3][0].url).toContain("freepublish/submit");
    expect((requester as ReturnType<typeof vi.fn>).mock.calls[4][0].url).toContain("freepublish/get");
  });
});
