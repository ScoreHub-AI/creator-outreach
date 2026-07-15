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

如果工具返回结构化 JSON，优先按 `error_type` 做分流，不要靠自然语言错误文本猜测。

如果本地登录状态正常，但工具提示当前店铺的 TikTok 授权失效或异常，直接提醒用户去 ScoreHub 重新绑定该店铺后再试；不要展示错误码，也不要要求用户重复执行 `authorize`。

如果工具提示请求过于频繁、持续限流或配额受限，直接提醒用户暂停发送、耐心等待并稍后继续；不要建议“重新授权拿一个干净的 token”，也不要主动走 `authorize`，除非用户自己明确要求重新授权。

### 速率与话术

- 每条发送间隔 **5-8 秒 + 随机抖动**（间隔 <5s 会触发 429）。
- 3 套模板 A/B/C **轮换**（按序号取模），降低 spam 检测风险。模板见
  [references/message-templates.md](./references/message-templates.md)。
- 变量替换：`{name}`（达人昵称）、`{brand}`、`{commission}`。
- 深夜不发：默认按达人时区工作时间（9:00-21:00）发送。

### 输出

实时进度（每条 ✅/❌ + conversation_id + message_id）+ 最终汇总（成功/失败/跳过）。

## 关键陷阱

- `create_conversation` 必须用 **`creator_open_id`**（不是 `creator_user_id`）。
- `creator_open_id` **仅来自搜索接口**，分析接口不返回——务必从搜索结果透传。

## 降级：直接 API

```
POST /affiliate_seller/202508/conversations            Body: {"creator_open_id": "xxx"}
POST /affiliate_seller/202412/conversations/{id}/messages   Body: {"msg_type":"TEXT","content":"{\"content\":\"...\"}"}
```

## 错误处理

| 问题类型 | 处理 |
|----------|------|
| `oauth_invalid` | 仅在真正未授权或本地 OAuth 失效时，才允许提示用户调用 `authorize` |
| 当前店铺的 TikTok 授权失效或异常 | 用中文提醒用户：本地登录状态正常，但当前店铺需要先到 ScoreHub 重新绑定后再试；不要展示错误码，不要要求重复 `authorize` |
| 建会话入参不对或达人标识无效 | 检查传入的是来自搜索结果的 `creator_open_id` |
| 消息配额已用完或当前达人不满足发送条件 | 跳过该达人，继续后续名单 |
| 日配额已用完 | 停止全部 |
| 请求过于频繁或持续限流 | 先提醒用户暂停发送、耐心等待并稍后继续；必要时有限退避重试。不要建议重新授权；只有用户明确要求时才走 `authorize` |
| 参数无效 | 提示用户修正名单、消息内容或建联参数，不走授权路径 |
