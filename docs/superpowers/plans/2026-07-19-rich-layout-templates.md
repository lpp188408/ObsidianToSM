# ObsidianToSM 丰富排版模板实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标：** 保留六套颜色主题，新增“不套用模板”和四套可组合的结构化公众号排版模板，并保证预览、复制、草稿和发表使用同一份内联样式 HTML。

**架构：** 新建 `src/layouts.ts` 管理排版模板及各元素的完整样式，`src/themes.ts` 继续只管理颜色。`src/renderer.ts` 根据 `themeId + layoutId` 生成最终 HTML；`SidebarController` 管理并持久化两个选择，右侧工作台用模板下拉框和颜色色块组合操作。

**技术栈：** TypeScript 5.8、Obsidian 插件 API、Marked 16、highlight.js 11、Vitest 3、esbuild。

## 全局约束

- 所有用户界面、提示和文档使用中文。
- 保留六套颜色主题及现有 ID，不改变公众号账号、封面、草稿和发表 API 流程。
- 新增模板 ID 固定为 `none`、`editorial-magazine`、`modern-business`、`reading-notes`、`technical-blueprint`。
- 公众号关键样式必须写入元素 `style` 属性，不依赖伪元素、脚本、外部字体和复杂选择器。
- `layoutId` 缺失或无效时回退到 `none`，旧用户升级后默认外观不变。
- 用户自定义 CSS 继续附加在输出末尾。
- 每个任务遵循先写失败测试、再做最小实现、最后运行相关测试的顺序。

---

## 文件结构

- 新建 `src/layouts.ts`：定义排版模板 ID、名称、完整元素样式和回退规则。
- 新建 `src/__tests__/layouts.test.ts`：验证五个选项、回退和颜色组合。
- 修改 `src/renderer.ts`：组合颜色与模板，为公众号常用元素生成内联样式。
- 修改 `src/__tests__/renderer.test.ts`：验证四套模板、基础模板、列表、表格和代码输出。
- 修改 `src/settings.ts`：新增并默认化 `layoutId`。
- 修改 `src/sidebar-controller.ts`：管理 `themeId + layoutId`，切换后持久化并刷新。
- 修改 `src/__tests__/sidebar-controller.test.ts`：验证模板、颜色切换和持久化。
- 修改 `src/sidebar-view.ts`：增加模板下拉框，将下拉框与颜色色块放入样式栏。
- 修改 `src/main.ts`：把两个选择贯穿预览、复制、草稿和发表。
- 修改 `styles.css`：增加紧凑样式栏及窄侧栏换行规则。
- 修改 `README.md`：更新中文主题说明和使用步骤。
- 修改 `package.json`、`package-lock.json`、`manifest.json`、`versions.json`：版本提升到 `0.4.0`。
- 重新生成 `main.js`：提交可直接安装的插件产物。

---

### 任务 1：排版模板模型

**文件：**
- 新建：`src/layouts.ts`
- 新建：`src/__tests__/layouts.test.ts`

**接口：**
- 消费：`WechatTheme`，来自 `src/themes.ts`。
- 产出：`LayoutStyles`、`WechatLayout`、`LAYOUTS`、`getLayout(id)`。

- [ ] **步骤 1：编写模板目录与回退失败测试**

```ts
import { describe, expect, it } from "vitest";
import { getTheme } from "../themes";
import { getLayout, LAYOUTS } from "../layouts";

describe("getLayout", () => {
  it("提供基础排版和四套内置模板", () => {
    expect(LAYOUTS.map((layout) => layout.id)).toEqual([
      "none",
      "editorial-magazine",
      "modern-business",
      "reading-notes",
      "technical-blueprint"
    ]);
  });

  it("未知模板回退为不套用模板", () => {
    expect(getLayout("unknown").id).toBe("none");
  });

  it("模板样式使用当前颜色主题的强调色", () => {
    const styles = getLayout("editorial-magazine").styles(getTheme("tech-blue"));
    expect(styles.h2).toContain("#1769aa");
    expect(styles.a).toContain("#1769aa");
  });
});
```

- [ ] **步骤 2：运行测试并确认因模块不存在而失败**

运行：`npm test -- --run src/__tests__/layouts.test.ts`

