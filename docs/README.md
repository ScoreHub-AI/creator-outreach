# creator-outreach — 产品与协作文档

> **实现状态**: 当前已实现 Agent 定义、WorkBuddy 插件清单、八个 Skill、Rank 分数契约与消息模板参考、`create_conversation` 建联链路、账号与店铺切换、搜索/评分的固定 Markdown 与 WorkBuddy HTML 输出能力，以及 WorkBuddy 开放平台上架素材包（`listing/` + `scripts/`）。当前进度详见 [ROADMAP.md](./ROADMAP.md)。

## 文档权威来源

`creator-outreach` 的文档按职责分层，避免多份行为规范并行演化：

- **Agent 权威规范**：[`../agents/tiktok-creator-outreach.md`](../agents/tiktok-creator-outreach.md)
  - 唯一的共享行为规范来源
  - 定义首轮引导与意图分流、授权与切换、统一错误分流、能力不可用时的交付契约、本地运行环境恢复、市场与配额边界
- **Skill 专项规则**：
  - [`../skills/tiktok-creator-search/SKILL.md`](../skills/tiktok-creator-search/SKILL.md)
  - [`../skills/tiktok-creator-analysis/SKILL.md`](../skills/tiktok-creator-analysis/SKILL.md)
  - [`../skills/tiktok-batch-outreach/SKILL.md`](../skills/tiktok-batch-outreach/SKILL.md)
  - [`../skills/tiktok-similar-creators/SKILL.md`](../skills/tiktok-similar-creators/SKILL.md)
  - [`../skills/tiktok-affiliate-analytics/SKILL.md`](../skills/tiktok-affiliate-analytics/SKILL.md)
  - [`../skills/scorehub-sample-lookup/SKILL.md`](../skills/scorehub-sample-lookup/SKILL.md)
  - [`../skills/scorehub-creator-message-lookup/SKILL.md`](../skills/scorehub-creator-message-lookup/SKILL.md)
  - [`../skills/scorehub-email-lookup/SKILL.md`](../skills/scorehub-email-lookup/SKILL.md)
  - 各自领域特有的触发条件、输入输出契约和关键陷阱的权威来源
- **Reference 细节规则**：
  - 搜索筛选字段、自然语言映射、取值范围与互斥关系以 [`../skills/tiktok-creator-search/references/creator-search-filters.md`](../skills/tiktok-creator-search/references/creator-search-filters.md) 为准
  - Rank 分数来源、排名顺序、分数缺失和展示边界以 [`../skills/tiktok-creator-analysis/references/scoring-model.md`](../skills/tiktok-creator-analysis/references/scoring-model.md) 为准
  - 话术正文、轮换和变量以 [`../skills/tiktok-batch-outreach/references/message-templates.md`](../skills/tiktok-batch-outreach/references/message-templates.md) 为准
  - 申样、回复/聊天、邮件字段以三个随手查 Skill 的 `references/tools-and-fields.md` 为准；跨组公共契约、编号关系与 T12/T14/T39 支撑见 [`../agents/references/quick-lookup/`](../agents/references/quick-lookup/) 和 [`../agents/tiktok-creator-outreach.lookup-additions.md`](../agents/tiktok-creator-outreach.lookup-additions.md)
  - Reference 中明文规则与参考实现冲突时，以明文规则为准
- **包级 README**：
  - [`../README.md`](../README.md)
  - [`../README.en.md`](../README.en.md)
  - 面向终端用户的安装、首次使用和故障排查说明
- **公开发布与渠道口径**：
  - [`./WORKBUDDY_PUBLIC_ONBOARDING.md`](./WORKBUDDY_PUBLIC_ONBOARDING.md)
  - 官方市场入口（终端用户主渠道）与 npm 备用 / 预览 / 自测安装、bootstrap 状态机、Tiky 自升级、`mcp-server` 引导和环境恢复口径
- **开放平台上架素材与交付口径**：
  - [`../listing/README.md`](../listing/README.md) 是随上架 zip 分发的产品摘要，不含本地安装命令
  - [`./MARKETPLACE_DELIVERY.md`](./MARKETPLACE_DELIVERY.md) 是专家市场连接器依赖、打包校验与 npm 自测通道隔离的权威说明
  - [`../scripts/`](../scripts) 负责生成上架版 Agent 正文与打包；跨包提审流程与基线以顶层 [`../../../docs/WORKBUDDY_OPEN_PLATFORM_LISTING.md`](../../../docs/WORKBUDDY_OPEN_PLATFORM_LISTING.md) 为准

若不同文档表述不一致，共享行为以 Agent 为准，领域专项行为以对应 Skill 为准，字段、边界和模板细节以对应 Reference 为准。

## 产品定位

Tiky 是 ScoreHub AI 面向 TikTok Shop 卖家的达人营销专家。其核心交付不是海量群发，而是：

1. 搜索合适达人
2. 建立清晰可比较的达人画像
3. 对精选候选人做小范围建联验证

因此，`creator-outreach` 的职责是定义智能体的对话行为、Skill 入口和展示契约，而不是实现 TikTok API 或持久化业务系统。

## 包内职责

本包主要包含以下内容：

