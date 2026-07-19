import { Notice, Plugin, requestUrl } from "obsidian";
import { parseAccountRows } from "./accounts";
import { CoverStore } from "./cover-store";
import { MacosKeychainStore } from "./macos-keychain";
import { resolveEmbeds } from "./assets";
import { copyHtmlToClipboard } from "./clipboard";
import { extractWechatMetadata } from "./metadata";
import { PreviewModal, type DraftConfig } from "./preview-modal";
import { buildArticlePdfDocument, openPdfPrintDialog } from "./pdf";
import { renderMarkdownToWechatHtml } from "./renderer";
import { DEFAULT_SETTINGS, PluginSettings, SettingsTab } from "./settings";
import { dataUrlToUploadFile, publishWechatArticle, publishWechatDraft, publishWechatImageDraft, type WechatUploadFile } from "./wechat";
import { SidebarController } from "./sidebar-controller";
import { VIEW_TYPE_WECHAT_WORKBENCH, WechatWorkbenchView } from "./sidebar-view";
import { SuccessModal } from "./success-modal";
import { buildStickerExportPaths, mergeStickerSettings, sanitizeStickerTitle, type StickerNote, type StickerSettings } from "./sticker";
import { markdownToStickerPlainText, renderMarkdownToStickerHtml } from "./sticker-renderer";

export default class ObsidianToSmPlugin extends Plugin {
  declare settings: PluginSettings;

