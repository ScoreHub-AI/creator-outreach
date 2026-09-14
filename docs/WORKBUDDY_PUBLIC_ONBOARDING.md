# WorkBuddy 公开自助安装与持续升级

> 本文档定义 `creator-outreach` 面向终端用户的公开交付路径。具体对话行为以 Agent 权威规范为准。
>
> **交付路径边界**：本文只描述**分享链接**路径。**开放平台**（`open.workbuddy.cn`）上架走 WorkBuddy 依赖引导卡片，MCP 由平台负责连接，**不含**本页的 bootstrap 门禁与分享链接回退；其字段契约、上架版 Agent 正文差异与交付物见顶层 [`../../../docs/WORKBUDDY_OPEN_PLATFORM_LISTING.md`](../../../docs/WORKBUDDY_OPEN_PLATFORM_LISTING.md)。

## 两条通道的分工

本包同时存在于两条互不干扰的通道，安装器只负责自己那条：

| | 平台通道（对用户发布） | 本地自测通道（开发者自用） |
|---|---|---|
| 来源 | 开放平台上架包 | 本仓库源码 |
| 市场 | `experts` | `my-experts` |
| 插件名 | `tiktok-creator-outreach` | `tiktok-creator-outreach-dev` |
| 显示名 | ScoreHub Tiky | ScoreHub Tiky（本地自测） |
| 创建者 | WorkBuddy 自动下载并物化 | 本包 `bootstrap --dev` |
| 用途 | 终端用户使用已发布能力 | 在发布前自测新功能 |

`bootstrap --install` / `--update` **默认只配置 MCP**，不注册也不物化任何插件，因此不会在用户机器上留下与平台版抢名字的第二份专家；它只额外做一件事：清掉旧版安装器写坏的同名残留（见「存量迁移」）。只有显式加 `--dev` 才会创建本地自测副本。

两条通道的 **skill id 互不重叠**（自测副本统一带 `-dev` 后缀），所以可以共存。唯一还会重名的是 agent 名，自测时若发现行为串味，先到插件管理页停用平台版再复现。

## 交付边界

WorkBuddy 分享链接只负责将 Tiky 代码包安装到 WorkBuddy，不会在分享安装阶段同时配置 MCP Server。因此公开版保证的边界是：

- 用户可以打开 Tiky 会话，但在 bootstrap 完成前不进入达人搜索、分析、建联或 OAuth。
- 首次本地安装必须经用户明确确认；该确认同时授权后续静默更新 ScoreHub 本地引导。
- 安装或更新不会删除 `~/.scorehub/` 中的 OAuth 授权缓存。
- MCP 配置在完全重启 WorkBuddy 后生效。插件代码按「源码位 → 版本化缓存」两步生效：平台版由 WorkBuddy 自行物化，本地自测通道由本包安装器在 `--dev` 时一次性完成两步 —— 写入成功不等于已生效，见「插件生效链路」。
- 更新不主动中断当前任务；当前会话可以继续使用已加载的版本。

当前公开分享链接为：

`https://www.workbuddy.cn/work/launch/?sharecode=lNM8H05BRKoV-dw2gac3ZwQ-p01o3C3KVz1gXJ_CwvtX02-mSRqBB3xepE4V0gr7&expertname=Tiky+%C2%B7+TikTok%E8%BE%BE%E4%BA%BA%E8%90%A5%E9%94%80%E4%B8%93%E5%AE%B6&buddy_type=workbuddy`

## Bootstrap 状态机

Tiky 每个新会话在欢迎语和业务操作前先执行：

`npx -y @scorehub/creator-outreach@latest bootstrap --check --json`

| 状态 | 含义 | Tiky 行为 |
|---|---|---|
| `uninitialized` | 未获得首次确认，或尚未配置 `scorehub` MCP | 说明将安装本地组件，等待明确确认 |
| `restart_required` | 安装或更新已写入，当前 WorkBuddy 尚未确认加载 | 先通过 `status` 验证当前 MCP 的托管元数据；确认已加载后自动清除重启标记并继续，否则提示完全重启 WorkBuddy |
| `activation_required` | **本地自测通道**的源码位已写入新版本，但登记表仍指向旧的版本化缓存 | 执行 `bootstrap --update --json` 由安装器自己把缓存推进到新版本并重新登记；不得引导用户去插件管理页点「更新」（自测通道不经市场升级）。仅当重跑后仍为此状态才回退为覆盖安装 |
| `ready` | 当前配置符合公开版契约 | 正常进入欢迎和业务流程 |
| `repair_required` | 配置损坏、环境不满足或上次安装失败 | 说明可恢复原因，经确认后重试修复 |

