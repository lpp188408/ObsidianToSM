import { App, Modal, Notice } from "obsidian";
import { copyHtmlToClipboard } from "./clipboard";
import type { WechatMetadata } from "./metadata";
import { publishWechatDraft, type WechatRequester, type WechatUploadFile } from "./wechat";
import { SuccessModal } from "./success-modal";

export interface DraftConfig {
  appId: string;
  appSecret: string;
  thumbMediaId: string;
  metadata: WechatMetadata;
  cover?: WechatUploadFile;
  requester: WechatRequester;
}

export class PreviewModal extends Modal {
  constructor(
    app: App,
    private readonly html: string,
    private readonly plainText: string,
    private readonly draftConfig: DraftConfig
  ) {
    super(app);
  }

  onOpen(): void {
    this.contentEl.empty();
    this.contentEl.addClass("obsidian-to-sm-preview");

    const actions = this.contentEl.createDiv("obsidian-to-sm-actions");
    actions.createEl("button", { text: "复制到公众号" }).addEventListener("click", () => {
      void this.copy();
    });
    actions.createEl("button", { text: "发送草稿" }).addEventListener("click", () => {
      void this.sendDraft();
    });

    const preview = this.contentEl.createDiv("obsidian-to-sm-preview-body");
    preview.innerHTML = this.html;
  }

  private async copy(): Promise<void> {
    try {
      await copyHtmlToClipboard(this.html, this.plainText);
      new Notice("已复制，可粘贴到微信公众号编辑器");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      new Notice(`复制失败：${message}`);
    }
  }

  private async sendDraft(): Promise<void> {
    if (!this.draftConfig.appId || !this.draftConfig.appSecret) {
      new Notice("请先在插件设置中配置 AppID 和 AppSecret");
      return;
    }
    if (!this.draftConfig.cover && !this.draftConfig.thumbMediaId) {
      new Notice("请在右侧工作台选择本地封面，或在插件设置中填写封面 thumb_media_id");
      return;
    }

    try {
      new Notice("正在上传正文图片并创建草稿…");
      await publishWechatDraft({ ...this.draftConfig, html: this.html });
      new SuccessModal(this.app, "已加入草稿箱", "文章已成功加入公众号草稿箱。").open();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      new Notice(`发送草稿失败：${message}`);
    }
  }
}
