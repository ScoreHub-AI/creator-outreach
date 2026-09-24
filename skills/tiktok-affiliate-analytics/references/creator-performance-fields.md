# 官方达人表现字段 Reference

本文件整理 `creator_performance` 返回的官方达人画像字段，供商品 TOPN 出单达人画像补充使用。官方接口数据是 TikTok Shop Marketplace 的当前达人整体表现快照，不等于本店历史订单结果，也不参与本店 TOPN 排名。

## 调用边界

- 仅对本店历史订单中已进入商品 TOPN、且能够可靠映射 `creator_open_id` 的达人调用；
- `creator_open_id` 必须来自可靠的搜索结果或身份映射，不得由用户名猜测或自行构造；
- 接口失败、限流、权限不足或字段缺失时，保留本店历史结果，并将官方画像标记为不可用或不完整；
- 官方字段必须与本店历史字段分区展示，并标注“官方当前画像”。

## 字段分组

### 身份与基础画像

| 字段 | 含义 | 使用边界 |
|---|---|---|
| `username` | TikTok 用户名 | 身份核对和展示 |
| `nickname` | TikTok 昵称 | 展示 |
| `avatar.url` | 头像地址 | 展示，不参与排序 |
| `selection_region` | 达人所属市场/区域 | 与店铺市场核对 |
| `bio_description` | 达人简介 | 文本参考，不替代结构化表现 |
| `follower_count` | 粉丝数 | 官方当前快照 |
| `profile_tt_uri` | TikTok 资料页 URI | 展示或人工复核 |
| `category_ids` | 带货内容涉及的类目 ID | 仅作类目元数据，不直接证明垂类适配 |

### 粉丝受众

| 字段 | 含义 | 使用边界 |
|---|---|---|
| `follower_location[].key/value` | 粉丝地区及占比 | 保留原始值，单位按真实响应解释 |
| `follower_age[].key/value` | 粉丝年龄段及占比 | 保留原始值，单位按真实响应解释 |
| `follower_gender[].key/value` | 粉丝性别及占比 | 保留原始值，单位按真实响应解释 |

### 内容和互动表现

| 字段 | 含义 |
|---|---|
| `ec_video_count` / `ec_live_count` | 电商视频数 / 电商直播数 |
| `avg_ec_video_play_count` / `avg_ec_live_view_count` | 平均视频播放量 / 平均直播观看量 |
| `avg_ec_video_like_count` / `avg_ec_video_comment_count` / `avg_ec_video_share_count` | 平均视频点赞、评论、分享 |
| `avg_ec_live_like_count` / `avg_ec_live_comment_count` / `avg_ec_live_share_count` | 平均直播点赞、评论、分享 |
| `ec_video_engagement_rate` / `ec_live_engagement_rate` | 视频 / 直播互动率 |
| `content_gmv_distribution[].content_type/value` | 按 VIDEO、LIVE、SHOWCASE 划分的内容 GMV 分布 |

### GMV、GPM 与合作规模

| 字段 | 含义 | 使用边界 |
|---|---|---|
| `gmv`、`video_gmv`、`live_gmv` | 达人整体、视频、直播 GMV | 官方市场表现，不计入本店 GMV |
| `gmv_range` | GMV 区间及币种 | 展示区间，不用于本店排序 |
| `gpm`、`video_gpm`、`live_gpm` | 总体、视频、直播 GPM | 官方市场表现，不等于本店 GPM |
| `gpm_range`、`video_gpm_range`、`live_gpm_range` | GPM 区间及币种 | 保留区间和币种 |
| `units_sold`、`units_sold_range` | 累计售出件数及区间 | 授权不足时可能缺失，不替代本店销量 |
| `promoted_product_num` | 推广商品数 | 描述推广广度 |
| `product_original_price_range` | 推广商品原价区间及币种 | 描述价格带 |
| `top_collaborated_brand_ids` / `brand_collaboration_count` | 主要合作品牌及合作品牌数 | 描述合作广度，不证明本店结果 |

### 评价、佣金与履约倾向

| 字段 | 含义 | 使用边界 |
|---|---|---|
| `avg_commission_rate`、`avg_commission_rate_range` | 平均佣金率及区间 | hundredths of a percent；示例 6000 表示 60% |
| `avg_gmv_per_buyer`、`avg_gmv_per_buyer_range` | 平均每位买家 GMV及区间 | 特定市场或授权条件下返回 |
| `pps` | Promotion Performance Score | 近 90 天可购物内容与商品选择质量；无值保持未知 |
| `rating` | 合作卖家评分 | 市场反馈，不等于本店评价 |
| `post_rate` | 收到样品后预计发布可购物视频或直播的比例 | 预测性字段，不是本店真实履约率 |

## 单位、窗口和缺失

- 币种字段必须与对应金额一起展示，不能跨币种直接相加；
- 互动率、佣金率和预计发布率的官方示例使用 hundredths of a percent；分布字段可能使用小数比例。实现时需保留原始值并通过真实响应测试确认换算；
- `ec_video_engagement_rate` 的官方说明使用最近 30 天视频，`pps` 使用过去 90 天；其他字段的统一窗口未完全明确，应标注“接口窗口未明确”；
- 精确 GMV、销量、佣金和区间字段可能因授权不足缺失。缺失表示未知，不填零；
- 官方画像结果必须注明接口返回时间或快照属性，并与本店历史分析日期范围分开展示。

## 禁止混用

- 官方总 GMV、视频 GMV、直播 GMV和 GPM 不得计入本店达人归因实付商品成交额；
- `post_rate` 不得直接解释为本店履约率、出单率或转化率；
- 官方类目分布不得直接生成“该达人适合某商品”的确定性结论；
- 官方画像字段不得改变商品 TOPN 的本店排序结果。
