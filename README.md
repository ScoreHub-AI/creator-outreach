# @scorehub/creator-outreach

English version: [README.en.md](./README.en.md)

**ScoreHub AI TikTok达人营销专家 · Tiky** 是 ScoreHub AI 面向 TikTok Shop 卖家打造的达人营销专家。Tiky 可按类目、GMV、销量、粉丝量级与年龄/性别、内容表现和合作特征发现合适的达人，结合近 30 天带货、内容、品类和受众数据建立清晰可比较的达人画像，并通过精选后的小范围建联快速验证合作假设；也可以随时查询当前店铺的样品申请、达人回复/聊天和邮件记录。Tiky 不是面向成千上万达人的海量群发工具。TikTok 操作通过 ScoreHub MCP 完成，TikTok API 凭证由 ScoreHub 托管，使用者无需配置。

## 支持市场

Tiky 当前覆盖 24 个国家市场：印度尼西亚（ID）、泰国（TH）、马来西亚（MY）、越南（VN）、菲律宾（PH）、新加坡（SG）、美国（US）、英国（GB）、德国（DE）、意大利（IT）、法国（FR）、西班牙（ES）、爱尔兰（IE）、波兰（PL）、捷克（CZ）、葡萄牙（PT）、比利时（BE）、荷兰（NL）、奥地利（AT）、希腊（GR）、匈牙利（HU）、日本（JP）、巴西（BR）和墨西哥（MX）。市场边界以 Agent 规范为准。

## 支持的客户端

- WorkBuddy

## 安装

### 官方市场（终端用户推荐）

Tiky 的官方发布渠道是 WorkBuddy 官方市场（开放平台上架）。终端用户只需要：

