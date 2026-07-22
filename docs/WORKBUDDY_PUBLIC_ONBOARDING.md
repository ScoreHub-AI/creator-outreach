# WorkBuddy 公开自助安装与持续升级

> 本文档定义 `creator-outreach` 面向终端用户的公开交付路径。具体对话行为以 Agent 权威规范为准。

## 交付边界

WorkBuddy 分享链接只负责将 Tiky 代码包安装到 WorkBuddy，不会在分享安装阶段同时配置 MCP Server。因此公开版保证的边界是：

- 用户可以打开 Tiky 会话，但在 bootstrap 完成前不进入达人搜索、分析、建联或 OAuth。
- 首次本地安装必须经用户明确确认；该确认同时授权后续静默更新 ScoreHub 本地引导。
- 安装或更新不会删除 `~/.scorehub/` 中的 OAuth 授权缓存。
- WorkBuddy 加载 MCP 配置和新插件文件需要新会话或完全重启；更新不主动中断当前任务。

当前公开分享链接为：

`https://www.workbuddy.cn/work/launch/?sharecode=lNM8H05BRKoV-dw2gac3ZwQ-p01o3C3KVz1gXJ_CwvtX02-mSRqBB3xepE4V0gr7&expertname=Tiky+%C2%B7+TikTok%E8%BE%BE%E4%BA%BA%E8%90%A5%E9%94%80%E4%B8%93%E5%AE%B6&buddy_type=workbuddy`

## Bootstrap 状态机

Tiky 每个新会话在欢迎语和业务操作前先执行：

`npx -y @scorehub/creator-outreach@latest bootstrap --check --json`

| 状态 | 含义 | Tiky 行为 |
|---|---|---|
| `uninitialized` | 未获得首次确认，或尚未配置 `scorehub` MCP | 说明将安装本地组件，等待明确确认 |
| `restart_required` | 安装或更新已写入，当前 WorkBuddy 尚未加载 | 提示完全重启 WorkBuddy，不执行业务工具 |
| `ready` | 当前配置符合公开版契约 | 正常进入欢迎和业务流程 |
| `repair_required` | 配置损坏、环境不满足或上次安装失败 | 说明可恢复原因，经确认后重试修复 |

`bootstrap --check` 只读取本地状态和配置，不改写文件。用户首次确认后执行：

`npx -y @scorehub/creator-outreach@latest bootstrap --install --json`

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

## 持续升级

- 已确认的用户在 `bootstrap --check --json` 返回 `update_due = true` 时，由 `bootstrap --update --silent --json` 静默刷新 creator-outreach 和 MCP 配置，不再对每次 creator-outreach 升级重复询问。
- 远程版本检查最多每 24 小时一次；网络失败时保留当前已加载版本和 MCP 配置。
- `mcp-server` 不固定版本；WorkBuddy 每次启动都由 `@latest` 解析当前 npm latest。
- Windows 托管启动不启用 shell；包含空格的绝对路径作为独立 JSON 参数传递。
- `mcp-server@latest` 必须保持工具名、参数、OAuth 和 `status` 契约向后兼容。无法向后兼容的升级必须使用新包名。

## 本地状态与恢复

bootstrap 状态保存在 `~/.workbuddy/scorehub/bootstrap-state.json`，包含首次确认、当前 creator-outreach 版本、最近观察到的 mcp-server 版本、最近检查时间、重启状态和最近错误。

- 插件目录、状态文件和 `mcp.json` 写入采用临时路径加原子替换。
- `mcp.json` 无法解析时不直接覆盖，不丢弃其他 MCP Server 配置。
- Node.js 低于 18、Windows 托管目录缺少匹配的 `node.exe` / `npx-cli.js`，或需要系统级安装时，仍必须单独征得用户确认。
- 无网络、npm 不可用或 self-check 失败时，保留原配置和插件，返回 `repair_required`。

## 存量迁移

已包含 bootstrap 门禁的版本可以持续获取 creator-outreach latest。更早版本需要用户一次性重新打开公开分享链接。
