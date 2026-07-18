# Obsidian To WeChat MP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a personal Obsidian plugin similar to NoteToMP for converting the active note into WeChat Official Account editor friendly HTML, copying it, previewing it, and later publishing it as a draft.

**Architecture:** Start with a local-only MVP: Obsidian command/ribbon opens a preview modal, converts the active Markdown file to styled HTML, resolves local images as data URLs, and writes rich HTML to the clipboard. Add direct WeChat draft publishing only after the copy workflow is verified, because WeChat access token, media upload, and draft APIs depend on AppID/AppSecret and IP whitelist constraints.

**Tech Stack:** Obsidian plugin API, TypeScript, esbuild, marked, highlight.js, jsdom for tests, Vitest, browser Clipboard API.

## Global Constraints

- Language: plugin UI copy defaults to Chinese; code identifiers use English.
- Personal use first; no community marketplace release requirements in the first milestone.
- Do not copy NoteToMP source code verbatim; use it only as behavior reference.
- Store AppSecret only in Obsidian plugin data for personal local use; never log it.
- MVP publish mode is "copy to WeChat editor"; "send to WeChat draft" is milestone 2 because WeChat API calls require IP whitelist compatibility.
- Build output for manual install must include `main.js`, `manifest.json`, and `styles.css`.

---

## File Structure

- Create: `package.json` - npm scripts and dependencies.
- Create: `tsconfig.json` - strict TypeScript settings for Obsidian plugin code.
- Create: `esbuild.config.mjs` - bundle `src/main.ts` to `main.js`.
- Create: `manifest.json` - Obsidian plugin metadata.
- Create: `versions.json` - local version compatibility map.
- Create: `styles.css` - preview modal and WeChat article CSS.
- Create: `src/main.ts` - plugin lifecycle, commands, ribbon icon, settings tab.
- Create: `src/settings.ts` - settings schema, defaults, persistence helpers.
- Create: `src/renderer.ts` - Markdown to WeChat HTML conversion.
- Create: `src/assets.ts` - Obsidian local image resolution and data URL conversion.
- Create: `src/clipboard.ts` - rich HTML and plain text clipboard write.
- Create: `src/preview-modal.ts` - preview, copy button, optional draft button.
- Create: `src/wechat.ts` - milestone 2 direct WeChat API client.
- Create: `src/__tests__/renderer.test.ts` - renderer behavior tests.
- Create: `src/__tests__/clipboard.test.ts` - clipboard payload tests.
- Create: `README.md` - install, usage, verification, and known WeChat API limitations.

### Task 1: Plugin Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `esbuild.config.mjs`
- Create: `manifest.json`
- Create: `versions.json`
- Create: `src/main.ts`

**Interfaces:**
- Produces: Obsidian plugin id `obsidian-to-sm`
- Produces: npm scripts `dev`, `build`, `test`

- [ ] **Step 1: Create package metadata**

```json
{
  "name": "obsidian-to-sm",
  "version": "0.1.0",
  "description": "Personal Obsidian plugin for copying notes to WeChat MP editor.",
  "main": "main.js",
  "scripts": {
    "dev": "node esbuild.config.mjs",
    "build": "tsc -noEmit -skipLibCheck && node esbuild.config.mjs production",
    "test": "vitest run"
  },
  "dependencies": {
    "highlight.js": "^11.11.1",
    "marked": "^16.1.1"
  },
  "devDependencies": {
    "@types/node": "^22.15.17",
    "builtin-modules": "^5.0.0",
    "esbuild": "^0.25.5",
    "jsdom": "^26.1.0",
    "obsidian": "latest",
    "typescript": "^5.8.3",
    "vitest": "^3.2.4"
  }
}
```

- [ ] **Step 2: Create TypeScript and esbuild config**

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "inlineSourceMap": true,
    "inlineSources": true,
    "lib": ["DOM", "ES2022"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "target": "ES2022",
    "types": ["node"]
  },
  "include": ["src/**/*.ts"]
}
```

```js
import esbuild from "esbuild";
import process from "process";
import builtins from "builtin-modules";

const prod = process.argv[2] === "production";

