# TikTok Batch Creator Outreach — 批量达人建联

先创建会话再发送建联消息，多套模板轮换，速率控制降低 spam 风险。

## 触发条件

当用户提到以下意图时加载本技能：
- "给这些达人发消息/建联/联系"
- "批量发送建联消息"
- "创建会话并发消息给达人"
- "向达人发送合作邀请"

## 执行前必须确认

批量发送属多步操作，发送前**必须**与用户确认：
1. **品牌名**（模板变量 `{brand}`）
2. **佣金比例**（模板变量 `{commission}`）
3. 核对最终话术内容无误

## 执行方式（MCP 优先，两步建联）

对每个达人：

1. **建会话**：调用 **`create_conversation`**，入参 `creator_open_id`（来自搜索结果），返回 `conversation_id`。
2. **发消息**：调用 **`send_message`**，入参 `conversation_id` + `msg_type: "TEXT"` + `content`（模板填充后的文本）。

### 速率与话术

- 每条发送间隔 **5-8 秒 + 随机抖动**（间隔 <5s 会触发 429）。
- 3 套模板 A/B/C **轮换**（按序号取模），降低 spam 检测风险。模板见
  [references/message-templates.md](./references/message-templates.md)。
- 变量替换：`{name}`（达人昵称）、`{brand}`、`{commission}`。
- 深夜不发：默认按达人时区工作时间（9:00-21:00）发送。

### 输出

实时进度（每条 ✅/❌ + conversation_id + message_id）+ 最终汇总（成功/失败/跳过）。

## 关键陷阱

- `create_conversation` 必须用 **`creator_open_id`**（不是 `creator_user_id`，否则报 36009004 / 36009035）。
- `creator_open_id` **仅来自搜索接口**，分析接口不返回——务必从搜索结果透传。

## 降级：直接 API

```
POST /affiliate_seller/202508/conversations            Body: {"creator_open_id": "xxx"}
POST /affiliate_seller/202412/conversations/{id}/messages   Body: {"msg_type":"TEXT","content":"{\"content\":\"...\"}"}
```

## 错误处理

| 错误码 | 含义 | 处理 |
|--------|------|------|
| 36009004 | 必填字段缺失 | 检查字段名为 `creator_open_id` |
| 36009035 | 无效 open_id | 确保来自搜索结果 |
| 16030100 | 消息配额已用完 | 跳过该达人 |
| 16032001 | 区域不匹配 | 跳过该达人 |
| 45101004 | 日配额已用完 | 停止全部 |
| 36009002 | 请求过于频繁 | 指数退避重试 |