预期：失败，错误包含 `Failed to load url ../layouts`。

- [ ] **步骤 3：实现模板类型、基础样式和五个选项**

在 `src/layouts.ts` 定义完整接口：

```ts
import type { WechatTheme } from "./themes";

export interface LayoutStyles {
  section: string;
  h1: string;
  h2: string;
  h3: string;
  p: string;
  blockquote: string;
  ul: string;
  ol: string;
  li: string;
  strong: string;
  em: string;
  a: string;
  img: string;
  hr: string;
  inlineCode: string;
  pre: string;
  code: string;
  table: string;
  th: string;
  td: string;
}

export interface WechatLayout {
  id: string;
  name: string;
  styles(theme: WechatTheme): LayoutStyles;
}
```

实现 `baseStyles(theme)`，完整返回基础排版：

```ts
function baseStyles(theme: WechatTheme): LayoutStyles {
  return {
    section: `font-family:Optima,"PingFang SC","Microsoft YaHei",serif;font-size:16px;line-height:1.75;color:${theme.body};`,
    h1: `font-size:24px;line-height:1.4;text-align:center;margin:1.2em 0;font-weight:700;color:${theme.heading};`,
    h2: `font-size:20px;line-height:1.5;border-bottom:2px solid ${theme.accent};padding-bottom:4px;margin:1.6em 0 .8em;font-weight:700;color:${theme.heading};`,
    h3: `font-size:18px;line-height:1.5;margin:1.4em 0 .7em;font-weight:700;color:${theme.heading};`,
    p: `margin:1em 0;color:${theme.body};`,
    blockquote: `border-left:4px solid ${theme.accent};background:${theme.quoteBackground};margin:1em 0;padding:.6em 1em;color:${theme.body};`,
    ul: "margin:1em 0;padding-left:1.5em;",
    ol: "margin:1em 0;padding-left:1.5em;",
    li: `margin:.3em 0;color:${theme.body};`,
    strong: `font-weight:700;color:${theme.heading};`,
    em: `font-style:italic;color:${theme.body};`,
    a: `color:${theme.accent};text-decoration:none;`,
    img: "display:block;max-width:100%;height:auto;margin:1.2em auto;",
    hr: `margin:2em 0;border:0;border-top:1px solid ${theme.accent};`,
    inlineCode: `padding:.12em .3em;background:${theme.codeBackground};color:${theme.heading};font-family:"SFMono-Regular",Consolas,monospace;font-size:.9em;`,
    pre: `margin:1.2em 0;padding:12px;overflow:auto;background:${theme.codeBackground};border-radius:6px;`,
    code: `font-family:"SFMono-Regular",Consolas,"Liberation Mono",monospace;font-size:14px;color:${theme.body};`,
    table: "width:100%;margin:1.2em 0;border-collapse:collapse;font-size:.95em;",
    th: `padding:.6em .7em;border:1px solid ${theme.accent};background:${theme.quoteBackground};color:${theme.heading};text-align:left;font-weight:700;`,
    td: `padding:.6em .7em;border:1px solid ${theme.accent};color:${theme.body};vertical-align:top;`
  };
}
```

随后用对象展开覆盖模板差异：

