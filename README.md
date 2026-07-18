# Obsidian To SM

个人使用的 Obsidian 到微信公众号草稿箱插件。它将当前笔记转换为公众号兼容 HTML，自动上传正文图片和封面，并创建公众号草稿；也可以只复制富文本到公众号编辑器。

## 功能

- 命令与 ribbon：打开预览、复制富文本、或一键保存当前笔记到公众号草稿箱
- Markdown 转公众号友好 HTML，支持代码高亮和可选行号
- Obsidian 本地图片 `![[image.png|120x80]]` 自动转换；保存草稿时上传到微信并替换为微信 CDN 地址
- 从笔记 frontmatter 读取标题、作者、摘要、封面及评论设置
- 本地封面自动上传为公众号永久素材；没有本地封面时可使用已有 `thumb_media_id`
- AppSecret 仅保存在本地 Obsidian 插件数据中，插件不会写入日志

## 安装

```bash
npm install
npm run build
mkdir -p "<vault>/.obsidian/plugins/obsidian-to-sm"
cp main.js manifest.json styles.css "<vault>/.obsidian/plugins/obsidian-to-sm/"
```

然后在 Obsidian 的“设置 → 第三方插件”中启用 `Obsidian To SM`。

## 笔记格式

frontmatter 可省略；未填写时，标题默认取笔记的第一个 H1 或文件名，作者取插件设置。

```markdown
---
标题: 我的公众号文章
作者: 张三
摘要: 这是一段用于公众号展示的摘要。
封面: "![[cover.png]]"
打开评论: true
仅粉丝可评论: false
---

# 我的公众号文章

正文中的本地图片：![[diagram.png|800]]
```

也支持对应英文键：`title`、`author`、`digest`、`cover`、`need_open_comment`、`only_fans_can_comment`。

## 公众号配置

在插件设置的“直发草稿配置”中填写 AppID 和 AppSecret。公众号后台还必须满足：

1. 账号具备获取 `access_token`、上传素材和创建草稿的 API 权限。
2. 将运行 Obsidian 的机器公网 IP 加入公众号后台 IP 白名单。
3. 每篇要一键保存的笔记，在 frontmatter 配置本地 `封面`；或者在插件设置中填已有的永久素材 `thumb_media_id`。

如果未满足 IP 白名单或 API 权限，插件会显示微信返回的错误，草稿不会创建。

## 使用

### 一键保存到草稿箱

1. 打开目标笔记。
2. 执行命令 `一键保存当前笔记到公众号草稿箱`。
3. 插件依次上传正文图片、上传封面、创建草稿，并显示草稿 `media_id`。
4. 到公众号后台“内容管理 → 草稿箱”检查文章，再由你决定编辑或群发。

### 预览与复制

执行 `复制当前笔记到公众号`，在预览窗口检查样式后点击“复制到公众号”，将富文本粘贴到公众号编辑器。

## 验证

```bash
npm run build
npm test
```

手动验证：安装插件后，用包含标题、代码、本地正文图和 frontmatter 封面的笔记执行一键保存。成功时公众号草稿箱会出现文章；重点检查标题、摘要、封面、正文图片和代码块。

## 边界

- “一键发布”在本插件中是“一键保存到公众号草稿箱”，不会自动群发或直接对外发布。
- 直发草稿依赖微信公众号 API 权限和 IP 白名单；没有稳定白名单出口时，请使用复制模式或部署固定 IP 的发布代理。
- 微信编辑器会过滤部分 HTML/CSS，最终显示以公众号草稿预览为准。
