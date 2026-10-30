# @scorehub/creator-outreach

Chinese version: [README.md](./README.md)

**ScoreHub AI TikTok Creator Marketing Expert · Tiky** is ScoreHub AI's creator marketing expert for TikTok Shop sellers. Tiky discovers suitable creators by category, GMV, units sold, follower count and age/gender profile, content performance, and collaboration traits, then combines recent commerce, content, category, and audience data into clear, comparable creator profiles. Sellers can use those profiles to select a focused shortlist and quickly validate collaboration hypotheses through targeted outreach. Tiky can also look up sample applications, creator replies/chats, and email records for the current shop at any time. Tiky is not a mass-messaging tool for contacting thousands of creators. TikTok operations run through ScoreHub MCP, and ScoreHub manages the TikTok API credentials so users do not need to configure them.

## Supported Markets

Tiky currently covers 19 country markets: Indonesia (ID), Thailand (TH), Malaysia (MY), Vietnam (VN), the Philippines (PH), Singapore (SG), the United States (US), the United Kingdom (GB), Germany (DE), Italy (IT), France (FR), Spain (ES), Ireland (IE), Poland (PL), Czechia (CZ), Portugal (PT), Japan (JP), Brazil (BR), and Mexico (MX). The Agent specification is authoritative for this market boundary.

## Supported Clients

- WorkBuddy

## Install

### Official marketplace (recommended for end users)

Tiky's official release channel is the WorkBuddy marketplace (open-platform listing). End users only need to:

1. Install WorkBuddy and launch it at least once
2. Open the official marketplace share link in a browser so it launches WorkBuddy and installs Tiky:

   `https://www.workbuddy.cn/work/launch/?expertname=ScoreHub%20Tiky&prompt=%E6%88%91%E6%83%B3%E4%BA%86%E8%A7%A3%20Tiky%20%E8%83%BD%E5%B8%AE%E5%8A%A9%E6%88%91%E5%81%9A%E4%BB%80%E4%B9%88&deeplink=workbuddy%3A%2F%2Ftask%3Faction%3Dstart%26expertId%3Dex_N3BAMfJWLgpz%26prompt%3D%E6%88%91%E6%83%B3%E4%BA%86%E8%A7%A3%20Tiky%20%E8%83%BD%E5%B8%AE%E5%8A%A9%E6%88%91%E5%81%9A%E4%BB%80%E4%B9%88&buddy_type=workbuddy`

3. Return to WorkBuddy and open the "ScoreHub Tiky" conversation

The marketplace version requires no local install commands: WorkBuddy's dependency guidance card connects the MCP service, and users never edit `mcp.json` by hand. The first TikTok tool call opens ScoreHub login for shop authorization.

### npm channel (backup / preview / self-test)

The npm package is no longer the official release channel. It serves as an auxiliary channel for three scenarios:

- **Preview**: install a specific npm version into WorkBuddy before it reaches the marketplace (or to try a new release early)
- **Backup**: a fallback install path when the marketplace is unavailable
- **Self-test**: developers verifying unpublished changes in this repository

#### Install a specific npm version into WorkBuddy

Prerequisite: WorkBuddy installed and launched at least once (the installer detects the client via `~/.workbuddy/`).

```bash
npx -y @scorehub/creator-outreach@<version> bootstrap --dev --install
```

For example, to preview `1.12.0` (once that version is published to npm):

```bash
npx -y @scorehub/creator-outreach@1.12.0 bootstrap --dev --install
```

The command:

1. Self-checks `@scorehub/mcp-server@latest`, then atomically merges the `scorehub` MCP configuration into `~/.workbuddy/mcp.json`
2. Registers that version's expert payload as "ScoreHub Tiky (local dev)" under "My Experts", with every skill id carrying a `-dev` suffix

Fully restart WorkBuddy, then select "ScoreHub Tiky (local dev)" from the Agent list. Notes:

- The copy coexists with the marketplace version: skill ids are isolated and never shadow each other. Both copies share the same agent name; if behavior cross-talks, disable the marketplace copy first and reproduce.
- To switch versions, rerun the same command with the new version and restart WorkBuddy.
- To remove the preview copy, disable or uninstall "ScoreHub Tiky (local dev)" on the plugin management page.
- The preview copy's code source is recorded at install time as that version's npm cache directory; if the directory is later cleaned up, subsequent silent updates fall back to the latest published code.

#### First conversation on an npm copy

npm-channel copies keep the bootstrap gate: every new conversation first runs `npx -y @scorehub/creator-outreach@latest bootstrap --check --json`. When uninitialized, Tiky explains that the ScoreHub local component is required and waits for explicit confirmation; after confirmation she writes the MCP configuration and asks for a full WorkBuddy restart. That confirmation also authorizes future silent updates, so Tiky does not ask again for every release. The MCP server always resolves `@scorehub/mcp-server@latest`; it is never pinned to a specific version.

