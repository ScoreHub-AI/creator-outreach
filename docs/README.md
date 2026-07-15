# creator-outreach — 业务背景与功能说明

> **实现状态**: 本文档描述目标功能全景。已实现：Agent 定义、插件清单、三个 Skill（MCP 优先调用）、评分模型/消息模板的口径文档、`create_conversation` 建联链路（sdk→mcp-remote→mcp-server）。仍在开发：配额感知。消息监听（达人回复接收/分类）当前不做。当前进度详见 [ROADMAP.md](./ROADMAP.md)。

## 业务背景

TikTok Shop 卖家需要持续找达人合作带货。传统方式是在 TikTok Creator Marketplace 网页上手动搜索、一一点击达人主页看数据、逐个发私信——效率极低，且无法批量操作。

「Tiky」是 ScoreHub 平台的首个 AI 智能体，目标是将达人建联流程从「手动点网页」升级为「对话式操作」。卖家在 WorkBuddy 中对 Tiky 说「帮我搜美妆类目、GMV 1000-10000 的达人，分析前 5 个的表现，然后群发建联消息」，Tiky 自动完成整个流程。

## 功能说明

### 达人搜索

按以下维度搜索 Creator Marketplace 中的达人：

- 关键词（TikTok 用户名/昵称）
- GMV 区间（0-100 / 100-1000 / 1000-10000 / 10000+）
- 销量区间（0-10 / 10-100 / 100-1000 / 1000+）
- 类目筛选
- 粉丝画像（年龄、性别、地区）
- 内容表现（平均播放量、互动率）

### 达人分析

获取单达人近 30 天表现数据：

- 带货数据：GMV、销量、客单价
- 粉丝画像：年龄分布、性别比例、地区分布
- 内容表现：视频数、平均播放量、互动率
- 合作类目分布

按自定义评分模型（带货能力 30% + 内容影响力 25% + 粉丝规模 15% + 品类匹配 20% + 粉丝质量 10%）对达人打分排序。

### 批量建联

- **两步建联**：先创建会话（`create_conversation`，用 `creator_open_id`）拿 `conversation_id`，再发送消息（`send_message`）
- 发送 5 种类型消息：文本（TEXT）、商品卡片（PRODUCT_CARD）、定向合作邀请（TARGET_COLLABORATION_CARD）、免费样品邀请（FREE_SAMPLE_CARD）、图片（IMAGE）
- 消息模板变量替换（`{name}` / `{brand}` / `{commission}`，3 套模板轮换）
- 速率控制（5-8 秒间隔 + 随机抖动，防触发频率限制）

## 调用方式

### 优先：MCP 工具

通过 ScoreHub MCP Connector 调用远程端点：

```
search_creators      → 达人搜索（返回 creator_open_id）
creator_performance  → 达人表现分析
create_conversation  → 创建达人会话（建联前置，用 creator_open_id）
send_message         → 发送建联消息
authorize            → OAuth 授权
status               → 连接状态
```

`authorize` / `status` 只表示本地 MCP 登录状态正常。如果真实工具调用时提示当前店铺的 TikTok 授权已失效或异常，处理方式是先到 ScoreHub 重新绑定该店铺，而不是反复重新做本地 OAuth 登录。

如果工具提示请求过于频繁、持续限流或配额受限，处理方式是先等待、分批重试或缩小本次请求范围；不要把这类问题当作授权失效，也不需要为了解除限流去重新登录。只有用户自己明确要求重新授权时，才应走浏览器授权。

底层远程工具会返回结构化错误类型，智能体据此稳定区分：

- `oauth_invalid`：本地 ScoreHub 登录失效
- `shop_auth_invalid`：店铺 TikTok 授权失效或异常
- `rate_limited` / `quota_exhausted`：限流或配额问题
- `invalid_input`：请求参数不合法

### 降级：直接 API 调用

当 MCP 不可用时，通过环境变量中的 TikTok API 凭证直接调用。

## 技术架构

```
WorkBuddy (Agent Host)
    │
    ▼
Tiky 智能体 (creator-outreach)
    │ MCP 协议
    ▼
@scorehub/mcp-server (本地代理)
    │ Streamable HTTP
    ▼
mcp-remote (远程端点)
    │ @scorehub/tiktok-sdk
    ▼
TikTok Shop Partner API
```

## 部署方式

智能体通过 WorkBuddy 专家市场发布。用户安装后，配置 ScoreHub MCP Server 即可使用。

## 常见授权问题

- **浏览器已经登录成功，但搜索/分析/建联仍失败**：
  这通常不是本地 MCP 登录问题，而是当前店铺的 TikTok 授权已失效、撤销、过期或不匹配。应先到 ScoreHub 重新绑定该店铺，再回到 Tiky 重试。

## 常见限流问题

- **短时间内连续调用后被提示请求过于频繁**：
  这通常是频率或配额问题，不是 token 不干净，也不是必须重新授权。应先等待一段时间，再分批重试或缩小本次操作范围。除非用户自己明确要求，否则不要引导重新授权。

## 三个工程关系

详见 [架构总览](../../../docs/ARCHITECTURE.md)
