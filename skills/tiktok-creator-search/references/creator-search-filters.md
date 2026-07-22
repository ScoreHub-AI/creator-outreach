# 达人搜索筛选字段映射

本文件是 `search_creators` 筛选字段、自然语言映射、取值范围和互斥关系的唯一权威来源。Search Skill 负责何时询问、调用和展示，Agent 只保留用户可理解的能力摘要。

## 可用筛选

| 用户画像维度 | 工具字段 | 映射规则 |
|---|---|---|
| 用户名或昵称 | `keyword` | 原样传入用户给出的关键词 |
| 类目 | `category` | 必须先按 Search Skill 调用 `get_categories`，不得猜测 ID |
| GMV | `gmv_ranges` | `0–100` / `100–1K` / `1K–10K` / `10K+` 依次映射 `GMV_RANGE_0_100` / `GMV_RANGE_100_1000` / `GMV_RANGE_1000_10000` / `GMV_RANGE_10000_AND_ABOVE` |
| 销量 | `units_sold_ranges` | `0–10` / `10–100` / `100–1K` / `1K+` 依次映射 `UNITS_SOLD_RANGE_0_10` / `UNITS_SOLD_RANGE_10_100` / `UNITS_SOLD_RANGE_100_1000` / `UNITS_SOLD_RANGE_1000_AND_ABOVE` |
| 粉丝数 | `follower_demographics.count_range` | 最小值传 `count_ge`，最大值传 `count_le`；均为大于等于 0 的整数，且最小值不得大于最大值 |
| 粉丝年龄 | `follower_demographics.age_ranges` | `18–24` / `25–34` / `35–44` / `45–54` / `55+` 依次映射 `AGE_RANGE_18_24` / `AGE_RANGE_25_34` / `AGE_RANGE_35_44` / `AGE_RANGE_45_54` / `AGE_RANGE_55_AND_ABOVE` |
| 粉丝主要性别 | `follower_demographics.gender_distribution` | `男性` / `女性` 映射 `MALE` / `FEMALE`；最低占比传 `percentage_ge`，用户百分比乘 100，例如 `60%` 传 `6000` |
| 平均视频播放量 | `content_performance.avg_video_views` | 传 `0–100000` 的整数字符串 |
| 平均带货视频播放量 | `content_performance.avg_shoppable_video_views` | 传 `0–100000` 的整数字符串；不得与平均视频播放量同时使用 |
| 平均互动率 | `content_performance.avg_engagement_rate` | 传 `0–20` 的整数百分数字符串，例如 `5%` 传 `"5"` |
| 平均带货互动率 | `content_performance.avg_shopable_engagement_rate` | 传 `0–20` 的整数百分数字符串 |
| 平均直播观看人数 | `content_performance.avg_live_avg_viewers_ge` | 传 `0–100000` 的整数字符串 |
| 平均带货直播观看人数 | `content_performance.avg_shoppable_live_avg_viewers_ge` | 传 `0–100000` 的整数字符串；不得与平均直播观看人数同时使用 |
| 平均佣金率 | `affiliate_data.avg_commission_rate` | “低于 5% / 10% / 15% / 20%”依次映射 `LESS_THAN_5%` / `LESS_THAN_10%` / `LESS_THAN_15%` / `LESS_THAN_20%`；只能选一档 |
| 样品后发帖表现 | `affiliate_data.post_rate` | “合格 / 良好 / 最佳”映射 `OK` / `GOOD` / `BETTER`；各市场的实际基准由 TikTok 决定 |
| 达人归属 | `affiliate_data.creator_agency_staus` | “机构达人 / 独立达人”映射 `AGENCY_MANAGED` / `INDEPENDENT`；字段名沿用上游拼写 |
| 快速增长 | `affiliate_data.is_fast_growing` | 用户明确要求快速增长达人时传 `true` |
| 近 90 天未邀约 | `affiliate_data.not_invited_l90_days` | 用户明确要求排除近期已邀约达人时传 `true` |

连续的 GMV、销量或年龄档位可以组合。例如“GMV 1K+”映射后两档，“18–34 岁”映射前两档。不能由完整官方档位精确表达的边界不得静默放宽，应要求用户改选可用档位。

## 解析与冲突

- 用户说“视频/直播”时使用普通内容指标；明确说“带货、挂车、电商、shoppable”时使用对应带货指标。
- 普通视频播放量与带货视频播放量互斥；普通直播观看人数与带货直播观看人数互斥。用户同时明确要求一组互斥指标时，先要求二选一，不调用搜索。
- 百分比只接受明确的 `0–100%`；粉丝性别最低占比转换为 `0–10000` 的整数，互动率保持 `0–20` 的整数百分数。
- `language`、`creator_level`、`category_pro` 依赖各市场动态枚举，本阶段不传 `advanced_filters`，也不向用户承诺可筛选。
- “地区”不是粉丝受众筛选字段。搜索市场由当前授权店铺决定，不得将目标国家写入 `follower_demographics` 或 `advanced_filters`。

## 用户可读摘要

按用户表达顺序生成“已应用画像”，只展示实际传入且最终生效的条件。使用本地化名称和数值，例如：

> 已应用画像：美妆｜GMV 1K+｜粉丝 1万–10万｜18–34 岁｜女性粉丝 ≥60%｜带货视频平均播放 ≥5,000｜独立达人｜快速增长

不得展示工具字段名、枚举、类目 ID、`search_key`、`page_token` 或未实际传入的默认值。