1. 安装并至少启动过一次 WorkBuddy
2. 在浏览器打开官方市场分享链接，唤起 WorkBuddy 安装 Tiky：

   [打开官方市场安装 Tiky](https://www.workbuddy.cn/work/launch/?expertname=ScoreHub%20Tiky&prompt=%E6%88%91%E6%83%B3%E4%BA%86%E8%A7%A3%20Tiky%20%E8%83%BD%E5%B8%AE%E5%8A%A9%E6%88%91%E5%81%9A%E4%BB%80%E4%B9%88&deeplink=workbuddy%3A%2F%2Ftask%3Faction%3Dstart%26expertId%3Dex_N3BAMfJWLgpz%26prompt%3D%E6%88%91%E6%83%B3%E4%BA%86%E8%A7%A3%20Tiky%20%E8%83%BD%E5%B8%AE%E5%8A%A9%E6%88%91%E5%81%9A%E4%BB%80%E4%B9%88&buddy_type=workbuddy)

3. 回到 WorkBuddy，打开 “ScoreHub Tiky” 对话

官方市场版使用已上架的「ScoreHub TikTok 达人营销」连接器。召唤 Tiky 时，WorkBuddy 会引导完成连接、ScoreHub 登录与店铺授权；已连接过的依赖不会重复引导。无需执行本地安装命令，也不需要手工编辑 `mcp.json`。

### npm 渠道（备用 / 预览 / 自测）

npm 包不再承担官方发布渠道，定位为辅助渠道，服务于三类场景：

- **预览**：某个版本尚未上架官方市场（或想提前试用新版）时，先把 npm 上的指定版本装进 WorkBuddy
- **备用**：官方市场不可用时的兜底安装途径
- **自测**：开发者在本仓库内验证未发布的改动

#### 从 npm 安装指定版本到 WorkBuddy

前提：已安装并至少启动过一次 WorkBuddy（安装器靠 `~/.workbuddy/` 识别客户端）。

```bash
npx -y @scorehub/creator-outreach@<版本号> bootstrap --dev --install
```

例如预览 `1.12.0`（该版本发布到 npm 后可用）：

```bash
npx -y @scorehub/creator-outreach@1.12.0 bootstrap --dev --install
```

这条命令会：

1. 自检 `@scorehub/mcp-server@latest` 后，把 `scorehub` MCP 配置原子合并到 `~/.workbuddy/mcp.json`
2. 把该版本的专家本体以「ScoreHub Tiky（本地自测）」身份注册进「我的专家」，全部技能 id 带 `-dev` 后缀

执行后**完全重启 WorkBuddy**，在 Agent 列表选择「ScoreHub Tiky（本地自测）」即可使用。注意事项：

- 该副本可与官方市场版共存：技能 id 已隔离，不会互相遮蔽；两者 agent 名相同，若发现行为串味，先停用市场版再复现。
- 换版本：用新的版本号重跑同一条命令并重启 WorkBuddy。
- 不再需要预览时：到 WorkBuddy 插件管理页停用或卸载「ScoreHub Tiky（本地自测）」。
- 预览副本的代码来源在安装时记录为对应版本的 npm 缓存目录；若该目录日后被清理，后续静默更新会回退为最新发布版代码。

#### npm 副本的首次会话

npm 渠道副本保留 bootstrap 门禁：每个新会话先执行 `npx -y @scorehub/creator-outreach@latest bootstrap --check --json`。未初始化时，Tiky 会说明需要安装 ScoreHub 本地组件，并等待你明确确认；确认后写入 MCP 配置并要求完全重启 WorkBuddy。这次确认同时授权后续静默更新 creator-outreach，不会对每个新版本重复询问。MCP 始终运行 `@scorehub/mcp-server@latest`，不固定具体版本。

#### 仅修复 MCP 配置（不安装专家本体）

```bash
npx -y @scorehub/creator-outreach
```

该命令只把 MCP 配置合并到 `~/.workbuddy/mcp.json`，不安装也不更新任何专家本体；未检测到 WorkBuddy 时会退出且不写入任何文件。

### 仓库内自测（开发者）

```bash
node packages/creator-outreach/install.js bootstrap --dev --install --json
```

与 npm 预览同一条通道，但代码来源记录为仓库根 —— 后续来自 npm 发布包的静默更新也只从该仓库取材，不会用发布版覆盖未发布的改动。`--dev` 每次都会重写版本化缓存，因此每次执行后都需要完全重启 WorkBuddy。安装细节、bootstrap 状态机与故障恢复见 [`docs/WORKBUDDY_PUBLIC_ONBOARDING.md`](./docs/WORKBUDDY_PUBLIC_ONBOARDING.md)。

## 两条交付通道

| | 官方市场通道（终端用户） | 本地通道（npm 预览 / 备用；仓库自测） |
|---|---|---|
| 来源 | 官方市场上架包，WorkBuddy 自动下载 | npm 发布包（预览 / 备用）或本仓库源码（自测） |
| 入口 | 官方市场分享链接（见上文） | `npx -y @scorehub/creator-outreach@<版本号> bootstrap --dev --install` |
| 市场 / 插件名 | `experts` / `tiktok-creator-outreach` | `my-experts` / `tiktok-creator-outreach-dev` |
| 显示名 | ScoreHub Tiky | ScoreHub Tiky（本地自测） |
| 技能 id | `tiktok-creator-search` 等 | 同上但统一带 `-dev` 后缀 |
| MCP 连接 | WorkBuddy 依赖引导卡片 | bootstrap 安装器写入 `~/.workbuddy/mcp.json` |

默认安装（不带 `--dev`）**只配置 MCP**，不会创建第二份专家；本地副本与市场版共存时靠 `-dev` 技能 id 隔离 —— `enabledPlugins` 开关拦不住加载，不要依赖它隔离两条通道。

## 首次使用与授权

- **官方市场版**：首次 TikTok 工具调用时会打开浏览器引导登录 ScoreHub。授权、重新授权或店铺切换成功后，Tiky 会依次确认当前登录账号、当前授权店铺、店铺所属国家和店铺关联品牌。
- **npm 渠道副本**：每个新对话的第一轮先检查 `uninitialized` / `restart_required` / `activation_required` / `ready` / `repair_required` 五个 bootstrap 状态，只有 `ready` 才直接进入能力介绍、账号/店铺切换或业务操作；`activation_required` 表示本地通道的加载位仍停在旧版本（重启无效），Tiky 会重跑 `bootstrap --update` 由安装器推进加载位。官方市场版没有 bootstrap 门禁，不会遇到这些状态。

Token 缓存在 `~/.scorehub/`，不会被 bootstrap 或升级清除。

如果提示当前店铺的 TikTok 授权已失效或异常，本地 ScoreHub 登录通常仍然有效。请先到 ScoreHub 重新绑定店铺，再重试；不要反复进行浏览器登录。

如果提示请求过于频繁或配额受限，请等待、分批重试或缩小操作范围。限流不需要重新登录。

## 快速开始

直接对 Tiky 说：

- 帮我搜索适合合作的 TikTok 达人，类目是美妆，GMV 在 1000-10000 美元区间
- 找 20 位美妆达人，粉丝 1万-10万，18-34 岁女性粉丝占比至少 60%，GMV 1K+，带货视频平均播放 5000+，快速增长的独立达人
- 分析这 10 个达人的带货表现，帮我打分排名
- 从排名前 5 位中选出最匹配的 3 位，选择一种利益前置 Offer，预览通知栏前 15 字后发起建联验证
- 分析我店铺上个月的联盟经营和商品表现
- 看看现在有哪些待审核的样品申请，哪些快到审核或发货截止时间
- 看看最近有哪些达人回复，打开这条回复并继续看已有聊天
- 查一下我最近的邮件，以及主动发信的成功和失败统计

## 故障排查

### 官方市场版：MCP 工具不可用、工具列表为空或连接已关闭

MCP 连接由 WorkBuddy 依赖引导卡片负责。请完全退出并重新打开 WorkBuddy 后重试；仍不可用时，确认 Tiky 已安装，并在连接器页面检查「ScoreHub TikTok 达人营销」是否已连接。

依赖恢复前，Tiky 不会编造达人名单或发送结果：她会交付一份包含能力状态、本轮未执行项、筛选与建联方案、恢复清单的方案文档，并标注所有数值来自你的条件或平台约束。连接恢复后可直接在下一轮按该计划续做。

### npm 渠道：找不到受支持的客户端

先安装并启动 WorkBuddy 一次，再执行 npm 渠道安装命令；安装器未检测到 `~/.workbuddy/` 时会退出且不写入任何文件。

### npm 渠道：bootstrap 提示需要修复或 Node.js 问题

如果错误明确提示找不到 Node.js、npm 或 npx，或 Node.js 版本低于 18，Tiky 会先说明诊断结论。经你确认后，它会使用 Node.js 官方 LTS 安装路径协助恢复，复检通过后提示你重启 WorkBuddy。该流程不会重新授权或修改 TikTok 凭证。其他修复场景按 Tiky 给出的可恢复原因处理。

## 相关链接

- MCP Server：[@scorehub/mcp-server](https://www.npmjs.com/package/@scorehub/mcp-server)
- 仓库：[ScoreHub-AI/creator-outreach](https://github.com/ScoreHub-AI/creator-outreach)
