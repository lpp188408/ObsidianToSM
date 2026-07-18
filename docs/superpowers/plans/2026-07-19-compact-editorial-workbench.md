# 紧凑编辑部工作台实施计划

> **面向执行代理：** 必须使用 `superpowers:executing-plans` 逐任务执行本计划；步骤使用复选框跟踪。

**目标：** 将 ObsidianToSM 的右侧发布工作台改造为紧凑、有层次的编辑部工具台，同时保留封面、主题、复制、草稿和直接发布能力。

**架构：** `SidebarController` 只管理预览状态，新增可选 `coverDataUrl` 字段。插件准备笔记时解析封面资源，视图仅消费状态渲染缩略图、图标工具栏和主题色块。

**技术栈：** TypeScript、Obsidian Plugin API、Vitest、esbuild。

## 全局约束

- 文案、注释和文档必须使用中文；代码标识符保持现有英文命名。
- 工作台固定在右侧栏，未配置公众号或封面时也必须可以预览文章。
- 不改变微信 API、账号密钥保存、Markdown 渲染和发布调用链。
- 使用 Obsidian 原生 CSS 变量、内置 Lucide 图标和中文可访问标签。
- 不引入新运行时依赖，不使用渐变、厚阴影或大圆角卡片。

---

## 文件结构

- 修改：`src/sidebar-controller.ts`：把可选封面 data URL 纳入侧栏状态。
- 修改：`src/__tests__/sidebar-controller.test.ts`：覆盖刷新后的封面缩略图状态。
- 修改：`src/main.ts`：在准备活动笔记时解析封面 data URL，并提供给侧栏控制器。
- 修改：`src/sidebar-view.ts`：渲染状态行、封面缩略图、账号行、图标工具栏、主题色块和帮助提示。
- 修改：`styles.css`：定义紧凑工具台、封面、工具按钮、主题色块和预览区布局。
- 修改：`README.md`：说明右侧紧凑工作台的入口和行为。

### 任务 1：扩展侧栏预览状态

**文件：**
- 修改：`src/__tests__/sidebar-controller.test.ts`
- 修改：`src/sidebar-controller.ts`

**接口：**
- 消费：`SidebarControllerDependencies.load(themeId)`。
- 产出：`SidebarState.coverDataUrl?: string`；`load()` 返回 `{ html, plainText, coverDataUrl? }`。

- [ ] **步骤 1：写入失败测试**

在 `src/__tests__/sidebar-controller.test.ts` 增加：

```ts
it("刷新时保存当前笔记的封面缩略图", async () => {
  const controller = new SidebarController({
    load: async () => ({
      html: "<article>正文</article>",
      plainText: "正文",
      coverDataUrl: "data:image/png;base64,cover"
    })
  });

  await controller.refresh();

  expect(controller.getState().coverDataUrl).toBe("data:image/png;base64,cover");
});
```

- [ ] **步骤 2：运行测试确认失败**

运行：`npm test -- src/__tests__/sidebar-controller.test.ts`

预期：测试失败，提示 `coverDataUrl` 不存在于状态类型。

- [ ] **步骤 3：实现最小状态扩展**

在 `src/sidebar-controller.ts` 中将接口收敛为：

```ts
export interface SidebarState {
  html: string;
  plainText: string;
  coverDataUrl?: string;
  themeId: string;
  isBusy: boolean;
}

export interface SidebarControllerDependencies {
  load(themeId: string): Promise<{ html: string; plainText: string; coverDataUrl?: string }>;
  publish?(): Promise<void>;
}
```

将 `refresh()` 写为以下形式，保证切换到没有封面的笔记时不会显示上一篇文章的缩略图：

```ts
async refresh(): Promise<void> {
  const note = await this.dependencies.load(this.state.themeId);
  this.state = { ...this.state, html: note.html, plainText: note.plainText, coverDataUrl: note.coverDataUrl };
}
```

- [ ] **步骤 4：运行测试确认通过**

运行：`npm test -- src/__tests__/sidebar-controller.test.ts`

预期：所有侧栏控制器测试通过。

- [ ] **步骤 5：提交状态接口**

```bash
git add src/sidebar-controller.ts src/__tests__/sidebar-controller.test.ts
git commit -m "feat: 侧栏状态支持封面缩略图"
```

### 任务 2：向侧栏提供活动笔记封面

**文件：**
- 修改：`src/main.ts`
- 测试：`src/__tests__/metadata.test.ts`

