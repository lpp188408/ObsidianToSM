# ObsidianToSM Sidebar Publishing Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the plugin named **ObsidianToSM** with a left-sidebar workbench that previews the active note, selects a theme and account, saves a WeChat draft, or submits a publish task.

**Architecture:** Keep rendering, account parsing, credential storage, and WeChat HTTP orchestration independent from Obsidian view code. `SidebarController` owns active-note refresh and command state; `WechatWorkbenchView` owns DOM rendering and delegates actions to the controller. The main plugin creates the view, adapts Obsidian APIs, and persists non-secret settings.

**Tech Stack:** TypeScript, Obsidian Plugin API (`ItemView`, `WorkspaceLeaf`, `requestUrl`), Electron `safeStorage`, esbuild, marked, highlight.js, Vitest.

## Global Constraints

- The plugin display name is `ObsidianToSM`; its stable Obsidian plugin identifier and directory remain `obsidian-to-sm`.
- The plugin remains desktop-only and requires macOS Keychain-backed Electron `safeStorage`; never persist plaintext AppSecret in plugin data.
- Every publish action uses the currently selected configured account.
- `发文章` creates a WeChat draft only; `发帖图` creates a draft, submits it to the publish API, and reports its asynchronous terminal status.
- Neither action sends a follower mass message.
- The workbench is a left-sidebar `ItemView`; it must not use `Modal` for the main workflow.
- Built-in themes are exactly `minimal-mono`, `tech-blue`, `business-green`, `ink`, `editorial-red`, and `warm-orange`.
- Inline images and covers are uploaded through existing WeChat client logic before draft creation.
- UI text defaults to Chinese and no AppSecret is shown in notices or logs.

---

## File Structure

- Create: `src/themes.ts` — built-in theme definitions and theme lookup.
- Create: `src/accounts.ts` — account-row parsing and secret-free account metadata.
- Create: `src/credential-store.ts` — injected Keychain adapter plus Electron implementation.
- Create: `src/sidebar-controller.ts` — pure controller for refresh, theme/account selection, draft and publish actions.
- Create: `src/sidebar-view.ts` — `ItemView` implementation and DOM event wiring.
- Create: `src/__tests__/themes.test.ts` — theme selection coverage.
- Create: `src/__tests__/accounts.test.ts` — account-row validation coverage.
- Create: `src/__tests__/credential-store.test.ts` — encryption adapter coverage.
- Create: `src/__tests__/sidebar-controller.test.ts` — controller state and action coverage.
- Modify: `src/renderer.ts` — consume `WechatTheme` instead of one fixed palette.
- Modify: `src/wechat.ts` — submit/poll publish tasks and return structured results.
- Modify: `src/settings.ts` — render account settings, test accounts, and persist secret-free metadata.
- Modify: `src/main.ts` — register/open the sidebar view, connect Obsidian APIs, and remove the modal command path.
- Modify: `src/styles.css` — fixed control panel and scrollable sidebar preview styles.
- Modify: `README.md` — sidebar, account security, themes, draft, and final-publish usage.

## Task 1: Themes And Themed Renderer

**Files:**
- Create: `src/themes.ts`
- Create: `src/__tests__/themes.test.ts`
- Modify: `src/renderer.ts`
- Modify: `src/__tests__/renderer.test.ts`

**Interfaces:**
- Produces `WechatTheme { id, name, styles }`.
- Produces `THEMES: readonly WechatTheme[]` and `getTheme(id: string): WechatTheme`.
- Changes `RenderOptions` to include `themeId: string`.

- [ ] **Step 1: Write the failing theme lookup tests**

```ts
import { describe, expect, it } from "vitest";
import { THEMES, getTheme } from "../themes";

describe("getTheme", () => {
  it("provides six selectable built-in themes", () => {
    expect(THEMES.map((theme) => theme.id)).toEqual([
      "minimal-mono", "tech-blue", "business-green", "ink", "editorial-red", "warm-orange"
    ]);
  });

  it("falls back to minimal mono for an unknown id", () => {
    expect(getTheme("unknown").id).toBe("minimal-mono");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- --run src/__tests__/themes.test.ts`

Expected: FAIL because `../themes` does not exist.

- [ ] **Step 3: Implement the theme module**

