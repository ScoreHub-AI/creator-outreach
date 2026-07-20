# @scorehub/creator-outreach

## Unreleased

### Changed

- Reposition Tiky as a TikTok creator marketing expert focused on building clear creator profiles and validating focused collaboration shortlists, rather than a mass-messaging tool.
- Require Tiky to redirect requests to contact thousands of creators toward discovery, profile analysis, ranking, and a focused outreach-validation shortlist.
- Show Tiky in the conversation-facing profession field while keeping the plugin display name as the ScoreHub AI product name.

## 1.1.3

### Patch Changes

- Constrain creator search and scoring responses to stable summaries, tables, pagination, identifier retention, missing-data handling, and deterministic ranking rules.
- Generate self-contained WorkBuddy HTML reports for six or more results when visualization is available, with complete Markdown fallback.
- Avoid misleading relative scores for a single creator and preserve outreach identifiers from search context for later actions.

## 1.1.2

### Patch Changes

- Confirm the current login phone number before the authorized shop, country, and brands after authorization succeeds.

## 1.1.1

### Patch Changes

- Require Tiky to confirm the authorized shop name, country, and bound brands after authorization or a shop switch succeeds.

## 1.1.0

### Minor Changes

- Recognize account and shop switching requests, including immediate handling on the first turn for session preparation.

## 1.0.16

### Patch Changes

- Use an opaque white WorkBuddy avatar background so transparent pixels no longer render as dark.

## 1.0.15

### Patch Changes

- Remove the unsupported direct TikTok API fallback from user-facing agent guidance. WorkBuddy users now receive a simple MCP recovery prompt, while ScoreHub manages TikTok credentials.
- Introduce Tiky's supported capabilities at the start of every new conversation before requesting authorization or running an operation.
- Expand the first-conversation introduction with supported markets, practical examples, and context-aware next-step guidance.
- Refresh the WorkBuddy plugin profile with ScoreHub AI branding, a branded avatar, and first-use-aligned prompts.
- Keep the WorkBuddy quick entry focused on Tiky's capability introduction so it does not conflict with first-conversation behavior.

## 1.0.14

### Patch Changes

- Clarify the supported client setup, add bilingual npm documentation, and validate Node.js and installed clients before writing configuration files.

## 1.0.13

### Patch Changes

- Stabilize OAuth and structured TikTok error handling so local OAuth invalidation, shop rebind prompts, parameter validation, and rate-limit guidance are distinguished consistently.

## 1.0.12

### Patch Changes

- 将安装脚本写入的默认 MCP 远端地址从 `https://mcp.scorehub.cn` 切换到 `https://app.scorehub.cn/mcp`，匹配新的生产入口。

## 1.0.11

### Patch Changes

- 修复评分模型字段对齐：mcp-remote `CreatorPerformance` 补 `data.creator` 嵌套层，修正 GMV/互动率/粉丝画像字段为真实 API 类型（string vs number）
- 品类匹配改为父类目优先，移除 `category_ids`（叶子 ID）兜底，修复 gender key 大小写匹配
- 补充 SEA 市场限制：泰/马/越/菲/印尼/新加坡，搜索前主动拦截不支持的市场
- 新增类型验证脚本：真实 API 响应 fixture + `validate-types` 一键回归

## 1.0.10

### Patch Changes

- `npx @scorehub/creator-outreach` 安装完成时打印 mcp-server 当前最新版本号（`npm view` 查询，失败静默兜底为 `@latest`）。注意该版本为 install 时刻的最新版，运行时由 npx 现场解析 `@latest`，届时可能已更新

## 1.0.9

### Patch Changes

- 修复类目过滤静默失效：达人搜索的 `category` 只认「父类目 + 直接下一级子类目」（TikTok 官方约束，与 v1/v2 版本无关），此前误用 v2 深层叶子 ID 会被搜索接口忽略、返回无关达人。Agent/Skill 文档改为父类目优先、兜底子类目只取直接下一级，并新增「搜索后 `category_ids` 闭环校验」：返回类目与所传 ID 零重叠即判定过滤失效，回退到父类目重搜

## 1.0.8

### Patch Changes

- `npx @scorehub/creator-outreach` 启动时打印包名和版本号
- 优化 README：修正过时的"需先全局安装 mcp-server"说明（实际由 `npx -y` 自动拉取），补充授权流程和客户端安装对照表

## 1.0.7

### Patch Changes

- 修复 WorkBuddy MCP `Connection closed`：WorkBuddy spawn 子进程的 PATH 不含 node，npx 及其下载的包依赖 `#!/usr/bin/env node` 找不到 node 而秒退。install.js 在 WorkBuddy mcp.json 的 `env.PATH` 注入捆绑 node 的 bin 目录；同时去掉 WorkBuddy 不识别的 `type` 字段

## 1.0.6

### Patch Changes

- 修复 WorkBuddy `spawn npx ENOENT`：自动检测 WorkBuddy 捆绑的 npx 全路径并写入 mcp.json

## 1.0.5

### Patch Changes

- install.js 支持同时安装到 WorkBuddy：检测 `~/.workbuddy/` 目录，自动复制插件文件并写入 `mcp.json`，Claude Code 和 WorkBuddy 可一次安装完成

## 1.0.4

### Patch Changes

- 优化类目解析逻辑：优先匹配父类目（`is_leaf=false`），仅当无父类目匹配时兜底使用子类目（`is_leaf=true`），扩大达人搜索覆盖面

## 1.0.2

### Patch Changes

- 修复 mcp-server 启动命令添加 @latest 标签，确保每次启动 MCP 时拉取最新版本