```ts
const layouts: readonly WechatLayout[] = [
  { id: "none", name: "不套用模板", styles: baseStyles },
  {
    id: "editorial-magazine",
    name: "杂志叙事",
    styles: (theme) => ({
      ...baseStyles(theme),
      section: `font-family:Optima,"Songti SC","PingFang SC",serif;font-size:16px;line-height:1.9;color:${theme.body};`,
      h1: `font-family:Georgia,"Songti SC",serif;font-size:26px;line-height:1.35;text-align:center;margin:1.5em 0 .9em;padding-bottom:.65em;border-bottom:3px solid ${theme.accent};font-weight:700;color:${theme.heading};`,
      h2: `font-family:Georgia,"Songti SC",serif;font-size:21px;line-height:1.5;text-align:center;margin:2em 0 1em;font-weight:700;color:${theme.heading};`,
      h3: `font-family:Georgia,"Songti SC",serif;font-size:18px;margin:1.7em 0 .8em;padding-left:.7em;border-left:3px solid ${theme.accent};font-weight:700;color:${theme.heading};`,
      blockquote: `margin:1.4em 0;padding:1em 1.2em;border:0;background:${theme.quoteBackground};color:${theme.body};font-family:Georgia,"Songti SC",serif;`,
      hr: `width:3em;margin:2em auto;border:0;border-top:3px solid ${theme.accent};`
    })
  },
  {
    id: "modern-business",
    name: "现代商务",
    styles: (theme) => ({
      ...baseStyles(theme),
      section: `font-family:Optima,"PingFang SC","Microsoft YaHei",sans-serif;font-size:16px;line-height:1.8;color:${theme.body};`,
      h1: `font-size:26px;line-height:1.35;text-align:left;margin:1.3em 0 .8em;padding-bottom:.55em;border-bottom:3px solid ${theme.accent};font-weight:750;color:${theme.heading};`,
      h2: `font-size:20px;line-height:1.5;margin:1.8em 0 .8em;padding:.35em .7em;border-left:5px solid ${theme.accent};background:${theme.quoteBackground};font-weight:700;color:${theme.heading};`,
      h3: `font-size:18px;margin:1.5em 0 .7em;padding-bottom:.35em;border-bottom:1px solid ${theme.accent};font-weight:700;color:${theme.heading};`,
      blockquote: `margin:1.2em 0;padding:.85em 1em;border:1px solid ${theme.accent};border-left:5px solid ${theme.accent};background:${theme.quoteBackground};color:${theme.body};`,
      th: `padding:.65em .75em;border:1px solid ${theme.accent};background:${theme.accent};color:#ffffff;text-align:left;font-weight:700;`
    })
  },
  {
    id: "reading-notes",
    name: "阅读手记",
    styles: (theme) => ({
      ...baseStyles(theme),
      section: `font-family:Georgia,"Songti SC","PingFang SC",serif;font-size:16px;line-height:1.95;color:${theme.body};background:#fffdf8;padding:.35em .8em;`,
      h1: `font-family:Georgia,"Songti SC",serif;font-size:25px;line-height:1.4;text-align:left;margin:1.4em 0 1em;font-weight:700;color:${theme.heading};`,
      h2: `font-family:Georgia,"Songti SC",serif;font-size:21px;line-height:1.5;margin:1.9em 0 .9em;padding-left:.75em;border-left:5px solid ${theme.accent};font-weight:700;color:${theme.heading};`,
      h3: `font-family:Georgia,"Songti SC",serif;font-size:18px;margin:1.6em 0 .75em;color:${theme.heading};`,
      blockquote: `margin:1.4em 0;padding:1.2em;border:0;background:${theme.quoteBackground};color:${theme.body};font-family:Georgia,"Songti SC",serif;`,
      li: `margin:.4em 0;padding-left:.15em;color:${theme.body};`
    })
  },
  {
    id: "technical-blueprint",
    name: "技术蓝图",
    styles: (theme) => ({
      ...baseStyles(theme),
      section: `font-family:Optima,"PingFang SC","Microsoft YaHei",sans-serif;font-size:15.5px;line-height:1.8;color:${theme.body};`,
      h1: `font-size:25px;line-height:1.35;text-align:left;margin:1.3em 0 .8em;padding-bottom:.55em;border-bottom:1px solid ${theme.accent};font-weight:750;color:${theme.heading};`,
      h2: `font-size:20px;line-height:1.5;margin:1.8em 0 .8em;padding-left:.65em;border-left:4px solid ${theme.accent};font-weight:700;color:${theme.heading};`,
      h3: `font-size:17px;margin:1.5em 0 .7em;color:${theme.accent};font-weight:700;`,
      blockquote: `margin:1.2em 0;padding:.8em 1em;border:0;border-left:4px solid ${theme.accent};background:${theme.quoteBackground};color:${theme.body};`,
      inlineCode: `padding:.15em .35em;background:${theme.codeBackground};color:${theme.accent};font-family:"SFMono-Regular",Consolas,monospace;font-size:.9em;`,
      pre: "margin:1.3em 0;padding:14px;overflow:auto;background:#101820;border-radius:4px;color:#d7e2ea;",
      code: `font-family:"SFMono-Regular",Consolas,"Liberation Mono",monospace;font-size:13px;color:#d7e2ea;`
    })
  }
];

