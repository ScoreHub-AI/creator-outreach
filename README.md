# @scorehub/creator-outreach

English version: [README.en.md](./README.en.md)

**ScoreHub AI TikTok达人营销专家 · Tiky** 是 ScoreHub AI 面向 TikTok Shop 卖家打造的达人营销智能体。Tiky 可按类目、GMV 和粉丝画像发现合适的达人，评估近 30 天带货表现与合作价值，并高效推进批量建联。TikTok 操作通过 ScoreHub MCP 完成，TikTok API 凭证由 ScoreHub 托管，使用者无需配置。

## 支持的客户端

- Claude Code
- WorkBuddy

Claude Desktop 当前不受此安装器支持。

## 安装

### 前置条件

- Node.js 18 或更高版本
- npm 和可访问 npm registry 的网络
- 已安装并至少启动过 Claude Code 或 WorkBuddy

运行：

```bash
npx -y @scorehub/creator-outreach
```

安装器只会配置已检测到的客户端；未检测到 Claude Code 或 WorkBuddy 时，会退出且不写入任何配置文件。

| 客户端 | 检测条件 | 安装内容 | 使用方式 |
|---|---|---|---|
| Claude Code | `~/.claude/` 存在 | Agent 定义写入 `~/.claude/agents/`；MCP 配置合并到 `~/.claude.json` | 重启后输入 `@tiktok-creator-outreach` |
| WorkBuddy | `~/.workbuddy/` 存在 | 插件文件写入 `~/.workbuddy/plugins/.../`；MCP 配置合并到 `~/.workbuddy/mcp.json` | 重启后在 Agent 列表选择“ScoreHub AI TikTok达人营销专家 · Tiky” |

MCP Server（`@scorehub/mcp-server`）由配置中的 `npx -y` 在首次启动时自动拉取，无需全局安装。WorkBuddy 会使用其捆绑的 Node.js，并自动适配 Windows 的 `npx.cmd` 与 PATH 分隔符。

> 也可在 WorkBuddy 插件市场直接搜索 `@scorehub/creator-outreach` 安装。

## 首次使用与授权

每个新对话的第一轮，Tiky 会先介绍达人搜索、表现评估和批量建联三项能力，说明目前支持的东南亚市场，并给出典型用法和下一步选项。明确要求切换账号或店铺时除外：切换店铺会直接打开当前账号的店铺确认页，切换账号才会打开 ScoreHub 登录页。选择需要的操作后，它才会在首次调用 TikTok 功能时打开浏览器引导你登录 ScoreHub。授权、重新授权或店铺切换成功后，Tiky 会依次确认当前登录账号、当前授权店铺、店铺所属国家和店铺关联品牌。登录后 Token 缓存在 `~/.scorehub/`，Claude Code 与 WorkBuddy 共享，无需重复授权。

如果提示当前店铺的 TikTok 授权已失效或异常，本地 ScoreHub 登录通常仍然有效。请先到 ScoreHub 重新绑定店铺，再重试；不要反复进行浏览器登录。

如果提示请求过于频繁或配额受限，请等待、分批重试或缩小操作范围。限流不需要重新登录。

## 快速开始

直接对 Tiky 说：

- 帮我搜索适合合作的 TikTok 达人，类目是美妆，GMV 在 1000-10000 美元区间
- 分析这 10 个达人的带货表现，帮我打分排名
- 用我的建联话术模板，给这 50 个达人批量发送合作消息

## 故障排查

### 找不到受支持的客户端

先安装并启动 Claude Code 或 WorkBuddy 一次，再重新运行安装命令。Claude Desktop 不在当前支持范围内。

### MCP 工具不可用、工具列表为空或连接已关闭

ScoreHub 服务暂时未连接。请完全退出并重新打开 Claude Code 或 WorkBuddy 后重试；如仍无法使用，请联系 ScoreHub 支持。

## 相关链接

- MCP Server：[@scorehub/mcp-server](https://www.npmjs.com/package/@scorehub/mcp-server)
- 仓库：[ScoreHub-AI/creator-outreach](https://github.com/ScoreHub-AI/creator-outreach)
