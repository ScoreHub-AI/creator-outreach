# creator-outreach — 开发计划

## 已完成

- [x] Agent 定义 (`agents/tiktok-creator-outreach.md`) — 灵魂/身份/能力/原则/标准工作流
- [x] 调用方式定义 (MCP 优先 + 直接 API 降级)
- [x] 插件清单 (`.codebuddy-plugin/plugin.json`) — expert 元数据 + agent/skills 引用 + quickPrompts
- [x] **Skills 文件完善**: 三个 Skill 的 SKILL.md 已迁移并改为 MCP 工具调用
  - [x] `tiktok-creator-search` — 调用 `search_creators`，透传 `creator_open_id`
  - [x] `tiktok-creator-analysis` — 调用 `creator_performance` + 评分模型
  - [x] `tiktok-batch-outreach` — 两步建联：`create_conversation` → `send_message`
- [x] **评分模型（口径文档）**: 100 分制公式 + 标签体系 + MCP 字段映射说明
  (`skills/tiktok-creator-analysis/references/scoring-model.md`)
- [x] **评分模型对接 MCP 数据**: `creator_performance` 直接透传 TikTok 原始字段，scoring-model.md 已更新为优先使用完整公式，降级策略兜底
- [x] **消息模板**: 3 套话术 A/B/C + 变量替换 (`skills/tiktok-batch-outreach/references/message-templates.md`)

## 待开发

### 高优先级

（当前无高优先级待开发任务）

### 中优先级

- [ ] **配额感知**: 每次操作前检查日配额剩余（10,000/天），超限时提示等待
- [ ] **竞品达人搜索**: 输入竞品品牌名（或 hashtag，如 `#lululemon`），搜索有该竞品合作记录的达人，结合评分模型筛选出高潜力名单
  - 复用现有 `search_creators`（keyword 传入品牌名/hashtag）
  - 复用 `tiktok-creator-analysis` Skill 进行评分
  - 注意：hashtag 搜索为 TikTok 未文档化行为，API 行为可能变更
- [ ] **达人列表展示优化**: 搜索结果统一表格化输出（已在 skill 约定，待实际验证）

### 低优先级

- [ ] **A/B 测试建联话术**: 多套模板随机分配，追踪回复率最优话术
- [ ] **达人推荐引擎**: 基于历史合作数据自动推荐最适合的达人
- [ ] **多店铺切换**: 支持卖家在多个绑定店铺间切换操作
- [ ] **导出功能**: 搜索结果导出为 CSV/Excel

## 暂不做

- **消息监听（达人回复接收/分类/状态机）**: TikTok 无 GET 轮询，接收依赖 Webhook (Type 33)，
  且需消息落库；本包无数据库、禁止数据修改，暂不纳入本包范围。

## 跨包依赖

- **`create_conversation` MCP 工具**（批量建联前置）已沿依赖链补齐：
  sdk (`createConversation`) → mcp-remote (`/mcp/tools/create-conversation`) → mcp-server (`create_conversation` 映射)。
- 评分模型完整取数依赖 sdk 侧 `creator_performance` 返回字段的进一步补齐。