`activation_required` 只由本地自测通道触发：终端用户没有 `my-experts` 源码位，`detectActivationGap` 直接返回空，因此不会看到这个状态。

`bootstrap --check` 只读取本地状态和配置，不改写文件。用户首次确认后执行：

`npx -y @scorehub/creator-outreach@latest bootstrap --install --json`

重启标记不会根据进程重启次数猜测是否生效。重启后的首轮会话允许调用本地 `status`：只有返回 `config_source.managed_by = "@scorehub/creator-outreach"`、`config_source.client_host = "workbuddy"`，且 `config_source.creator_outreach_version` 与 bootstrap 检查结果中的已安装版本一致时，才执行 `bootstrap --mark-ready --json` 清除标记；状态元数据不匹配时继续提示用户完全退出并重启。已安装版本与正在执行的 `@latest` 版本可以不同，确认重启后再按更新流程处理。

安装器先执行 `npx -y @scorehub/mcp-server@latest --self-check --json` 的等价启动，通过后才原子合并 `~/.workbuddy/mcp.json` 并更新本地插件。MCP 始终解析并运行 `@scorehub/mcp-server@latest`：macOS / Linux 直接使用 `npx`；Windows 使用 WorkBuddy 同一托管版本中的 `node.exe` 直接加载 `node_modules/npm/bin/npx-cli.js`，不通过不能被原生进程 API 直接执行的 `npx.cmd`，也不创建 `.bat` 包装脚本。

macOS / Linux 配置为：

```json
{
  "command": "npx",
  "args": ["-y", "@scorehub/mcp-server@latest"]
}
```

Windows 配置使用安装器检测到的绝对路径，结构为：

```json
{
  "command": "C:\\Users\\<user>\\.workbuddy\\binaries\\node\\versions\\<version>\\node.exe",
  "args": [
    "C:\\Users\\<user>\\.workbuddy\\binaries\\node\\versions\\<version>\\node_modules\\npm\\bin\\npx-cli.js",
    "-y",
    "@scorehub/mcp-server@latest"
  ]
}
```

旧版安装器写入的 `npx.cmd` 或临时 `npx.bat` 配置会在后续静默更新中迁移到上述原生启动方式；WorkBuddy 轮换托管 Node.js 版本后，过期的绝对路径也会按相同流程更新。两种情况都要求完全重启 WorkBuddy。

## 插件生效链路

WorkBuddy 从 5.3.11 起把插件加载改为**按版本不可变的缓存快照**，插件代码因此有两个位置，写入位与加载位不再重合：

| 位置 | 作用 | 平台通道 | 本地自测通道 |
|---|---|---|---|
| `~/.workbuddy/plugins/marketplaces/<市场>/plugins/<插件名>` | 源码位 | WorkBuddy 下载解包 | 本包安装器写入，并改写为 dev 身份 |
| `~/.workbuddy/plugins/cache/<市场>/<插件名>/<版本>` | 版本化缓存（**加载位**） | WorkBuddy 物化 | 本包安装器物化 |
| `~/.workbuddy/plugins/installed_plugins.json` | 安装登记表；`installPath` 与 `version` 是判定「实际生效版本」的唯一来源 | WorkBuddy 维护 | 本包安装器 upsert `user` 作用域记录 |
| `~/.workbuddy/settings.json` 的 `enabledPlugins` | 插件管理页显示的启用态；**不是**加载开关 | WorkBuddy 维护 | `--dev` 时写 `true`，避免 UI 里看着是关的 |

四条硬约束决定了 `--dev` 的实现方式：

