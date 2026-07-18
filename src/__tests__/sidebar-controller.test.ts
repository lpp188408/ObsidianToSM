import { describe, expect, it } from "vitest";
import { SidebarController } from "../sidebar-controller";

describe("SidebarController", () => {
  it("切换主题后重新渲染当前笔记", async () => {
    const controller = new SidebarController({
      load: async (themeId) => ({ html: `<article>${themeId}</article>`, plainText: "正文" })
    });
    await controller.refresh();
    await controller.setTheme("tech-blue");
    expect(controller.getState().html).toContain("tech-blue");
  });

  it("刷新无封面笔记时清空上一页的封面缩略图", async () => {
    let includeCover = true;
    const controller = new SidebarController({
      load: async () => includeCover
        ? { html: "<article>有封面</article>", plainText: "正文", coverDataUrl: "data:image/png;base64,cover" }
        : { html: "<article>无封面</article>", plainText: "正文" }
    });

    await controller.refresh();
    includeCover = false;
    await controller.refresh();

    expect(controller.getState().coverDataUrl).toBeUndefined();
  });

  it("执行中拒绝第二次发布", async () => {
    let resolve!: () => void;
    const controller = new SidebarController({
      load: async () => ({ html: "<article>正文</article>", plainText: "正文" }),
      publish: async () => new Promise<void>((done) => { resolve = done; })
    });
    await controller.refresh();
    const pending = controller.publish();
    expect(controller.getState().isBusy).toBe(true);
    await expect(controller.publish()).rejects.toThrow("正在发布");
    resolve();
    await pending;
  });
});