await esbuild.build({
  banner: { js: "/* obsidian-to-sm */" },
  bundle: true,
  entryPoints: ["src/main.ts"],
  external: ["obsidian", "electron", "@codemirror/autocomplete", "@codemirror/collab", "@codemirror/commands", "@codemirror/language", "@codemirror/lint", "@codemirror/search", "@codemirror/state", "@codemirror/view", ...builtins],
  format: "cjs",
  logLevel: "info",
  minify: prod,
  outfile: "main.js",
  platform: "browser",
  sourcemap: prod ? false : "inline",
  target: "es2022",
  treeShaking: true
});
```

- [ ] **Step 3: Create Obsidian metadata**

```json
{
  "id": "obsidian-to-sm",
  "name": "Obsidian To SM",
  "version": "0.1.0",
  "minAppVersion": "1.5.0",
  "description": "Copy Obsidian notes to WeChat Official Account editor.",
  "author": "peng_lei",
  "isDesktopOnly": true
}
```

```json
{
  "0.1.0": "1.5.0"
}
```

- [ ] **Step 4: Create minimal plugin entry**

```ts
import { Notice, Plugin } from "obsidian";

export default class ObsidianToSmPlugin extends Plugin {
  async onload(): Promise<void> {
    this.addRibbonIcon("send", "复制到公众号", () => {
      new Notice("Obsidian To SM 已加载");
    });

    this.addCommand({
      id: "copy-active-note-to-wechat",
      name: "复制当前笔记到公众号",
      callback: () => new Notice("复制功能待实现")
    });
  }
}
```

- [ ] **Step 5: Verify scaffold**

Run: `npm install`

Run: `npm run build`

Expected: `main.js` is generated and TypeScript passes.

### Task 2: Settings

**Files:**
- Create: `src/settings.ts`
- Modify: `src/main.ts`

**Interfaces:**
- Produces: `PluginSettings`
- Produces: `DEFAULT_SETTINGS`
- Produces: `SettingsTab`

- [ ] **Step 1: Define settings**

```ts
export interface PluginSettings {
  author: string;
  defaultAccountName: string;
  customCss: string;
  enableLineNumbers: boolean;
  wechatAppId: string;
  wechatAppSecret: string;
}

export const DEFAULT_SETTINGS: PluginSettings = {
  author: "",
  defaultAccountName: "",
  customCss: "",
  enableLineNumbers: true,
  wechatAppId: "",
  wechatAppSecret: ""
};
```

- [ ] **Step 2: Add settings tab**

```ts
import { App, PluginSettingTab, Setting } from "obsidian";
import ObsidianToSmPlugin from "./main";

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
      .addText((text) => text.setValue(this.plugin.settings.author).onChange(async (value) => {
        this.plugin.settings.author = value;
        await this.plugin.saveSettings();
      }));

    new Setting(containerEl)
      .setName("自定义 CSS")
      .addTextArea((text) => text.setValue(this.plugin.settings.customCss).onChange(async (value) => {
        this.plugin.settings.customCss = value;
        await this.plugin.saveSettings();
      }));
  }
}
```

- [ ] **Step 3: Wire persistence in `src/main.ts`**

```ts
import { Notice, Plugin } from "obsidian";
import { DEFAULT_SETTINGS, PluginSettings, SettingsTab } from "./settings";

export default class ObsidianToSmPlugin extends Plugin {
  settings!: PluginSettings;