- **缓存目录名取自 `plugin.json` 的 `version`**（`resolvePluginCacheIdentity`）。物化用 `.staging-*` → rename 原子发布，临时目录必须以 `.` 开头，否则会被 `findCachedPluginByDirectory` 当成一个额外版本参与挑选。
- **`my-experts` 的 `marketplace.json` 是扫描的输入，不是产物。** 5.5.x 的 `doScanCustomExperts` 只返回清单里已登记的条目，`reconcileCustomMarketplaceManifest` 只做清理、**不会自动登记磁盘上的裸目录** —— 只写目录不写清单等于插件在任何列表里都不存在，而且不会自愈。因此 `--dev` 必须显式 upsert 清单条目，字段与平台 `updateCustomExpertMarketplaceManifest` 一致（`name` / `source` / `description`）。
- **技能按 `name` 全局索引，同名不报错。** `SkillExtensionLoader` 对同名技能是「先加载者占用、后者静默跳过」，所以自测副本的 skill id 必须带 `-dev` 后缀，否则会与平台版互相遮蔽、自测结果不可信。
- **自测副本的代码来源必须登记，不能沿用「当前正在运行的包」。** 静默更新（`--update`）同样会刷新自测通道，而 agent 会话里跑的是 `npx @scorehub/creator-outreach@latest`，它的 `__dirname` 指向 npm 缓存里的**发布版**。若拿它当来源，一次静默更新就会把未发布的改动覆盖回旧代码，且版本号看上去仍然正常。因此 `--dev` 会把仓库根写进登记表记录的 `sourceDir`，之后任何来源触发的刷新都从该目录取材（目录已不存在时才回退到当前运行包，`--check` 以 `local_channel_source_dir` 回报实际取值）。

> `enabledPlugins` **拦不住加载**：本机实测 `@experts` 与 `@my-experts` 的 settings 值都是 `false`，两者却都在同一天的日志里报过 `Loaded N skill(s)`。它只决定插件管理页显示的启用态，真正决定「加载哪一份代码」的是市场清单 + 缓存物化 + skill id 是否撞名。别指望用这个开关隔离两条通道。

因此本包安装器写入源码位后**不能**把「已写入」当作「已生效」，必须从登记表读取实际生效版本再决定状态；`--dev` 则把四步一次做完：写源码位（含 dev 身份与 skill id 后缀）→ 注册清单 → 物化缓存 → 写登记表与启用态。

**重启 WorkBuddy 对 `activation_required` 无效。** 启动维护阶段只补建「登记记录缺失」的插件，记录存在但版本陈旧时不会刷新，所以这个问题不能用重启解决 —— 自测通道由 `bootstrap --update` 推进加载位，平台通道由插件管理页「更新」推进。

### 平台通道为什么不能靠改清单版本绕开

平台通道的加载位由 WorkBuddy 维护，本包安装器只读不写。`my-experts` 是自动生成市场，其清单条目只含 `name` / `source` / `description`，且会被平台按目录扫描结果整份覆写；手工补 `version` 会在下次扫描被抹除。缺少该字段时 `versionSatisfiesRange` 把版本区间视为**空区间**（`if (!el) return !0`），任何已存在的登记记录都被判为命中并直接返回「已安装」—— 这是历史上「更新后用户仍跑旧源码」的根因。

本地自测通道不走市场升级路径，因此不受这条空区间判定影响：`--dev` 每次都自己物化缓存并写登记表 —— **不按版本跳过**。自测循环里 `plugin.json` 的 `version` 常常不变，若按版本判定「缓存已是最新」，加载位就会继续跑旧代码；缓存目录名仍是 `version`，旧内容被同名新内容替换。

## 本地自测通道（`bootstrap --dev`）

在仓库内自测未发布的新功能：

```bash
node packages/creator-outreach/install.js bootstrap --dev --install --json
```

它会写 MCP 配置，并把本地源码以 `tiktok-creator-outreach-dev@my-experts` 的身份注册进「我的专家」、物化到版本化缓存、写登记表与启用态。首次执行后需完全重启 WorkBuddy；之后改完代码重跑同一条命令即可推进加载位（返回 `restart_required` 表示缓存已换新）。

