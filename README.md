# @scorehub/creator-outreach

**Tiky** — TikTok 达人建联 AI 智能体。一条命令装进 Claude Code 和 WorkBuddy。

按类目 / GMV / 粉丝画像搜索 TikTok Shop 达人，分析带货表现并打分排名，批量发送建联消息（`create_conversation` → `send_message`）。所有 TikTok API 调用通过 ScoreHub MCP 完成。

## 安装

```bash
npx @scorehub/creator-outreach
```

命令会自动检测本机已安装的 AI 客户端并完成配置：

| 客户端 | 安装内容 |
|--------|----------|
| **Claude Code / Claude Desktop** | Agent 定义 → `~/.claude/agents/`；MCP 配置 → `~/.claude.json` |
| **WorkBuddy**（检测到 `~/.workbuddy/` 时） | 插件文件 → `~/.workbuddy/plugins/.../`；MCP 配置 → `~/.workbuddy/mcp.json` |

MCP Server（`@scorehub/mcp-server`）由配置中的 `npx -y` 在首次启动时自动拉取，无需单独安装。

安装完成后重启客户端，即可唤起 Tiky：

- **Claude Code**：输入 `@tiktok-creator-outreach`
- **WorkBuddy**：在 Agent 列表中选择 "Tiky — TikTok Creator Outreach"

> 也可在 WorkBuddy 插件市场直接搜索 `@scorehub/creator-outreach` 安装。

## 首次使用：授权

Tiky 首次调用 TikTok 工具时会自动打开浏览器引导登录 ScoreHub。登录一次后 Token 缓存在本地（`~/.scorehub/`），Claude Code 与 WorkBuddy 共享，无需重复授权。

## 快速开始

直接对 Tiky 说：

- 帮我搜索适合合作的 TikTok 达人，类目是美妆，GMV 在 1000-10000 美元区间
- 分析这 10 个达人的带货表现，帮我打分排名
- 用我的建联话术模板，给这 50 个达人批量发送合作消息

## 相关链接

- MCP Server：[@scorehub/mcp-server](https://www.npmjs.com/package/@scorehub/mcp-server)
- 仓库：[ScoreHub-AI/creator-outreach](https://github.com/ScoreHub-AI/creator-outreach)
