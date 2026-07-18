import { Notice, Plugin, requestUrl } from "obsidian";
import { resolveEmbeds } from "./assets";
import { extractWechatMetadata } from "./metadata";
import { PreviewModal, type DraftConfig } from "./preview-modal";
import { renderMarkdownToWechatHtml } from "./renderer";
import { DEFAULT_SETTINGS, PluginSettings, SettingsTab } from "./settings";
import { publishWechatDraft, type WechatUploadFile } from "./wechat";

export default class ObsidianToSmPlugin extends Plugin {
  declare settings: PluginSettings;

  async onload(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    this.addSettingTab(new SettingsTab(this.app, this));

    this.addRibbonIcon("send", "复制到公众号", () => {
      void this.openPreviewForActiveNote();
    });

    this.addCommand({
      id: "copy-active-note-to-wechat",
      name: "复制当前笔记到公众号",
      callback: () => {
        void this.openPreviewForActiveNote();
      }
    });

    this.addCommand({
      id: "publish-active-note-to-wechat-draft",
      name: "一键保存当前笔记到公众号草稿箱",
      callback: () => {
        void this.publishActiveNote();
      }
    });
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  async openPreviewForActiveNote(): Promise<void> {
    try {
      const note = await this.prepareActiveNote();
      if (note) new PreviewModal(this.app, note.html, note.plainText, note.draftConfig).open();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      new Notice(`生成公众号预览失败：${message}`);
    }
  }

  private async publishActiveNote(): Promise<void> {
    try {
      const note = await this.prepareActiveNote();
      if (!note) return;
      new Notice("正在上传正文图片并创建草稿…");
      const mediaId = await publishWechatDraft({ ...note.draftConfig, html: note.html });
      new Notice(`草稿已创建：${mediaId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      new Notice(`发送草稿失败：${message}`);
    }
  }

  private async prepareActiveNote(): Promise<{ html: string; plainText: string; draftConfig: DraftConfig } | null> {
    const file = this.app.workspace.getActiveFile();
    if (!file) {
      new Notice("没有打开的笔记");
      return null;
    }

    const markdown = await this.app.vault.read(file);
    const { body, metadata } = extractWechatMetadata(markdown, {
      author: this.settings.author,
      title: file.basename
    });
    const withImages = await resolveEmbeds(body, async (path) => (await this.resolveAsset(path, file.path)).dataUrl);
    const html = renderMarkdownToWechatHtml(withImages, {
      customCss: this.settings.customCss,
      enableLineNumbers: this.settings.enableLineNumbers
    });
    const cover = metadata.cover ? (await this.resolveAsset(metadata.cover, file.path)).uploadFile : undefined;
    return {
      html,
      plainText: body,
      draftConfig: {
        appId: this.settings.wechatAppId,
        appSecret: this.settings.wechatAppSecret,
        thumbMediaId: this.settings.thumbMediaId,
        metadata,
        cover,
        requester: async (request) => requestUrl(request)
      }
    };
  }

  private async resolveAsset(path: string, sourcePath: string): Promise<{ dataUrl: string; uploadFile: WechatUploadFile }> {
    const file = this.app.metadataCache.getFirstLinkpathDest(path, sourcePath);
    if (!file) {
      throw new Error(`找不到图片：${path}`);
    }

    const bytes = await this.app.vault.readBinary(file);
    const base64 = arrayBufferToBase64(bytes);
    const mimeType = mimeForExtension(file.extension);
    return {
      dataUrl: `data:${mimeType};base64,${base64}`,
      uploadFile: { bytes, filename: file.name, mimeType }
    };
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function mimeForExtension(extension: string): string {
  switch (extension.toLowerCase()) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "svg":
      return "image/svg+xml";
    default:
      return "image/png";
  }
}
