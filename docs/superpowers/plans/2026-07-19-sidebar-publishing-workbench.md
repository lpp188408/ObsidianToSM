# ObsidianToSM 左侧发布工作台实施计划

> **面向执行代理：** 必须使用 `superpowers:executing-plans` 或 `superpowers:subagent-driven-development` 逐项执行。每项均使用复选框记录进度。

**目标：** 交付名为 `ObsidianToSM` 的左侧发布工作台，支持主题、多公众号钥匙串配置、草稿保存和直接发布。

**架构：** 将主题、账号解析、凭证存储、微信 API 与 Obsidian 视图分离。`SidebarController` 管理当前笔记、主题、账号和发布状态；`WechatWorkbenchView` 仅负责侧栏 DOM；`main.ts` 适配 Obsidian API。

**技术栈：** TypeScript、Obsidian `ItemView`、Electron `safeStorage`、marked、highlight.js、Vitest、esbuild。

## 全局约束

- 文档和界面文案使用中文；代码标识符保留英文。
- AppSecret 只保存至 macOS 钥匙串，插件数据不保存明文。
- 六个主题 ID 固定为 `minimal-mono`、`tech-blue`、`business-green`、`ink`、`editorial-red`、`warm-orange`。
- `发文章`只保存草稿；`发帖图`提交发布任务并查询状态，不实现粉丝群发。
- 每个新增行为必须先写失败测试，再写最小实现。

---

### 任务 1：主题与渲染器

**文件：** 新建 `src/themes.ts`、`src/__tests__/themes.test.ts`；修改 `src/renderer.ts`、`src/__tests__/renderer.test.ts`。

**接口：** `WechatTheme`、`THEMES`、`getTheme(id)`；`RenderOptions` 新增 `themeId`。

- [ ] 写失败测试，断言 `THEMES` 恰有六个主题且未知 ID 回退到 `minimal-mono`。
- [ ] 运行 `npm test -- --run src/__tests__/themes.test.ts`，确认因模块不存在失败。
- [ ] 创建主题表；每项包含 `id`、中文名称、正文色、标题色、强调色、引用背景和代码背景。
- [ ] 修改 `renderMarkdownToWechatHtml`，从 `getTheme(options.themeId)` 取内联颜色；在渲染测试中断言 `tech-blue` 输出包含 `#1769aa`。
- [ ] 运行 `npm test -- --run src/__tests__/themes.test.ts src/__tests__/renderer.test.ts`，确认通过。
- [ ] 提交：`git commit -am "feat: 添加公众号排版主题"`。

### 任务 2：多账号与钥匙串

**文件：** 新建 `src/accounts.ts`、`src/credential-store.ts`、对应两个测试；修改 `src/settings.ts`。

**接口：** `WechatAccount { id, name, appId }`、`parseAccountRows(text)`、`CredentialStore.save/read/remove`。

- [ ] 写失败测试：解析两行 `名称|AppID|AppSecret` 后，账号元数据不含 Secret；格式错误和重复 AppID 抛出中文错误。
- [ ] 写失败测试：假钥匙串适配器保存后得到密文，读取可还原明文，插件数据不含原始 Secret。
- [ ] 运行两个测试，确认模块缺失导致失败。
- [ ] 实现 `parseAccountRows`；实现注入式 `KeychainAdapter` 和 `CredentialStore`，使用 Electron `safeStorage` 的加密/解密能力，并以 Base64 存储密文。
- [ ] 设置页增加多行账号输入、`保存公众号信息` 和 `测试公众号`；测试按钮逐个调用 access_token 并显示结果。
- [ ] 运行 `npm test -- --run src/__tests__/accounts.test.ts src/__tests__/credential-store.test.ts` 和 `npm run build`。
- [ ] 提交：`git commit -am "feat: 添加钥匙串多公众号配置"`。

### 任务 3：直接发布 API

**文件：** 修改 `src/wechat.ts`、`src/__tests__/wechat.test.ts`。