export const LAYOUTS = layouts;

export function getLayout(id: string): WechatLayout {
  return LAYOUTS.find((layout) => layout.id === id) ?? LAYOUTS[0];
}
```

- [ ] **步骤 4：运行模板测试并确认通过**

运行：`npm test -- --run src/__tests__/layouts.test.ts src/__tests__/themes.test.ts`

预期：两个测试文件全部通过，六套颜色主题测试无回归。

- [ ] **步骤 5：提交模板模型**

```bash
git add src/layouts.ts src/__tests__/layouts.test.ts
git commit -m "feat: 添加四套公众号排版模板"
```

---

### 任务 2：公众号内联样式渲染

**文件：**
- 修改：`src/renderer.ts`
- 修改：`src/__tests__/renderer.test.ts`

**接口：**
- 消费：`getTheme(id)`、`getLayout(id)`、`LayoutStyles`。
- 产出：`renderMarkdownToWechatHtml(markdown, options)`，其中 `RenderOptions.layoutId?: string`。

- [ ] **步骤 1：编写四套模板与完整元素失败测试**

在 `src/__tests__/renderer.test.ts` 增加：

```ts
const sample = `# 主标题

## 二级标题

> 引用内容

- 列表一
- 列表二

行内代码 \`const value = 1\`

| 项目 | 内容 |
| --- | --- |
| 模板 | 测试 |

\`\`\`ts
const x = 1;
\`\`\``;

it.each([
  ["editorial-magazine", "font-family:Georgia"],
  ["modern-business", "border-left:5px solid #1769aa"],
  ["reading-notes", "background:#fffdf8"],
  ["technical-blueprint", "background:#101820"]
])("应用 %s 排版模板", (layoutId, marker) => {
  const html = renderMarkdownToWechatHtml(sample, {
    customCss: "",
    enableLineNumbers: true,
    themeId: "tech-blue",
    layoutId
  });
  expect(html).toContain(marker);
  expect(html).toContain("<ul style=");
  expect(html).toContain("<li style=");
  expect(html).toContain("<table style=");
  expect(html).toContain("<th style=");
  expect(html).toContain("<td style=");
  expect(html).toContain("#1769aa");
});

it("不套用模板时保持基础排版", () => {
  const html = renderMarkdownToWechatHtml("## 标题", {
    customCss: "",
    enableLineNumbers: false,
    themeId: "business-green",
    layoutId: "none"
  });
  expect(html).toContain("border-bottom:2px solid #2f8f6f");
});
```

- [ ] **步骤 2：运行测试并确认因 `layoutId` 尚未生效而失败**

运行：`npm test -- --run src/__tests__/renderer.test.ts`

预期：失败，四套模板未出现对应标记，列表和表格没有内联样式。

- [ ] **步骤 3：组合模板与颜色，并覆盖所有公众号常用标签**

把 `RenderOptions` 和主渲染流程改为：

```ts
import { getLayout, type LayoutStyles } from "./layouts";

export interface RenderOptions {
  customCss: string;
  enableLineNumbers: boolean;
  themeId?: string;
  layoutId?: string;
}

