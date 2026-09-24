---
name: tiktok-affiliate-analytics
description: 分析已授权且已完成数据同步的 TikTok Shop 店铺联盟经营数据，覆盖店铺、联盟、商品、有效联盟订单和商品 TOPN 出单达人画像。用于店铺经营分析、商品联盟结果、商品出单达人贡献和趋势/风险诊断请求。
---

# TikTok Affiliate Analytics — 联盟经营数据分析（WorkBuddy 版）

本 Skill 负责一期 Tiky 数据分析五个核心场景的意图识别、准入校验、场景编排、只读工具调用和结果交付。各场景的目标、业务问题、来源和主动分析边界以 [业务问题索引](./references/analysis-scope-and-questions.md) 为入口；指标公式、字段映射、关联键和输出边界以本包 References 为准；本文件不复制 SQL 或完整指标字典。工具名沿用 WorkBuddy 中的 `mcp__scorehub__*` 命名空间。

## 一期范围

支持以下场景：

1. 店铺经营总览与趋势诊断；
2. 联盟经营贡献与渠道结构；
3. 商品整体经营表现与风险；
4. 商品联盟订单结果；
5. 商品 TOPN 出单达人画像。

商品—内容—订单效果、履约结果弱点、售后与订单质量，以及独立订单分析和独立内容分析暂不作为本 Skill 的完整场景；用户明确询问时按 `business-rules.md` 的范围外回复策略处理。

## 触发条件

- “分析店铺整体经营/经营情况/整体趋势”；
- “分析联盟销售额、联盟销量、有效联盟订单或渠道结构”；
- “分析商品表现、商品榜单或商品风险”；
- “查看商品联盟订单结果或订单趋势”；
- “找出某商品 TOPN 出单达人、达人贡献或历史画像”。

用户明确指定商品或达人时，以指定对象为主，不强制展示店铺经营基线；达人结果必须能可靠定位到本店商品订单、TOPN 或其他已有历史关联，不能把官方整体画像单独当作本店结果，一期不宣称支持独立、全量达人分析。用户明确指定订单或内容时，一期仅在已有可靠关联事实范围内提供，不宣称独立订单/内容专题已实现；超出范围时按 `business-rules.md` 回复。用户未指定对象且可以安全推断为店铺整体时，进入店铺整体场景；存在多个合理解释时先澄清。

## 执行流程

### 1. 分析准入（只读）

共享连接、授权与限流处理遵循 Agent。分析按以下流程执行：

1. 调用 `mcp__scorehub__status` 检查本地连接和账号登录状态，未登录时按 Agent 的授权流程处理；
2. 按单日/单月规则解析最终 `start_date`、`end_date`；
3. 调用 `mcp__scorehub__get_analytics_readiness` 查询账号店铺凭证、数值 ID 映射和指定日期同步状态；
4. 列出可分析店铺和不可分析店铺原因；
5. 账号下存在多个可分析店铺且用户未指定时，用 WorkBuddy `AskUserQuestion` 让用户选择一个或多个；只有一个可分析店铺时直接继续；
6. 只把准入工具返回 `analyzable=true` 的数值 `shop_id` 传给后续业务分析工具。

数据分析不依赖 Tiky 达人能力中的当前选中店铺。数值 `shop_id` 默认不面向用户展示，也不得从店铺名、ScoreHub UUID 或 `shop_code` 猜测/回退。同步状态只读消费经营驾驶舱的查询结果；不得在本 Skill 中发起同步写入或修改数据库。

### 2. 日期与对象解析

- 指定某一天：`start_date = end_date = 指定日期`；
- 指定过去月份：使用该月第一天至最后一天；
- 指定本月且当前日期大于 4 号：使用本月第一天至当前日期前 4 天；当前日期为 1–4 号时提示本月尚无可分析日期；
- 未指定日期：当前日期大于 4 号时默认本月第一天至当前日期前 4 天，当前日期为 1–4 号时默认上一个完整自然月；
- 明确给出的同月子区间可按原范围使用；未来月份、晚于当前日期前 4 天的范围或跨自然月范围，提示用户调整，不静默截断、拆分或合并；
- 日期截止按分析服务业务时区计算，默认 `Asia/Shanghai`；服务拒绝日期时让用户调整，不尝试绕过；
- 校验 `start_date <= end_date` 后通过准入工具检查同步日期覆盖，再识别主分析对象、关联对象和用户问题。