```ts
export interface WechatTheme {
  id: string;
  name: string;
  styles: {
    accent: string;
    body: string;
    heading: string;
    quoteBackground: string;
    codeBackground: string;
  };
}

export const THEMES: readonly WechatTheme[] = [
  { id: "minimal-mono", name: "简约黑白", styles: { accent: "#222222", body: "#222222", heading: "#111111", quoteBackground: "#f5f5f5", codeBackground: "#f6f6f6" } },
  { id: "tech-blue", name: "科技蓝", styles: { accent: "#1769aa", body: "#1f2937", heading: "#0f3d66", quoteBackground: "#edf6ff", codeBackground: "#f4f8fc" } },
  { id: "business-green", name: "商务绿", styles: { accent: "#2f8f6f", body: "#202124", heading: "#1e5e49", quoteBackground: "#f2faf6", codeBackground: "#f4f8f6" } },
  { id: "ink", name: "人文墨", styles: { accent: "#775548", body: "#312c29", heading: "#2a211d", quoteBackground: "#f7f3ef", codeBackground: "#f5f1ed" } },
  { id: "editorial-red", name: "杂志红", styles: { accent: "#b42318", body: "#2d2626", heading: "#8f1d16", quoteBackground: "#fff3f1", codeBackground: "#fff7f5" } },
  { id: "warm-orange", name: "暖橙生活", styles: { accent: "#bc6c25", body: "#3e3025", heading: "#8a4d17", quoteBackground: "#fff6ed", codeBackground: "#fff9f2" } }
];

export function getTheme(id: string): WechatTheme {
  return THEMES.find((theme) => theme.id === id) ?? THEMES[0];
}
```

- [ ] **Step 4: Run the theme test to verify it passes**

Run: `npm test -- --run src/__tests__/themes.test.ts`

Expected: PASS with 2 tests.

- [ ] **Step 5: Make the renderer use the selected theme**

Replace fixed `styles` colors in `src/renderer.ts` with values from `getTheme(options.themeId).styles`. Extend the renderer test with:

```ts
expect(renderMarkdownToWechatHtml("# 标题", { customCss: "", enableLineNumbers: true, themeId: "tech-blue" })).toContain("#1769aa");
```

- [ ] **Step 6: Run renderer and theme tests**

Run: `npm test -- --run src/__tests__/themes.test.ts src/__tests__/renderer.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit the task**

```bash
git add src/themes.ts src/renderer.ts src/__tests__/themes.test.ts src/__tests__/renderer.test.ts
git commit -m "feat: add selectable WeChat themes"
```

## Task 2: Multi-Account Parsing And Keychain Storage

**Files:**
- Create: `src/accounts.ts`
- Create: `src/credential-store.ts`
- Create: `src/__tests__/accounts.test.ts`
- Create: `src/__tests__/credential-store.test.ts`
- Modify: `src/settings.ts`

**Interfaces:**
- Produces `WechatAccount { id, name, appId }` with no `appSecret` field.
- Produces `parseAccountRows(input: string): ParsedAccounts`.
- Produces `CredentialStore.save(accountId, secret)`, `read(accountId)`, and `remove(accountId)`.

- [ ] **Step 1: Write failing account-parser tests**

```ts
import { describe, expect, it } from "vitest";
import { parseAccountRows } from "../accounts";

