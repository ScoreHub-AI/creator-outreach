# 相似达人推荐模型

本文件是相似度评分模型的唯一权威 Reference。`tiktok-similar-creators` Skill 和 Agent 只做引用摘要，不重复展开。

## 一、两阶段评分

| 阶段 | 数据源 | API 调用 | 维度 | 用途 |
|------|--------|---------|------|------|
| 粗排 | `searchCreators` 返回字段 | 0 | 品类 + 粉丝量 | 从候选池（≤24）筛出 Top-K 进入精排 |
| 精排 | `getCreatorPerformance` 全量指标 | ≤12 | 6 维完整评分 | 排序取 Top-N 返回 |

粗排 Top-K 计算：`K = min(ceil(top_n × 1.5), 12)`。

## 二、6 个维度及权重（精排）

| 维度 | 权重 | 相似度函数 | 数据字段 |
|------|------|-----------|----------|
| 品类匹配 | 0.25 | Jaccard（交集/并集） | `category_ids`（叶子 ID，两侧同层级可比） |
| 粉丝量级 | 0.20 | `1 - \|log10(fA) - log10(fB)\| / 6` | `follower_count` |
| GMV | 0.20 | `1 - \|A-B\| / max(A,B)` | `gmv.amount`（parseFloat） |
| 互动率 | 0.15 | `1 - \|A-B\| / max(A,B)` | 见互动率取值规则 |
| 客单价 | 0.10 | `1 - \|A-B\| / max(A,B)` | `gmv.amount / units_sold` |
| 内容形式 | 0.10 | 匹配 = 1，否则 = 0 | 见内容形式推断规则 |

### 品类匹配字段约束（关键）

`search_creators` 的 `category` 参数只接受**顶层类目 ID**（`parent_id == "0"`），描述明文「禁止传更深层 ID」。
- **召回用**：目标达人的 `category_gmv_distribution[].category_id`（顶级父类目 ID，与 `get_categories` 顶层 `id` 同级）。
- **相似度计算用**：目标与候选的 `category_ids`（叶子 ID）做 Jaccard——两侧字段同层级，可比。
- **禁止混用**：不可将叶子 `category_ids` 传入 `searchCreators` 的 `parent_category_id`，否则被搜索接口静默忽略，返回无关达人。

## 三、互动率取值规则

先用 `inferContentFormat` 判断内容形式，再按形式取对应互动率：

| 内容形式 | 互动率取值 |
|----------|-----------|
| 直播型 | `parseFloat(ec_live_engagement_rate) / 100` |
| 视频型 | `parseFloat(ec_video_engagement_rate) / 100` |
| 混合型 | 两者均值（缺失或为 "0" 的一侧不计入分母） |

字段单位为**百分之一百分点**（如 `"6000"` = 60%），使用前 `/100` 换算为百分比值。
缺失率记为 0，不参与均值时跳过。

## 四、内容形式推断规则

从 `ec_live_count` 和 `ec_video_count` 推断：

| 条件 | 结果 |
|------|------|
| 两者均为 0 | `mixed` |
| 直播占比 > 70% | `live` |
| 视频占比 > 70% | `video` |
| 其他 | `mixed` |

## 五、3 路召回策略

| 召回路径 | 搜索参数 | 取前 | 触发条件 |
|----------|---------|------|----------|
| 同品类 | `category: [{parent_category_id: id_from_category_gmv_distribution}]` | 10 | `category_gmv_distribution` 非空 |
| 同粉丝量级 | `follower_demographics: {count_range: {count_ge: floor(f×0.5), count_le: ceil(f×2)}}` | 10 | 始终 |
| 全市场多样性 | 无筛选条件 | 10 | 始终 |

各路结果合并 → 按 `creator_open_id` 去重 → 排除目标自身 → **上限 24 人**。

## 六、粗排公式

仅用 `searchCreators` 已返回字段（品类 + 粉丝量），零额外 API 调用：

```
coarseScore = computeCategorySimilarity(targetCatIds, candidateCategoryIds) × (0.25/0.45)
            + computeFollowerSimilarity(targetFollowers, candidateFollowers) × (0.20/0.45)
```

权重归一化至总和 1。

## 七、差异化标签规则

| 标签 | 触发条件 |
|------|---------|
| 同品类 | 精排品类 Jaccard ≥ 0.8 |
| 更高GMV | 候选 GMV > 目标 × 1.2 |
| 更高互动率 | 候选互动率 > 目标 × 1.2 |
| 更大粉丝量 | 候选粉丝 > 目标 × 1.5 |
| 更小粉丝量，高性价比 | 候选粉丝 < 目标 × 0.67 且 > 0 |

标签按触发条件从上到下顺序展示。
