# 达人评分模型（100 分制）

综合评分 = 带货能力×30% + 内容影响力×25% + 粉丝规模×15% + 品类匹配×20% + 粉丝质量×10%。

各维度分先在**候选集内归一化**（除以集合内最大值再×100，封顶 100），因此评分是**相对排序**用途，
需要一批达人一起算才有意义；单个达人无法得到有意义的归一化分。

## 各维度算法

### 1. 带货能力（30%）
- GMV 分 = min(gmv / maxGmv × 100, 100) × 0.6
- 销量分 = min(units / maxUnits × 100, 100) × 0.4
- 维度分 = round(GMV 分 + 销量分)

### 2. 内容影响力（25%）
- 观看分 = min((直播均观看 + 视频均播放) / max总观看 × 100, 100) × 0.5
- 直播互动分 = min(直播互动率 / max直播互动率 × 100, 100) × 0.3
- 视频互动分 = min(视频互动率 / max视频互动率 × 100, 100) × 0.2
- 维度分 = round(三者之和)

### 3. 粉丝规模（15%）
- 维度分 = round(min(followers / maxFollowers × 100, 100))

### 4. 品类匹配（20%）
- **目标类目 ID 集合**（`target_cat_ids`）：由用户品类意图决定，只能使用本轮当前授权店铺的 `get_categories` 结果。默认使用 `parent_id == "0"` 的顶层类目 ID；仅当用户明确指定某个直接子类目时，才改用该子类目 ID。不得硬编码、跨店铺复用或合并多个市场的类目 ID。
- 若有 `category_gmv_distribution`（API 返回的 `category_id` 为**顶级父类目 ID**，与 `target_cat_ids` 同层级）：
  - 取 GMV 占比最高的类目，判断其 `category_id` 是否在 `target_cat_ids` 中
    - **命中**（最理想路径）→ 维度分 = round(该类目 GMV 占比 × 100)，上限 100
    - **未命中** → 计算分布中所有类目与 `target_cat_ids` 的交集：overlap = 交集类目数 / 分布中类目总数；维度分 = round(overlap × 100)
- 若无 `category_gmv_distribution` → 维度分记 **null**（标注「品类数据未授权」），不参与品类维度排序
  - **禁止用 `category_ids` 替代**：该字段是达人发帖产品的**叶子类目 ID**，层级远深于父类目，与 `target_cat_ids`（父类目）直接求交集结果恒为空，会错误地将匹配达人评为零分

### 5. 粉丝质量（10%，示例以美妆女性受众为基准）
- 女性占比分 = min(female_pct × 100 / 0.8, 100)（female_pct 为小数，>1 时按 /100 归一）
- 核心年龄分 = min((18-24 + 25-34 + 35-44 占比之和) × 100 / 0.8, 100)
- 维度分 = round(女性占比分 × 0.5 + 核心年龄分 × 0.5)

## 标签体系

| 标签 | 触发条件 |
|------|---------|
| 💎带货王者 | 带货分 ≥ 80 |
| 💰有潜力 | 50 ≤ 带货分 < 80 |
| 🎬内容高手 | 内容分 ≥ 70 |
| 🎯精准美妆 | 品类分 ≥ 80 |
| 👩优质粉丝 | 粉丝质量分 ≥ 60 |
| 📢大V / 🎤腰部 / 🌱尾部达人 | 粉丝数 >50K / 10K–50K / <10K |
| 🔴直播型 / 🟣混合型 / 🟢视频型 | 直播 GMV 占比 >0.8 / >0.5 / 其他 |

## 推荐结论与理由

推荐结论解释的是**当前候选集内的合作优先级**，不是对达人能力的绝对评级。理由只能使用用户本轮目标、原始指标、五维分、相对排名、标签和已标注的数据缺口，不得根据昵称、简介或常识补写内容风格、合作历史、转化表现等未返回事实。

### 多达人结论

成功评分数 `n >= 2` 时，先按综合分排序结果计算排名百分位 `p = (rank - 1) / (n - 1)`：

| 条件 | 基础结论 |
|------|---------|
| `p <= 0.30` | 优先推荐 |
| `0.30 < p <= 0.70` | 值得测试 |
| `p > 0.70` | 谨慎考虑 |

再按以下优先级覆盖基础结论：

