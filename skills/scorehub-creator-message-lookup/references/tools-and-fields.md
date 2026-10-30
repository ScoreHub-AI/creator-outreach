# 达人回复与站内沟通：工具与字段

本文件定义达人回复与站内沟通工具T05—T07的输入、结果及原字段映射，与04 工具定义与调用流程（开发对照，不随包发布）共同使用。执行流程见[SKILL.md](../SKILL.md)；新增包装字段与原API字段分别说明。

公共输入/返回、错误与续查格式见[公共契约](../../../agents/references/quick-lookup/common-contract.md)，标识区别见[编号和关联](../../../agents/references/quick-lookup/identifiers-and-relations.md)；共享预算、退避、恢复与跨组流程由[Agent共享规则](../../../agents/tiktok-creator-outreach.lookup-additions.md) 统一维护。下文只保留领域字段和必要边界。

## 1. 工具、范围与输入约定

| 工具 | 原接口及用途 | 范围/影响 |
| --- | --- | --- |
| T05 `list_creator_reply_notifications` | GET /extend/creator-reply-notification/list，数量按需复用stats/unread-badge | 本人接收通知＋当前选店；不标读 |
| T06 `get_creator_reply_notification` | GET /extend/creator-reply-notification/detail，必要时POST /extend/creator-reply-notification/read | 同上；明确打开才按需单条标读 |
| T07 `get_creator_chat_messages` | 必要时POST /extend/im/conversation定位，再POST /extend/im/messages | 当前店铺权限及官方授权；可能补存已查消息，不创建会话/发送 |

注册名不含宿主前缀，宿主沿现有 `mcp__scorehub__` 方式引用，已按此名注册。模型不填shop_id、receiver_member_id、登录身份、角色或凭证。所有业务编号按字符串传；适配到数字主键时核格式及安全整数。输入拒绝未定义字段。

公共 `continuation_token:string` 为新增可信续查凭据，不是原API参数。首次可省略，续查仅传该字段，不夹带view、对象或筛选；绑定账号/当前店铺/工具/原条件及已读未展示位置，逐次重验权限，不能当权限凭证。失效或范围变化时重新查询，不猜造token或自由传源页码。

## 2. T05 通知清单或计数

| 输入 | 类型/默认 | 原接口映射及边界 |
| --- | --- | --- |
| `view` | list/count，默认list | list源page=1/pageSize=20；count可pageSize=1取同条件total，裁掉无需展示明细 |
| `creator_account_keyword` | string，可选 | tkId，账号快照模糊匹配，不搜昵称/全文、不证明唯一达人 |
| `task_name_keyword` | string，可选 | taskName，名称快照模糊匹配，不是taskId精确筛选 |
| `message_type` | TEXT/IMAGE/PRODUCT_CARD/TARGET_COLLABORATION_CARD/FREE_SAMPLE_CARD/OTHER，可选 | messageType；未知返回可保留，不新增可传枚举 |
| `reply_time_start/reply_time_end` | 带时区ISO 8601 string，可分别省略 | replyTimeStart/End，筛replyAt，两端含，起晚于止invalid_input |
| `read_status` | all/unread/read，默认all | readStatus；未给日期不加日期，最近沿北京时间含今天近7自然日 |
| `continuation_token` | string，可选 | 恢复原成员/店铺/条件、源页及未展示位置 |

list模式 `result={rows,total}`；count模式 `result={total}`。rows按问题保留通知id、shopId、达人标识/昵称/账号、replyAt、messageType、summary、isRead/readAt、taskId/taskNameSnapshot、versionType及必要会话标识，不默认透完整内容快照或接收成员身份。按replyAt倒序，普通首批20条。

计数 `name=notification_total, unit=notification`，只代表同条件通知条数。优先list.total；stats忽略readStatus时不能用totalCount冒充未读量，须选同口径unreadCount等可靠值。unread-badge不能替代含账号、任务名、日期的筛选；todayCount不能直接当北京时间今天。无需同时调用所有计数入口，分次读不保证快照。

原接口无来源/taskId精确筛选。指定来源/任务必须按可靠关系复筛并另说明覆盖及计数。versionType来自列表补查私信任务，可空；详情不补此字段。展示资料更新不改变账号筛选仍匹配快照的事实。成功total=0仅代表当前范围无匹配通知，不证明从未回复；异常空页或失败不当零。`effects=[]`，`freshness.data_updated_at=null`，replyAt不是列表更新时间。

## 3. T06 通知详情与单条标读

输入仅 `notification_id:string` 必填，来自明确选中通知的真实id；不收批量编号、已读开关或read-all。缺定位先T05，有多候选不默认最新。

`result={notification}`，保留真实通知编号/店铺/达人/回复时间类型、summary、contentSnapshot、imageUrlSnapshot、isRead/readAt及可靠taskId/creatorImId/messageId。已存contentSnapshot文字可作正文，仅summary就仅称摘要；卡片不是当前申样或合作状态证明。长内容缺省、裁剪及未展示部分要说明，优先复用已取得内容。

原detail/read只核接收成员，MCP须执行：读取详情 → 可信端核接收成员及返回shopId为当前选店 → 才返回内容并按需单条read。归属不符/无法核实，停止返回内容且不标读。用户明确打开且未读才标该条，调用前/时提示；后台预取不标读。