export function renderMarkdownToWechatHtml(markdown: string, options: RenderOptions): string {
  const theme = getTheme(options.themeId ?? "business-green");
  const layout = getLayout(options.layoutId ?? "none");
  const articleStyles = layout.styles(theme);
  const marked = new Marked({ async: false, gfm: true });

  marked.use({
    renderer: {
      code(token: Tokens.Code): string {
        const language = token.lang && hljs.getLanguage(token.lang) ? token.lang : "plaintext";
        const highlighted = hljs.highlight(token.text, { language }).value;
        const body = options.enableLineNumbers ? addLineNumbers(highlighted) : highlighted;
        return `<pre style="${articleStyles.pre}"><code class="hljs language-${escapeHtml(language)}" style="${articleStyles.code}">${body}</code></pre>`;
      }
    }
  });

  const article = marked.parse(markdown) as string;
  return `<section class="obsidian-to-sm" style="${articleStyles.section}">${inlineWechatStyles(article, articleStyles)}</section><style>${baseCss(articleStyles)}${options.customCss}</style>`;
}
```

用明确标签映射替换当前只处理少数元素的链式替换：

```ts
function inlineWechatStyles(html: string, styles: LayoutStyles): string {
  const plainTags: ReadonlyArray<[string, keyof LayoutStyles]> = [
    ["h1", "h1"], ["h2", "h2"], ["h3", "h3"], ["p", "p"],
    ["blockquote", "blockquote"], ["ul", "ul"], ["ol", "ol"], ["li", "li"],
    ["strong", "strong"], ["em", "em"], ["hr", "hr"], ["code", "inlineCode"],
    ["table", "table"], ["th", "th"], ["td", "td"]
  ];
  let output = html;
  for (const [tag, key] of plainTags) {
    output = output.replaceAll(`<${tag}>`, `<${tag} style="${styles[key]}">`);
  }
  return output
    .replaceAll("<a ", `<a style="${styles.a}" `)
    .replaceAll("<img ", `<img style="${styles.img}" `);
}
```

代码块中的 `<code class=...>` 不会被 `<code>` 精确替换误伤。将固定兜底 CSS 改为按当前模板生成，用户自定义 CSS 继续放在最后：

```ts
function baseCss(styles: LayoutStyles): string {
  return `
.obsidian-to-sm{${styles.section}}
.obsidian-to-sm h1{${styles.h1}}
.obsidian-to-sm h2{${styles.h2}}
.obsidian-to-sm h3{${styles.h3}}
.obsidian-to-sm p{${styles.p}}
.obsidian-to-sm blockquote{${styles.blockquote}}
.obsidian-to-sm ul{${styles.ul}}
.obsidian-to-sm ol{${styles.ol}}
.obsidian-to-sm li{${styles.li}}
.obsidian-to-sm strong{${styles.strong}}
.obsidian-to-sm em{${styles.em}}
.obsidian-to-sm a{${styles.a}}
.obsidian-to-sm img{${styles.img}}
.obsidian-to-sm hr{${styles.hr}}
.obsidian-to-sm code{${styles.inlineCode}}
.obsidian-to-sm pre{${styles.pre}}
.obsidian-to-sm pre code{${styles.code}}
.obsidian-to-sm table{${styles.table}}
.obsidian-to-sm th{${styles.th}}
.obsidian-to-sm td{${styles.td}}
`;
}
```

保留行号生成函数，把 `codeLine` 与 `lineNumber` 改为两个独立字符串常量，避免继续依赖已删除的固定文章样式对象。

- [ ] **步骤 4：运行渲染与主题测试并确认通过**

运行：`npm test -- --run src/__tests__/renderer.test.ts src/__tests__/layouts.test.ts src/__tests__/themes.test.ts`

预期：三个测试文件全部通过，代码高亮与行号断言仍然通过。

- [ ] **步骤 5：提交渲染器**

```bash
git add src/renderer.ts src/__tests__/renderer.test.ts
git commit -m "feat: 渲染可组合公众号排版样式"
```

---

### 任务 3：状态持久化与右侧样式栏

**文件：**
- 修改：`src/settings.ts`
- 修改：`src/sidebar-controller.ts`
- 修改：`src/__tests__/sidebar-controller.test.ts`
- 修改：`src/sidebar-view.ts`
- 修改：`src/main.ts`
- 修改：`styles.css`

**接口：**
- 消费：`LAYOUTS`、现有 `THEMES`、`renderMarkdownToWechatHtml`。
- 产出：可持久化的 `PluginSettings.layoutId`，以及组合样式状态 `SidebarState.themeId/layoutId`。

- [ ] **步骤 1：编写模板切换、颜色切换和持久化失败测试**

把控制器测试的加载依赖改成两个参数，并增加持久化断言：

```ts
it("切换模板后持久化选择并重新渲染", async () => {
  const saved: string[] = [];
  const controller = new SidebarController({
    initialThemeId: "business-green",
    initialLayoutId: "none",
    load: async (themeId, layoutId) => ({ html: `<article>${themeId}/${layoutId}</article>`, plainText: "正文" }),
    persistStyle: async (themeId, layoutId) => { saved.push(`${themeId}/${layoutId}`); }
  });
  await controller.setLayout("reading-notes");
  expect(controller.getState().html).toContain("business-green/reading-notes");
  expect(saved).toEqual(["business-green/reading-notes"]);
});

