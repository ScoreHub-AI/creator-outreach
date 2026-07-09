# creator-outreach — Tiky TikTok 达人建联

TikTok 达人建联 WorkBuddy 智能体。支持按 GMV/类目/粉丝画像搜索达人、
带货表现分析评分、两步会话建联（create_conversation → send_message），
通过 ScoreHub MCP 调用 TikTok API。

## 安装

在 WorkBuddy 桌面版插件安装入口输入以下任意一种地址：

**npmjs（推荐）**
```
@scorehub/creator-outreach
```

**GitHub**
```
https://github.com/ScoreHub-AI/creator-outreach
```

## 前提条件

插件依赖 ScoreHub MCP Server 调用 TikTok API，安装插件前需先配置：

```bash
npm install -g @scorehub/mcp-server
```

配置说明见 [@scorehub/mcp-server](https://www.npmjs.com/package/@scorehub/mcp-server)。

## 快速开始

安装完成后，可以直接对 Tiky 说：

- 帮我搜索适合合作的TikTok达人，类目是美妆，GMV在1000-10000美元区间
- 分析这10个达人的带货表现，帮我打分排名
- 用我的建联话术模板，给这50个达人批量发送合作消息