`coverage.state=not_applicable`，`pagination=null`；原字段缺值保留。effects为 `kind=notification_mark_read`：原已读则status=not_attempted并说明；read业务成功则succeeded，仅说明标记请求成功或无需重复。原接口没有新改变条数/新readAt，不补造。返回isRead/readAt是标记前值，结果另说。内容成功但标记失败/未知用read_status=partial，effects=failed/unknown并说明；超时不盲重试。内容失败则不标，错误不推全系统不存在。

## 4. T07 站内聊天

| 首次输入 | 类型/关系 | 映射 |
| --- | --- | --- |
| `creator_im_id` | string，与tk_uid恰选一项 | 同店铺可靠标识 → messages.creatorImId |
| `tk_uid` | string，与creator_im_id恰选一项 | 已核IM侧达人UID → conversation.tkUid，取得creatorImId再查messages |
| `continuation_token` | string，仅续查单传 | 恢复同店铺/达人及官方nextPageToken，向更早消息读取 |

不把账号、昵称或openId当上述IM标识。原接口无指定历史conversationId、页大小、日期、方向或正文关键词筛选，不新增伪参数。目标日期/片段在有限读取中按返回字段判断。

`result={hasConversation,messages,hasMore,nextPageToken}`；做过定位时可另附已有conversationId/creatorImId。消息只保留实际id/messageId、createTime、senderRole、direction、messageType、安全裁剪content、source及必要taskId/replyToTaskId；内部senderId仅确有定位需要时保留。source是入库来源，不是方向。

任务关联按单条消息的真实字段解释：店铺出站消息的taskId表示产生该消息的发送任务；达人入站消息的replyToTaskId是系统关联到的最近出站任务，不代表达人主观回复原因。关联这条通知还须核对通知与聊天的messageId等可靠标识及同店铺/达人关系。缺少相应字段时不能凭时间相邻、同一达人或卡片内容把聊天归给指定任务，也不能把source当发送方向。字段为null保留未知。

首批最近固定20条，页内createTime/id正序，续查更早；仅能报实际本批消息数，不造聊天总数。优先展示已取余下消息，重复游标或无进展停止。

| 结果 | 解释及影响 |
| --- | --- |
| hasConversation=false且messages空 | 可能无本地会话，也可能被服务吞掉官方异常；coverage=unknown，公共pagination.has_more=null，说明无法区分，不照源hasMore=false宣称读尽/从未聊过 |
| 独立conversation定位明确未命中 | 可说未找到可用本地会话，不推平台从未联系 |
| hasConversation=true但本页空 | 按真实hasMore/token解释本页，不推全历史无消息 |
| 非空messages成功 | 已走syncQueriedMessages补存，effects.kind=chat_message_sync/status=succeeded；不报新增条数，不说全会话已同步 |
| 空消息 | 不推执行了补存 |
| 超时或同步异常 | 可能部分落库，effects=unknown，不按严格纯读自动重试 |

明确授权失效才用shop_auth_invalid；一般店铺不存在或合并空不猜权限原因。不调conversation/save或message/send，不标通知已读。

## 5. 公共结果、停止及依赖

公共返回、覆盖及错误格式以开头所链公共契约为准。本组区分通知条数与聊天消息条数；读取时刻不是消息同步时刻。正常首批不证明全部历史已同步，可靠空、被源服务合并的空结果和失败须分别解释。

共享读取、等待、限流和停止沿[Agent共享规则](../../../agents/tiktok-creator-outreach.lookup-additions.md)，不按工具或分支重开预算。通知标读或聊天补存结果未知时不套纯读重试。

通知任务关系按[编号和关联](../../../agents/references/quick-lookup/identifiers-and-relations.md)解释；查询顺序和缺关系时的停止由[SKILL.md](../SKILL.md#已有任务关系与停止)维护。

| 卖家问题 | 约定工具与输入 | 结果重点 |
| --- | --- | --- |
| 看看达人回复 | T05 `{}` | 本人当前选店、全部已读状态、不额外限日期；20条通知，不标读 |
| 多少未读？ | T05 `{"view":"count","read_status":"unread"}` | 同条件通知条数，不当人数 |
| 打开第二条 | T06的notification_id取已选真实id | 先可信核店铺，再按需标该条；内容/标记结果分开 |
| 看前后对话 | T07的creator_im_id取同店铺可靠标识 | 最近20条、向更早续查；合并空不说从未聊过 |

可解析的独立输入示例：

```json
{}
```

```json
{"view":"count","read_status":"unread"}
```

```json
{"message_type":"TEXT","creator_account_keyword":"alice"}
```

来源：browsercloudAPI.yaml通知list/stats/unread-badge/detail/read、IM conversation/messages；Browser-Plugin-Backend origin/main-v2提交839f6e17967c74bcd678854bb84ac112f082c041对应Controller/Service/DTO。身份及单条店铺检查、部署、分页、日期、维护行为及吞错限制见06 实现依赖与开发评审事项（开发对照，不随包发布）中的U03、U04、U12、U22、U23、U25；正式接入还须验证续查、字段裁剪和共享预算。

## 一期已确认支撑范围

S13保留，T12/T14仅纳入必要的direct_message分支；工具输入、父子校验顺序、当前配置/发送记录/回填内容区别见[跨组支撑工具契约](../../../agents/references/quick-lookup/reply-support-tool-contracts.md)。不重新打开通知标读，不扩整个任务分组，不开放邀约查询分支。