- dev 身份改 `plugin.json` 的 `name` / `plugin` / `displayName` / `description`，并把 `skills/*/SKILL.md` 的 `name` 与 agent 文件里的 id 引用一起加上 `-dev` 后缀（`applyDevSkillIds`）。`agentName`、`agents/` 下的文件名与 skills 目录名保持不变 —— 运行时会按 `agentName` 在自己的插件目录里定位 agent markdown，改它会连带要求重命名文件与 frontmatter。
- 只改 skill id、不改目录名，是因为 `plugin.json` 的 `skills` 数组用的是**路径**（`./skills/<目录>`）；目录名不动就不用同步它。重复执行幂等，不会叠出 `-dev-dev`。
- **每次 `--dev` 都会重写缓存**，所以每次都需要一次重启才算生效。
- 自测副本的代码来源（仓库根）会记进登记表记录的 `sourceDir`。因此 agent 会话里的静默更新也只会从该仓库取材，不会用 npm 发布版覆盖你的改动；仓库被删或挪走后回退到当前运行包，通道不会卡死。
- 自测完成后可到插件管理页停用或卸载「ScoreHub Tiky（本地自测）」；两条通道的 skill id 已隔离，共存不会互相遮蔽，但 agent 名仍相同，若发现行为串味先停用平台版。

## 持续升级

- 已确认的用户在 `bootstrap --check --json` 返回 `update_due = true` 时，由 `bootstrap --update --silent --json` 静默刷新 creator-outreach 和 MCP 配置，不再对每次 creator-outreach 升级重复询问。
- 远程版本检查最多每 24 小时一次；网络失败时保留当前已加载版本和 MCP 配置。
- `mcp-server` 不固定版本；WorkBuddy 每次启动都由 `@latest` 解析当前 npm latest。
- Windows 托管启动不启用 shell；包含空格的绝对路径作为独立 JSON 参数传递。
- `mcp-server@latest` 必须保持工具名、参数、OAuth 和 `status` 契约向后兼容。无法向后兼容的升级必须使用新包名。

## 本地状态与恢复

bootstrap 状态保存在 `~/.workbuddy/scorehub/bootstrap-state.json`，包含首次确认、当前 creator-outreach 版本、最近观察到的 mcp-server 版本、最近检查时间、重启状态和最近错误。

实际生效版本不写入该状态文件，而是每次检查时从 WorkBuddy 的 `installed_plugins.json` 现场读取并校验缓存目录是否存在，避免把「本安装器写过什么」误当成「WorkBuddy 加载了什么」。因此 bootstrap 检查会同时返回源码位版本与实际生效版本，二者不一致即 `activation_required`。

- 插件目录、状态文件和 `mcp.json` 写入采用临时路径加原子替换。
- `mcp.json` 无法解析时不直接覆盖，不丢弃其他 MCP Server 配置。
- Node.js 低于 18、Windows 托管目录缺少匹配的 `node.exe` / `npx-cli.js`，或需要系统级安装时，仍必须单独征得用户确认。
- 无网络、npm 不可用或 self-check 失败时，保留原配置和插件，返回 `repair_required`。

## 存量迁移

已包含 bootstrap 门禁的版本可以持续获取 creator-outreach latest。更早版本需要用户一次性重新打开公开分享链接。

旧版安装器以 `my-experts` 名义写入的**同名**副本（`tiktok-creator-outreach@my-experts`）是个陷阱：它不在市场清单里注册（列表里看不见、也不会自愈），却照样参与扩展加载。实测它会与平台版 `@experts` 在同一台机器上**同时**加载同名技能，先加载者占用 —— 这是历史上「装了新版本却仍在跑旧代码」的成因之一。

因此 `install()` / `update()` 两条路径都会在开头清理这套残留（`cleanupLegacyLocalCopy`），覆盖五处：`marketplaces/my-experts/plugins/tiktok-creator-outreach` 目录、`cache/my-experts/tiktok-creator-outreach` 缓存、`installed_plugins.json` 里的 `tiktok-creator-outreach@my-experts` 记录、`settings.json` 里同 id 的启用态、以及市场清单里的同名条目。判定按目录内 `plugin.json` 的 `name` 做，不误删别人的自定义专家；同目录下其他条目一律保留。

终端用户的平台版不受影响 —— 平台版由 WorkBuddy 自行下载与升级，本包安装器只读它的版本号用于诊断，从不写 `cache/experts`。
