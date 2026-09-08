# 相似达人推荐模型

本文件是相似度评分模型的唯一权威 Reference。`tiktok-similar-creators` Skill 和 Agent 只做引用摘要，不重复展开。

## 一、外部评分与两阶段流程

外部双达人相似度服务是 `find_similar_creators` 的唯一评分来源，接口字段和错误契约见仓库顶层的 [达人相似度服务调用说明](../../../../../creator-similarity-api.md)。调用 `POST /v1/creator-similarities` 时，目标达人和候选达人均使用 TikTok Performance 返回的 `data.creator` 对象。

- 外部服务返回的 `similarity_score`（0–100）在 MCP 层归一化为 0–1 后再展示。
- 外部服务为每个评分结果返回 `confidence`；它是数据覆盖置信度，不是相似度，低置信度结果必须标明数据不足，不能仅按分数解读。
- 外部结果是最终排序唯一依据，不与其他评分方法平均或加权混合。
- 服务未配置、调用失败或响应不符合契约时返回结构化错误，不返回替代评分结果。

召回和候选预算仍由 `find_similar_creators` 负责：三路召回合并去重后最多保留 24 位，默认最多对 12 位候选获取 Performance 并送入评分服务。粗排只用于控制 TikTok Performance 调用量，不作为最终对外分数。

| 阶段 | 数据源 | API 调用 | 维度 | 用途 |
|------|--------|---------|------|------|
| 粗排 | `searchCreators` 返回字段 | 0 | 品类 + 粉丝量 | 从候选池（≤24）筛出 Top-K 进入精排 |
| 精排 | `getCreatorPerformance` + 外部相似度服务 | TikTok ≤12 + 服务 1 次 | 以服务返回的分数和 breakdown 为准 | 排序取 Top-N 返回 |

粗排 Top-K 计算：`K = min(ceil(top_n × 1.5), 12)`。

## 二、召回字段约束

`search_creators` 的 `category` 参数只接受**顶层类目 ID**（`parent_id == "0"`），描述明文「禁止传更深层 ID」。
- **召回用**：目标达人的 `category_gmv_distribution[].category_id`（顶级父类目 ID，与 `get_categories` 顶层 `id` 同级）。
- **候选粗排与展示标签用**：目标与候选的 `category_ids`（叶子 ID）做 Jaccard；该值不作为最终相似度。
- **禁止混用**：不可将叶子 `category_ids` 传入 `searchCreators` 的 `parent_category_id`，否则被搜索接口静默忽略，返回无关达人。

## 三、3 路召回策略

| 召回路径 | 搜索参数 | 取前 | 触发条件 |
|----------|---------|------|----------|
| 同品类 | `category: [{parent_category_id: id_from_category_gmv_distribution}]` | 10 | `category_gmv_distribution` 非空 |
| 同粉丝量级 | `follower_demographics: {count_range: {count_ge: floor(f×0.5), count_le: ceil(f×2)}}` | 10 | 始终 |
| 全市场多样性 | 无筛选条件 | 10 | 始终 |

各路结果合并 → 按 `creator_open_id` 去重 → 排除目标自身 → **上限 24 人**。

## 四、粗排公式

仅用 `searchCreators` 已返回字段（品类 + 粉丝量），零额外 API 调用：

```
coarseScore = computeCategorySimilarity(targetCatIds, candidateCategoryIds) × (0.25/0.45)
            + computeFollowerSimilarity(targetFollowers, candidateFollowers) × (0.20/0.45)
```

权重归一化至总和 1。该分数只决定哪些候选进入外部评分，不能写入 `similarity_score`，也不能作为失败时的替代结果。

## 五、差异化标签规则

| 标签 | 触发条件 |
|------|---------|
| 同品类 | 目标与候选的叶子品类 Jaccard ≥ 0.8 |
| 更高GMV | 候选 GMV > 目标 × 1.2 |
| 更高互动率 | 候选互动率 > 目标 × 1.2 |
| 更大粉丝量 | 候选粉丝 > 目标 × 1.5 |
| 更小粉丝量，高性价比 | 候选粉丝 < 目标 × 0.67 且 > 0 |

标签按触发条件从上到下顺序展示。