describe("parseAccountRows", () => {
  it("returns secret-free account metadata and secrets separately", () => {
    expect(parseAccountRows("技术笔记|wx-a|secret-a\n读书会|wx-b|secret-b")).toEqual({
      accounts: [
        { id: "wx-a", name: "技术笔记", appId: "wx-a" },
        { id: "wx-b", name: "读书会", appId: "wx-b" }
      ],
      secrets: new Map([["wx-a", "secret-a"], ["wx-b", "secret-b"])
    });
  });

  it("rejects duplicate AppID and malformed rows", () => {
    expect(() => parseAccountRows("技术笔记|wx-a|one\n重复|wx-a|two")).toThrow("AppID 重复：wx-a");
    expect(() => parseAccountRows("技术笔记|wx-a")).toThrow("第 1 行格式错误");
  });
});
```

- [ ] **Step 2: Run the parser test to verify it fails**

Run: `npm test -- --run src/__tests__/accounts.test.ts`

Expected: FAIL because `../accounts` does not exist.

- [ ] **Step 3: Implement parsing and Keychain abstraction**

```ts
export interface WechatAccount { id: string; name: string; appId: string; }
export interface ParsedAccounts { accounts: WechatAccount[]; secrets: Map<string, string>; }

export function parseAccountRows(input: string): ParsedAccounts {
  const accounts: WechatAccount[] = [];
  const secrets = new Map<string, string>();
  for (const [index, raw] of input.split("\n").entries()) {
    if (!raw.trim()) continue;
    const parts = raw.split("|").map((part) => part.trim());
    if (parts.length !== 3 || parts.some((part) => !part)) throw new Error(`第 ${index + 1} 行格式错误，应为：名称|AppID|AppSecret`);
    const [name, appId, secret] = parts;
    if (secrets.has(appId)) throw new Error(`AppID 重复：${appId}`);
    accounts.push({ id: appId, name, appId });
    secrets.set(appId, secret);
  }
  return { accounts, secrets };
}
```

Define the adapter:

```ts
export interface KeychainAdapter {
  isAvailable(): boolean;
  encrypt(value: string): string;
  decrypt(value: string): string;
}

export class CredentialStore {
  constructor(private readonly adapter: KeychainAdapter, private readonly readData: () => Record<string, string>, private readonly writeData: (data: Record<string, string>) => Promise<void>) {}
  async save(accountId: string, secret: string): Promise<void> { /* fail when unavailable, encrypt and save */ }
  read(accountId: string): string { /* fail when unavailable or missing, decrypt */ }
  async remove(accountId: string): Promise<void> { /* remove encrypted entry */ }
}
```

Implement `ElectronKeychainAdapter` using `safeStorage.isEncryptionAvailable()`, `safeStorage.encryptString`, and `safeStorage.decryptString` from Electron. Store only Base64 ciphertext in the plugin data record.

- [ ] **Step 4: Write and run Keychain tests**

```ts
it("writes only encrypted AppSecret data", async () => {
  const saved: Record<string, string> = {};
  const store = new CredentialStore(fakeKeychain, () => saved, async (next) => Object.assign(saved, next));
  await store.save("wx-a", "plain-secret");
  expect(saved["wx-a"]).not.toContain("plain-secret");
  expect(store.read("wx-a")).toBe("plain-secret");
});
```

Run: `npm test -- --run src/__tests__/accounts.test.ts src/__tests__/credential-store.test.ts`

Expected: PASS.

- [ ] **Step 5: Extend plugin settings**

Add `accounts: WechatAccount[]`, `selectedAccountId: string`, `encryptedSecrets: Record<string, string>`, and `themeId: string` to `PluginSettings`. In settings, render the textarea shown in the approved design and buttons labelled `保存公众号信息` and `测试公众号`; call injected plugin methods so settings code does not access Keychain directly. Never set AppSecret as a saved text-field value.

- [ ] **Step 6: Build and commit the task**

Run: `npm run build && npm test`

Expected: exit code 0.

```bash
git add src/accounts.ts src/credential-store.ts src/settings.ts src/__tests__/accounts.test.ts src/__tests__/credential-store.test.ts
git commit -m "feat: add encrypted multi-account settings"
```

## Task 3: Publish Submission And Status Polling

**Files:**
- Modify: `src/wechat.ts`
- Modify: `src/__tests__/wechat.test.ts`

**Interfaces:**
- Produces `WechatPublishResult { draftMediaId: string; publishId: string; status: "published" | "reviewing" | "failed" | "rejected" }`.
- Produces `publishWechatArticle(input: WechatDraftPublishInput): Promise<WechatPublishResult>`.
- Adds `WechatClient.submitPublish(mediaId: string)` and `WechatClient.getPublishStatus(publishId: string)`.

- [ ] **Step 1: Write a failing direct-publish test**

```ts
it("submits a created draft and maps a successful publish status", async () => {
  const requester = vi.fn()
    .mockResolvedValueOnce({ json: { access_token: "token" } })
    .mockResolvedValueOnce({ json: { media_id: "cover" } })
    .mockResolvedValueOnce({ json: { media_id: "draft" } })
    .mockResolvedValueOnce({ json: { publish_id: "publish" } })
    .mockResolvedValueOnce({ json: { publish_status: 0 } });
  const result = await publishWechatArticle(inputWithLocalCover(requester));
  expect(result).toEqual({ draftMediaId: "draft", publishId: "publish", status: "published" });
  expect(requester.mock.calls[3][0].url).toContain("freepublish/submit");
  expect(requester.mock.calls[4][0].url).toContain("freepublish/get");
});
```

- [ ] **Step 2: Run the publish test to verify it fails**

Run: `npm test -- --run src/__tests__/wechat.test.ts`

Expected: FAIL because `publishWechatArticle` does not exist.

- [ ] **Step 3: Implement submit and polling methods**

```ts
async submitPublish(mediaId: string): Promise<string> {
  const response = await this.postJson("cgi-bin/freepublish/submit", { media_id: mediaId });
  if (typeof response.json.publish_id !== "string") throwWechatError(response.json, "提交发布失败");
  return response.json.publish_id;
}

async getPublishStatus(publishId: string): Promise<PublishStatus> {
  const response = await this.postJson("cgi-bin/freepublish/get", { publish_id: publishId });
  return mapPublishStatus(response.json.publish_status, response.json);
}
```

`publishWechatArticle` must reuse the existing image upload and draft creation path, submit the returned draft media ID, then poll at 1-second intervals for at most 15 attempts. Terminal state `0` maps to `published`; state `1` maps to `failed`; state `2` maps to `reviewing`; state `3` maps to `rejected`. Return `reviewing` after the timeout rather than reporting a false failure.

- [ ] **Step 4: Add error mapping tests and run the suite**

```ts
it.each([[1, "failed"], [2, "reviewing"], [3, "rejected"]])("maps publish status %s to %s", async (code, expected) => {
  expect(mapPublishStatus(code, {})).toBe(expected);
});
```

Run: `npm test -- --run src/__tests__/wechat.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the task**

```bash
git add src/wechat.ts src/__tests__/wechat.test.ts
git commit -m "feat: submit and track WeChat publication"
```

## Task 4: Sidebar Controller And View

**Files:**
- Create: `src/sidebar-controller.ts`
- Create: `src/sidebar-view.ts`
- Create: `src/__tests__/sidebar-controller.test.ts`
- Modify: `src/styles.css`

**Interfaces:**
- Produces `SidebarState { html, plainText, title, themeId, selectedAccountId, isBusy, error? }`.
- Produces `SidebarController.refresh()`, `setTheme(themeId)`, `setAccount(accountId)`, `copy()`, `createDraft()`, and `publish()`.
- Produces `WechatWorkbenchView extends ItemView` with `getViewType(): "obsidian-to-sm-workbench"`.

- [ ] **Step 1: Write failing controller tests**

```ts
it("re-renders the active note when a different theme is selected", async () => {
  const controller = createController();
  await controller.refresh();
  controller.setTheme("tech-blue");
  expect(controller.getState().html).toContain("#1769aa");
});

it("disables parallel publication while a publish request is in progress", async () => {
  const controller = createControllerWithDeferredPublish();
  const pending = controller.publish();
  expect(controller.getState().isBusy).toBe(true);
  await expect(controller.createDraft()).rejects.toThrow("正在发布");
  resolvePublish();
  await pending;
});
```

- [ ] **Step 2: Run the controller test to verify it fails**

Run: `npm test -- --run src/__tests__/sidebar-controller.test.ts`

Expected: FAIL because `../sidebar-controller` does not exist.

- [ ] **Step 3: Implement a dependency-injected controller**

Create `SidebarDependencies` with `readActiveNote`, `resolveAsset`, `copyHtml`, `getAccountSecret`, `createDraft`, and `publishArticle` functions. `refresh` parses metadata, resolves image embeds, calls the themed renderer, and stores the current publish input. `createDraft` and `publish` set `isBusy` before awaiting API work and reset it in `finally`.

- [ ] **Step 4: Run controller tests to verify they pass**

Run: `npm test -- --run src/__tests__/sidebar-controller.test.ts`

Expected: PASS.

- [ ] **Step 5: Implement `WechatWorkbenchView`**

Use `ItemView` and this DOM structure:

```ts
const workspace = this.contentEl.createDiv({ cls: "obsidian-to-sm-workbench" });
const controls = workspace.createDiv({ cls: "obsidian-to-sm-controls" });
const cover = controls.createEl("button", { cls: "obsidian-to-sm-cover", text: "添加封面" });
const account = controls.createEl("select", { cls: "obsidian-to-sm-account" });
const preview = workspace.createDiv({ cls: "obsidian-to-sm-sidebar-preview" });
```

Render `去公众号后台`, `刷新`, `发文章`, `发帖图`, `复制`, `主题`, and `帮助` buttons. The publish buttons must be disabled while `state.isBusy` is true. `发文章` calls `controller.createDraft`; `发帖图` calls `controller.publish`. `帮助` expands an inline help block, not a modal.

- [ ] **Step 6: Add sidebar CSS**

```css
.obsidian-to-sm-workbench { display: flex; flex-direction: column; height: 100%; }
.obsidian-to-sm-controls { flex: 0 0 auto; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; padding: 12px; border-bottom: 1px solid var(--background-modifier-border); }
.obsidian-to-sm-cover { grid-row: span 2; min-height: 128px; border: 1px dashed var(--background-modifier-border); background: transparent; }
.obsidian-to-sm-sidebar-preview { flex: 1 1 auto; overflow-y: auto; padding: 14px; }
.obsidian-to-sm-sidebar-preview .obsidian-to-sm { max-width: 680px; margin: 0 auto; }
```

- [ ] **Step 7: Run tests and commit**

Run: `npm test -- --run src/__tests__/sidebar-controller.test.ts && npm run build`

Expected: exit code 0.

```bash
git add src/sidebar-controller.ts src/sidebar-view.ts src/styles.css src/__tests__/sidebar-controller.test.ts
git commit -m "feat: add sidebar publishing workbench"
```

## Task 5: Obsidian Integration, Documentation, And Installation

**Files:**
- Modify: `src/main.ts`
- Modify: `src/settings.ts`
- Modify: `README.md`
- Modify: `manifest.json`
- Modify: `versions.json`

**Interfaces:**
- Registers `VIEW_TYPE_WECHAT_WORKBENCH = "obsidian-to-sm-workbench"`.
- Produces command `打开公众号发布工作台` and ribbon action `打开公众号发布工作台`.

- [ ] **Step 1: Register and open the sidebar view**

```ts
this.registerView(VIEW_TYPE_WECHAT_WORKBENCH, (leaf) => new WechatWorkbenchView(leaf, this.createSidebarDependencies()));
this.addRibbonIcon("send", "打开公众号发布工作台", () => void this.activateWorkbench());
this.addCommand({ id: "open-wechat-publishing-workbench", name: "打开公众号发布工作台", callback: () => void this.activateWorkbench() });

async activateWorkbench(): Promise<void> {
  const leaf = this.app.workspace.getLeftLeaf(false) ?? this.app.workspace.getLeftLeaf(true);
  await leaf.setViewState({ type: VIEW_TYPE_WECHAT_WORKBENCH, active: true });
  this.app.workspace.revealLeaf(leaf);
}
```

Adapt `requestUrl`, vault binary reads, clipboard, `CredentialStore`, external URL opening, and notice display inside `createSidebarDependencies`. Remove the modal as the primary command path but retain `PreviewModal` only if it is still needed by no public command; otherwise delete it and its unused CSS.

- [ ] **Step 2: Make cover selection write frontmatter safely**

Use `SuggestModal<TFile>` restricted to common image extensions. On selection, update the first existing `封面:` or `cover:` line in a frontmatter block; otherwise insert `封面: "![[${file.name}]]"` into a newly created frontmatter block. Refresh the controller after modification.

- [ ] **Step 3: Update documentation and version**

Set plugin `name` to `ObsidianToSM`, package display metadata to `ObsidianToSM`, versions to `0.3.0`, add a `0.3.0` entry to `versions.json`, and document:

- left-sidebar activation;
- multi-account input format;
- Keychain-only AppSecret storage;
- theme IDs and optional `公众号主题: tech-blue` frontmatter;
- difference between `发文章` and `发帖图`;
- direct publishing is not follower broadcast;
- API permission and IP whitelist requirements.

- [ ] **Step 4: Run all automated verification**

Run: `npm test && npm run build && git diff --check`

Expected: all Vitest tests pass, TypeScript checks pass, `main.js` is generated, and diff check prints no errors.

- [ ] **Step 5: Install into the configured Vault and verify artifacts**

Run:

```bash
cp main.js manifest.json styles.css '/Users/peng_lei/Documents/Obsidian Vault/.obsidian/plugins/obsidian-to-sm/'
shasum -a 256 main.js '/Users/peng_lei/Documents/Obsidian Vault/.obsidian/plugins/obsidian-to-sm/main.js'
```

Expected: the two hashes match.

- [ ] **Step 6: Commit and push**

```bash
git add src/main.ts src/settings.ts README.md manifest.json package.json versions.json main.js styles.css
git commit -m "feat: complete sidebar WeChat publishing workflow"
git push
```

## Self-Review

- Spec coverage: Tasks 1-5 cover the sidebar, full preview, six themes, multi-account Keychain configuration, account testing, cover persistence, draft creation, final publish submission/polling, safety states, documentation, and Vault installation.
- Placeholder scan: Every task contains a concrete file list, public interface, test command, and implementation direction.
- Type consistency: `WechatAccount`, `CredentialStore`, `WechatTheme`, `SidebarState`, `SidebarController`, `WechatWorkbenchView`, `WechatDraftPublishInput`, and `WechatPublishResult` are defined before use by later tasks.
