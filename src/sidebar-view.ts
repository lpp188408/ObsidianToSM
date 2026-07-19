import { ItemView, Notice, setIcon, WorkspaceLeaf } from "obsidian";
import { LAYOUTS } from "./layouts";
import { THEMES } from "./themes";
import { SidebarController } from "./sidebar-controller";
import type { WechatAccount } from "./accounts";
import type { WechatUploadFile } from "./wechat";

export const VIEW_TYPE_WECHAT_WORKBENCH = "obsidian-to-sm-workbench";

export interface WorkbenchActions {
  accounts(): readonly WechatAccount[];
  selectedAccountId(): string;
  setSelectedAccount(id: string): Promise<void>;
  addCover(file: WechatUploadFile): Promise<void>;
  copy(themeId: string, layoutId: string): Promise<void>;
  createDraft(themeId: string, layoutId: string): Promise<void>;
  publish(themeId: string, layoutId: string): Promise<void>;
}

export class WechatWorkbenchView extends ItemView {
  private showHelp = false;
  private isRunning = false;

  constructor(leaf: WorkspaceLeaf, private readonly controller: SidebarController, private readonly actions: WorkbenchActions) {
    super(leaf);
  }

  getViewType(): string { return VIEW_TYPE_WECHAT_WORKBENCH; }
  getDisplayText(): string { return "ObsidianToSM"; }
  getIcon(): string { return "send"; }

  async onOpen(): Promise<void> {
    await this.refresh();
  }

