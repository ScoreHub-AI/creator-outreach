# @scorehub/creator-outreach

Chinese version: [README.md](./README.md)

**ScoreHub AI TikTok Creator Marketing Expert · Tiky** is ScoreHub AI's creator marketing agent for TikTok Shop sellers. Tiky discovers suitable creators by category, GMV, and audience profile; evaluates their recent sales performance and collaboration potential; and helps sellers scale outreach efficiently. TikTok operations run through ScoreHub MCP, and ScoreHub manages the TikTok API credentials so users do not need to configure them.

## Supported Clients

- Claude Code
- WorkBuddy

Claude Desktop is not currently supported by this installer.

## Install

### Prerequisites

- Node.js 18 or later
- npm and network access to the npm registry
- Claude Code or WorkBuddy installed and launched at least once

Run:

```bash
npx -y @scorehub/creator-outreach
```

The installer configures only clients it detects. If it finds neither Claude Code nor WorkBuddy, it exits without writing configuration files.

| Client | Detection | Installed content | How to use |
|---|---|---|---|
| Claude Code | `~/.claude/` exists | Agent definition in `~/.claude/agents/`; MCP configuration merged into `~/.claude.json` | Restart, then enter `@tiktok-creator-outreach` |
| WorkBuddy | `~/.workbuddy/` exists | Plugin files in `~/.workbuddy/plugins/.../`; MCP configuration merged into `~/.workbuddy/mcp.json` | Restart, then select “ScoreHub AI TikTok Creator Marketing Expert · Tiky” from the Agent list |

The MCP server (`@scorehub/mcp-server`) is downloaded automatically by the configured `npx -y` command the first time it starts. A global installation is not required. WorkBuddy uses its bundled Node.js and the installer handles Windows `npx.cmd` and PATH separators.

> You can also search for `@scorehub/creator-outreach` in the WorkBuddy plugin marketplace.

## First Use and Authorization

At the start of every new conversation, Tiky introduces its creator search, performance analysis, and batch outreach capabilities, supported Southeast Asian markets, typical use cases, and next-step options. Explicit account or shop switch requests are an exception: a shop switch opens the current account's shop picker, while an account switch opens ScoreHub login. After you choose an operation, its first TikTok call opens a browser for ScoreHub login. Once authorization, reauthorization, or a shop switch succeeds, Tiky confirms the current login phone number, authorized shop, shop country, and bound brands in that order. Tokens are then cached under `~/.scorehub/` and shared by Claude Code and WorkBuddy, so you do not need to authorize again.

If Tiky says that the current shop's TikTok authorization is invalid or unavailable, your local ScoreHub login is usually still valid. Rebind the shop in ScoreHub and try again; do not repeat browser login.

If a request is rate limited or quota limited, wait, retry in smaller batches, or narrow the operation. Reauthorization does not resolve rate limits.

## Quick Start

Ask Tiky:

- Find TikTok creators in the beauty category with GMV between $1,000 and $10,000.
- Analyze the sales performance of these 10 creators and rank them.
- Send outreach messages to these 50 creators using my collaboration template.

## Troubleshooting

### No supported client found

Install and launch Claude Code or WorkBuddy once, then run the install command again. Claude Desktop is outside the current support scope.

### MCP tools are unavailable, the tool list is empty, or the connection closes

ScoreHub is temporarily unavailable. Fully quit and reopen Claude Code or WorkBuddy, then try again. Contact ScoreHub support if the problem continues.

## Related Links

- MCP Server: [@scorehub/mcp-server](https://www.npmjs.com/package/@scorehub/mcp-server)
- Repository: [ScoreHub-AI/creator-outreach](https://github.com/ScoreHub-AI/creator-outreach)
