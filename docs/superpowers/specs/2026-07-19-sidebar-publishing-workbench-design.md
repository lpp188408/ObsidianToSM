# Sidebar Publishing Workbench Design

## Goal

Replace the current modal-based publishing flow with a left-sidebar Obsidian workbench. It must render the active note as a complete scrollable WeChat article preview, allow selecting a theme and an Official Account, and publish through the Official Account APIs without manually copying content.

## Scope

- A dockable left sidebar view opened from the ribbon and command palette.
- Complete scrollable article preview in the sidebar, refreshed from the active Markdown note.
- Six built-in themes: `minimal-mono`, `tech-blue`, `business-green`, `ink`, `editorial-red`, and `warm-orange`.
- Multiple Official Account configurations in the plugin settings.
- AppSecret storage in the macOS system Keychain. Plugin data contains account name, AppID, and a Keychain service/account reference only.
- Account connection test using the `access_token` API.
- Local cover selection and persistence to the active note's frontmatter.
- Create-draft action and direct-publish action.

## Explicit Boundaries

- `发文章` creates a WeChat draft. It uploads inline images and the selected cover before calling the draft API.
- `发帖图` creates the draft and submits it to WeChat's publish API. The API submission produces a publish task; the UI polls and reports published, reviewing, failed, or rejected state.
- Neither action sends a broadcast message to all followers. Mass messaging is outside this plugin's scope.
- The plugin is desktop-only and requires macOS Keychain support for saving AppSecret. It must not silently fall back to plaintext secrets.
- Real publishing remains dependent on the account API permissions and the current machine's IP whitelist.

## Settings

The settings page exposes a multiline account input and three buttons.

Input format, one account per line:

```text
公众号名称|AppID|AppSecret
技术笔记|wx123...|secret-value
读书会|wx456...|secret-value
```

- `保存公众号信息`: validates every line, writes each AppSecret to Keychain, and stores non-secret account metadata in plugin data.
- `测试公众号`: obtains an access token for each configured account and reports per-account success or the WeChat error.
- Existing author, line-number, custom CSS, and fallback `thumb_media_id` settings remain available.

## Sidebar Layout

The view has a fixed control area and a scrollable preview below it.

- Cover tile: `添加封面`; opens an Obsidian file chooser, then writes `封面: "![[filename.png]]"` to the active note frontmatter.
- Account selector: selects the account used for API operations.
- `去公众号后台`: opens `https://mp.weixin.qq.com/` in the external browser.
- `刷新`: reloads the active note, resolves embeds, parses frontmatter, and re-renders the preview.
- `发文章`: sends the current rendered article to the selected account's draft box.
- `发帖图`: sends the article as a draft, submits the draft to the publish API, and polls the task status.
- `复制`: copies the rendered rich HTML to the system clipboard.
- `主题`: dropdown for the six built-in themes; changing it re-renders the preview immediately.
- `帮助`: opens a compact help panel listing credentials, IP whitelist, cover, and API-permission requirements.

The article preview uses the selected theme and is constrained to a readable mobile-like article width while remaining vertically scrollable within the sidebar.

## Data Flow

1. The view reads the active note and its frontmatter.
2. It resolves Obsidian image embeds to local data URLs for preview.
3. The renderer applies the selected theme and produces WeChat-compatible HTML.
4. On publish, inline data URLs are uploaded through WeChat's content-image endpoint and replaced with returned URLs.
5. The local cover is uploaded as a permanent image material, or the configured fallback `thumb_media_id` is used.
6. The plugin calls the draft endpoint. The direct-publish action then submits the draft media ID and polls the returned publish task.

## Error Handling

- Account configuration errors identify the offending line without retaining the secret in a notice or log.
- Keychain unavailable: saving accounts fails with an explicit message; plaintext storage is never used.
- Publish errors display the WeChat message and code when available.
- A view-level busy state disables publish actions while an upload or publish task is running.
- The sidebar preview remains available when account configuration is incomplete, so copy mode continues to work.

## Tests

- Theme renderer tests verify distinct inline styles for every built-in theme.
- Account-parser tests cover valid rows, invalid rows, duplicate names, and trimming.
- Credential-store tests use an injected Keychain adapter and verify that plugin data contains no AppSecret.
- WeChat client tests cover draft creation, final publish submission, and terminal publish-status mappings.
- Sidebar controller tests cover active-note refresh, theme switching, and disabled actions while publishing.

## Acceptance Criteria

- The workbench appears as a left sidebar rather than a modal.
- Users can add and test more than one Official Account configuration without secrets being stored in plain plugin data.
- The current note can be saved as a draft or submitted for publication without using clipboard copy.
- The sidebar displays a complete, scrollable, themed preview of the active note.
- The plugin builds and all automated tests pass.
