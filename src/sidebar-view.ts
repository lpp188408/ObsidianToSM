import { ItemView, Notice, setIcon, WorkspaceLeaf } from "obsidian";
import { toPng } from "html-to-image";
import { copyPngToClipboard } from "./clipboard";
import { LAYOUTS } from "./layouts";
import { THEMES } from "./themes";
import { SidebarController } from "./sidebar-controller";
import type { WechatAccount } from "./accounts";
import type { WechatUploadFile } from "./wechat";
import {
  applyStickerRatio,
  calculateStickerPageOffsets,
  calculateStickerTableFirstColumnWidth,
  createDefaultStickerSettings,
  validateStickerPages,
  type StickerBlockMetric,
  type StickerNote,
  type StickerSettings
} from "./sticker";

export const VIEW_TYPE_WECHAT_WORKBENCH = "obsidian-to-sm-workbench";

export interface WorkbenchActions {
  accounts(): readonly WechatAccount[];
  selectedAccountId(): string;
  setSelectedAccount(id: string): Promise<void>;
  addCover(file: WechatUploadFile): Promise<void>;
  copy(themeId: string, layoutId: string): Promise<void>;
  createDraft(themeId: string, layoutId: string): Promise<void>;
  publish(themeId: string, layoutId: string): Promise<void>;
  stickerSettings(): StickerSettings;
  saveStickerSettings(settings: StickerSettings): Promise<void>;
  loadSticker(): Promise<StickerNote | null>;
  copyStickerText(text: string): Promise<void>;
  exportStickerImages(title: string, dataUrls: string[]): Promise<string[]>;
  createStickerDraft(note: StickerNote, dataUrls: string[], withDescription: boolean): Promise<void>;
}

type WorkbenchSection = "wechat" | "sticker";

export class WechatWorkbenchView extends ItemView {
  private showHelp = false;
  private isRunning = false;
  private activeSection: WorkbenchSection = "wechat";
  private showStickerSettings = false;
  private stickerNote: StickerNote | null = null;
  private stickerExportPages: HTMLElement[] = [];
  private stickerSettingsCache: StickerSettings | null = null;
  private stickerSaveQueue: Promise<void> = Promise.resolve();
  private stickerRenderTimer: number | null = null;
  private confirmStickerReset = false;

  constructor(leaf: WorkspaceLeaf, private readonly controller: SidebarController, private readonly actions: WorkbenchActions) {
    super(leaf);
  }

  getViewType(): string { return VIEW_TYPE_WECHAT_WORKBENCH; }
  getDisplayText(): string { return "ObsidianToSM"; }
  getIcon(): string { return "send"; }

  async onOpen(): Promise<void> {
    this.contentEl.addClass("obsidian-to-sm-workbench-view");
    await this.refreshWechat();
  }

  async onClose(): Promise<void> {
    this.contentEl.removeClass("obsidian-to-sm-workbench-view");
  }

