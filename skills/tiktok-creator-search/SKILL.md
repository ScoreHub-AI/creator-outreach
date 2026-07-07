# TikTok Creator Search — 达人搜索

在 TikTok Shop Creator Marketplace 中按多维度筛选搜索达人，支持翻页获取全量结果。

## 触发条件

当用户提到以下意图时加载本技能：
- "搜索/找/筛选 TikTok 达人/creator"
- "帮我找美妆/3C/服装类目的达人"
- "查找 GMV 在 xxx 区间的达人"
- "搜索粉丝画像为 xxx 的达人"
- 任何包含达人搜索、市场筛选的请求

## 执行方式（MCP 优先）

调用 MCP 工具 **`search_creators`**，不要写脚本。若已授权可直接调用；未授权时先走 `authorize`。

### 入参

| 参数 | 说明 |
|------|------|
| `keyword` | 用户名/昵称搜索（可选） |
| `gmv_ranges` | GMV 区间数组，取值见下表（可选） |
| `page_size` | 每页条数，默认/上限 20 |
| `page_token` | 翻页令牌，首次不传，用上一页返回的 `next_page_token` 续拉 |

**GMV 区间取值**：`GMV_RANGE_0_100` / `GMV_RANGE_100_1000` / `GMV_RANGE_1000_10000` / `GMV_RANGE_10000_AND_ABOVE`

### 输出与后续

- 结果用**表格**展示关键字段（昵称 / 用户名 / 粉丝数 / GMV 区间 / 类目），避免大段 JSON。
- **务必透传每个达人的 `creator_open_id`**——这是后续 `create_conversation` 建联的必需字段，且**仅搜索结果返回**（分析接口不返回）。
- 单页最多 20 条，大批量搜索需用 `page_token` 多次翻页。

## 降级：直接 API

MCP 不可用时，降级用环境变量凭证直接调用：

```
POST https://open-api.tiktokglobalshop.com/affiliate_seller/202508/marketplace_creators/search
```

- 签名：HMAC-SHA256，body 为空 `{}` 时不参与签名；compact JSON `separators=(",", ":")`
- 已知类目 ID：`1000001`（Beauty & Personal Care）、`600024`（Beauty 子类目，最常见）

## 错误处理

| 错误码 | 含义 | 处理 |
|--------|------|------|
| 45101004 | 日配额已用完 | 明确告知用户，停止 |
| 36009002 | 请求过于频繁 | 指数退避重试 1s/2s/4s/8s/16s |