**接口：**
- 消费：`prepareActiveNote(themeId)` 内已有的 `metadata.cover` 和 `resolveAsset(path, sourcePath)`。
- 产出：`prepareActiveNote()` 的返回值包含 `coverDataUrl?: string`；`createSidebarController().load()` 原样返回该值。

- [ ] **步骤 1：写入前置断言**

在 `src/__tests__/metadata.test.ts` 增加：

```ts
it("没有封面字段时返回空封面", () => {
  const result = extractWechatMetadata("# 标题", { author: "作者", title: "标题" });

  expect(result.metadata.cover).toBe("");
});
```

- [ ] **步骤 2：运行测试确认基础条件**

运行：`npm test -- src/__tests__/metadata.test.ts`

预期：新测试通过，`metadata.cover` 可以安全作为可选输入。

- [ ] **步骤 3：扩展笔记准备结果**

在 `src/main.ts` 复用一次封面解析结果：

```ts
const coverAsset = metadata.cover ? await this.resolveAsset(metadata.cover, file.path) : undefined;
const cover = coverAsset?.uploadFile;
const coverDataUrl = coverAsset?.dataUrl;
```

在返回值增加 `coverDataUrl`，并让 `createSidebarController()` 返回：

```ts
return { html: note.html, plainText: note.plainText, coverDataUrl: note.coverDataUrl };
```

不要再次解析同一个封面文件。

- [ ] **步骤 4：运行相关测试和构建**

运行：`npm test -- src/__tests__/metadata.test.ts src/__tests__/sidebar-controller.test.ts && npm run build`

预期：测试和构建均通过。

- [ ] **步骤 5：提交封面数据传递**

```bash
git add src/main.ts src/__tests__/metadata.test.ts
git commit -m "feat: 侧栏显示当前笔记封面"
```

### 任务 3：实现紧凑图标工作台

**文件：**
- 修改：`src/sidebar-view.ts`
- 修改：`styles.css`

**接口：**
- 消费：`SidebarState.html`、`SidebarState.coverDataUrl`、`SidebarState.themeId` 和现有 `WorkbenchActions`。
- 产出：操作区不高于约 118px，保留所有动作，按钮均有中文 `aria-label`。

- [ ] **步骤 1：新增图标按钮工厂**

将视图导入扩展为：

```ts
import { ItemView, Notice, setIcon, WorkspaceLeaf } from "obsidian";
```

以此方法替代普通文字按钮：

```ts
private iconButton(parent: HTMLElement, icon: string, label: string, handler: () => void, className = ""): HTMLButtonElement {
  const button = parent.createEl("button", { cls: `obsidian-to-sm-icon-button ${className}`.trim() });
  button.setAttribute("aria-label", label);
  button.setAttribute("data-tooltip-position", "bottom");
  setIcon(button, icon);
  button.addEventListener("click", handler);
  return button;
}
```

- [ ] **步骤 2：替换顶部布局**

在 `render()` 中依次创建状态行、账号行和工具栏：

```ts
const header = root.createDiv({ cls: "obsidian-to-sm-workbench-header" });
header.createSpan({ cls: "obsidian-to-sm-workbench-title", text: "ObsidianToSM" });
header.createSpan({ cls: "obsidian-to-sm-workbench-status", text: state.html ? "预览已更新" : "等待笔记" });

const accountRow = root.createDiv({ cls: "obsidian-to-sm-account-row" });
const cover = accountRow.createEl("button", { cls: "obsidian-to-sm-cover", attr: { "aria-label": "添加或更换封面" } });
if (state.coverDataUrl) cover.createEl("img", { attr: { src: state.coverDataUrl, alt: "文章封面" } });
else setIcon(cover, "image-plus");
```

账号下拉放入 `accountRow`，后台按钮使用 `external-link`。工具栏按顺序使用 `refresh-cw`、`copy`、`file-plus-2`、`send`、`palette`、`circle-help`；`send` 增加 `obsidian-to-sm-publish-button` 类。主题选择替换为遍历 `THEMES` 创建的色块按钮，以 `item.accent` 为背景，点击后调用 `controller.setTheme(item.id)` 并重绘。

- [ ] **步骤 3：保留全部行为和帮助提示**

确保动作绑定保持：

```ts
refresh-cw -> this.refresh()
copy -> this.run(() => this.actions.copy(state.themeId))
file-plus-2 -> this.run(() => this.actions.createDraft(state.themeId))
send -> this.run(() => this.actions.publish(state.themeId))
external-link -> window.open("https://mp.weixin.qq.com/")
```

主题色块与帮助图标放在同一工具栏；帮助文本为“预览不需要账号；创建草稿和直接发布需要在插件设置中配置账号、微信 API 权限、IP 白名单和封面。”。