  async onload(): Promise<void> {
    const loaded = await this.loadData() as Partial<PluginSettings> | null;
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...loaded,
      stickerSettings: mergeStickerSettings(loaded?.stickerSettings)
    };
    this.addSettingTab(new SettingsTab(this.app, this));
    this.registerView(VIEW_TYPE_WECHAT_WORKBENCH, (leaf) => new WechatWorkbenchView(leaf, this.createSidebarController(), {
      accounts: () => this.settings.accounts, selectedAccountId: () => this.settings.selectedAccountId,
      setSelectedAccount: async (id) => { this.settings.selectedAccountId = id; await this.saveSettings(); },
      addCover: async (file) => this.chooseCover(file),
      copy: async (themeId, layoutId) => { const note = await this.prepareActiveNote(themeId, layoutId); if (note) await copyHtmlToClipboard(note.html, note.plainText); },
      exportPdf: async (themeId, layoutId) => this.exportActiveNotePdf(themeId, layoutId),
      createDraft: async (themeId, layoutId) => this.publishActiveNote(themeId, layoutId),
      publish: async (themeId, layoutId) => this.publishArticle(themeId, layoutId),
      stickerSettings: () => this.settings.stickerSettings,
      saveStickerSettings: async (settings) => { this.settings.stickerSettings = settings; await this.saveSettings(); },
      loadSticker: async () => this.prepareStickerNote(),
      copyStickerText: async (text) => { await navigator.clipboard.writeText(text); new Notice("贴图文案已复制"); },
      exportStickerImages: async (title, dataUrls) => this.exportStickerImages(title, dataUrls),
      createStickerDraft: async (note, dataUrls, withDescription) => this.publishStickerDraft(note, dataUrls, withDescription)
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

  exportAccountRows(): string { return this.settings.accounts.map((item) => `${item.name}|${item.appId}|已保存`).join("\n"); }

  async saveAccounts(rows: string): Promise<void> {
    const parsed = parseAccountRows(rows);
    const store = this.credentialStore();
    for (const [id, secret] of parsed.secrets) {
      if (secret === "已保存") await store.read(id);
      else await store.save(id, secret);
    }
    this.settings.accounts = parsed.accounts;
    this.settings.selectedAccountId = parsed.accounts.some((item) => item.id === this.settings.selectedAccountId) ? this.settings.selectedAccountId : (parsed.accounts[0]?.id ?? "");
    await this.saveSettings();
    new Notice(`已安全保存 ${parsed.accounts.length} 个公众号账号`);
  }

  async testAccounts(): Promise<void> {
    for (const account of this.settings.accounts) {
      const secret = await this.credentialStore().read(account.id);
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

  private async publishActiveNote(themeId = this.settings.themeId, layoutId = this.settings.layoutId): Promise<void> {
    try {
      const note = await this.prepareActiveNote(themeId, layoutId);
      if (!note) return;
      new Notice("正在上传正文图片并创建草稿…");
      await publishWechatDraft({ ...note.draftConfig, html: note.html });
      new SuccessModal(this.app, "已加入草稿箱", "文章已成功加入公众号草稿箱。").open();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      new Notice(`发送草稿失败：${message}`);
    }
  }

  private async exportActiveNotePdf(themeId: string, layoutId: string): Promise<void> {
    const note = await this.prepareActiveNote(themeId, layoutId);
    if (!note) return;
    openPdfPrintDialog(buildArticlePdfDocument(note.draftConfig.metadata.title, note.html));
    new Notice("已打开系统打印窗口，请选择“存储为 PDF”完成导出");
  }

  private async publishArticle(themeId = this.settings.themeId, layoutId = this.settings.layoutId): Promise<void> {
    try {
      const note = await this.prepareActiveNote(themeId, layoutId);
      if (!note) return;
      const result = await publishWechatArticle({ ...note.draftConfig, html: note.html });
      if (result.status === "published") new SuccessModal(this.app, "发表成功", "文章已成功发表到公众号。").open();
      else if (result.status === "reviewing") new Notice(`发布任务已提交，微信仍在处理中（${result.publishId}）`);
      else throw new Error(result.status === "rejected" ? "微信平台审核未通过" : "微信发布失败");
    } catch (error) { throw new Error(`直接发布失败：${error instanceof Error ? error.message : String(error)}`); }
  }

  private createSidebarController(): SidebarController {
    return new SidebarController({
      initialThemeId: this.settings.themeId,
      initialLayoutId: this.settings.layoutId,
      initialPreviewMode: this.settings.previewMode,
      persistStyle: async (themeId, layoutId) => {
        this.settings.themeId = themeId;
        this.settings.layoutId = layoutId;
        await this.saveSettings();
      },
      persistPreviewMode: async (previewMode) => {
        this.settings.previewMode = previewMode;
        await this.saveSettings();
      },
      load: async (themeId, layoutId) => {
        const note = await this.prepareActiveNote(themeId, layoutId);
        if (!note) return { html: "", plainText: "" };
        return { html: note.html, plainText: note.plainText, coverDataUrl: note.coverDataUrl };
      }
    });
  }

  private async activateWorkbench(): Promise<void> {
    const leaf = this.app.workspace.getRightLeaf(false);
    if (!leaf) {
      new Notice("未找到可用的右侧栏，请先显示右侧边栏后重试");
      return;
    }
    await leaf.setViewState({ type: VIEW_TYPE_WECHAT_WORKBENCH, active: true });
    this.app.workspace.revealLeaf(leaf);
  }

  private async chooseCover(file: WechatUploadFile): Promise<void> {
    const note = this.app.workspace.getActiveFile();
    if (!note) throw new Error("没有打开的笔记");
    const accepted = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
    if (!accepted.has(file.mimeType)) throw new Error("封面仅支持 JPG、PNG、GIF 或 WebP 图片");
    const stored = await this.coverStore().save(note.path, file);
    this.settings.localCovers[note.path] = stored;
    await this.saveSettings();
    new Notice(`已设置本地封面：${file.filename}`);
  }

  private async prepareActiveNote(themeId = this.settings.themeId, layoutId = this.settings.layoutId): Promise<{ html: string; plainText: string; coverDataUrl?: string; draftConfig: DraftConfig } | null> {
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
      themeId,
      layoutId
    });
    const storedCover = this.settings.localCovers[file.path];
    const localCover = storedCover ? await this.coverStore().read(storedCover) : undefined;
    const legacyCover = !localCover && metadata.cover ? await this.resolveAsset(metadata.cover, file.path) : undefined;
    const cover = localCover ?? legacyCover?.uploadFile;
    const account = this.settings.accounts.find((item) => item.id === this.settings.selectedAccountId);
    return {
      html,
      plainText: body,
      coverDataUrl: localCover ? uploadFileToDataUrl(localCover) : legacyCover?.dataUrl,
      draftConfig: {
        appId: account?.appId ?? "",
        appSecret: account ? await this.credentialStore().read(account.id) : "",
        thumbMediaId: this.settings.thumbMediaId,
        metadata,
        cover,
        requester: async (request) => requestUrl(request)
      }
    };
  }

  private async prepareStickerNote(): Promise<StickerNote | null> {
    const file = this.app.workspace.getActiveFile();
    if (!file) {
      new Notice("没有打开的笔记");
      return null;
    }
    const markdown = await this.app.vault.read(file);
    const { body, metadata } = extractWechatMetadata(markdown, { author: this.settings.author, title: file.basename });
    const withImages = await resolveEmbeds(body, async (path) => (await this.resolveAsset(path, file.path)).dataUrl);
    return {
      title: metadata.title,
      html: renderMarkdownToStickerHtml(withImages),
      plainText: markdownToStickerPlainText(body),
      needOpenComment: metadata.needOpenComment,
      onlyFansCanComment: metadata.onlyFansCanComment
    };
  }

  private async exportStickerImages(title: string, dataUrls: string[]): Promise<string[]> {
    const safeDirectory = `贴图导出/${sanitizeStickerTitle(title)}`;
    await this.ensureVaultFolder("贴图导出");
    await this.ensureVaultFolder(safeDirectory);
    const listing = await this.app.vault.adapter.list(safeDirectory);
    const paths = buildStickerExportPaths(title, dataUrls.length, new Set(listing.files));
    for (let index = 0; index < paths.length; index += 1) {
      const file = dataUrlToUploadFile(dataUrls[index], `sticker-${index + 1}`);
      await this.app.vault.adapter.writeBinary(paths[index], file.bytes);
    }
    new SuccessModal(this.app, "贴图导出成功", `已保存 ${paths.length} 张图片到 ${safeDirectory}`).open();
    return paths;
  }

  private async publishStickerDraft(note: StickerNote, dataUrls: string[], withDescription: boolean): Promise<void> {
    const account = this.currentAccount();
    const images = dataUrls.map((dataUrl, index) => dataUrlToUploadFile(dataUrl, `sticker-${index + 1}`));
    await publishWechatImageDraft({
      appId: account.appId,
      appSecret: await this.credentialStore().read(account.id),
      requester: async (request) => requestUrl(request),
      title: note.title,
      description: withDescription ? note.plainText : "",
      images,
      needOpenComment: note.needOpenComment,
      onlyFansCanComment: note.onlyFansCanComment
    });
    new SuccessModal(
      this.app,
      "贴图已加入草稿箱",
      withDescription ? "图片和文字描述已成功加入公众号草稿箱。" : "纯图片内容已成功加入公众号草稿箱。"
    ).open();
  }

  private async ensureVaultFolder(path: string): Promise<void> {
    if (!await this.app.vault.adapter.exists(path)) await this.app.vault.createFolder(path);
  }

  private currentAccount() {
    const account = this.settings.accounts.find((item) => item.id === this.settings.selectedAccountId);
    if (!account) throw new Error("请先在插件设置中添加并选择公众号账号");
    return account;
  }

  private credentialStore(): MacosKeychainStore {
    return new MacosKeychainStore();
  }

  private coverStore(): CoverStore {
    if (!this.manifest.dir) throw new Error("找不到插件目录，无法保存本地封面");
    return new CoverStore(this.app.vault.adapter, this.manifest.dir);
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

function uploadFileToDataUrl(file: WechatUploadFile): string {
  return `data:${file.mimeType};base64,${arrayBufferToBase64(file.bytes)}`;
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
