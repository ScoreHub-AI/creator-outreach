# creator-outreach — 产品与协作文档

> **实现状态**: 当前已实现 Agent 定义、WorkBuddy 插件清单、三个 Skill、评分模型与消息模板参考、`create_conversation` 建联链路、账号与店铺切换，以及搜索/评分的固定 Markdown 与 WorkBuddy HTML 输出能力。当前进度详见 [ROADMAP.md](./ROADMAP.md)。

## 文档权威来源

`creator-outreach` 的文档按职责分层，避免多份行为规范并行演化：

- **Agent 权威规范**：[`../agents/tiktok-creator-outreach.md`](../agents/tiktok-creator-outreach.md)
  - 唯一的共享行为规范来源
  - 定义首轮引导、授权与切换、统一错误分流、本地运行环境恢复、市场与配额边界
- **Skill 专项规则**：
  - [`../skills/tiktok-creator-search/SKILL.md`](../skills/tiktok-creator-search/SKILL.md)
  - [`../skills/tiktok-creator-analysis/SKILL.md`](../skills/tiktok-creator-analysis/SKILL.md)
  - [`../skills/tiktok-batch-outreach/SKILL.md`](../skills/tiktok-batch-outreach/SKILL.md)
  - 各自领域特有的触发条件、输入输出契约和关键陷阱的权威来源
- **Reference 细节规则**：
  - 搜索筛选字段、自然语言映射、取值范围与互斥关系以 [`../skills/tiktok-creator-search/references/creator-search-filters.md`](../skills/tiktok-creator-search/references/creator-search-filters.md) 为准
  - 评分公式、权重、字段映射与标签以 [`../skills/tiktok-creator-analysis/references/scoring-model.md`](../skills/tiktok-creator-analysis/references/scoring-model.md) 为准
  - 话术正文、轮换和变量以 [`../skills/tiktok-batch-outreach/references/message-templates.md`](../skills/tiktok-batch-outreach/references/message-templates.md) 为准
  - Reference 中明文规则与参考实现冲突时，以明文规则为准
- **包级 README**：
  - [`../README.md`](../README.md)
  - [`../README.en.md`](../README.en.md)
  - 面向终端用户的安装、首次使用和故障排查说明
- **公开发布与自助安装说明**：
  - [`./WORKBUDDY_PUBLIC_ONBOARDING.md`](./WORKBUDDY_PUBLIC_ONBOARDING.md)
  - 面向终端用户的分享链接首装、Tiky 自升级、`mcp-server` 引导和环境恢复口径

若不同文档表述不一致，共享行为以 Agent 为准，领域专项行为以对应 Skill 为准，公式、字段和模板细节以对应 Reference 为准。

## 产品定位

Tiky 是 ScoreHub AI 面向 TikTok Shop 卖家的达人营销专家。其核心交付不是海量群发，而是：

1. 搜索合适达人
2. 建立清晰可比较的达人画像
3. 对精选候选人做小范围建联验证

因此，`creator-outreach` 的职责是定义智能体的对话行为、Skill 入口和展示契约，而不是实现 TikTok API 或持久化业务系统。

## 包内职责

本包主要包含以下内容：

- **Agent 定义**：智能体身份、首轮欢迎语、工具使用边界和统一行为规则
- **Skills**：搜索、评分、建联三个能力入口及各自专项契约
- **插件元数据**：WorkBuddy 插件清单、展示名、头像、快捷入口
- **安装器**：将插件复制到 WorkBuddy，并写入 `@scorehub/mcp-server` 的 MCP 配置
- **公开版引导**：在 WorkBuddy 每个新会话强制执行 bootstrap 状态门禁，首次确认后预拉取并自检 `mcp-server@latest`，后续静默更新 creator-outreach，并仅在明确证据下恢复 Node.js LTS
- **测试**：校验品牌、安装行为以及关键规范是否仍由正确文档承载

本包不承担以下职责：

- 不直接调用 TikTok API
- 不保存消息、回复或运营数据
- 不实现消息监听、A/B 回复率追踪或导出
- 不提供定时或跨时区建联调度
- 不提供绕过 ScoreHub MCP 的直连降级路径

## 能力概览

### 达人搜索

- 通过 `search_creators` 搜索达人
- 支持类目、商业表现、粉丝受众、内容表现与合作特征的精细画像筛选
- 类目 ID 与名称来自当前授权店铺的 SEA v2 类目树，名称直接使用店铺当地语言
- 支持类目解析、闭环校验、分页与 60 人会话上限
- 类目或 GMV 存在多个有效选项时，通过 WorkBuddy `AskUserQuestion` 完成多选确认
- 在 WorkBuddy 中，搜索结果达到阈值时生成 HTML 报告

### 达人分析

- 通过 `creator_performance` 获取近 30 天表现数据
- 基于评分模型做候选集内相对评分
- 单达人只输出画像与建议，不输出误导性的相对综合分

### 小范围建联验证

- 先 `create_conversation`，后 `send_message`
- 仅用于精选候选人验证，不承诺海量群发
- 支持利益前置 Offer 预设、可编辑默认值、通知栏前 15 字预览、速率控制和发送结果汇报

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
- 账号切换、店铺切换和授权确认提示
- 小范围建联验证

仍在开发：

- 配额感知
- 竞品达人搜索
- 相似达人推荐

当前明确不做：

- 消息监听
- A/B 回复率追踪
- 导出功能

## 维护约束

- 修改智能体通用行为时，只改 Agent 权威规范，并同步调整引用它的测试
- 修改某个能力的专属规则时，只改对应 Skill
- 修改评分公式、字段映射或话术模板时，只改对应 Reference；Skill 只在引用关系或对外能力变化时同步更新
- 修改安装、首次使用或故障排查口径时，更新包级 README
- 新增开发主题时，先更新本包 [ROADMAP.md](./ROADMAP.md)，完成后再同步顶层 `docs/ROADMAP.md`