**接口：** `publishWechatArticle(input)` 返回 `{ draftMediaId, publishId, status }`；`WechatClient.submitPublish(mediaId)` 与 `getPublishStatus(publishId)`。

- [ ] 写失败测试：创建草稿后调用 `cgi-bin/freepublish/submit`，再调用 `cgi-bin/freepublish/get`；状态码 `0` 映射 `published`。
- [ ] 写失败测试：状态码 `1`、`2`、`3` 分别映射 `failed`、`reviewing`、`rejected`。
- [ ] 运行 `npm test -- --run src/__tests__/wechat.test.ts`，确认导出函数不存在而失败。
- [ ] 实现提交发布、状态查询和最多 15 次、每秒一次的轮询；超时返回 `reviewing`，不报告虚假失败。
- [ ] 运行微信测试并确认通过。
- [ ] 提交：`git commit -am "feat: 支持公众号直接发布"`。

### 任务 4：侧栏控制器与视图

**文件：** 新建 `src/sidebar-controller.ts`、`src/sidebar-view.ts`、`src/__tests__/sidebar-controller.test.ts`；修改 `src/styles.css`。

**接口：** `SidebarState`，以及 `refresh`、`setTheme`、`setAccount`、`copy`、`createDraft`、`publish` 方法；视图类型为 `obsidian-to-sm-workbench`。

- [ ] 写失败测试：切换 `tech-blue` 后 HTML 使用蓝色；发布中再次发布抛出“正在发布”。
- [ ] 运行控制器测试，确认模块不存在而失败。
- [ ] 实现依赖注入控制器：读取笔记、解析 frontmatter、解析图片、渲染、读取钥匙串、调用草稿/发布 API 和复制能力。
- [ ] 实现 `ItemView`：上方封面块、账号下拉、去后台、刷新、发文章、发帖图、复制、主题、帮助；下方预览使用 `overflow-y: auto` 完整滚动显示。
- [ ] 发布按钮在 `isBusy` 时禁用；帮助使用侧栏内联区域，不使用弹窗。
- [ ] 运行 `npm test -- --run src/__tests__/sidebar-controller.test.ts && npm run build`。
- [ ] 提交：`git commit -am "feat: 添加左侧发布工作台"`。

### 任务 5：Obsidian 集成、文档与安装

**文件：** 修改 `src/main.ts`、`src/settings.ts`、`README.md`、`manifest.json`、`package.json`、`versions.json`。

- [ ] 注册 `WechatWorkbenchView`；左侧 ribbon 和命令 `打开公众号发布工作台` 打开或显示该 view。
- [ ] 使用 `SuggestModal<TFile>` 选择封面，并安全更新或创建 frontmatter 的 `封面` 字段。
- [ ] 删除或下线主流程中的 `PreviewModal`；不再注册旧弹窗命令。
- [ ] 将显示名称改为 `ObsidianToSM`，版本提升到 `0.3.0`，README 改为中文并说明账号格式、钥匙串、主题、草稿与直接发布差异。
- [ ] 运行 `npm test && npm run build && git diff --check`，确认全部成功。
- [ ] 复制 `main.js`、`manifest.json`、`styles.css` 到 `/Users/peng_lei/Documents/Obsidian Vault/.obsidian/plugins/obsidian-to-sm/`，使用 `shasum -a 256` 确认构建文件与安装文件一致。
- [ ] 提交并推送：`git add . && git commit -m "feat: 完成 ObsidianToSM 左侧发布工作台" && git push`。

## 验收清单

- [ ] 左侧栏取代主发布弹窗，完整预览可滚动。
- [ ] 六套主题可切换，支持默认主题与 frontmatter 覆盖。
- [ ] 多账号可保存和测试，配置文件无明文 Secret。
- [ ] 草稿和直接发布均不依赖剪贴板。
- [ ] 测试、构建、差异检查和 Vault 安装验证均通过。
