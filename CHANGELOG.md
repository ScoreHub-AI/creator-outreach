# @scorehub/creator-outreach

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