#### Repair the MCP configuration only (no expert payload)

```bash
npx -y @scorehub/creator-outreach
```

This command only merges the MCP configuration into `~/.workbuddy/mcp.json`; it installs or updates no expert payload. If WorkBuddy is not detected, it exits without writing configuration files.

### In-repository self-test (developers)

```bash
node packages/creator-outreach/install.js bootstrap --dev --install --json
```

Same channel as the npm preview, but the code source is recorded as the repository root — later silent updates from the published npm package refresh from that repository instead of overwriting unpublished changes. `--dev` rewrites the versioned cache every time, so each run requires a full WorkBuddy restart. Install details, the bootstrap state machine, and recovery flows live in [`docs/WORKBUDDY_PUBLIC_ONBOARDING.md`](./docs/WORKBUDDY_PUBLIC_ONBOARDING.md).

## Two Delivery Channels

| | Marketplace channel (end users) | Local channel (npm preview / backup; in-repo self-test) |
|---|---|---|
| Source | Marketplace listing package, downloaded by WorkBuddy | npm package (preview / backup) or this repository's source (self-test) |
| Entry | Official marketplace share link (see above) | `npx -y @scorehub/creator-outreach@<version> bootstrap --dev --install` |
| Marketplace / plugin | `experts` / `tiktok-creator-outreach` | `my-experts` / `tiktok-creator-outreach-dev` |
| Display name | ScoreHub Tiky | ScoreHub Tiky (local dev) |
| Skill ids | `tiktok-creator-search`, etc. | The same ids with a `-dev` suffix |
| MCP connection | WorkBuddy dependency guidance card | bootstrap installer writes `~/.workbuddy/mcp.json` |

A default install (without `--dev`) **only configures MCP** and never creates a second expert. Coexistence relies on the `-dev` skill ids — the `enabledPlugins` flag does not stop loading, so do not rely on it to isolate the two channels.

## First Use and Authorization

- **Marketplace version**: the first TikTok tool call opens ScoreHub login in a browser. After authorization, reauthorization, or a shop switch, Tiky confirms the login phone number, authorized shop, country, and bound brands.
- **npm-channel copy**: the first turn of every new conversation checks the `uninitialized` / `restart_required` / `activation_required` / `ready` / `repair_required` bootstrap states; only `ready` goes straight into capabilities, account or shop switching, and business operations. `activation_required` means the local channel's load position still points to an older cached version (a restart does not help); Tiky re-runs `bootstrap --update` and lets the installer advance the cache itself. The marketplace version has no bootstrap gate and never shows these states.

Tokens remain under `~/.scorehub/` and are not removed by bootstrap or updates.

If Tiky says that the current shop's TikTok authorization is invalid or unavailable, your local ScoreHub login is usually still valid. Rebind the shop in ScoreHub and try again; do not repeat browser login.

If a request is rate limited or quota limited, wait, retry in smaller batches, or narrow the operation. Reauthorization does not resolve rate limits.

## Quick Start

Ask Tiky:

- Find TikTok creators in the beauty category with GMV between $1,000 and $10,000.
- Find 20 beauty creators with 10K-100K followers, at least 60% female followers aged 18-34, GMV of $1K+, 5K+ average shoppable-video views, independent status, and fast growth.
- Analyze the sales performance of these 10 creators and rank them.
- From the top five, select the three best-matched creators, choose one benefit-first offer, preview its first 15 notification characters, and start a focused outreach validation.
- Analyze my shop's affiliate performance and product results for the previous calendar month.
- Show pending sample applications and any approaching review or shipment deadlines.
- Show recent creator replies, open one reply, and continue the existing chat.
- Look up my recent email records and successful or failed proactive sends.

## Troubleshooting

### Marketplace version: MCP tools are unavailable, the tool list is empty, or the connection closes

WorkBuddy's dependency guidance card owns the MCP connection. Fully quit and reopen WorkBuddy, then try again. If the tools remain unavailable, open the plugin management page and confirm that Tiky is installed and the `scorehub` dependency is connected.

### npm channel: no supported client found

Install and launch WorkBuddy once, then rerun the npm-channel install command; the installer exits without writing anything when `~/.workbuddy/` is absent.

### npm channel: bootstrap reports a repair requirement or a Node.js problem

If an error explicitly says that Node.js, npm, or npx is missing, or that Node.js is below version 18, Tiky explains the diagnosis first. After your confirmation, she guides recovery through the official Node.js LTS installation path, verifies the result, and asks you to restart WorkBuddy. This does not reauthorize or change TikTok credentials. Other repair scenarios follow the recoverable reason reported by Tiky.

## Related Links

- MCP Server: [@scorehub/mcp-server](https://www.npmjs.com/package/@scorehub/mcp-server)
- Repository: [ScoreHub-AI/creator-outreach](https://github.com/ScoreHub-AI/creator-outreach)
