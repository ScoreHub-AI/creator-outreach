# 联盟经营分析指标 Reference

本文件是指标含义与来源索引的 owner。有效订单筛选、金额重建和排序细节统一见 [数据关联与归因](./data-join-and-attribution.md)；只解释真实工具返回的数据，不执行表查询。

## 店铺与联盟汇总

| 指标 | 粒度 | 主要来源 | 运行约束 |
|---|---|---|---|
| 店铺整体 GMV | 店铺/日 | `xmj_shop_daily.gmv_amount*`、`metric_date` | 店铺整体口径，不替代联盟 GMV |
| 店铺退款金额 | 店铺/日 | `xmj_shop_daily.refunds_amount*` | 店铺整体口径 |
| 店铺售出件数 | 店铺/日 | `xmj_shop_daily.items_sold` | 不替代联盟销量 |
| 店铺订单数 | 店铺/日 | `xmj_shop_daily.orders` | 官方含义为已支付订单数 |
| 商品联盟销售额 | 店铺/商品/日 | `xmj_product_daily.affiliate_total_attributed_gmv_amount*` | 汇总可复用，不拆作达人金额 |
| 商品联盟销量 | 店铺/商品/日 | `xmj_product_daily.affiliate_total_attributed_sold_items` | 汇总可复用，达人拆分用联盟明细 |
| 有效联盟订单数 | 店铺/商品/达人/周期 | `xmj_affiliate_order_line` | 按已确认筛选条件并 `DISTINCT order_id` |
| 联盟确认退款额 | 店铺/商品/周期 | 退款/取消事实表 | 复用驾驶舱联盟经营结果口径 |
| 视频/直播联盟成交额 | 店铺/商品/日 | 商品日报联盟渠道字段 | 汇总可用；内容级需可靠关联 |

## 商品与达人

| 指标 | 粒度 | 主要来源 | 运行约束 |
|---|---|---|---|
| 商品整体 GMV | 商品/日 | `xmj_product_daily` 整体经营字段 | 不命名为联盟 GMV |
| 商品整体售出件数 | 商品/日 | `xmj_product_daily` 整体经营字段 | 与联盟销量分开 |
| 商品整体退款金额/退款率 | 商品/周期 | `xmj_product_daily` | 退款率仅在 GMV>0 时计算 |
| 商品有效联盟订单数 | 商品/周期 | `xmj_affiliate_order_line` | 有效订单筛选 + `DISTINCT order_id` |
| 商品有效联盟销量 | 商品/周期 | 联盟订单行 `quantity` | 多 SKU 折叠见数据关联 Reference |
| 商品订单关联达人数量 | 商品/周期 | `creator_username` | 规范化后去重 |
| 达人归因实付商品成交额（GMV） | 商品/订单/达人 | `xmj_order_line.sale_price` | 只计目标商品、不含运费，多达人可重复归因；本指标为 Tiky 自定义 GMV，不替代商品日报联盟 GMV |
| 商品 TOPN 出单达人 | 商品/达人 | 联盟订单 + Tiky GMV | 排序见数据关联 Reference；官方画像见 `creator-performance-fields.md` |

## 其他已上线驾驶舱指标索引

以下为后端可能提供的补充指标。仅在真实返回时使用，不能把这些来源字段当作已开放工具承诺。

| 指标 | 适用范围 | 运行约束 |
|---|---|---|
| 店铺整体 LIVE/VIDEO/PRODUCT_CARD 渠道成交额及占比 | 店铺经营上下文 | 不等同于联盟内部渠道结构 |
| 联盟销售额占店铺整体 GMV 比例 | 店铺/周期 | 必须同店铺、同周期，分母为 0 不可比较 |
| 商品整体 GMV/售出件数/退款金额/退款率榜单 | 商品经营与风险 | 沿用商品日报整体口径，不与联盟指标混用 |
| 商品已退款件数 | 商品售后上下文 | 不推导利润或净收入 |
| 履约达人数、履约后出单达人数、履约视频数、履约直播场次 | 履约链路上下文 | 仅覆盖定向合作 + 免费样品申请 + 履约链路；履约结果弱点尚未独立实现 |
| 高退款店铺、GMV 下滑店铺预警 | 风险提示 | 仅为规则化信号，不解释具体原因 |

| 达人账号、昵称、头像 | 商品 TOPN 展示 | 历史账号与外部当前资料需分开标注 |

官方达人画像字段不在本指标索引中展开，统一见 [`creator-performance-fields.md`](./creator-performance-fields.md)。

金额无法完整重建时，TOPN 不以 0 填充缺失 GMV；保留金额缺失标识，按可用有效联盟销量、有效联盟订单数降级排序，并披露金额覆盖范围和未重建数量。上线驾驶舱当前达人订单详情 GMV包含运费，不能直接复用为 Tiky GMV。

## 状态与缺失

`complete`、`partial`、`no_data`、`not_comparable`、`unavailable` 的含义和用户表达以 `business-rules.md` 为准。缺失值默认未知，不填零；金额不可重建时保留订单数/销量。
