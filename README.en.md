# @scorehub/creator-outreach

Chinese version: [README.md](./README.md)

**ScoreHub AI TikTok Creator Marketing Expert · Tiky** is ScoreHub AI's creator marketing expert for TikTok Shop sellers. Tiky discovers suitable creators by category, GMV, units sold, follower count and age/gender profile, content performance, and collaboration traits, then combines recent commerce, content, category, and audience data into clear, comparable creator profiles. Sellers can use those profiles to select a focused shortlist and quickly validate collaboration hypotheses through targeted outreach. Tiky is not a mass-messaging tool for contacting thousands of creators. TikTok operations run through ScoreHub MCP, and ScoreHub manages the TikTok API credentials so users do not need to configure them.

## Shop Analytics

Tiky's fifth Skill provides read-only analysis of authorized shops, including shop overview, affiliate contribution, product performance, product affiliate orders, and top creators by product. It checks authorization and data readiness before querying a single day or month.

## Supported Markets

Tiky currently covers 13 country markets: Indonesia (ID), Thailand (TH), Malaysia (MY), Vietnam (VN), the Philippines (PH), Singapore (SG), the United States (US), the United Kingdom (GB), Germany (DE), Italy (IT), France (FR), Spain (ES), and Ireland (IE). The Agent specification is authoritative for this market boundary.

## Supported Clients

- WorkBuddy

## Install

### Public Entry for End Users

For the public release, end users only need to:

1. Install WorkBuddy and launch it at least once
2. Open the following share link in a browser so it can launch WorkBuddy and install Tiky:

   `https://www.workbuddy.cn/work/launch/?sharecode=lNM8H05BRKoV-dw2gac3ZwQ-p01o3C3KVz1gXJ_CwvtX02-mSRqBB3xepE4V0gr7&expertname=Tiky+%C2%B7+TikTok%E8%BE%BE%E4%BA%BA%E8%90%A5%E9%94%80%E4%B8%93%E5%AE%B6&buddy_type=workbuddy`

3. Return to WorkBuddy and open the “ScoreHub Tiky” conversation

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
| WorkBuddy | `~/.workbuddy/` exists | Only the MCP configuration is merged into `~/.workbuddy/mcp.json` by default; `--dev` additionally writes a self-test plugin directory | Restart, then select “ScoreHub Tiky” from the Agent list |

Before writing the configuration, Tiky verifies the MCP server with `--self-check --json`, then WorkBuddy starts it automatically. macOS and Linux use `npx -y @scorehub/mcp-server@latest`. Windows reuses WorkBuddy's managed `node.exe` to load the matching npm `npx-cli.js` directly, avoiding `.cmd` / `.bat` process-launch compatibility problems. Tiky only guides users to the official Node.js LTS installer when the managed runtime is explicitly missing or too old.

## Two Delivery Channels

| | Platform channel (end users) | Local self-test channel (developers) |
|---|---|---|
| Source | Listing package on the open platform, downloaded by WorkBuddy | This repository's source, written by `bootstrap --dev` |
| Marketplace / plugin | `experts` / `tiktok-creator-outreach` | `my-experts` / `tiktok-creator-outreach-dev` |
| Display name | ScoreHub Tiky | ScoreHub Tiky (local dev) |
| Skill ids | `tiktok-creator-search`, etc. | The same ids with a `-dev` suffix |

A default install (`bootstrap --install`) **only configures MCP** and never creates a second expert. Add `--dev` to register the local source as a self-test copy and validate new features before release. The self-test copy ships its own `-dev` skill ids, so the two channels no longer shadow each other when both are present — WorkBuddy resolves skills by name and silently skips duplicates, and the `enabledPlugins` flag does not stop loading, so distinct ids are the only reliable isolation.

```bash
# Self-test: write local source, register it under "My Experts", and advance the load position
node packages/creator-outreach/install.js bootstrap --dev --install --json
```

`--dev` rewrites the versioned cache every time, so each run requires a full WorkBuddy restart to take effect. The self-test copy records its source root (this repository), so even a silent update triggered by the published npm package later refreshes it from that repository instead of overwriting your unpublished changes with release code. Disable or uninstall “ScoreHub Tiky (local dev)” on the plugin management page when you are done; both copies still share the same agent name, so disable the platform copy first if you ever see cross-talk. Installs and silent updates also clean up the legacy same-named `my-experts` copy left by older installers, which used to load duplicate skill names alongside the platform build.

## First Use and Authorization

At the start of every new conversation, Tiky first checks one of five bootstrap states: `uninitialized`, `restart_required`, `activation_required`, `ready`, or `repair_required`. Only `ready` goes straight into the capability introduction, account or shop switching, and business operations; `activation_required` means the **local self-test copy** still loads an older version from the versioned cache (a restart does not help), so Tiky re-runs `bootstrap --update` and lets the installer advance the cache itself while the current turn continues with the loaded version — end users have no local self-test copy and never see this state. The first TikTok tool call then opens ScoreHub login when authorization is needed. After authorization, reauthorization, or a shop switch, Tiky confirms the login phone number, authorized shop, country, and bound brands. Tokens remain under `~/.scorehub/` and are not removed by bootstrap or updates.

If Tiky says that the current shop's TikTok authorization is invalid or unavailable, your local ScoreHub login is usually still valid. Rebind the shop in ScoreHub and try again; do not repeat browser login.

If a request is rate limited or quota limited, wait, retry in smaller batches, or narrow the operation. Reauthorization does not resolve rate limits.

## Quick Start

Ask Tiky:

- Find TikTok creators in the beauty category with GMV between $1,000 and $10,000.
- Find 20 beauty creators with 10K-100K followers, at least 60% female followers aged 18-34, GMV of $1K+, 5K+ average shoppable-video views, independent status, and fast growth.
- Analyze the sales performance of these 10 creators and rank them.
- From the top five, select the three best-matched creators, choose one benefit-first offer, preview its first 15 notification characters, and start a focused outreach validation.
- Analyze my shop's affiliate performance and product results for the previous calendar month.

## Troubleshooting

### No supported client found

Install and launch WorkBuddy once, then use the share link to launch Tiky's installation in WorkBuddy.

### MCP tools are unavailable, the tool list is empty, or the connection closes

Tiky runs the bootstrap check first. It does not attempt OAuth or business calls while installation, restart, or repair is required. If bootstrap reports `ready` but tools remain unavailable, fully quit and reopen WorkBuddy, then try again.

If an error explicitly says that Node.js, npm, or npx is missing, or that Node.js is below version 18, Tiky explains the diagnosis first. After your confirmation, it guides recovery through the official Node.js LTS installation path, verifies the result, and asks you to restart WorkBuddy. This does not reauthorize or change TikTok credentials.

## Related Links

- MCP Server: [@scorehub/mcp-server](https://www.npmjs.com/package/@scorehub/mcp-server)
- Repository: [ScoreHub-AI/creator-outreach](https://github.com/ScoreHub-AI/creator-outreach)