  async onload(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    this.addSettingTab(new SettingsTab(this.app, this));
    this.addRibbonIcon("send", "复制到公众号", () => new Notice("Obsidian To SM 已加载"));
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}
```

- [ ] **Step 4: Verify settings**

Run: `npm run build`

Expected: build passes; Obsidian settings page shows author and custom CSS fields after manual install.

### Task 3: Markdown Renderer

**Files:**
- Create: `src/renderer.ts`
- Create: `src/__tests__/renderer.test.ts`
- Modify: `styles.css`

**Interfaces:**
- Produces: `renderMarkdownToWechatHtml(markdown: string, options: RenderOptions): string`

- [ ] **Step 1: Write renderer test**

```ts
import { describe, expect, it } from "vitest";
import { renderMarkdownToWechatHtml } from "../renderer";

describe("renderMarkdownToWechatHtml", () => {
  it("wraps article HTML and highlights code", () => {
    const html = renderMarkdownToWechatHtml("# 标题\n\n```ts\nconst x = 1;\n```", {
      customCss: "",
      enableLineNumbers: true
    });

    expect(html).toContain('class="obsidian-to-sm"');
    expect(html).toContain("<h1>标题</h1>");
    expect(html).toContain("hljs");
    expect(html).toContain("data-line=\"1\"");
  });
});
```

- [ ] **Step 2: Implement renderer**

```ts
import hljs from "highlight.js";
import { Marked } from "marked";

export interface RenderOptions {
  customCss: string;
  enableLineNumbers: boolean;
}

export function renderMarkdownToWechatHtml(markdown: string, options: RenderOptions): string {
  const marked = new Marked({
    async: false,
    gfm: true
  });

  marked.use({
    renderer: {
      code(code: string, language: string | undefined) {
        const validLanguage = language && hljs.getLanguage(language) ? language : "plaintext";
        const highlighted = hljs.highlight(code, { language: validLanguage }).value;
        const lines = highlighted.split("\n").filter((line, index, arr) => index < arr.length - 1 || line.length > 0);
        const body = options.enableLineNumbers
          ? lines.map((line, index) => `<span class="code-line" data-line="${index + 1}">${line || " "}</span>`).join("\n")
          : highlighted;
        return `<pre><code class="hljs language-${validLanguage}">${body}</code></pre>`;
      }
    }
  });

  const article = marked.parse(markdown) as string;
  return `<section class="obsidian-to-sm">${article}</section><style>${baseCss()}${options.customCss}</style>`;
}

function baseCss(): string {
  return `
.obsidian-to-sm{font-family:Optima,"PingFang SC","Microsoft YaHei",serif;font-size:16px;line-height:1.75;color:#202124;}
.obsidian-to-sm h1{font-size:24px;text-align:center;margin:1.2em 0;}
.obsidian-to-sm h2{font-size:20px;border-bottom:2px solid #2f8f6f;padding-bottom:4px;margin:1.6em 0 .8em;}
.obsidian-to-sm p{margin:1em 0;}
.obsidian-to-sm blockquote{border-left:4px solid #2f8f6f;background:#f5faf7;margin:1em 0;padding:.6em 1em;color:#4b5563;}
.obsidian-to-sm pre{background:#f6f8fa;border-radius:6px;padding:12px;overflow:auto;}
.obsidian-to-sm .code-line{display:block;position:relative;padding-left:3em;}
.obsidian-to-sm .code-line::before{content:attr(data-line);position:absolute;left:0;width:2em;text-align:right;color:#8a8f98;}
`;
}
```

- [ ] **Step 3: Verify renderer**

Run: `npm test -- src/__tests__/renderer.test.ts`

Expected: test passes.

### Task 4: Local Image Resolution

**Files:**
- Create: `src/assets.ts`
- Create: `src/__tests__/assets.test.ts`
- Modify: `src/renderer.ts`

**Interfaces:**
- Produces: `resolveEmbeds(markdown: string, resolver: AssetResolver): Promise<string>`
- Consumes: Obsidian `Vault` and `MetadataCache`

- [ ] **Step 1: Write image syntax test**

```ts
import { describe, expect, it } from "vitest";
import { resolveEmbeds } from "../assets";

describe("resolveEmbeds", () => {
  it("replaces Obsidian image embeds with markdown image data URLs", async () => {
    const markdown = "before ![[cover.png|120x80]] after";
    const result = await resolveEmbeds(markdown, async (path) => `data:image/png;base64,${path}`);
    expect(result).toBe("before <img src=\"data:image/png;base64,cover.png\" width=\"120\" height=\"80\" /> after");
  });
});
```

- [ ] **Step 2: Implement embed replacement**

```ts
export type AssetResolver = (path: string) => Promise<string>;

export async function resolveEmbeds(markdown: string, resolver: AssetResolver): Promise<string> {
  const pattern = /!\[\[([^|\]]+)(?:\|(\d+)(?:x(\d+))?)?\]\]/g;
  const matches = [...markdown.matchAll(pattern)];
  let result = markdown;