1. **明确不匹配 → 本轮不推荐**：仅当用户给出可由现有字段直接验证的核心目标，且已授权、口径和层级一致的数据明确未达到目标时使用。可验证目标限于：同层级目标类目没有交集；用户明确给出的性别、年龄、直播或视频指标下限未达到。不得因综合分或单一维度排名靠后直接输出“本轮不推荐”。
2. **核心数据缺失 → 谨慎考虑**：目标类目缺 `category_gmv_distribution`，目标性别缺 `follower_gender`，目标年龄缺 `follower_age`，直播目标缺直播观看或互动字段，视频目标缺视频播放或互动字段时，结论最高为“谨慎考虑”。不同类目层级无法可靠比较时也按数据缺失处理，不得判为不匹配。
3. 其他情况保留排名百分位对应的基础结论。多个目标同时存在时，“明确不匹配”优先于“核心数据缺失”。无法由现有字段验证的目标不参与结论覆盖，只能在风险中说明仍需建联验证。

### 证据选择

按以下顺序生成理由，避免只复述综合分：

1. 优先选择与用户明确目标直接相关且可验证的匹配证据；只引用与当前达人有关的目标短语，不复述完整搜索条件。
2. 再从带货能力、内容影响力、粉丝规模、品类匹配和粉丝质量中选择最有区分度的优势；优先引用维度分及该维度相对名次，并用一个原始指标补充依据。
3. 风险按“明确目标不匹配 → 目标所需数据缺失 → 其他数据缺口 → 最弱维度”的顺序选择。缺失值必须明确写出，不能当作真实低表现。
4. 榜单短理由使用一条完整句，包含一至两项核心证据，并在存在关键风险或缺口时用后半句指出；控制在 60 个中文字符以内。示例：`品类匹配 88，带货能力位列本组第 2；直播互动数据缺失，建议先小范围验证。`

### 详情证据链

每位达人详情固定包含：

1. **推荐结论**：结论及适合优先验证的合作方向；只有直播或视频相关原始数据能够支撑时，才可指定对应内容形式，否则使用通用的“小范围合作验证”。
2. **推荐依据**：两条最有区分度的证据，每条包含维度分或相对名次，并尽量附一个原始指标。
3. **主要风险**：一条明确不匹配、数据缺口或最弱维度；若没有明显风险，写明“当前数据未发现突出短板”，不得虚构风险。
4. **建议动作**：优先建联验证合作意愿、报价和档期；只有用户已给出 Offer 或合作形式时才引用该条件，不替用户承诺新的金额、佣金或合作权益。

### 单达人结论

单达人不使用排名百分位、综合分或五维相对分。按以下优先级给出合作判断：

1. 可验证的核心目标明确不匹配 → `暂不推荐`。
2. 核心目标所需字段缺失或层级不可比 → `信息不足，暂缓推荐`。
3. 可验证的核心目标匹配 → `值得进一步验证`。
4. 用户未提供可验证目标 → `需加入更多候选后判断优先级`。

单达人仍展示原始指标、标签、数据缺口、优势/风险与建议动作，但不得用单元素归一化结果作为推荐依据。

## MCP 字段映射说明（重要）

MCP 工具 `creator_performance` 直接透传 TikTok 详情接口的原始 JSON 响应（见官方 API 文档 `Get Marketplace Creator Performance`）。
所有评分所需字段位于 `data.creator.*` 路径下，字段对应关系如下：

| 评分所需 | MCP 返回字段（`data.creator.*`） | 类型 | 使用方式 |
|---------|------------------------------|------|---------|
| GMV | `gmv.amount` | string（如 `"3434.23"`） | `parseFloat()` 后使用 |
| 销量 | `units_sold` | int | 直接用 |
| 直播观看 | `avg_ec_live_view_count` | int | 直接用 |
| 视频播放 | `avg_ec_video_play_count` | int | 直接用 |
| 直播互动率 | `ec_live_engagement_rate` | string（如 `"6000"` = 60%） | `parseFloat() / 100` 换算为百分比小数 |
| 视频互动率 | `ec_video_engagement_rate` | string（如 `"3000"` = 30%） | `parseFloat() / 100` 换算为百分比小数 |
| 粉丝性别 | `follower_gender[].key` / `.value` | key 为 string（`"Male"` / `"Female"`，首字母大写），value 为 string 小数（如 `"0.5000"`） | `parseFloat(value)` 后使用；key 比较需兼容大小写 |
| 粉丝年龄 | `follower_age[].key` / `.value` | key 为 string（如 `"18-23"`），value 为 string 小数（如 `"0.2500"`） | `parseFloat(value)` 后使用 |
| 品类 GMV 分布 | `category_gmv_distribution[].category_id` / `.value` | category_id 为 string（**顶级父类目 ID**），value 为 string 小数（如 `"0.3035"`） | `parseFloat(value)` 后作为 GMV 占比 |
| 品类列表 | `category_ids` | string[]（**叶子类目 ID**） | **不用于品类匹配**（与父类目 ID 层级不同，交集恒为空） |