it("切换颜色时保留当前模板", async () => {
  const controller = new SidebarController({
    initialThemeId: "business-green",
    initialLayoutId: "technical-blueprint",
    load: async (themeId, layoutId) => ({ html: `<article>${themeId}/${layoutId}</article>`, plainText: "正文" })
  });
  await controller.setTheme("tech-blue");
  expect(controller.getState().html).toContain("tech-blue/technical-blueprint");
});
```

- [ ] **步骤 2：运行控制器测试并确认类型和行为失败**

运行：`npm test -- --run src/__tests__/sidebar-controller.test.ts`

预期：失败，`initialLayoutId`、`persistStyle` 和 `setLayout` 尚不存在。

- [ ] **步骤 3：扩展设置和控制器状态**

在 `PluginSettings` 与默认设置中增加：

```ts
layoutId: string;
```

```ts
layoutId: "none",
```

将控制器依赖与状态改为：

```ts
export interface SidebarState {
  html: string;
  plainText: string;
  coverDataUrl?: string;
  themeId: string;
  layoutId: string;
  isBusy: boolean;
}

export interface SidebarControllerDependencies {
  initialThemeId?: string;
  initialLayoutId?: string;
  load(themeId: string, layoutId: string): Promise<{ html: string; plainText: string; coverDataUrl?: string }>;
  persistStyle?(themeId: string, layoutId: string): Promise<void>;
  publish?(): Promise<void>;
}
```

构造时读取初始值，`refresh()` 同时传入两个 ID；`setTheme()` 和新 `setLayout()` 都先更新状态、调用可选 `persistStyle()`，再刷新预览：

```ts
async setLayout(layoutId: string): Promise<void> {
  this.state = { ...this.state, layoutId };
  await this.dependencies.persistStyle?.(this.state.themeId, this.state.layoutId);
  await this.refresh();
}
```

`setTheme()` 使用完全相同的持久化顺序。

- [ ] **步骤 4：让预览、复制、草稿和发表贯穿两个选择**

把 `WorkbenchActions` 的三个内容操作签名改为：

```ts
copy(themeId: string, layoutId: string): Promise<void>;
createDraft(themeId: string, layoutId: string): Promise<void>;
publish(themeId: string, layoutId: string): Promise<void>;
```

三个按钮分别传入 `state.themeId, state.layoutId`。在 `main.ts` 中让 `prepareActiveNote(themeId, layoutId)` 调用：

```ts
const html = renderMarkdownToWechatHtml(withImages, {
  customCss: this.settings.customCss,
  enableLineNumbers: this.settings.enableLineNumbers,
  themeId,
  layoutId
});
```

`createSidebarController()` 必须提供：

```ts
initialThemeId: this.settings.themeId,
initialLayoutId: this.settings.layoutId,
persistStyle: async (themeId, layoutId) => {
  this.settings.themeId = themeId;
  this.settings.layoutId = layoutId;
  await this.saveSettings();
},
load: async (themeId, layoutId) => {
  const note = await this.prepareActiveNote(themeId, layoutId);
  if (!note) return { html: "", plainText: "" };
  return { html: note.html, plainText: note.plainText, coverDataUrl: note.coverDataUrl };
}
```

侧栏以外的复制、草稿命令使用 `this.settings.themeId` 与 `this.settings.layoutId` 作为默认值，禁止继续写死 `business-green`。

- [ ] **步骤 5：新增模板下拉框和独立样式栏**

在 `sidebar-view.ts` 导入 `LAYOUTS`。主工具栏只保留刷新、复制、草稿、发表和帮助按钮；随后创建：

```ts
const styleBar = root.createDiv({ cls: "obsidian-to-sm-style-bar" });
const layoutSelect = styleBar.createEl("select", {
  cls: "obsidian-to-sm-layout-select",
  attr: { "aria-label": "选择排版模板" }
});
for (const item of LAYOUTS) {
  layoutSelect.createEl("option", { text: item.name, value: item.id });
}
layoutSelect.value = state.layoutId;
layoutSelect.addEventListener("change", () => {
  void this.controller.setLayout(layoutSelect.value).then(() => this.render());
});

