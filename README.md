# @scorehub/creator-outreach

English version: [README.en.md](./README.en.md)

**ScoreHub AI TikTok达人营销专家 · Tiky** 是 ScoreHub AI 面向 TikTok Shop 卖家打造的达人营销专家。Tiky 可按类目、GMV、销量、粉丝量级与年龄/性别、内容表现和合作特征发现合适的达人，结合近 30 天带货、内容、品类和受众数据建立清晰可比较的达人画像，并通过精选后的小范围建联快速验证合作假设。Tiky 不是面向成千上万达人的海量群发工具。TikTok 操作通过 ScoreHub MCP 完成，TikTok API 凭证由 ScoreHub 托管，使用者无需配置。

## 支持的客户端

- WorkBuddy

## 安装

### 终端用户入口

公开发布时，终端用户只需要：

1. 安装并至少启动过一次 WorkBuddy
2. 点击分享链接，在浏览器中唤起 WorkBuddy 安装 Tiky：

   `https://www.workbuddy.cn/work/launch/?sharecode=lNM8H05BRKoV-dw2gac3ZwQ-p01o3C3KVz1gXJ_CwvtX02-mSRqBB3xepE4V0gr7&expertname=Tiky+%C2%B7+TikTok%E8%BE%BE%E4%BA%BA%E8%90%A5%E9%94%80%E4%B8%93%E5%AE%B6&buddy_type=workbuddy`

3. 回到 WorkBuddy，打开 “Tiky · TikTok达人营销专家” 对话

Tiky 每个新会话都会通过 `npx -y @scorehub/creator-outreach@latest` 执行 bootstrap 检查。未初始化时，她会说明需要安装 ScoreHub 本地组件，并等待你明确确认；确认后预拉取并自检 `@scorehub/mcp-server@latest`，再更新 Tiky 本地文件和 WorkBuddy 的 `scorehub` MCP 配置。安装完成后需要完全重启 WorkBuddy。

首次确认同时授权后续静默更新 creator-outreach，不会对每个新版本重复询问。MCP 始终运行 `@scorehub/mcp-server@latest`，不固定具体版本。

分享链接只负责把 Tiky 放进 WorkBuddy。默认情况下，你不需要手工安装 `@scorehub/mcp-server`，也不需要自己编辑 `mcp.json`。

### 技术支持 / 内部兜底安装

命令行安装器仅作为技术支持或内部排障路径保留：

```bash
npx -y @scorehub/creator-outreach
```

该安装器只会配置已检测到的 WorkBuddy；未检测到 WorkBuddy 时，会退出且不写入任何配置文件。

| 客户端 | 检测条件 | 安装内容 | 使用方式 |
|---|---|---|---|
| WorkBuddy | `~/.workbuddy/` 存在 | 插件文件写入 `~/.workbuddy/plugins/.../`；MCP 配置合并到 `~/.workbuddy/mcp.json` | 重启后在 Agent 列表选择“ScoreHub AI TikTok达人营销专家” |

MCP Server（`@scorehub/mcp-server`）在写入配置前会先通过 `--self-check --json` 验证可执行性，之后由 WorkBuddy 自动拉起。macOS / Linux 使用 `npx -y @scorehub/mcp-server@latest`；Windows 复用 WorkBuddy 托管的 `node.exe` 直接加载同版本 npm 的 `npx-cli.js`，避免 `.cmd` / `.bat` 的进程启动兼容问题。只有在托管运行时明确缺失或版本过低时，Tiky 才会引导你安装官方 Node.js LTS。

## 首次使用与授权

每个新对话的第一轮，Tiky 都先检查 `uninitialized` / `restart_required` / `ready` / `repair_required` bootstrap 状态。只有 `ready` 才进入能力介绍、账号/店铺切换或业务操作。首次 TikTok 工具调用时会打开浏览器引导你登录 ScoreHub。授权、重新授权或店铺切换成功后，Tiky 会依次确认当前登录账号、当前授权店铺、店铺所属国家和店铺关联品牌。Token 缓存在 `~/.scorehub/`，不会被 bootstrap 或升级清除。

如果提示当前店铺的 TikTok 授权已失效或异常，本地 ScoreHub 登录通常仍然有效。请先到 ScoreHub 重新绑定店铺，再重试；不要反复进行浏览器登录。

如果提示请求过于频繁或配额受限，请等待、分批重试或缩小操作范围。限流不需要重新登录。

## 快速开始

直接对 Tiky 说：

- 帮我搜索适合合作的 TikTok 达人，类目是美妆，GMV 在 1000-10000 美元区间
- 找 20 位美妆达人，粉丝 1万-10万，18-34 岁女性粉丝占比至少 60%，GMV 1K+，带货视频平均播放 5000+，快速增长的独立达人
- 分析这 10 个达人的带货表现，帮我打分排名
- 从排名前 5 位中选出最匹配的 3 位，选择一种利益前置 Offer，预览通知栏前 15 字后发起建联验证

## 故障排查

### 找不到受支持的客户端

先安装并启动 WorkBuddy 一次，再通过分享链接唤起安装 Tiky。

### MCP 工具不可用、工具列表为空或连接已关闭

Tiky 会优先运行 bootstrap 检查。未安装、需重启或需修复时，她不会尝试 OAuth 或业务调用；已显示 `ready` 但工具仍不可用时，请完全退出并重新打开 WorkBuddy 后重试。

如果错误明确提示找不到 Node.js、npm 或 npx，或 Node.js 版本低于 18，Tiky 会先说明诊断结论。经你确认后，它会使用 Node.js 官方 LTS 安装路径协助恢复，复检通过后提示你重启 WorkBuddy。该流程不会重新授权或修改 TikTok 凭证。

## 相关链接

- MCP Server：[@scorehub/mcp-server](https://www.npmjs.com/package/@scorehub/mcp-server)
- 仓库：[ScoreHub-AI/creator-outreach](https://github.com/ScoreHub-AI/creator-outreach)
