import { ItemView, Notice, WorkspaceLeaf } from "obsidian";
import { THEMES } from "./themes";
import { SidebarController } from "./sidebar-controller";
import type { WechatAccount } from "./accounts";

export const VIEW_TYPE_WECHAT_WORKBENCH = "obsidian-to-sm-workbench";

export interface WorkbenchActions {
  accounts(): readonly WechatAccount[];
  selectedAccountId(): string;
  setSelectedAccount(id: string): Promise<void>;
  addCover(): Promise<void>;
  copy(themeId: string): Promise<void>;
  createDraft(themeId: string): Promise<void>;
  publish(themeId: string): Promise<void>;
}

export class WechatWorkbenchView extends ItemView {
  private showHelp = false;

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
    const controls = root.createDiv({ cls: "obsidian-to-sm-controls" });
    const cover = controls.createEl("button", { cls: "obsidian-to-sm-cover", text: "＋\n添加封面" });
    cover.addEventListener("click", () => void this.actions.addCover().then(() => this.refresh()));
    const account = controls.createEl("select", { cls: "obsidian-to-sm-account" });
    account.createEl("option", { text: "请选择公众号", value: "" });
    for (const item of this.actions.accounts()) account.createEl("option", { text: item.name, value: item.id });
    account.value = this.actions.selectedAccountId();
    account.addEventListener("change", () => void this.actions.setSelectedAccount(account.value));
    this.button(controls, "去公众号后台", () => window.open("https://mp.weixin.qq.com/"));
    this.button(controls, "刷新", () => void this.refresh());
    this.button(controls, "发文章", () => void this.run(() => this.actions.createDraft(state.themeId)));
    this.button(controls, "发帖图", () => void this.run(() => this.actions.publish(state.themeId)));
    this.button(controls, "复制", () => void this.run(() => this.actions.copy(state.themeId)));
    const theme = controls.createEl("select", { cls: "obsidian-to-sm-theme" });
    for (const item of THEMES) theme.createEl("option", { text: item.name, value: item.id });
    theme.value = state.themeId;
    theme.addEventListener("change", () => void this.controller.setTheme(theme.value).then(() => this.render()));
    this.button(controls, "帮助", () => { this.showHelp = !this.showHelp; this.render(); });
    if (this.showHelp) root.createDiv({ cls: "obsidian-to-sm-help", text: "请先在插件设置中添加并测试公众号；发布需要 API 权限、IP 白名单与封面。" });
    const preview = root.createDiv({ cls: "obsidian-to-sm-sidebar-preview" });
    preview.innerHTML = state.html || "<p>打开笔记后点击刷新。</p>";
  }

  private button(parent: HTMLElement, text: string, handler: () => void): void {
    const button = parent.createEl("button", { text });
    button.addEventListener("click", handler);
  }

  private async run(action: () => Promise<void>): Promise<void> {
    try { await action(); await this.refresh(); }
    catch (error) { new Notice(error instanceof Error ? error.message : String(error)); }
  }
}
