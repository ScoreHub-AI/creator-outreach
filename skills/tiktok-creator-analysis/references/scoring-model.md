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

### 4. 品类匹配（20%，示例以美妆为基准）
- 美妆类目 ID 集合：`{600024, 601303, 602118, 602284, 601450, 600025, 600026}`
- 若有 `category_gmv_distribution`：取 GMV 占比最高的类目
  - 该类目属美妆 → 维度分 = round(该类目 GMV 占比 × 100)
  - 否则 → overlap = 交集类目数 / 达人类目数；维度分 = round(overlap × 80 + 10)
- 若无分布数据 → 维度分 = round(overlap × 100)

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

## MCP 字段映射说明（重要）

MCP 工具 `creator_performance` 直接透传 TikTok 详情接口的原始响应，**可直接使用上文完整公式**。
字段对应关系如下：

| 评分所需（原始字段） | MCP `creator_performance` 返回字段 | 备注 |
|----------------------|------------------------------------|------|
| `gmv.amount`（字符串） | `gmv_30d`（数值） | 直接用 |
| `units_sold` | `units_sold_30d` | 直接用 |
| `avg_ec_live_view_count` | `avg_ec_live_view_count` | 直接用 |
| `avg_ec_video_play_count` | `avg_ec_video_play_count` | 直接用 |
| `ec_live_engagement_rate` | `ec_live_engagement_rate` | 直接用 |
| `ec_video_engagement_rate` | `ec_video_engagement_rate` | 直接用 |
| `follower_gender` | `follower_gender`（`[{key, value}]`） | 直接用，value 为小数占比 |
| `follower_age` | `follower_age`（`[{key, value}]`） | 直接用，value 为小数占比 |
| `category_gmv_distribution` | `category_gmv_distribution`（`[{category_id, value}]`） | 直接用 |
| `category_ids` | `category_ids` | 直接用 |

**执行建议**：优先使用上表原始字段代入完整公式；若某原始字段缺失（接口未返回），
按以下顺序降级：
1. `avg_ec_live_view_count` / `avg_ec_video_play_count` 缺失 → 用 `avg_video_views` 合并近似观看量
2. `ec_live/video_engagement_rate` 缺失 → 用 `engagement_rate`（单值）代入互动分
3. `follower_gender` / `follower_age` 缺失 → 从 `follower_demographics` 取值
4. `category_gmv_distribution` / `category_ids` 缺失 → 用 `top_categories` 的 share 计算占比/重叠

字段缺失时对应维度**标注数据缺口**，不要静默填 0 造成排序失真。

## 参考实现（Python，逻辑口径来源，含硬编码凭证已剔除）

以下为原始脚本 `score_creator()` 的算法口径（仅作口径参考，实际以 MCP 数据代入）：

```python
def score_creator(c, all_creators):
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
    beauty_cat_ids = {"600024", "601303", "602118", "602284", "601450", "600025", "600026"}
    categories = c.get("category_ids", [])
    cat_gmv_dist = c.get("category_gmv_distribution", [])
    if cat_gmv_dist:
        top_cat = max(cat_gmv_dist, key=lambda x: float(x.get("value", 0) or 0))
        if top_cat.get("category_id", "") in beauty_cat_ids:
            scores["category"] = round(float(top_cat.get("value", 0) or 0) * 100)
        else:
            overlap = len(set(categories) & beauty_cat_ids) / max(len(categories), 1)
            scores["category"] = round(overlap * 80 + 10)
    else:
        overlap = len(set(categories) & beauty_cat_ids) / max(len(categories), 1)
        scores["category"] = round(overlap * 100)

    # 5. 粉丝质量 (10%)
    female_pct = 0
    for g in c.get("follower_gender", []):
        if g.get("key") == "female":
            female_pct = float(g.get("value", 0) or 0)
    q = min((female_pct if female_pct <= 1 else female_pct / 100) * 100 / 0.8, 100)
    core_age = sum(float(a.get("value", 0) or 0) for a in c.get("follower_age", [])
                   if a.get("key") in ("18-24", "25-34", "35-44"))
    scores["follower_quality"] = round(q * 0.5 + min(core_age * 100 / 0.8, 100) * 0.5)

    scores["total"] = round(
        scores["sales"] * 0.30 + scores["content"] * 0.25 + scores["followers"] * 0.15
        + scores["category"] * 0.20 + scores["follower_quality"] * 0.10
    )
    return scores
```
