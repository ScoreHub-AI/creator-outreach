# Rank 分数与达人分析契约

本 Reference 记录 `creator-outreach` 消费的 Rank 公共结果边界。Rank 服务负责综合评分、候选可用性分组和最终顺序；本包不再维护或执行旧版五维本地评分公式。

## 分数来源

分析调用 `rank_creators` 后，只消费响应中的：

- `ranking.ranked[].creator_open_id`
- `ranking.ranked[].input_index`
- `ranking.ranked[].rank`
- `ranking.ranked[].score`

`score` 是 `mcp-remote` 从 Rank 响应提取并归一为 JSON number 的候选综合分。客户端优先读取 Rank 候选的顶层 `score`；兼容 Rank 1.0 响应时读取 `model_output.strategy_score`。`model_output` 中的模型配置、策略标识、权重和其他字段不是公共契约，不得展示或推断。

分数保持 Rank 的原始数值含义：不自行归一化、取整、乘除比例或追加 `/100`。如果 Rank 使用的量纲或范围未在响应中说明，只显示数值，不为它添加标签或解释。

## 顺序与候选状态

- `ranked` 必须严格按 Rank 返回的顺序展示，`rank` 只用于显示，不得用 Performance 数据重排。
- `undisclosed` 表示数据未披露，展示 `missing_fields`，不填 0 分。
- `source_failed` 表示上游数据获取失败，展示安全的 `reason_code` 和可重试状态，不填 0 分。
- `invalid` 表示候选数据不符合 Rank 契约，展示安全的 `issues`，不得在本地修正后继续评分。
- 每位候选只能出现在四类结果之一；展示前核对 `summary.input_count` 等于四类数组长度之和。

## 分析流程

1. 用户请求评分时，无论确认 1 位还是任意数量达人，都调用 `rank_creators`，直接使用 Rank 的 `rank` 和 `score`；工具只拒绝空列表，不设本地人数上限。
2. 用户只请求事实画像而未请求评分时，才单独调用 `creator_performance`，并且不生成 Rank 分数。
3. Rank 返回 `ranking: null`、缺少有效分数或请求级失败时，只展示同一响应中的 Performance 事实和数据缺口，说明当前无法统一排名。
4. 禁止用 `creator_performance` 替代同一批候选的 Rank 评分，禁止恢复旧版五维公式、标签阈值或百分位结论。

## 推荐结论与理由

推荐结论不是 Rank 服务之外的第二套评分。只能结合 Rank 排名/分数、用户明确目标、Performance 原始指标和已标注的数据缺口给出：

- 不得因未知的分数范围自行设定“高分/低分”阈值。
- 不得把排名靠后直接解释为能力不合格；需要引用可验证的目标不匹配或数据缺口。
- 不得根据昵称、简介或常识补写内容风格、合作历史或转化表现。
- 榜单短理由只引用一至两项实际证据；没有足够证据时说明数据不足。