  private async refreshWechat(): Promise<void> {
    try {
      await this.controller.refresh();
      this.render();
    } catch (error) {
      new Notice(`刷新预览失败：${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async refreshSticker(): Promise<void> {
    try {
      this.stickerNote = await this.actions.loadSticker();
      this.render();
    } catch (error) {
      new Notice(`刷新贴图失败：${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private render(): void {
    const state = this.controller.getState();
    this.contentEl.empty();
    const root = this.contentEl.createDiv({ cls: "obsidian-to-sm-workbench" });
    const activeTheme = THEMES.find((item) => item.id === state.themeId) ?? THEMES[0];
    root.style.setProperty("--obsidian-to-sm-publish-accent", activeTheme.accent);

    const tabs = root.createDiv({ cls: "obsidian-to-sm-section-tabs", attr: { role: "tablist" } });
    for (const item of [{ id: "wechat" as const, label: "公众号" }, { id: "sticker" as const, label: "贴图" }]) {
      const tab = tabs.createEl("button", {
        cls: `obsidian-to-sm-section-tab${this.activeSection === item.id ? " is-active" : ""}`,
        text: item.label,
        attr: { role: "tab", "aria-selected": String(this.activeSection === item.id) }
      });
      tab.addEventListener("click", () => void this.switchSection(item.id));
    }

    if (this.activeSection === "sticker") this.renderSticker(root);
    else this.renderWechat(root);
  }

  private async switchSection(section: WorkbenchSection): Promise<void> {
    this.activeSection = section;
    this.showStickerSettings = false;
    if (section === "sticker" && !this.stickerNote) await this.refreshSticker();
    else this.render();
  }

  private renderWechat(root: HTMLElement): void {
    const state = this.controller.getState();
    const topPanel = root.createDiv({ cls: "obsidian-to-sm-top-panel" });
    const cover = topPanel.createEl("button", {
      cls: "obsidian-to-sm-cover clickable-icon",
      attr: { "aria-label": "添加或更换封面", "data-tooltip-position": "bottom" }
    });
    if (state.coverDataUrl) cover.createEl("img", { attr: { src: state.coverDataUrl, alt: "文章封面" } });
    else setIcon(cover, "image-plus");
    cover.addEventListener("click", () => this.chooseLocalCover());

    const settingsFields = topPanel.createDiv({ cls: "obsidian-to-sm-settings-fields" });
    const accountRow = settingsFields.createDiv({ cls: "obsidian-to-sm-account-row" });
    this.createAccountSelect(accountRow);
    this.iconButton(accountRow, "external-link", "打开公众号后台", () => window.open("https://mp.weixin.qq.com/"));

    const themeRow = settingsFields.createDiv({ cls: "obsidian-to-sm-option-row" });
    themeRow.createSpan({ cls: "obsidian-to-sm-field-label", text: "颜色主题" });
    const themes = themeRow.createDiv({ cls: "obsidian-to-sm-themes", attr: { "aria-label": "选择颜色主题" } });
    for (const item of THEMES) {
      const theme = themes.createEl("button", {
        cls: `obsidian-to-sm-theme-swatch${item.isOriginal ? " is-original" : ""}${item.id === state.themeId ? " is-active" : ""}`,
        attr: { "aria-label": `颜色：${item.name}`, "data-tooltip-position": "bottom" }
      });
      if (!item.isOriginal) theme.style.backgroundColor = item.accent;
      theme.addEventListener("click", () => void this.controller.setTheme(item.id).then(() => this.render()));
    }

    const layoutRow = settingsFields.createDiv({ cls: "obsidian-to-sm-option-row" });
    layoutRow.createSpan({ cls: "obsidian-to-sm-field-label", text: "排版模板" });
    const layoutSelect = layoutRow.createEl("select", { cls: "obsidian-to-sm-layout-select", attr: { "aria-label": "选择排版模板" } });
    for (const item of LAYOUTS) layoutSelect.createEl("option", { text: item.name, value: item.id });
    layoutSelect.value = state.layoutId;
    layoutSelect.addEventListener("change", () => void this.controller.setLayout(layoutSelect.value).then(() => this.render()));

    const previewRow = settingsFields.createDiv({ cls: "obsidian-to-sm-preview-row" });
    const previewModes = previewRow.createDiv({ cls: "obsidian-to-sm-preview-modes" });
    for (const item of [
      { id: "mobile" as const, icon: "smartphone", label: "手机预览" },
      { id: "desktop" as const, icon: "monitor", label: "PC 预览" }
    ]) {
      const mode = previewModes.createEl("button", {
        cls: `obsidian-to-sm-preview-mode${item.id === state.previewMode ? " is-active" : ""}`,
        attr: { "aria-label": item.label, "data-tooltip-position": "bottom" }
      });
      setIcon(mode, item.icon);
      mode.addEventListener("click", () => void this.controller.setPreviewMode(item.id).then(() => this.render()));
    }

    const toolbar = topPanel.createDiv({ cls: "obsidian-to-sm-toolbar" });
    const commands = toolbar.createDiv({ cls: "obsidian-to-sm-commands" });
    this.iconButton(commands, "refresh-cw", "刷新预览", () => void this.refreshWechat());
    this.iconButton(commands, "copy", "复制公众号富文本", () => void this.run(() => this.actions.copy(state.themeId, state.layoutId), true));
    this.iconButton(commands, "file-plus-2", "创建公众号草稿", () => void this.run(() => this.actions.createDraft(state.themeId, state.layoutId), true), "obsidian-to-sm-draft-button");
    this.iconButton(commands, "send", "直接发布文章", () => void this.run(() => this.actions.publish(state.themeId, state.layoutId), true), "obsidian-to-sm-publish-button");
    this.iconButton(commands, "circle-help", "显示发布条件", () => { this.showHelp = !this.showHelp; this.render(); });

    if (this.showHelp) root.createDiv({
      cls: "obsidian-to-sm-help",
      text: "预览不需要账号；创建草稿和直接发布需要在插件设置中配置账号、微信 API 权限、IP 白名单和封面。"
    });

    const preview = root.createDiv({ cls: `obsidian-to-sm-sidebar-preview is-${state.previewMode}` });
    preview.innerHTML = state.html || "<p>打开笔记后点击刷新。</p>";
  }

  private renderSticker(root: HTMLElement): void {
    const settings = this.currentStickerSettings();
    const shell = root.createDiv({ cls: "obsidian-to-sm-sticker-shell" });
    const toolbar = shell.createDiv({ cls: "obsidian-to-sm-sticker-toolbar" });
    const accountRow = toolbar.createDiv({ cls: "obsidian-to-sm-sticker-account" });
    this.createAccountSelect(accountRow);
    const actions = toolbar.createDiv({ cls: "obsidian-to-sm-sticker-actions" });
    this.iconButton(actions, "images", "创建纯图片公众号草稿", () => void this.createStickerDraft(false), "", "纯图稿");
    this.iconButton(actions, "file-text", "创建图片加描述公众号草稿", () => void this.createStickerDraft(true), "", "图文稿");
    this.iconButton(actions, "download", "导出贴图到 Vault", () => void this.exportSticker(), "", "导出");
    this.iconButton(actions, "clipboard", "复制首张贴图图片", () => void this.copyStickerImage(), "", "复制图");
    this.iconButton(actions, "copy", "复制贴图文案", () => void this.copyStickerText(), "", "复制文");
    this.iconButton(actions, "refresh-cw", "刷新贴图", () => void this.refreshSticker(), "", "刷新");
    this.iconButton(actions, "settings-2", "打开贴图设置", () => { this.showStickerSettings = true; this.render(); }, "", "设置");

    const preview = shell.createDiv({ cls: "obsidian-to-sm-sticker-preview" });
    if (!this.stickerNote) {
      preview.createEl("p", { cls: "obsidian-to-sm-sticker-empty", text: "打开笔记后点击刷新。" });
    } else {
      this.buildStickerPages(preview, root, this.stickerNote, settings);
    }

    if (this.showStickerSettings) this.renderStickerSettings(shell, settings);
  }

  private buildStickerPages(preview: HTMLElement, root: HTMLElement, note: StickerNote, settings: StickerSettings): void {
    this.stickerExportPages = [];
    const viewportWidth = Math.max(100, settings.width - settings.padding * 2);
    const measure = root.createDiv({ cls: "obsidian-to-sm-sticker-measure" });
    measure.style.width = `${viewportWidth}px`;
    measure.innerHTML = note.html;
    const article = measure.querySelector<HTMLElement>(".obsidian-to-sm-sticker-content");
    if (!article) return;
    this.applyStickerContentStyles(article, settings);
    const contentHeight = Math.ceil(Math.max(article.scrollHeight, article.offsetHeight));
    const blocks: StickerBlockMetric[] = Array.from(article.children).map((child) => {
      const element = child as HTMLElement;
      return { top: element.offsetTop, bottom: element.offsetTop + element.offsetHeight, tag: element.tagName };
    });
    blocks.push(...this.collectStickerLineMetrics(article));
    const contentViewportHeight = Math.max(50, settings.pageHeight - settings.padding * 2);
    const offsets = calculateStickerPageOffsets(contentHeight, contentViewportHeight, blocks, settings.pageMode);
    const frameHeights = offsets.map(() => settings.pageMode === "single" ? contentHeight + settings.padding * 2 : settings.pageHeight);

    const label = preview.createDiv({ cls: "obsidian-to-sm-sticker-size" });
    label.setText(settings.pageMode === "single"
      ? `尺寸 ${settings.width}px × ${frameHeights[0]}px`
      : `尺寸 ${settings.width}px × ${settings.pageHeight}px · ${offsets.length} 页`);
    const pages = preview.createDiv({ cls: "obsidian-to-sm-sticker-pages" });
    const availableWidth = Math.max(180, preview.clientWidth - 28);
    const scale = Math.min(1, availableWidth / settings.width);
    offsets.forEach((offset, index) => {
      const outer = pages.createDiv({ cls: "obsidian-to-sm-sticker-page-scale" });
      outer.style.width = `${settings.width * scale}px`;
      outer.style.height = `${frameHeights[index] * scale}px`;
      const visibleHeight = Math.min(
        settings.pageMode === "single" ? contentHeight : contentViewportHeight,
        (offsets[index + 1] ?? contentHeight) - offset
      );
      const frame = this.createStickerFrame(article, settings, offset, visibleHeight, frameHeights[index]);
      frame.style.transform = `scale(${scale})`;
      outer.appendChild(frame);
    });

    const exportTrack = root.createDiv({ cls: "obsidian-to-sm-sticker-export-track" });
    offsets.forEach((offset, index) => {
      const visibleHeight = Math.min(
        settings.pageMode === "single" ? contentHeight : contentViewportHeight,
        (offsets[index + 1] ?? contentHeight) - offset
      );
      const frame = this.createStickerFrame(article, settings, offset, visibleHeight, frameHeights[index]);
      exportTrack.appendChild(frame);
      this.stickerExportPages.push(frame);
    });
    measure.remove();
  }

  private createStickerFrame(
    article: HTMLElement,
    settings: StickerSettings,
    offset: number,
    visibleHeight: number,
    frameHeight: number
  ): HTMLElement {
    const frame = document.createElement("section");
    frame.className = "obsidian-to-sm-sticker-page";
    frame.style.width = `${settings.width}px`;
    frame.style.height = `${frameHeight}px`;
    frame.style.padding = `${settings.padding}px`;
    frame.style.borderRadius = `${settings.borderRadius}px`;
    frame.style.background = settings.backgroundType === "gradient" ? settings.backgroundGradient : settings.backgroundColor;
    const viewport = document.createElement("div");
    viewport.className = "obsidian-to-sm-sticker-viewport";
    viewport.style.height = `${Math.max(1, visibleHeight)}px`;
    const clone = article.cloneNode(true) as HTMLElement;
    this.applyStickerContentStyles(clone, settings);
    clone.style.transform = `translateY(-${offset}px)`;
    viewport.appendChild(clone);
    frame.appendChild(viewport);
    return frame;
  }

  private collectStickerLineMetrics(article: HTMLElement): StickerBlockMetric[] {
    const articleRect = article.getBoundingClientRect();
    const lines = new Map<string, StickerBlockMetric>();
    const walker = document.createTreeWalker(article, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      if (node.textContent?.trim()) {
        const range = document.createRange();
        range.selectNodeContents(node);
        for (const rect of Array.from(range.getClientRects())) {
          const top = Math.max(0, rect.top - articleRect.top);
          const bottom = Math.max(top, rect.bottom - articleRect.top);
          if (bottom > top) lines.set(`${Math.round(top)}:${Math.round(bottom)}`, { top, bottom, tag: "LINE" });
        }
        range.detach();
      }
      node = walker.nextNode();
    }
    return [...lines.values()];
  }

  private applyStickerContentStyles(article: HTMLElement, settings: StickerSettings): void {
    article.style.width = "100%";
    article.style.fontFamily = settings.fontFamily === "默认" ? "-apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif" : settings.fontFamily;
    article.style.fontSize = `${settings.fontSize}px`;
    this.fitStickerTableColumns(article);
  }

  private fitStickerTableColumns(article: HTMLElement): void {
    for (const table of Array.from(article.querySelectorAll<HTMLTableElement>("table"))) {
      if (table.clientWidth <= 0) continue;
      const cells = Array.from(table.querySelectorAll<HTMLTableCellElement>("tr > th:first-child, tr > td:first-child"));
      if (!cells.length) continue;
      const contentWidth = Math.max(...cells.map((cell) => this.measureStickerTableCell(cell)));
      const width = calculateStickerTableFirstColumnWidth(table.clientWidth, contentWidth);
      table.style.tableLayout = "fixed";
      for (const cell of cells) cell.style.width = `${Math.ceil(width)}px`;
    }
  }

  private measureStickerTableCell(cell: HTMLTableCellElement): number {
    const style = window.getComputedStyle(cell);
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return cell.scrollWidth;
    context.font = style.font;
    const padding = Number.parseFloat(style.paddingLeft) + Number.parseFloat(style.paddingRight);
    return context.measureText(cell.textContent?.trim() ?? "").width + padding;
  }

  private renderStickerSettings(shell: HTMLElement, settings: StickerSettings): void {
    const backdrop = shell.createDiv({ cls: "obsidian-to-sm-sticker-backdrop" });
    backdrop.addEventListener("click", () => { this.showStickerSettings = false; this.render(); });
    const drawer = shell.createDiv({ cls: "obsidian-to-sm-sticker-settings" });
    const header = drawer.createDiv({ cls: "obsidian-to-sm-sticker-settings-header" });
    header.createEl("h3", { text: "贴图排版设置" });
    const headerActions = header.createDiv({ cls: "obsidian-to-sm-sticker-settings-actions" });
    const resetButton = headerActions.createEl("button", {
      cls: `obsidian-to-sm-sticker-restore-button${this.confirmStickerReset ? " is-confirming" : ""}`,
      text: this.confirmStickerReset ? "确认恢复" : "恢复默认",
      attr: { "aria-label": "恢复贴图默认设置" }
    });
    resetButton.addEventListener("click", () => {
      if (!this.confirmStickerReset) {
        this.confirmStickerReset = true;
        resetButton.addClass("is-confirming");
        resetButton.setText("确认恢复");
        return;
      }
      this.confirmStickerReset = false;
      this.saveFullStickerSettings(createDefaultStickerSettings());
      new Notice("贴图排版已恢复默认设置");
    });
    this.iconButton(headerActions, "x", "关闭贴图设置", () => {
      this.showStickerSettings = false;
      this.confirmStickerReset = false;
      this.render();
    });

    this.createStickerSectionHeading(drawer, "排版布局");
    this.createSegmentedSetting(drawer, "导出模式", [
      { value: "single", label: "单张长图" },
      { value: "multi", label: "多页切片" },
      { value: "hr", label: "按分割线" }
    ], settings.pageMode, (value) => this.updateStickerSettings({ pageMode: value as StickerSettings["pageMode"] }));

    this.createSegmentedSetting(drawer, "比例预设", [
      { value: "3-4", label: "小红书 3:4" }, { value: "9-16", label: "故事 9:16" }, { value: "1-1", label: "正方形 1:1" },
      { value: "4-3", label: "标准 4:3" }, { value: "16-9", label: "宽屏 16:9" }, { value: "custom", label: "自定义" }
    ], settings.presetRatio, (value) => this.saveFullStickerSettings(applyStickerRatio(this.currentStickerSettings(), value)));

    const dimensions = drawer.createDiv({ cls: "obsidian-to-sm-sticker-setting-grid" });
    this.createNumberSetting(dimensions, "宽度", settings.width, 320, 1440, (width) => this.updateStickerSettings({ width, presetRatio: "custom" }));
    this.createNumberSetting(dimensions, "页高度", settings.pageHeight, 320, 16000, (pageHeight) => this.updateStickerSettings({ pageHeight, presetRatio: "custom" }), settings.pageMode === "single");
    if (settings.pageMode === "single") dimensions.createDiv({ cls: "obsidian-to-sm-sticker-setting-hint", text: "长图模式下高度随正文自动计算" });

    this.createStickerSectionHeading(drawer, "排版与字体");
    const fontGroup = this.settingGroup(drawer, "字体");
    const fontSelect = fontGroup.createEl("select", { cls: "obsidian-to-sm-sticker-select" });
    for (const font of ["默认", "PingFang SC", "Microsoft YaHei", "SimHei", "KaiTi", "Arial", "Georgia", "Courier New"]) {
      fontSelect.createEl("option", { text: font, value: font });
    }
    fontSelect.value = ["默认", "PingFang SC", "Microsoft YaHei", "SimHei", "KaiTi", "Arial", "Georgia", "Courier New"].includes(settings.fontFamily) ? settings.fontFamily : "默认";
    fontSelect.addEventListener("change", () => this.updateStickerSettings({ fontFamily: fontSelect.value }));
    const customFont = fontGroup.createEl("input", { cls: "obsidian-to-sm-sticker-input", attr: { type: "text", placeholder: "手动输入字体名称" } });
    if (fontSelect.value === "默认" && settings.fontFamily !== "默认") customFont.value = settings.fontFamily;
    customFont.addEventListener("change", () => this.updateStickerSettings({ fontFamily: customFont.value.trim() || "默认" }));

    this.createRangeSetting(drawer, "字号大小", settings.fontSize, 12, 28, 1, (fontSize) => this.updateStickerSettings({ fontSize }));

    this.createStickerSectionHeading(drawer, "样式与背景");
    this.createSegmentedSetting(drawer, "背景", [
      { value: "color", label: "纯色" }, { value: "gradient", label: "渐变" }
    ], settings.backgroundType, (value) => this.updateStickerSettings({ backgroundType: value as StickerSettings["backgroundType"] }));
    if (settings.backgroundType === "color") {
      const color = this.settingGroup(drawer, "背景颜色").createEl("input", { cls: "obsidian-to-sm-sticker-color", attr: { type: "color" } });
      color.value = settings.backgroundColor;
      color.addEventListener("change", () => this.updateStickerSettings({ backgroundColor: color.value }));
    } else {
      const gradient = this.settingGroup(drawer, "渐变背景").createEl("select", { cls: "obsidian-to-sm-sticker-select" });
      const presets = [
        ["雾蓝", "linear-gradient(135deg, #f8fafc 0%, #e8eef7 100%)"],
        ["晨曦", "linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)"],
        ["青芽", "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)"],
        ["柔粉", "linear-gradient(135deg, #fff1f2 0%, #fce7f3 100%)"]
      ];
      for (const [name, value] of presets) gradient.createEl("option", { text: name, value });
      gradient.value = settings.backgroundGradient;
      gradient.addEventListener("change", () => this.updateStickerSettings({ backgroundGradient: gradient.value }));
    }
    this.createRangeSetting(drawer, "内边距", settings.padding, 16, 80, 4, (padding) => this.updateStickerSettings({ padding }));
    this.createRangeSetting(drawer, "圆角大小", settings.borderRadius, 0, 32, 2, (borderRadius) => this.updateStickerSettings({ borderRadius }));
  }

  private createSegmentedSetting(
    parent: HTMLElement,
    label: string,
    options: Array<{ value: string; label: string }>,
    value: string,
    onChange: (value: string) => void
  ): void {
    const group = this.settingGroup(parent, label);
    const control = group.createDiv({ cls: "obsidian-to-sm-sticker-segmented" });
    control.style.gridTemplateColumns = `repeat(${Math.min(options.length, 3)}, minmax(0, 1fr))`;
    for (const option of options) {
      const button = control.createEl("button", { cls: option.value === value ? "is-active" : "", text: option.label });
      button.addEventListener("click", () => {
        for (const sibling of Array.from(control.children)) sibling.removeClass("is-active");
        button.addClass("is-active");
        onChange(option.value);
      });
    }
  }

  private createNumberSetting(parent: HTMLElement, label: string, value: number, min: number, max: number, onChange: (value: number) => void, disabled = false): void {
    const group = this.settingGroup(parent, label);
    const input = group.createEl("input", { cls: "obsidian-to-sm-sticker-input", attr: { type: "number", min: String(min), max: String(max) } });
    input.value = String(value);
    input.disabled = disabled;
    input.addEventListener("change", () => onChange(Math.min(max, Math.max(min, Number(input.value) || min))));
  }

  private createRangeSetting(parent: HTMLElement, label: string, value: number, min: number, max: number, step: number, onChange: (value: number) => void): void {
    const group = parent.createDiv({ cls: "obsidian-to-sm-sticker-setting-group is-range" });
    const heading = group.createDiv({ cls: "obsidian-to-sm-sticker-range-heading" });
    heading.createEl("label", { text: label });
    heading.createSpan({ text: `${value}px` });
    const input = group.createEl("input", { cls: "obsidian-to-sm-sticker-range", attr: { type: "range", min: String(min), max: String(max), step: String(step) } });
    input.value = String(value);
    input.addEventListener("change", () => onChange(Number(input.value)));
  }

  private createStickerSectionHeading(parent: HTMLElement, text: string): void {
    parent.createEl("h4", { cls: "obsidian-to-sm-sticker-section-heading", text });
  }

  private settingGroup(parent: HTMLElement, label: string): HTMLElement {
    const group = parent.createDiv({ cls: "obsidian-to-sm-sticker-setting-group" });
    group.createEl("label", { text: label });
    return group;
  }

  private updateStickerSettings(update: Partial<StickerSettings>): void {
    this.saveFullStickerSettings({ ...this.currentStickerSettings(), ...update });
  }

  private currentStickerSettings(): StickerSettings {
    return this.stickerSettingsCache ?? this.actions.stickerSettings();
  }

  private saveFullStickerSettings(settings: StickerSettings): void {
    this.stickerSettingsCache = settings;
    if (this.stickerRenderTimer !== null) window.clearTimeout(this.stickerRenderTimer);
    this.stickerRenderTimer = window.setTimeout(() => {
      this.stickerRenderTimer = null;
      this.render();
    }, 120);
    this.stickerSaveQueue = this.stickerSaveQueue
      .then(() => this.actions.saveStickerSettings(settings))
      .catch((error) => { new Notice(`保存贴图设置失败：${error instanceof Error ? error.message : String(error)}`); });
  }

  private async exportSticker(): Promise<void> {
    if (!this.stickerNote) return;
    await this.run(async () => {
      const dataUrls = await this.captureStickerPages(false);
      await this.actions.exportStickerImages(this.stickerNote!.title, dataUrls);
    });
  }

  private async createStickerDraft(withDescription: boolean): Promise<void> {
    if (!this.stickerNote) return;
    await this.run(async () => {
      const dataUrls = await this.captureStickerPages(true);
      await this.actions.createStickerDraft(this.stickerNote!, dataUrls, withDescription);
    });
  }

  private async copyStickerText(): Promise<void> {
    if (!this.stickerNote) return;
    await this.run(() => this.actions.copyStickerText(this.stickerNote!.plainText));
  }

  private async copyStickerImage(): Promise<void> {
    if (!this.stickerNote) return;
    await this.run(async () => {
      const [firstPage] = await this.captureStickerPages(false);
      if (!firstPage) throw new Error("没有可复制的贴图图片");
      await copyPngToClipboard(firstPage);
      new Notice("已复制首张贴图图片，可直接粘贴到微信或其他应用");
    });
  }

  private async captureStickerPages(forWechat: boolean): Promise<string[]> {
    const heights = this.stickerExportPages.map((page) => Number.parseFloat(page.style.height));
    validateStickerPages(heights, forWechat);
    if (document.fonts?.ready) await document.fonts.ready;
    await Promise.all(this.stickerExportPages.flatMap((page) => Array.from(page.querySelectorAll("img")).map(waitForImage)));
    const dataUrls: string[] = [];
    for (const page of this.stickerExportPages) {
      dataUrls.push(await toPng(page, { pixelRatio: 2, cacheBust: true }));
    }
    return dataUrls;
  }

  private createAccountSelect(parent: HTMLElement): HTMLSelectElement {
    const account = parent.createEl("select", { cls: "obsidian-to-sm-account" });
    account.createEl("option", { text: "未选择公众号（预览可用）", value: "" });
    for (const item of this.actions.accounts()) account.createEl("option", { text: item.name, value: item.id });
    account.value = this.actions.selectedAccountId();
    account.addEventListener("change", () => void this.actions.setSelectedAccount(account.value));
    return account;
  }

  private iconButton(parent: HTMLElement, icon: string, label: string, handler: () => void, className = "", shortLabel = ""): HTMLButtonElement {
    const button = parent.createEl("button", { cls: `obsidian-to-sm-icon-button clickable-icon ${className}`.trim() });
    button.setAttribute("aria-label", label);
    button.setAttribute("data-tooltip-position", "bottom");
    setIcon(button, icon);
    if (shortLabel) button.createSpan({ cls: "obsidian-to-sm-icon-button-label", text: shortLabel });
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
      void this.run(async () => this.actions.addCover({ bytes: await file.arrayBuffer(), filename: file.name, mimeType: file.type }), true);
    }, { once: true });
    input.click();
  }

  private async run(action: () => Promise<unknown>, refreshWechat = false): Promise<void> {
    if (this.isRunning) {
      new Notice("操作正在进行，请稍候");
      return;
    }
    this.isRunning = true;
    try {
      await action();
      if (refreshWechat) await this.refreshWechat();
    } catch (error) {
      new Notice(error instanceof Error ? error.message : String(error));
    } finally {
      this.isRunning = false;
    }
  }
}

function waitForImage(image: HTMLImageElement): Promise<void> {
  if (image.complete) return Promise.resolve();
  return new Promise((resolve, reject) => {
    image.addEventListener("load", () => resolve(), { once: true });
    image.addEventListener("error", () => reject(new Error("贴图中的图片加载失败")), { once: true });
  });
}
