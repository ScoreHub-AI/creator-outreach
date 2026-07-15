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
- [x] **Get Categories 集成**: Agent 提示词 + Skill 文档新增 `get_categories` 工具和两步解析工作流（品类名 → 类目 ID → 达人搜索），`category` 参数格式文档化，移除硬编码类目 ID
- [x] **类目过滤失效修正（bugfix）**: Agent + Skill 文档修正——核心是「达人搜索的 `category` 只认父类目 + 直接下一级子类目」这一版本无关的层级约束（禁用深层叶子），`category_version` 跟随区域（SEA/US/EU 用 v2），并新增"搜索后 `category_ids` 闭环校验"（零重叠即判定过滤静默失效、回退到父类目重搜），根治"中文类目树 ID 与搜索返回 category_ids 对不上"问题
- [x] **MCP 生产域名迁移**: 安装脚本写入的默认 `SCOREHUB_REMOTE_MCP_URL` 切换到 `https://app.scorehub.cn/mcp`（2026-07-15）
- [x] **店铺重新绑定提示**: 当 TikTok 店铺授权失效、撤销、过期或不匹配时，Agent/Skill/README 统一只用自然语言提示用户去 ScoreHub 重新绑定店铺，不展示错误码，也不误导用户重复执行本地 OAuth（2026-07-15）
- [x] **限流场景禁止引导重新授权**: 当请求过于频繁、持续限流或配额受限时，Agent/Skill/README 统一只提示用户耐心等待、分批重试或缩小范围；不得建议“重新授权拿一个干净的 token”，也不得主动引导浏览器重新授权，除非用户自己明确要求（2026-07-15）
- [x] **结构化错误类型驱动提示**: Agent/Skill 基于 `error_type` 而不是自然语言错误文本做分流：`oauth_invalid` 允许引导登录、`shop_auth_invalid` 提示重新绑定店铺、`rate_limited` / `quota_exhausted` 只提示等待、`invalid_input` 只提示修正请求（2026-07-15）
- [x] **版本号升级与发布元数据同步**: 为本轮店铺重新绑定 / 限流提示 / 结构化错误提示修复提升对外包版本号，并同步发布元数据（2026-07-15）

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
