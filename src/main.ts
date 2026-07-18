import { Notice, Plugin, requestUrl } from "obsidian";
import { safeStorage } from "electron";
import { parseAccountRows } from "./accounts";
import { CredentialStore } from "./credential-store";
import { resolveEmbeds } from "./assets";
import { copyHtmlToClipboard } from "./clipboard";
import { extractWechatMetadata } from "./metadata";
import { PreviewModal, type DraftConfig } from "./preview-modal";
import { renderMarkdownToWechatHtml } from "./renderer";
import { DEFAULT_SETTINGS, PluginSettings, SettingsTab } from "./settings";
import { publishWechatArticle, publishWechatDraft, type WechatUploadFile } from "./wechat";
import { SidebarController } from "./sidebar-controller";
import { VIEW_TYPE_WECHAT_WORKBENCH, WechatWorkbenchView } from "./sidebar-view";

export default class ObsidianToSmPlugin extends Plugin {
  declare settings: PluginSettings;

  async onload(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    this.addSettingTab(new SettingsTab(this.app, this));
    this.registerView(VIEW_TYPE_WECHAT_WORKBENCH, (leaf) => new WechatWorkbenchView(leaf, this.createSidebarController(), {
      accounts: () => this.settings.accounts, selectedAccountId: () => this.settings.selectedAccountId,
      setSelectedAccount: async (id) => { this.settings.selectedAccountId = id; await this.saveSettings(); },
      addCover: async () => { throw new Error("封面选择将在下一次更新中接入"); },
      copy: async () => { const note = await this.prepareActiveNote(); if (note) await copyHtmlToClipboard(note.html, note.plainText); },
      createDraft: async () => this.publishActiveNote(), publish: async () => this.publishArticle()
    }));

    this.addRibbonIcon("send", "打开公众号发布工作台", () => { void this.activateWorkbench(); });
    this.addCommand({ id: "open-wechat-publishing-workbench", name: "打开公众号发布工作台", callback: () => { void this.activateWorkbench(); } });

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

  exportAccountRows(): string { return this.settings.accounts.map((item) => `${item.name}|${item.appId}|`).join("\n"); }

  async saveAccounts(rows: string): Promise<void> {
    const parsed = parseAccountRows(rows);
    const store = this.credentialStore();
    for (const [id, secret] of parsed.secrets) await store.save(id, secret);
    this.settings.accounts = parsed.accounts;
    this.settings.selectedAccountId = parsed.accounts.some((item) => item.id === this.settings.selectedAccountId) ? this.settings.selectedAccountId : (parsed.accounts[0]?.id ?? "");
    await this.saveSettings();
    new Notice(`已安全保存 ${parsed.accounts.length} 个公众号账号`);
  }

  async testAccounts(): Promise<void> {
    for (const account of this.settings.accounts) {
      const secret = this.credentialStore().read(account.id);
      const response = await requestUrl({ url: `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${encodeURIComponent(account.appId)}&secret=${encodeURIComponent(secret)}` });
      if (typeof response.json?.access_token !== "string") throw new Error(`${account.name} 测试失败：${response.json?.errmsg ?? "获取 access_token 失败"}`);
    }
    new Notice("所有公众号账号连接正常");
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

  private async publishArticle(): Promise<void> {
    try {
      const note = await this.prepareActiveNote();
      if (!note) return;
      const result = await publishWechatArticle({ ...note.draftConfig, html: note.html });
      new Notice(`发布任务：${result.status}（${result.publishId}）`);
    } catch (error) { throw new Error(`直接发布失败：${error instanceof Error ? error.message : String(error)}`); }
  }

  private createSidebarController(): SidebarController {
    return new SidebarController({
      load: async (themeId) => {
        const note = await this.prepareActiveNote(themeId);
        if (!note) return { html: "", plainText: "" };
        return { html: note.html, plainText: note.plainText };
      }
    });
  }

  private async activateWorkbench(): Promise<void> {
    const leaf = this.app.workspace.getLeftLeaf(false);
    if (!leaf) {
      new Notice("未找到可用的左侧栏，请先显示左侧边栏后重试");
      return;
    }
    await leaf.setViewState({ type: VIEW_TYPE_WECHAT_WORKBENCH, active: true });
    this.app.workspace.revealLeaf(leaf);
  }

  private async prepareActiveNote(themeId = "business-green"): Promise<{ html: string; plainText: string; draftConfig: DraftConfig } | null> {
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
      enableLineNumbers: this.settings.enableLineNumbers,
      themeId
    });
    const cover = metadata.cover ? (await this.resolveAsset(metadata.cover, file.path)).uploadFile : undefined;
    return {
      html,
      plainText: body,
      draftConfig: {
        appId: this.currentAccount().appId,
        appSecret: this.credentialStore().read(this.currentAccount().id),
        thumbMediaId: this.settings.thumbMediaId,
        metadata,
        cover,
        requester: async (request) => requestUrl(request)
      }
    };
  }

  private currentAccount() {
    const account = this.settings.accounts.find((item) => item.id === this.settings.selectedAccountId);
    if (!account) throw new Error("请先在插件设置中添加并选择公众号账号");
    return account;
  }

  private credentialStore(): CredentialStore {
    return new CredentialStore({
      isAvailable: () => safeStorage.isEncryptionAvailable(),
      encrypt: (value) => safeStorage.encryptString(value).toString("base64"),
      decrypt: (value) => safeStorage.decryptString(Buffer.from(value, "base64"))
    }, () => this.settings.encryptedSecrets, async (encryptedSecrets) => {
      this.settings.encryptedSecrets = encryptedSecrets;
      await this.saveSettings();
    });
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