  for (const match of matches) {
    const [raw, path, width, height] = match;
    const src = await resolver(path);
    const attrs = [
      `src="${escapeHtml(src)}"`,
      width ? `width="${width}"` : "",
      height ? `height="${height}"` : ""
    ].filter(Boolean).join(" ");
    result = result.replace(raw, `<img ${attrs} />`);
  }

  return result;
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
```

- [ ] **Step 3: Add Obsidian resolver in `src/main.ts`**

```ts
async resolveAssetToDataUrl(path: string): Promise<string> {
  const file = this.app.metadataCache.getFirstLinkpathDest(path, "");
  if (!file) throw new Error(`找不到图片：${path}`);
  const bytes = await this.app.vault.readBinary(file);
  const base64 = Buffer.from(bytes).toString("base64");
  const ext = file.extension.toLowerCase();
  const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "gif" ? "image/gif" : "image/png";
  return `data:${mime};base64,${base64}`;
}
```

- [ ] **Step 4: Verify image conversion**

Run: `npm test -- src/__tests__/assets.test.ts`

Expected: test passes.

### Task 5: Preview Modal And Clipboard

**Files:**
- Create: `src/clipboard.ts`
- Create: `src/preview-modal.ts`
- Modify: `src/main.ts`

**Interfaces:**
- Produces: `copyHtmlToClipboard(html: string, plainText: string): Promise<void>`
- Produces: `PreviewModal`

- [ ] **Step 1: Implement clipboard writer**

```ts
export async function copyHtmlToClipboard(html: string, plainText: string): Promise<void> {
  const clipboardItem = new ClipboardItem({
    "text/html": new Blob([html], { type: "text/html" }),
    "text/plain": new Blob([plainText], { type: "text/plain" })
  });
  await navigator.clipboard.write([clipboardItem]);
}
```

- [ ] **Step 2: Implement preview modal**

```ts
import { App, Modal, Notice } from "obsidian";
import { copyHtmlToClipboard } from "./clipboard";

export class PreviewModal extends Modal {
  constructor(app: App, private readonly html: string, private readonly plainText: string) {
    super(app);
  }

  onOpen(): void {
    this.contentEl.empty();
    this.contentEl.addClass("obsidian-to-sm-preview");
    const actions = this.contentEl.createDiv("obsidian-to-sm-actions");
    actions.createEl("button", { text: "复制到公众号" }).addEventListener("click", async () => {
      await copyHtmlToClipboard(this.html, this.plainText);
      new Notice("已复制，可粘贴到微信公众号编辑器");
    });
    const preview = this.contentEl.createDiv("obsidian-to-sm-preview-body");
    preview.innerHTML = this.html;
  }
}
```

- [ ] **Step 3: Wire active note command**

```ts
async openPreviewForActiveNote(): Promise<void> {
  const file = this.app.workspace.getActiveFile();
  if (!file) {
    new Notice("没有打开的笔记");
    return;
  }
  const markdown = await this.app.vault.read(file);
  const withImages = await resolveEmbeds(markdown, (path) => this.resolveAssetToDataUrl(path));
  const html = renderMarkdownToWechatHtml(withImages, {
    customCss: this.settings.customCss,
    enableLineNumbers: this.settings.enableLineNumbers
  });
  new PreviewModal(this.app, html, markdown).open();
}
```

- [ ] **Step 4: Add preview CSS**

```css
.obsidian-to-sm-preview {
  padding: 0;
}

.obsidian-to-sm-actions {
  display: flex;
  gap: 8px;
  padding: 12px;
  border-bottom: 1px solid var(--background-modifier-border);
}

.obsidian-to-sm-preview-body {
  max-height: 70vh;
  overflow: auto;
  padding: 16px;
}
```

- [ ] **Step 5: Verify manually**

Run: `npm run build`

Manual check:
1. Copy `main.js`, `manifest.json`, `styles.css` into `<vault>/.obsidian/plugins/obsidian-to-sm/`.
2. Enable the plugin in Obsidian.
3. Open a note with headings, code, and one local image.
4. Run command `复制当前笔记到公众号`.
5. Click `复制到公众号`.
6. Paste into the WeChat Official Account editor.

Expected: headings, paragraphs, code highlighting, line numbers, and local image display are preserved.

### Task 6: WeChat Draft Publishing Spike

**Files:**
- Create: `src/wechat.ts`
- Modify: `src/settings.ts`
- Modify: `src/preview-modal.ts`
- Modify: `README.md`

**Interfaces:**
- Produces: `WechatClient`
- Consumes: settings `wechatAppId`, `wechatAppSecret`

- [ ] **Step 1: Implement direct API client**

```ts
import { requestUrl } from "obsidian";

export interface WechatDraftArticle {
  title: string;
  author: string;
  digest: string;
  content: string;
  thumbMediaId: string;
}

export class WechatClient {
  constructor(private readonly appId: string, private readonly appSecret: string) {}

