# @scorehub/creator-outreach

Chinese version: [README.md](./README.md)

**ScoreHub AI TikTok Creator Marketing Expert · Tiky** is ScoreHub AI's creator marketing expert for TikTok Shop sellers. Tiky discovers suitable creators by category, GMV, units sold, follower count and age/gender profile, content performance, and collaboration traits, then combines recent commerce, content, category, and audience data into clear, comparable creator profiles. Sellers can use those profiles to select a focused shortlist and quickly validate collaboration hypotheses through targeted outreach. Tiky is not a mass-messaging tool for contacting thousands of creators. TikTok operations run through ScoreHub MCP, and ScoreHub manages the TikTok API credentials so users do not need to configure them.

## Supported Clients

- WorkBuddy

## Install

### Public Entry for End Users

For the public release, end users only need to:

1. Install WorkBuddy and launch it at least once
2. Open the following share link in a browser so it can launch WorkBuddy and install Tiky:

   `https://www.workbuddy.cn/work/launch/?sharecode=lNM8H05BRKoV-dw2gac3ZwQ-p01o3C3KVz1gXJ_CwvtX02-mSRqBB3xepE4V0gr7&expertname=Tiky+%C2%B7+TikTok%E8%BE%BE%E4%BA%BA%E8%90%A5%E9%94%80%E4%B8%93%E5%AE%B6&buddy_type=workbuddy`

3. Return to WorkBuddy and open the “Tiky · TikTok Creator Marketing Expert” conversation

Tiky uses `npx -y @scorehub/creator-outreach@latest` to run a bootstrap check before every new conversation. When the machine is uninitialized, Tiky explains that the ScoreHub local component is required and waits for explicit confirmation. It then prefetches and self-checks `@scorehub/mcp-server@latest` before updating Tiky's files and the WorkBuddy `scorehub` MCP configuration. WorkBuddy must be fully restarted after the initial installation.

That first confirmation also authorizes future silent creator-outreach updates, so Tiky does not ask again for every release. The MCP launcher always resolves `@scorehub/mcp-server@latest`; it is never pinned to a specific version.

The share link only installs Tiky into WorkBuddy. In the normal public path, users do not need to install `@scorehub/mcp-server` manually or edit `mcp.json` themselves.

### Support / Internal Fallback Install

The command-line installer remains only as a support or internal fallback:

```bash
npx -y @scorehub/creator-outreach
```

The installer configures WorkBuddy only. If it does not find WorkBuddy, it exits without writing configuration files.

| Client | Detection | Installed content | How to use |
|---|---|---|---|
| WorkBuddy | `~/.workbuddy/` exists | Plugin files in `~/.workbuddy/plugins/.../`; MCP configuration merged into `~/.workbuddy/mcp.json` | Restart, then select “ScoreHub AI TikTok Creator Marketing Expert” from the Agent list |

Before writing the configuration, Tiky verifies the MCP server with `--self-check --json`, then WorkBuddy starts it automatically. macOS and Linux use `npx -y @scorehub/mcp-server@latest`. Windows reuses WorkBuddy's managed `node.exe` to load the matching npm `npx-cli.js` directly, avoiding `.cmd` / `.bat` process-launch compatibility problems. Tiky only guides users to the official Node.js LTS installer when the managed runtime is explicitly missing or too old.

## First Use and Authorization

At the start of every new conversation, Tiky first checks one of four bootstrap states: `uninitialized`, `restart_required`, `ready`, or `repair_required`. Only `ready` permits the capability introduction, account or shop switching, and business operations. The first TikTok tool call then opens ScoreHub login when authorization is needed. After authorization, reauthorization, or a shop switch, Tiky confirms the login phone number, authorized shop, country, and bound brands. Tokens remain under `~/.scorehub/` and are not removed by bootstrap or updates.

If Tiky says that the current shop's TikTok authorization is invalid or unavailable, your local ScoreHub login is usually still valid. Rebind the shop in ScoreHub and try again; do not repeat browser login.

If a request is rate limited or quota limited, wait, retry in smaller batches, or narrow the operation. Reauthorization does not resolve rate limits.

## Quick Start

Ask Tiky:

- Find TikTok creators in the beauty category with GMV between $1,000 and $10,000.
- Find 20 beauty creators with 10K-100K followers, at least 60% female followers aged 18-34, GMV of $1K+, 5K+ average shoppable-video views, independent status, and fast growth.
- Analyze the sales performance of these 10 creators and rank them.
- From the top five, select the three best-matched creators and contact them using my approved message to validate the profile.

## Troubleshooting

### No supported client found

Install and launch WorkBuddy once, then use the share link to launch Tiky's installation in WorkBuddy.

### MCP tools are unavailable, the tool list is empty, or the connection closes

Tiky runs the bootstrap check first. It does not attempt OAuth or business calls while installation, restart, or repair is required. If bootstrap reports `ready` but tools remain unavailable, fully quit and reopen WorkBuddy, then try again.

If an error explicitly says that Node.js, npm, or npx is missing, or that Node.js is below version 18, Tiky explains the diagnosis first. After your confirmation, it guides recovery through the official Node.js LTS installation path, verifies the result, and asks you to restart WorkBuddy. This does not reauthorize or change TikTok credentials.

## Related Links

- MCP Server: [@scorehub/mcp-server](https://www.npmjs.com/package/@scorehub/mcp-server)
- Repository: [ScoreHub-AI/creator-outreach](https://github.com/ScoreHub-AI/creator-outreach)