### 3. 场景执行

使用固定只读 MCP 工具，禁止让模型自由拼接 SQL 或直接调用分析服务。调用顺序由场景决定：

- 店铺整体：依次调用 `mcp__scorehub__analyze_shop_overview`、`mcp__scorehub__analyze_affiliate_contribution`、`mcp__scorehub__analyze_product_performance`；再按数据证据判断是否检查商品联盟订单结果和商品 TOPN 出单达人画像；
- 商品：调用 `mcp__scorehub__analyze_product_performance`、`mcp__scorehub__analyze_product_affiliate_orders`；发现达人贡献突出或订单集中时调用 `mcp__scorehub__analyze_product_top_creators`；
- 联盟/订单结果：调用 `mcp__scorehub__analyze_affiliate_contribution` 或 `mcp__scorehub__analyze_product_affiliate_orders`；
- 达人：仅在可可靠定位到本店商品订单、商品 TOPN 出单达人画像或其他已有历史关联时取得本店历史结果；无法定位关联范围时按范围外策略处理；
- 订单/内容：一期只读取已实现关联中的事实证据，不单独执行尚未冻结的订单或内容专题；
- 商品 TOPN 出单达人画像：调用 `mcp__scorehub__analyze_product_top_creators` 取得本店历史排名；仅对可靠映射且属于当前 OAuth 选中店铺的 `creator_open_id` 调用 `mcp__scorehub__creator_performance` 补充官方画像。

具体参数和返回结构见 [工具契约](./references/scenario-routing.md)。商品名称不能直接当作 ID；只有唯一可靠匹配到返回的商品 ID 时才继续，否则澄清。`analyze_product_performance` 仅返回全店各项 Top5 榜单，不能传 `product_ids`；指定商品不在榜内时，其整体指标未知，可继续查询该商品联盟订单与出单达人，不用其他商品替代。

### 4. 证据检查与输出

调用成功后检查样本量、金额覆盖率、达人 ID 映射率、关联覆盖率和数据状态。按 [报告结构](./references/analysis-output-schema.md) 交付，结论强度和业务状态解释遵循 [业务规则](./references/business-rules.md)。分析执行与结果展示分离，只展示与问题相关且有证据支持的结果。

如补充官方画像，先读取 [官方字段说明](./references/creator-performance-fields.md)，保留本店历史排名，不调用 Rank 改排。

## 工具调用约束

- 所有数据查询必须是固定、参数化、只读的分析工具；
- 店铺参数必须来自准入阶段用户选择的店铺集合；
- 所有日期参数必须经过单日/单月、非跨月和前 4 天边界校验；
- 店铺、日期或主对象变化后必须重新执行准入；范围均未变化的后续追问可复用本对话已有结果，只补充当前问题需要的工具；
- 官方达人画像只对可靠映射 `creator_open_id` 的 TOPN 达人调用；
- 工具失败时保留其他成功结果，按 `business-rules.md` 映射为用户可理解的降级说明；
- 不执行数据库写入、同步启动、建联、发消息、审核样品或修改业务规则。

## 后续专题与超出范围

商品—内容—订单效果、履约结果弱点、售后与订单质量尚未作为一期完整能力实现。已有数据但关联不足时可输出部分事实并标注覆盖范围；完全超出当前能力时明确不支持，不用相近但口径不同的指标冒充。订单和内容可作为一期商品、达人或店铺分析的关联对象，但不因此宣称独立订单/内容分析已实现。

## References

- [运行时分析范围与业务问题](./references/analysis-scope-and-questions.md)
- [指标定义](./references/metric-definitions.md)
- [数据关联与归因](./references/data-join-and-attribution.md)
- [场景路由](./references/scenario-routing.md)
- [输出结构与规则边界](./references/analysis-output-schema.md)
- [业务规则](./references/business-rules.md)
- [官方达人表现字段](./references/creator-performance-fields.md)
