export interface SidebarState {
  html: string;
  plainText: string;
  themeId: string;
  isBusy: boolean;
}

export interface SidebarControllerDependencies {
  load(themeId: string): Promise<{ html: string; plainText: string }>;
  publish?(): Promise<void>;
}

export class SidebarController {
  private state: SidebarState = { html: "", plainText: "", themeId: "business-green", isBusy: false };

  constructor(private readonly dependencies: SidebarControllerDependencies) {}

  getState(): Readonly<SidebarState> {
    return this.state;
  }

  async refresh(): Promise<void> {
    const note = await this.dependencies.load(this.state.themeId);
    this.state = { ...this.state, ...note };
  }

  async setTheme(themeId: string): Promise<void> {
    this.state = { ...this.state, themeId };
    await this.refresh();
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
