import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import type { WechatAccount } from "./accounts";
import type ObsidianToSmPlugin from "./main";

export interface PluginSettings {
  author: string;
  customCss: string;
  enableLineNumbers: boolean;
  accounts: WechatAccount[];
  selectedAccountId: string;
  encryptedSecrets: Record<string, string>;
  themeId: string;
  thumbMediaId: string;
}

export const DEFAULT_SETTINGS: PluginSettings = {
  author: "",
  customCss: "",
  enableLineNumbers: true,
  accounts: [],
  selectedAccountId: "",
  encryptedSecrets: {},
  themeId: "business-green",
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

    containerEl.createEl("h3", { text: "公众号信息" });
    containerEl.createEl("p", { text: "每行一个公众号：名称|AppID|AppSecret。AppSecret 使用 macOS 系统钥匙串加密保存。" });
    let rows = this.plugin.exportAccountRows();
    new Setting(containerEl).setName("公众号账号").addTextArea((text) => {
      text.inputEl.rows = 6;
      text.inputEl.cols = 48;
      text.inputEl.wrap = "off";
      text.setValue(rows);
      text.onChange((value) => { rows = value; });
    });
    new Setting(containerEl)
      .addButton((button) => button.setButtonText("保存公众号信息").setCta().onClick(async () => {
        try {
          await this.plugin.saveAccounts(rows);
          this.display();
        } catch (error) {
          new Notice(`保存公众号信息失败：${error instanceof Error ? error.message : String(error)}`);
        }
      }))
      .addButton((button) => button.setButtonText("测试公众号").onClick(async () => {
        try {
          await this.plugin.testAccounts();
        } catch (error) {
          new Notice(`测试公众号失败：${error instanceof Error ? error.message : String(error)}`);
        }
      }));

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
