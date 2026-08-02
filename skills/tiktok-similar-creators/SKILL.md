---
name: tiktok-similar-creators
description: 以目标达人为模板，通过多路召回和两阶段加权评分寻找表现特征相似的达人，返回按相似度降序排列的 Top-N 推荐列表。用于"找相似达人"、"以他为模板"、"有没有类似的达人"等请求。
---

# TikTok Similar Creators — 相似达人推荐

以某位达人为模板，基于多路召回和加权评分找到带货表现特征相似的其他达人。

本文件是相似达人推荐专项行为的权威来源；Agent 只保留能力摘要。若执行流程、输出或失败处理存在冲突，以本文件为准。

## 触发条件

当用户提到以下意图时加载本技能：
- "找相似达人"/"找类似的达人"
- "similar to this creator"/"find similar creators"
- "以他为模板"/"有没有类似的达人"
- "这批达人里有没有跟 @xxx 很像的"

## 执行方式（MCP 优先）

调用 MCP 工具 **`find_similar_creators`**：

| 参数 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `creator_user_id` | ✅ | — | 目标达人的 `creator_open_id`，只能来自当前对话上下文中的搜索结果，不可编造 |
| `top_n` | ❌ | 20 | 返回数量（1–50） |
| `include_reasoning` | ❌ | true | 是否包含各维度相似度得分 |

相似度模型、召回策略、权重和标签规则的唯一权威来源是 [相似达人推荐模型](./references/similarity-model.md)，本 Skill 不重复其实现细节。

授权、限流、MCP 不可用和本地运行环境恢复遵循 Agent 的权威规则，本技能不重复展开。

### 执行流程

1. 从当前对话上下文中提取目标达人的 `creator_open_id`（搜索结果中保留的标识）
2. 调用 `find_similar_creators`，传入 `creator_user_id`
3. 按输出格式展示结果

如果上下文中没有可用的 `creator_open_id`（例如用户只说"找个跟美妆达人相似的"但没指定具体达人），先引导用户通过搜索找到目标达人，或请用户提供达人名称。

### 输出（固定格式）

禁止直接展示 MCP 原始 JSON。工具返回的结果按以下规则展示：

#### Markdown 展示

**1. 目标达人摘要**
```
🎯 目标达人：@username（nickname）
   粉丝：<follower_count>  ·  GMV：<gmv_amount> <gmv_currency>  ·  内容形式：<直播型/视频型/混合型>
```

**2. 相似达人列表** — 按相似度得分降序的表格：

| 排名 | 达人 | 用户名 | 粉丝数 | 相似度 | 亮点 |
|------|------|--------|--------|--------|------|
| 1 | nickname | @username | follower_count | 0.85 | 同品类 · 更高GMV |
| 2 | ... | ... | ... | ... | ... |

- "亮点"列展示 `differentiator_tags`（以 "·" 连接），无标签时显示 `—`。
- 相似度保留两位小数。
- 保留每位达人的 `creator_open_id` 供后续分析或建联使用。

**3. 召回说明** — 简短一行：
```
共评估 <total_candidates_evaluated> 位候选人（<召回路列表，逗号分隔>），返回 Top-<N>
```

#### WorkBuddy HTML 可视化

- HTML 报告的共享品牌配色遵循 Agent 的"WorkBuddy HTML 共享配色"契约，本 Skill 不自行定义。
- 结果 ≥ 6 位时，若当前宿主提供 HTML/可视化产物能力，默认生成自包含的响应式 HTML 报告。用户明确要求 HTML 时不受人数限制。
- 宿主不支持 HTML 或生成失败时，回退为 Markdown 表格 + 摘要。
- HTML 报告必须包含：目标达人摘要卡片、相似达人排名列表（含相似度分、亮点标签、各维度得分展开区）、召回说明。
- 只使用内联 CSS/JavaScript，不依赖 CDN、远程字体或外部图片。
- 昵称、用户名及所有工具返回文本写入 HTML 前必须转义。

### 错误处理

| 情况 | 处理方式 |
|------|---------|
| 目标达人 Performance 查询失败 | 根据结构化错误（`shop_auth_invalid`/`oauth_invalid`/`rate_limited`等）按 Agent 规则分流 |
| 候选池为空（无人召回） | 说明该达人在当前市场的可召回范围（品类、粉丝量级、全市场）均未找到其他达人，建议换一个目标达人再试 |
| 候选池非空但精排后全部失败 | 展示目标达人摘要，说明精排阶段调用失败，建议稍后重试或换目标达人 |
| 精排候选全部成功但相似度偏低（最高分 < 0.3） | 结果仍正常展示，但在摘要中提示"未找到高度相似的达人，当前结果仅供参考" |
| `rate_limited` / `quota_exhausted` | 建议等待后重试，不主动调用 `authorize` |
| 上下文中没有 `creator_open_id` | 引导先搜索达人（`tiktok-creator-search` Skill）获取 ID，再使用本功能 |