- **Agent 定义**：智能体身份、首轮欢迎语、工具使用边界和统一行为规则
- **Skills**：搜索、评分、建联、相似达人、数据分析，以及样品申请、达人回复/聊天、邮件查询八个能力入口及各自专项契约
- **依赖未就绪时的交付**：Agent 定义四段交付结构与禁止虚构数值的边界，搜索 / 建联 Skill 各自声明本领域的离线可交付项；建联 Skill 另维护「明确免确认豁免」与「离线交付单一 Offer 候选」两条口径，唯一权威来源为 [`../skills/tiktok-batch-outreach/SKILL.md`](../skills/tiktok-batch-outreach/SKILL.md)。开放平台质检归因与复评沟通口径见 [`../../../docs/WORKBUDDY_QC_REVIEW_1_12_4.md`](../../../docs/WORKBUDDY_QC_REVIEW_1_12_4.md)。
- **插件元数据**：WorkBuddy 插件清单、展示名、头像、快捷入口
- **安装器**：默认只写入 `@scorehub/mcp-server` 的 MCP 配置；`bootstrap --dev` 时额外把专家副本写入 WorkBuddy 本地通道（npm 预览 / 备用 / 仓库自测）
- **npm 渠道引导**：npm 副本在每个新会话强制执行 bootstrap 状态门禁，首次确认后预拉取并自检 `mcp-server@latest`，后续静默更新 creator-outreach，并仅在明确证据下恢复 Node.js LTS；官方市场版无此门禁（MCP 由平台依赖引导卡片负责）
- **开放平台上架素材**：上架版 Agent 正文（剥离 npm 渠道 bootstrap 门禁，由脚本从权威正文生成）、市场连接器依赖声明、随包产品摘要 README，以及字段校验与纯净打包脚本
- **测试**：校验品牌、安装行为以及关键规范是否仍由正确文档承载

本包不承担以下职责：

- 不直接调用 TikTok API
- 不保存消息、回复或运营数据
- 不实现消息监听、A/B 回复率追踪或导出
- 不提供定时或跨时区建联调度
- 不提供绕过 ScoreHub MCP 获取真实达人数据的直连降级路径；依赖未就绪时只交付离线方案，不产出达人数据
- 不审批/拒绝样品申请、不寄样、不发信/回复、不建合作、不导出或写同步；查询中的刷新、标读、补存等附带动作按对应 Skill 说明

## 能力概览

### 达人搜索

- 通过 `search_creators` 搜索达人
- 支持类目、商业表现、粉丝受众、内容表现与合作特征的精细画像筛选
- 类目 ID 与名称来自当前授权店铺的 v2 类目树，名称直接使用店铺当地语言
- 支持类目解析、闭环校验、分页与 60 人会话上限
- 类目或 GMV 存在多个有效选项时，通过 WorkBuddy `AskUserQuestion` 完成多选确认
- 在 WorkBuddy 中，搜索结果达到阈值时生成 HTML 报告

### 达人分析

- 通过 `creator_performance` 获取近 30 天表现数据
- 一个或多个达人都直接使用 Rank 返回的候选分数和排名，不在 Agent 内重新计算
- 多达人报告提供目标优先的推荐结论、榜单短理由与详情证据链，并如实呈现风险和数据缺口
- 单达人评分请求同样展示 Rank 的绝对分数，并输出画像、合作判断与建议；不生成额外的相对综合分

### 小范围建联验证

- 先 `create_conversation`，后 `send_message`
- 仅用于精选候选人验证，不承诺海量群发
- 支持利益前置 Offer 预设、可编辑默认值、通知栏前 15 字预览、速率控制和发送结果汇报

### 随手查：样品申请、达人回复与邮件

- 样品申请：清单、指定申请详情、CRM 关联合作/寄样、同步状态；仅在用户明确要求时刷新
- 达人回复：本人回复通知、单条通知详情和已有聊天；按真实任务关系衔接私信任务查询
- 邮件：本人邮箱收发清单、单封正文、主动发信统计；按需用 T39 定位成员，不把成员 ID 直接当邮件目标
- 查询为主，不审批、不寄样、不发信、不建合作；打开通知/收件、刷新申请、聊天补存和成员维护等附带行为按 Skill 说明

以上能力的具体行为细节不在本文件重复展开，统一以 Agent 和对应 Skill 为准。

## 技术架构与依赖

```text
WorkBuddy (Agent Host)
    │
    ▼
creator-outreach (Agent + Skills + Plugin)
    │ MCP
    ▼
@scorehub/mcp-server
    │ Streamable HTTP
    ▼
mcp-remote
    │ @scorehub/tiktok-sdk
    ▼
TikTok Shop Partner API
```

依赖关系说明：

- `creator-outreach` 依赖 `mcp-server` 提供本地 MCP 工具注册和 OAuth 入口
- `mcp-server` 再通过 Streamable HTTP 调用 `mcp-remote`
- `mcp-remote` 负责与 TikTok Shop Partner API 交互
- TikTok 凭证与店铺授权均由 ScoreHub 远端托管

跨包设计与依赖链详见 [../../../docs/ARCHITECTURE.md](../../../docs/ARCHITECTURE.md)。

## 当前范围与暂不做

当前已稳定支持：

- 达人搜索与结果展示契约
- 达人评分与 HTML/Markdown 报告契约
- 相似达人推荐与外部双达人相似度评分契约
- 账号切换、店铺切换和授权确认提示
- 小范围建联验证
- 样品申请、达人回复/聊天与邮件查询

仍在开发：

- 配额感知
- 竞品达人搜索

当前明确不做：

- 消息监听
- A/B 回复率追踪
- 导出功能

## 维护约束

- 修改智能体通用行为时，只改 Agent 权威规范，并同步调整引用它的测试
- 修改某个能力的专属规则时，只改对应 Skill
- 修改 Rank 分数映射、字段边界或话术模板时，只改对应 Reference；Skill 只在引用关系或对外能力变化时同步更新
- 修改安装、首次使用或故障排查口径时，更新包级 README
- 修改上架版 Agent 行为时，改 `scripts/build-platform-agent.py` 的锚点替换对，不要手工维护第二份正文；字段合规与打包清单变更以顶层上架方案文档为准
- 新增开发主题时，先更新本包 [ROADMAP.md](./ROADMAP.md)，完成后再同步顶层 `docs/ROADMAP.md`