- [ ] **步骤 4：定义紧凑样式**

将 `styles.css` 中工作台相关规则替换为：

```css
.obsidian-to-sm-workbench { display: flex; flex-direction: column; height: 100%; min-width: 0; }
.obsidian-to-sm-workbench-header { align-items: center; border-bottom: 1px solid var(--background-modifier-border); display: flex; justify-content: space-between; min-height: 30px; padding: 0 8px; }
.obsidian-to-sm-account-row { align-items: center; display: grid; gap: 6px; grid-template-columns: 48px minmax(0, 1fr) 30px; padding: 6px 8px; }
.obsidian-to-sm-cover { align-items: center; background: transparent; border: 1px dashed var(--background-modifier-border); display: flex; height: 64px; justify-content: center; overflow: hidden; padding: 0; width: 48px; }
.obsidian-to-sm-cover img { height: 100%; object-fit: cover; width: 100%; }
.obsidian-to-sm-toolbar { align-items: center; border-bottom: 1px solid var(--background-modifier-border); display: flex; gap: 4px; min-height: 38px; padding: 4px 8px; }
.obsidian-to-sm-icon-button { align-items: center; display: inline-flex; height: 30px; justify-content: center; padding: 0; width: 30px; }
.obsidian-to-sm-publish-button { background: var(--interactive-accent); color: var(--text-on-accent); }
.obsidian-to-sm-theme-swatch { border: 2px solid transparent; height: 16px; padding: 0; width: 16px; }
.obsidian-to-sm-theme-swatch.is-active { border-color: var(--text-normal); }
```

为账号下拉、帮助条和预览区补充 `min-width: 0`、原生颜色变量与可滚动行为；不添加渐变或 `box-shadow`。

- [ ] **步骤 5：运行完整质量检查**

运行：`npm test && npm run build`

预期：所有 Vitest 测试通过，`main.js` 成功生成。

- [ ] **步骤 6：提交视图改造**

```bash
git add src/sidebar-view.ts styles.css
git commit -m "feat: 重构紧凑发布工作台"
```

### 任务 4：同步中文说明并部署插件

**文件：**
- 修改：`README.md`
- 生成：`main.js`
- 部署：`/Users/peng_lei/Documents/Obsidian Vault/.obsidian/plugins/obsidian-to-sm/main.js`
- 部署：`/Users/peng_lei/Documents/Obsidian Vault/.obsidian/plugins/obsidian-to-sm/manifest.json`
- 部署：`/Users/peng_lei/Documents/Obsidian Vault/.obsidian/plugins/obsidian-to-sm/styles.css`

**接口：**
- 消费：已构建的 `main.js`、`manifest.json`、`styles.css`。
- 产出：用户 Vault 中可重载的 ObsidianToSM 插件包。

- [ ] **步骤 1：更新中文说明**

在 `README.md` 使用说明中补充：右侧工作台无需账号即可刷新预览；账号、封面、工具栏和主题均位于预览上方；“创建草稿”和“直接发布”分别使用微信草稿与发布 API。

- [ ] **步骤 2：构建并复制安装产物**

运行：

```bash
npm run build
cp main.js manifest.json styles.css "/Users/peng_lei/Documents/Obsidian Vault/.obsidian/plugins/obsidian-to-sm/"
```

预期：三个文件均存在于 Vault 插件目录。

- [ ] **步骤 3：执行最终验证**

运行：

```bash
npm test
npm run build
cmp -s main.js "/Users/peng_lei/Documents/Obsidian Vault/.obsidian/plugins/obsidian-to-sm/main.js"
cmp -s styles.css "/Users/peng_lei/Documents/Obsidian Vault/.obsidian/plugins/obsidian-to-sm/styles.css"
git status --short
```

预期：测试和构建通过，两个 `cmp` 命令返回 `0`，工作树仅可能包含预期的 README 修改。

- [ ] **步骤 4：提交并推送**

```bash
git add README.md main.js
git commit -m "docs: 说明紧凑工作台操作"
git push origin HEAD
```

## 自检结果

- 规格覆盖：任务 1 和 2 实现封面状态与无封面兼容；任务 3 覆盖状态行、紧凑尺寸、图标、主题色块、帮助和所有操作；任务 4 覆盖中文文档、构建、安装和验证。
- 占位扫描：未使用待定项或泛化的“补充测试”描述；每项均给出具体接口、代码或命令。
- 类型一致性：`coverDataUrl?: string` 在控制器依赖、控制器状态、活动笔记准备结果和视图渲染中使用相同名称与可选类型。
