import { App, Notice, PluginSettingTab, setIcon, Setting } from "obsidian";
import type { WechatAccount } from "./accounts";
import type { StoredCover } from "./cover-store";
import type { CoverCrop } from "./cover-crop";
import type ObsidianToSmPlugin from "./main";
import type { PreviewMode } from "./sidebar-controller";
import { DEFAULT_STICKER_SETTINGS, type StickerSettings } from "./sticker";

export interface PluginSettings {
  author: string;
  customCss: string;
  enableLineNumbers: boolean;
  accounts: WechatAccount[];
  selectedAccountId: string;
  encryptedSecrets: Record<string, string>;
  themeId: string;
  layoutId: string;
  previewMode: PreviewMode;
  thumbMediaId: string;
  localCovers: Record<string, StoredCover>;
  coverCrops: Record<string, CoverCrop>;
  stickerSettings: StickerSettings;
}

export const DEFAULT_SETTINGS: PluginSettings = {
  author: "",
  customCss: "",
  enableLineNumbers: true,
  accounts: [],
  selectedAccountId: "",
  encryptedSecrets: {},
  themeId: "tech-blue",
  layoutId: "modern-business",
  previewMode: "desktop",
  thumbMediaId: "",
  localCovers: {},
  coverCrops: {},
  stickerSettings: DEFAULT_STICKER_SETTINGS
};

export class SettingsTab extends PluginSettingTab {
  private showAccountHelp = false;

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

    const accountHeading = containerEl.createDiv({ cls: "obsidian-to-sm-settings-heading" });
    accountHeading.createEl("h3", { text: "公众号信息" });
    const accountHelpButton = accountHeading.createEl("button", {
      cls: "clickable-icon obsidian-to-sm-settings-info",
      attr: {
        "aria-label": "查看公众号配置说明",
        "aria-expanded": String(this.showAccountHelp)
      }
    });
    setIcon(accountHelpButton, "info");
    accountHelpButton.addEventListener("click", () => {
      this.showAccountHelp = !this.showAccountHelp;
      this.display();
    });
    if (this.showAccountHelp) {
      const accountHelp = containerEl.createDiv({ cls: "obsidian-to-sm-settings-help" });
      accountHelp.createEl("p", { text: "每行配置一个公众号，多个公众号请换行输入。" });
      accountHelp.createEl("code", { text: "公众号名称|AppID|AppSecret" });
      accountHelp.createEl("p", { text: "AppSecret 保存到 macOS 系统钥匙串；发布前还需在微信开发者平台配置 API IP 白名单。" });
    }
    let rows = this.plugin.exportAccountRows();
    new Setting(containerEl).setName("公众号账号").addTextArea((text) => {
      text.inputEl.rows = 6;
      text.inputEl.cols = 48;
      text.inputEl.wrap = "off";
      text.inputEl.placeholder = "公众号名称|AppID|AppSecret\n第二个公众号|AppID|AppSecret";
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
      .setDesc("可选。右侧工作台选择的本地封面会自动上传并优先使用；这里只在未选择本地封面时作为兜底。")
      .addText((text) =>
        text.setValue(this.plugin.settings.thumbMediaId).onChange(async (value) => {
          this.plugin.settings.thumbMediaId = value.trim();
          await this.plugin.saveSettings();
        })
      );
  }
}
