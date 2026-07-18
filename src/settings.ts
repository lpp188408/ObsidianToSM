import { App, PluginSettingTab, Setting } from "obsidian";
import type ObsidianToSmPlugin from "./main";

export interface PluginSettings {
  author: string;
  defaultAccountName: string;
  customCss: string;
  enableLineNumbers: boolean;
  wechatAppId: string;
  wechatAppSecret: string;
  thumbMediaId: string;
}

export const DEFAULT_SETTINGS: PluginSettings = {
  author: "",
  defaultAccountName: "",
  customCss: "",
  enableLineNumbers: true,
  wechatAppId: "",
  wechatAppSecret: "",
  thumbMediaId: ""
};

export class SettingsTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: ObsidianToSmPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Obsidian To SM" });

    new Setting(containerEl)
      .setName("作者")
      .setDesc("复制到公众号时使用的默认作者。")
      .addText((text) =>
        text.setValue(this.plugin.settings.author).onChange(async (value) => {
          this.plugin.settings.author = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("默认公众号")
      .setDesc("仅用于本地标记，MVP 不会自动登录公众号。")
      .addText((text) =>
        text.setValue(this.plugin.settings.defaultAccountName).onChange(async (value) => {
          this.plugin.settings.defaultAccountName = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("代码行号")
      .setDesc("复制 HTML 时给代码块增加行号。")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.enableLineNumbers).onChange(async (value) => {
          this.plugin.settings.enableLineNumbers = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("自定义 CSS")
      .setDesc("附加到复制内容中的公众号样式。")
      .addTextArea((text) => {
        text.inputEl.rows = 8;
        text.inputEl.cols = 48;
        text.setValue(this.plugin.settings.customCss).onChange(async (value) => {
          this.plugin.settings.customCss = value;
          await this.plugin.saveSettings();
        });
      });

    containerEl.createEl("h3", { text: "直发草稿配置" });
    containerEl.createEl("p", {
      text: "直发草稿需要公众号 API 权限和 IP 白名单。正文图片与笔记封面会自动上传；没有笔记封面时，可用下方 thumb_media_id 兜底。"
    });

    new Setting(containerEl)
      .setName("AppID")
      .addText((text) =>
        text.setValue(this.plugin.settings.wechatAppId).onChange(async (value) => {
          this.plugin.settings.wechatAppId = value.trim();
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("AppSecret")
      .setDesc("仅保存在本地 Obsidian 插件数据中。")
      .addText((text) => {
        text.inputEl.type = "password";
        text.setValue(this.plugin.settings.wechatAppSecret).onChange(async (value) => {
          this.plugin.settings.wechatAppSecret = value.trim();
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("封面 thumb_media_id")
      .setDesc("可选。笔记 frontmatter 有“封面”时会自动上传并优先使用；仅在未设置本地封面时作为兜底。")
      .addText((text) =>
        text.setValue(this.plugin.settings.thumbMediaId).onChange(async (value) => {
          this.plugin.settings.thumbMediaId = value.trim();
          await this.plugin.saveSettings();
        })
      );
  }
}