const themes = styleBar.createDiv({ cls: "obsidian-to-sm-themes", attr: { "aria-label": "选择颜色主题" } });
```

保留现有色块循环，将提示改为 `颜色：${item.name}`。

在 `styles.css` 增加紧凑、可换行样式：

```css
.obsidian-to-sm-style-bar {
  align-items: center;
  border-bottom: 1px solid var(--background-modifier-border);
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-height: 36px;
  padding: 4px 8px;
}

.obsidian-to-sm-layout-select {
  background: var(--background-secondary);
  flex: 1 1 124px;
  font-size: 12px;
  min-width: 0;
}

.obsidian-to-sm-style-bar .obsidian-to-sm-themes {
  flex: 0 0 auto;
  margin-left: auto;
}
```

- [ ] **步骤 6：运行控制器测试和 TypeScript 构建**

运行：`npm test -- --run src/__tests__/sidebar-controller.test.ts`

预期：控制器测试全部通过。

运行：`npm run build`

预期：TypeScript 无错误，esbuild 生成新的 `main.js`。

- [ ] **步骤 7：提交状态与界面**

```bash
git add src/settings.ts src/sidebar-controller.ts src/__tests__/sidebar-controller.test.ts src/sidebar-view.ts src/main.ts styles.css main.js
git commit -m "feat: 增加可组合排版样式栏"
```

---

### 任务 4：中文文档、版本与安装验证

**文件：**
- 修改：`README.md`
- 修改：`package.json`
- 修改：`package-lock.json`
- 修改：`manifest.json`
- 修改：`versions.json`
- 验证：`main.js`、`styles.css`

**接口：**
- 消费：任务 1 至 3 的最终插件产物。
- 产出：版本 `0.4.0` 的可安装 Obsidian 插件。

- [ ] **步骤 1：更新中文说明与版本**

将 README 功能清单中的主题说明改为：

```markdown
- 六套颜色主题：简约黑白、科技蓝、商务绿、人文墨、杂志红、暖橙生活
- 五种排版选择：不套用模板、杂志叙事、现代商务、阅读手记、技术蓝图
- 排版模板与颜色主题可自由组合，并记住最后一次选择
```

使用说明明确：模板下拉框和颜色色块位于同一条样式栏，切换后立即刷新预览，复制、草稿和发表沿用当前组合。

把 `package.json`、`package-lock.json`、`manifest.json` 的版本改为 `0.4.0`，在 `versions.json` 增加：

```json
"0.4.0": "1.5.0"
```

- [ ] **步骤 2：运行完整验证**

运行：`npm test`

预期：所有测试文件和测试用例通过。

运行：`npm run build`

预期：TypeScript 检查通过，`main.js` 成功生成。

运行：`git diff --check`

预期：无输出。

- [ ] **步骤 3：安装到用户的 Obsidian 仓库**

运行：

```bash
mkdir -p "/Users/peng_lei/Documents/Obsidian Vault/.obsidian/plugins/obsidian-to-sm"
cp main.js manifest.json styles.css "/Users/peng_lei/Documents/Obsidian Vault/.obsidian/plugins/obsidian-to-sm/"
```

验证安装文件：

```bash
shasum main.js manifest.json styles.css "/Users/peng_lei/Documents/Obsidian Vault/.obsidian/plugins/obsidian-to-sm/main.js" "/Users/peng_lei/Documents/Obsidian Vault/.obsidian/plugins/obsidian-to-sm/manifest.json" "/Users/peng_lei/Documents/Obsidian Vault/.obsidian/plugins/obsidian-to-sm/styles.css"
```

预期：源文件和安装目录中对应文件的哈希分别一致。

- [ ] **步骤 4：检查工作区改动并提交**

运行：`git status --short`

预期：只包含 README、版本文件和构建产物的预期改动。

```bash
git add README.md package.json package-lock.json manifest.json versions.json main.js
git commit -m "docs: 发布 0.4.0 排版模板版本"
```

- [ ] **步骤 5：最终验收记录**

记录并向用户报告：测试用例数量、构建结果、安装目录、三个安装文件哈希一致，以及需要在 Obsidian 中重新加载插件后查看模板下拉框。