  async refresh(): Promise<void> {
    try {
      await this.controller.refresh();
      this.render();
    } catch (error) {
      new Notice(`刷新预览失败：${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private render(): void {
    const state = this.controller.getState();
    this.contentEl.empty();
    const root = this.contentEl.createDiv({ cls: "obsidian-to-sm-workbench" });
    const activeTheme = THEMES.find((item) => item.id === state.themeId) ?? THEMES[0];
    root.style.setProperty("--obsidian-to-sm-publish-accent", activeTheme.accent);

    const header = root.createDiv({ cls: "obsidian-to-sm-workbench-header" });
    header.createSpan({ cls: "obsidian-to-sm-workbench-title", text: "ObsidianToSM" });
    header.createSpan({ cls: "obsidian-to-sm-workbench-status", text: state.html ? "预览已更新" : "等待笔记" });

    const topPanel = root.createDiv({ cls: "obsidian-to-sm-top-panel" });
    const cover = topPanel.createEl("button", {
      cls: "obsidian-to-sm-cover clickable-icon",
      attr: { "aria-label": "添加或更换封面", "data-tooltip-position": "bottom" }
    });
    if (state.coverDataUrl) cover.createEl("img", { attr: { src: state.coverDataUrl, alt: "文章封面" } });
    else setIcon(cover, "image-plus");
    cover.addEventListener("click", () => this.chooseLocalCover());

    const settingsPanel = topPanel.createDiv({ cls: "obsidian-to-sm-settings-panel" });
    const accountRow = settingsPanel.createDiv({ cls: "obsidian-to-sm-account-row" });
    const account = accountRow.createEl("select", { cls: "obsidian-to-sm-account" });
    account.createEl("option", { text: "未选择公众号（预览可用）", value: "" });
    for (const item of this.actions.accounts()) account.createEl("option", { text: item.name, value: item.id });
    account.value = this.actions.selectedAccountId();
    account.addEventListener("change", () => void this.actions.setSelectedAccount(account.value));
    this.iconButton(accountRow, "external-link", "打开公众号后台", () => window.open("https://mp.weixin.qq.com/"));

    const themeRow = settingsPanel.createDiv({ cls: "obsidian-to-sm-option-row" });
    themeRow.createSpan({ cls: "obsidian-to-sm-field-label", text: "颜色主题" });
    const themes = themeRow.createDiv({ cls: "obsidian-to-sm-themes", attr: { "aria-label": "选择颜色主题" } });
    for (const item of THEMES) {
      const theme = themes.createEl("button", {
        cls: `obsidian-to-sm-theme-swatch${item.id === state.themeId ? " is-active" : ""}`,
        attr: { "aria-label": `颜色：${item.name}`, "data-tooltip-position": "bottom" }
      });
      theme.style.backgroundColor = item.accent;
      theme.addEventListener("click", () => void this.controller.setTheme(item.id).then(() => this.render()));
    }

    const layoutRow = settingsPanel.createDiv({ cls: "obsidian-to-sm-option-row" });
    layoutRow.createSpan({ cls: "obsidian-to-sm-field-label", text: "排版模板" });
    const layoutSelect = layoutRow.createEl("select", {
      cls: "obsidian-to-sm-layout-select",
      attr: { "aria-label": "选择排版模板" }
    });
    for (const item of LAYOUTS) layoutSelect.createEl("option", { text: item.name, value: item.id });
    layoutSelect.value = state.layoutId;
    layoutSelect.addEventListener("change", () => {
      void this.controller.setLayout(layoutSelect.value).then(() => this.render());
    });

    const previewModeRow = settingsPanel.createDiv({ cls: "obsidian-to-sm-option-row" });
    previewModeRow.createSpan({ cls: "obsidian-to-sm-field-label", text: "预览模式" });
    const previewModes = previewModeRow.createDiv({ cls: "obsidian-to-sm-preview-modes" });
    for (const item of [
      { id: "mobile" as const, icon: "smartphone", label: "手机预览" },
      { id: "desktop" as const, icon: "monitor", label: "PC 预览" }
    ]) {
      const mode = previewModes.createEl("button", {
        cls: `obsidian-to-sm-preview-mode${item.id === state.previewMode ? " is-active" : ""}`,
        attr: { "aria-label": item.label, "data-tooltip-position": "bottom" }
      });
      setIcon(mode, item.icon);
      mode.addEventListener("click", () => {
        void this.controller.setPreviewMode(item.id).then(() => this.render());
      });
    }

    const toolbar = settingsPanel.createDiv({ cls: "obsidian-to-sm-toolbar" });
    this.iconButton(toolbar, "refresh-cw", "刷新预览", () => void this.refresh());
    this.iconButton(toolbar, "copy", "复制公众号富文本", () => void this.run(() => this.actions.copy(state.themeId, state.layoutId)));
    this.iconButton(toolbar, "file-plus-2", "创建公众号草稿", () => void this.run(() => this.actions.createDraft(state.themeId, state.layoutId)), "obsidian-to-sm-draft-button");
    this.iconButton(toolbar, "send", "直接发布文章", () => void this.run(() => this.actions.publish(state.themeId, state.layoutId)), "obsidian-to-sm-publish-button");
    this.iconButton(toolbar, "circle-help", "显示发布条件", () => { this.showHelp = !this.showHelp; this.render(); });

    if (this.showHelp) {
      root.createDiv({
        cls: "obsidian-to-sm-help",
        text: "预览不需要账号；创建草稿和直接发布需要在插件设置中配置账号、微信 API 权限、IP 白名单和封面。"
      });
    }

    const preview = root.createDiv({ cls: `obsidian-to-sm-sidebar-preview is-${state.previewMode}` });
    preview.innerHTML = state.html || "<p>打开笔记后点击刷新。</p>";
  }

  private iconButton(parent: HTMLElement, icon: string, label: string, handler: () => void, className = ""): HTMLButtonElement {
    const button = parent.createEl("button", { cls: `obsidian-to-sm-icon-button clickable-icon ${className}`.trim() });
    button.setAttribute("aria-label", label);
    button.setAttribute("data-tooltip-position", "bottom");
    setIcon(button, icon);
    button.addEventListener("click", handler);
    return button;
  }

  private chooseLocalCover(): void {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/gif,image/webp";
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (!file) return;
      void this.run(async () => this.actions.addCover({
        bytes: await file.arrayBuffer(),
        filename: file.name,
        mimeType: file.type
      }));
    }, { once: true });
    input.click();
  }

  private async run(action: () => Promise<void>): Promise<void> {
    if (this.isRunning) {
      new Notice("操作正在进行，请稍候");
      return;
    }
    this.isRunning = true;
    try { await action(); await this.refresh(); }
    catch (error) { new Notice(error instanceof Error ? error.message : String(error)); }
    finally { this.isRunning = false; }
  }
}