**执行建议**：优先使用上表字段代入完整公式；若某字段缺失（接口未返回），对应子维度记 0 或 null 并**标注数据缺口**：
- `avg_ec_live_view_count` 或 `avg_ec_video_play_count` 缺失 → 对应观看子分记 0，注明数据缺口
- `ec_live_engagement_rate` 或 `ec_video_engagement_rate` 缺失 → 对应互动子分记 0，注明数据缺口
- `follower_gender` 或 `follower_age` 缺失 → 对应粉丝质量子分记 0，注明数据缺口
- `category_gmv_distribution` 缺失 → 品类匹配维度记 **null**（不参与排序），注明「品类数据未授权」

字段缺失时对应维度**标注数据缺口**，不要静默填 0 造成排序失真。

## 参考实现（Python）

以下 `score_creator()` 仅用于帮助理解上文规则，不是独立权威口径，也不是项目运行代码。如果示例与上文公式、字段映射或缺失值规则冲突，以上文正文中的明文规则为准。

```python
def score_creator(c, all_creators, target_cat_ids):
    scores = {}
    max_gmv = max(float(x.get("gmv", {}).get("amount", 0) or 0) for x in all_creators) + 1
    max_followers = max(x.get("follower_count", 0) or 0 for x in all_creators) + 1
    max_views = max((x.get("avg_ec_live_view_count", 0) or 0) + (x.get("avg_ec_video_play_count", 0) or 0)
                    for x in all_creators) + 1

    # 1. 带货能力 (30%)
    gmv = float(c.get("gmv", {}).get("amount", 0) or 0)
    units = c.get("units_sold", 0) or 0
    max_units = max((x.get("units_sold", 0) or 0) for x in all_creators) + 1
    scores["sales"] = round(min(gmv / max_gmv * 100, 100) * 0.6 + min(units / max_units * 100, 100) * 0.4)

    # 2. 内容影响力 (25%)
    live_views = c.get("avg_ec_live_view_count", 0) or 0
    video_plays = c.get("avg_ec_video_play_count", 0) or 0
    live_eng = float(c.get("ec_live_engagement_rate", 0) or 0)
    video_eng = float(c.get("ec_video_engagement_rate", 0) or 0)
    max_live_eng = max(max(float(x.get("ec_live_engagement_rate", 0) or 0) for x in all_creators), 1)
    max_video_eng = max(max(float(x.get("ec_video_engagement_rate", 0) or 0) for x in all_creators), 1)
    scores["content"] = round(
        min((live_views + video_plays) / max_views * 100, 100) * 0.5
        + min(live_eng / max_live_eng * 100, 100) * 0.3
        + min(video_eng / max_video_eng * 100, 100) * 0.2
    )

    # 3. 粉丝规模 (15%)
    scores["followers"] = round(min((c.get("follower_count", 0) or 0) / max_followers * 100, 100))

    # 4. 品类匹配 (20%)
    cat_gmv_dist = c.get("category_gmv_distribution", [])
    if cat_gmv_dist:
        top_cat = max(cat_gmv_dist, key=lambda x: float(x.get("value", 0) or 0))
        if top_cat.get("category_id", "") in target_cat_ids:
            scores["category"] = round(min(float(top_cat.get("value", 0) or 0) * 100, 100))
        else:
            dist_ids = {x.get("category_id", "") for x in cat_gmv_dist}
            overlap = len(dist_ids & target_cat_ids) / max(len(dist_ids), 1)
            scores["category"] = round(overlap * 100)
    else:
        scores["category"] = None  # 品类数据未授权，不参与排序

    # 5. 粉丝质量 (10%)
    female_pct = 0
    for g in c.get("follower_gender", []):
        if g.get("key", "").lower() == "female":
            female_pct = float(g.get("value", 0) or 0)
    q = min((female_pct if female_pct <= 1 else female_pct / 100) * 100 / 0.8, 100)
    core_age = sum(float(a.get("value", 0) or 0) for a in c.get("follower_age", [])
                   if a.get("key") in ("18-24", "25-34", "35-44"))
    scores["follower_quality"] = round(q * 0.5 + min(core_age * 100 / 0.8, 100) * 0.5)

    scores["total"] = round(
        scores["sales"] * 0.30 + scores["content"] * 0.25 + scores["followers"] * 0.15
        + (scores["category"] or 0) * 0.20 + scores["follower_quality"] * 0.10
    )
    return scores
```
