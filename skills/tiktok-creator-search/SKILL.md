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

### 类目筛选前置步骤（重要）

如果用户提到了品类/类目关键词（如"美妆"、"3C"、"beauty"、"electronics"），**必须**先调用 `get_categories` 获取类目 ID，再调用 `search_creators`：

1. **`get_categories`** — 传入 `keyword`（品类名关键词），并设合适的 `locale`（中文用 `"zh-CN"`，英文用 `"en-US"`）。`category_version` 跟随区域：US/EU/SEA 用 `"v2"`（官方推荐，类目树更完整），其余区域按返回情况定，不必硬性钦定某个版本。
   - **关键层级约束（与版本无关）**：达人搜索的 `category` 过滤**只认父类目 + 其直接下一级子类目**（TikTok 官方约束："A child category is only 1 level deeper than the parent"）。类目树最深可达 7 级，若直接取深层子类目 ID 喂给搜索接口会被**静默忽略**，导致过滤失效、返回一堆无关达人（这正是"中文树 ID 和搜索返回 category_ids 对不上"的根因）。因此重点不在选哪个版本，而在**只用父类目或其直接下一级**。
2. **优先匹配父类目** — 从返回的 `categories` 中筛 `is_leaf=false` 的父类目。匹配到就直接用：
   - 构造 `category` 参数时 **只传 `parent_category_id`，不传 `child_category_id_list`**：`[{parent_category_id: "父ID"}]`
   - API 会搜索该父类目下**所有**子类目的达人，覆盖面最广
   - 匹配到多个父类目，用**表格展示**让用户确认要筛选哪些
3. **兜底匹配子类目（仅限父类目的直接下一级）** — 仅当没有合适父类目时降级：
   - 只取某父类目**直接下一级**的子类目（`parent_id` 等于该父类目 `id`），**绝不使用更深层的叶子 ID**
   - 构造：`[{parent_category_id: "父ID", child_category_id_list: ["直接子类ID1", "直接子类ID2"]}]`
   - 匹配到多个，同样用**表格展示**让用户确认
4. 将构造好的 `category` 参数传给 `search_creators`

> **核心原则**：父类目覆盖 > 子类目精确。且**层级只能到"父类目 + 直接子类目"**，深层叶子无效。宁愿多搜到一些达人（由后续 GMV/粉丝画像等条件进一步筛选），也不要漏掉。

调用 MCP 工具 **`search_creators`**，不要写脚本。若已授权可直接调用；未授权时先走 `authorize`。

如果工具返回结构化 JSON，优先按 `error_type` 做分流，不要靠自然语言错误文本猜测。

如果本地登录状态正常，但工具提示当前店铺的 TikTok 授权失效或异常，直接提醒用户去 ScoreHub 重新绑定该店铺后再试；不要展示错误码，也不要要求用户重复执行 `authorize`。

如果工具提示请求过于频繁、持续限流或配额受限，直接提醒用户耐心等待、缩小搜索范围或稍后重试；不要建议“重新授权拿一个干净的 token”，也不要主动走 `authorize`，除非用户自己明确要求重新授权。

### 入参

| 参数 | 说明 |
|------|------|
| `keyword` | 用户名/昵称搜索（可选） |
| `category` | 品类筛选数组（可选）。支持两种格式：① **父类目模式（推荐优先使用）**：`[{parent_category_id: "父ID"}]`，不传 `child_category_id_list`，搜索该父类目下所有子类目；② **父+直接子类目模式（仅兜底）**：`[{parent_category_id: "父ID", child_category_id_list: ["直接子类ID1"]}]`，子类目只能比父类目深一级。多个对象 OR 关系，单个对象内 child_category_id_list AND 关系。类目 ID **必须先通过 `get_categories` 获取**，不要硬编码或猜测；**禁止使用深层叶子 ID**。 |
| `gmv_ranges` | GMV 区间数组，取值见下表（可选） |
| `page_size` | 每页条数，默认/上限 20 |
| `page_token` | 翻页令牌，首次不传，用上一页返回的 `next_page_token` 续拉 |

**GMV 区间取值**：`GMV_RANGE_0_100` / `GMV_RANGE_100_1000` / `GMV_RANGE_1000_10000` / `GMV_RANGE_10000_AND_ABOVE`

### 输出与后续

- 结果用**表格**展示关键字段（昵称 / 用户名 / 粉丝数 / GMV 区间 / 类目），避免大段 JSON。
- **务必透传每个达人的 `creator_open_id`**——这是后续 `create_conversation` 建联的必需字段，且**仅搜索结果返回**（分析接口不返回）。
- 单页最多 20 条，大批量搜索需用 `page_token` 多次翻页。

### 类目过滤闭环校验（防静默失效）

用了 `category` 过滤时，搜索返回后**必须自检**：把返回结果里各达人的 `category_ids` 汇总，与本次传入的 `parent_category_id` / `child_category_id_list` 比对。

- 若**零重叠**（返回的 `category_ids` 完全不含所传的类目 ID），说明类目 ID 很可能层级过深或版本不对，**过滤已静默失效**——不要把这批结果当作"符合品类"直接给用户。此时应：
  1. 提示用户"当前类目过滤可能未生效"；
  2. 回退到更浅的类目层级重搜：把所传的深层子类目换成其**父类目**（只传 `parent_category_id`）重新 `search_creators`；仍零重叠时再上溯一级到顶级父类目。
- 若有重叠，说明过滤生效，正常展示。

## 降级：直接 API

MCP 不可用时，降级用环境变量凭证直接调用：

```
POST https://open-api.tiktokglobalshop.com/affiliate_seller/202508/marketplace_creators/search
```

- 签名：HMAC-SHA256，body 为空 `{}` 时不参与签名；compact JSON `separators=(",", ":")`
- 类目 ID 应通过 `GET /product/202309/categories` 获取，不要硬编码。MCP 可用时用 `get_categories` 工具。注意达人搜索的 `category` 只认「父类目 + 直接下一级子类目」，深层叶子无效；已知父类目段 ID 形如 `600001`（6 位），可作层级参考。

## 市场限制

当前仅支持以下东南亚市场：

| 国家 | 代码 |
|------|------|
| 泰国 | TH |
| 马来西亚 | MY |
| 越南 | VN |
| 菲律宾 | PH |
| 印度尼西亚 | ID |
| 新加坡 | SG |

用户在搜索前若明确指定目标市场（如"帮我找日本的达人"、"搜索美国市场创作者"），应**立即告知不支持该市场**，并建议用户改选以上 SEA 市场之一，不要直接调用 `search_creators`。

## 错误处理

| 问题类型 | 处理 |
|----------|------|
| `oauth_invalid` | 仅在真正未授权或本地 OAuth 失效时，才允许提示用户调用 `authorize` |
| 当前店铺的 TikTok 授权失效或异常 | 用中文提醒用户：本地登录状态正常，但当前店铺需要先到 ScoreHub 重新绑定后再试；不要展示错误码，不要要求重复 `authorize` |
| 日配额已用完 | 明确告知用户，停止 |
| 请求过于频繁或持续限流 | 先提醒用户耐心等待，建议缩小搜索范围、减少翻页或稍后重试；必要时按 1s/2s/4s/8s/16s 有限退避重试。不要建议重新授权；只有用户明确要求时才走 `authorize` |
| 参数无效 | 提示用户修正搜索条件或 page_size / 类目参数，不走授权路径 |
