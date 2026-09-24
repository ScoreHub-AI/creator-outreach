# 分析工具参数与响应 Reference

本文件是 Skill 调用时的字段索引。日期解析、店铺选择和执行顺序遵循 [SKILL.md](../SKILL.md)，业务问题见 [分析范围](./analysis-scope-and-questions.md)。工具 schema 是可调用参数的依据。

## 参数

所有工具包含必填 `start_date`、`end_date`（YYYY-MM-DD 字符串）。店铺 ID 保持数值字符串，只使用准入结果；`shop_ids` 为 1–20 个不重复 ID，`product_ids` 为 1–100 个不重复、非空 ID。

| 工具（均加 mcp__scorehub__ 前缀） | 额外参数 | 返回内容 |
|---|---|---|
| `get_analytics_readiness` | 无 | 账号店铺授权、映射、同步状态与 `analyzable` |
| `analyze_shop_overview` | 必填 `shop_ids` | 总览、比较、趋势和风险信号 |
| `analyze_affiliate_contribution` | 必填 `shop_ids`，可选 `product_ids` | 联盟贡献及全店渠道结构 |
| `analyze_product_performance` | 必填 `shop_ids` | 全店商品 GMV、销量、退款金额、退款率各 Top5 |
| `analyze_product_affiliate_orders` | 必填 `shop_ids`、`product_ids` | 指定商品联盟订单结果 |
| `analyze_product_top_creators` | 必填 `shop_id`、`product_id`，可选 `top_n`（默认 5，整数 1–50） | 单店单商品历史 TOPN |
| `creator_performance` | `creator_user_id`，值为可靠映射的 `creator_open_id` | 当前选中店铺上下文中的官方画像 |

商品筛选只影响联盟贡献部分；同次返回的店铺结构仍是全店数据。商品表现工具不接受商品过滤，榜外商品不能判为零销售。不同店铺分别展示，原币不可跨币种混加。

## 准入结果

MCP 成功信封为 `{ok:true,data}`。准入的 `data` 包含：

- `date_range`：实际校验的日期范围；
- `shops[]`：`name`、`market`、`country`、`selected`、`authorization_status`、`mapping_status`、`sync_status`、`analyzable`，映射成功时包含 `shop_id`，不可分析时含 `reason`；
- `summary`：账号店铺数、可分析和不可分析店铺数。

同步与授权由远端强制校验，每次业务调用都会重查，不要求模型推断原始任务状态。

## 业务结果

业务 `data` 为 `{date_range, availability, shops}`。每店包含 `shop_id`、`market`、`availability`、`results`、`errors`。

`results` 的模块键为 `shop_overview`、`shop_overview_insight`、`affiliate_effect`、`shop_structure`、`product_analysis`、`product_affiliate_orders` 或 `product_top_creators`；每项保留后端 `{code,description,data}`。`availability=available/partial/unavailable` 仅表示请求是否有成功结果，不代表数据完整度。

必须继续检查后端 `data` 内的业务状态、null、币种与覆盖率。状态／覆盖率缺失时保持未知，不能由 HTTP 成功推断完整；解释见 [业务规则](./business-rules.md)。全部失败时 MCP 返回 `{ok:false,error_type,user_message,retryable,upstream}`；`upstream.shops` 可保留逐店原因，共享错误分流遵循 Agent。