  async getAccessToken(): Promise<string> {
    const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${encodeURIComponent(this.appId)}&secret=${encodeURIComponent(this.appSecret)}`;
    const response = await requestUrl({ url, method: "GET" });
    if (!response.json?.access_token) throw new Error(response.json?.errmsg ?? "获取 access_token 失败");
    return response.json.access_token;
  }

  async addDraft(article: WechatDraftArticle): Promise<string> {
    const token = await this.getAccessToken();
    const response = await requestUrl({
      url: `https://api.weixin.qq.com/cgi-bin/draft/add?access_token=${encodeURIComponent(token)}`,
      method: "POST",
      contentType: "application/json",
      body: JSON.stringify({ articles: [article] })
    });
    if (!response.json?.media_id) throw new Error(response.json?.errmsg ?? "创建草稿失败");
    return response.json.media_id;
  }
}
```

- [ ] **Step 2: Gate draft publishing**

Only show `发送草稿` when `wechatAppId`, `wechatAppSecret`, and `thumbMediaId` are present. If not present, show a `Notice("请先配置 AppID、AppSecret 和封面 media_id")`.

- [ ] **Step 3: Verify with real account**

Manual check:
1. Confirm the account has `获取access_token` and draft API permission.
2. Confirm the current machine public IP is in WeChat Official Account IP whitelist.
3. Configure AppID and AppSecret locally.
4. Use a known permanent image `thumb_media_id`.
5. Send a draft.

Expected: WeChat returns `media_id`; the draft appears in the Official Account backend.

If WeChat returns an IP whitelist error, stop direct publishing and add a small fixed-IP proxy service as a separate plan.

### Task 7: Documentation And Verification

**Files:**
- Create: `README.md`

**Interfaces:**
- Produces: installation and verification guide.

- [ ] **Step 1: Document usage**

```md
# Obsidian To SM

个人使用的 Obsidian 到微信公众号排版插件。

## 功能

- 当前笔记转微信公众号编辑器友好的 HTML
- 代码高亮和行号
- Obsidian 本地图片 `![[image.png|120x80]]` 转换
- 一键复制到微信公众号编辑器

## 本地安装

```bash
npm install
npm run build
mkdir -p "<vault>/.obsidian/plugins/obsidian-to-sm"
cp main.js manifest.json styles.css "<vault>/.obsidian/plugins/obsidian-to-sm/"
```

## 验证

1. 在 Obsidian 第三方插件中启用 `Obsidian To SM`。
2. 打开一篇包含标题、代码块和本地图片的笔记。
3. 执行命令 `复制当前笔记到公众号`。
4. 点击 `复制到公众号`。
5. 粘贴到微信公众号编辑器检查样式。

## 已知限制

直发草稿依赖微信公众号 API 权限和 IP 白名单。如果本机公网 IP 不在白名单，直发会失败，需要固定 IP 服务端代理。
```

- [ ] **Step 2: Final verification**

Run: `npm run build`

Run: `npm test`

Expected: both pass.

## Self-Review

- Spec coverage: The plan covers NoteToMP-like copy workflow, local image handling, code highlighting, settings, and later WeChat draft publishing.
- Placeholder scan: No `TBD`, `TODO`, or unspecified implementation step remains.
- Type consistency: `PluginSettings`, `renderMarkdownToWechatHtml`, `resolveEmbeds`, `copyHtmlToClipboard`, `PreviewModal`, and `WechatClient` are defined before use.
- Risk: Direct WeChat API publishing may fail without IP whitelist compatibility; this is isolated to Task 6 and does not block the copy-to-editor MVP.
