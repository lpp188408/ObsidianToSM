export type PreviewMode = "mobile" | "desktop";

export interface SidebarState {
  html: string;
  plainText: string;
  coverDataUrl?: string;
  themeId: string;
  layoutId: string;
  previewMode: PreviewMode;
  isBusy: boolean;
}

export interface SidebarControllerDependencies {
  initialThemeId?: string;
  initialLayoutId?: string;
  initialPreviewMode?: PreviewMode;
  load(themeId: string, layoutId: string): Promise<{ html: string; plainText: string; coverDataUrl?: string }>;
  persistStyle?(themeId: string, layoutId: string): Promise<void>;
  persistPreviewMode?(mode: PreviewMode): Promise<void>;
  publish?(): Promise<void>;
}

export class SidebarController {
  private state: SidebarState;

  constructor(private readonly dependencies: SidebarControllerDependencies) {
    this.state = {
      html: "",
      plainText: "",
      themeId: dependencies.initialThemeId ?? "tech-blue",
      layoutId: dependencies.initialLayoutId ?? "modern-business",
      previewMode: dependencies.initialPreviewMode ?? "desktop",
      isBusy: false
    };
  }

  getState(): Readonly<SidebarState> {
    return this.state;
  }

  async refresh(): Promise<void> {
    const note = await this.dependencies.load(this.state.themeId, this.state.layoutId);
    this.state = {
      ...this.state,
      html: note.html,
      plainText: note.plainText,
      coverDataUrl: note.coverDataUrl
    };
  }

  async setTheme(themeId: string): Promise<void> {
    this.state = { ...this.state, themeId };
    await this.dependencies.persistStyle?.(this.state.themeId, this.state.layoutId);
    await this.refresh();
  }

  async setLayout(layoutId: string): Promise<void> {
    this.state = { ...this.state, layoutId };
    await this.dependencies.persistStyle?.(this.state.themeId, this.state.layoutId);
    await this.refresh();
  }

  async setPreviewMode(previewMode: PreviewMode): Promise<void> {
    this.state = { ...this.state, previewMode };
    await this.dependencies.persistPreviewMode?.(previewMode);
  }

  async publish(): Promise<void> {
    if (this.state.isBusy) throw new Error("正在发布，请稍候");
    if (!this.dependencies.publish) throw new Error("未配置发布能力");
    this.state = { ...this.state, isBusy: true };
    try {
      await this.dependencies.publish();
    } finally {
      this.state = { ...this.state, isBusy: false };
    }
  }
}
