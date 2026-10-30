# 样品申请工具与字段参考

本文件定义样品申请工具T01—T04的输入、结果及原字段映射，与04 工具定义与调用流程（开发对照，不随包发布）共同使用。执行分支见[SKILL.md](../SKILL.md)，共享身份、预算及恢复由Agent负责。

公共输入/返回、错误与续查格式见[公共契约](../../../agents/references/quick-lookup/common-contract.md)，标识区别见[编号和关联](../../../agents/references/quick-lookup/identifiers-and-relations.md)；共享预算、退避、恢复与跨组流程由[Agent共享规则](../../../agents/tiktok-creator-outreach.lookup-additions.md) 统一维护。下文只保留领域字段和必要边界。

## 1. 工具索引与身份

| 编号 | 约定注册名 | 已有业务接口 | 读取影响 |
| --- | --- | --- | --- |
| T01 | `list_sample_applications` | GET /extend/sample-application/list | 读取已有列表；不 expand、不刷新 |
| T02 | `get_sample_application_detail` | ①已有GET /extend/sample-application/detail（云端）；②CRM `GET /samples/sample-applications/{applicationId}`（固定 `x-api-version: 1`） | 先①校验申请，再②一次取得真实关联＋合作摘要＋寄样摘要并合并；不审批、不建单、不补同步 |
| T03 | `get_sample_sync_status` | GET /extend/sample-application/sync-status | 读共用状态，不启动任务 |
| T04 | `refresh_sample_applications` | POST /extend/sample-application/manual-refresh | 启动现有手动刷新，更新云端记录；不是严格只读 |

注册名不包含宿主前缀；宿主沿现有 `mcp__scorehub__` 形式引用，已按此名注册。四项云端请求均从可信当前选店绑定 `shopId` 并沿原服务校验；T02第二步还须可信商户/当前店铺CRM映射及CRM独立授权校验。模型输入不开放店铺、商户、成员身份或凭证。所有业务编号用字符串；不把长编号转成数字。输入对象拒绝未定义字段。

## 2. T01 清单输入

首次调用所有业务筛选均可选，省略即当前店铺、待审核、不额外限申请日期，源 `page=1/size=20`。模型不自由传页码或批次。

| 约定输入 | 类型/取值 | 原接口映射与含义 |
| --- | --- | --- |
| `status` | string；见下表 | 实际状态映射 `pageStatus`；省略默认 PENDING |
| `creator_keyword` | string | `creatorKeyword`；昵称/账号模糊匹配，非唯一身份 |
| `product_keyword` | string | `productKeyword`；仅商品标题模糊匹配，不是 PID/SKU |
| `applied_time_start` | 带时区 ISO 8601 string，可省略 | `appliedTimeStart`，起点包含 |
| `applied_time_end` | 带时区 ISO 8601 string，可省略 | `appliedTimeEnd`，终点包含；起晚于止为 invalid_input |
| `continuation_token` | string，可省略 | MCP 续查凭据，非原 API 参数；续查仅传它，与任何筛选同时传入为 invalid_input |

| 输入状态 | 业务标签 | 适配规则 |
| --- | --- | --- |
| PENDING | 待审核 | 传同名 pageStatus |
| AWAITING_SHIPMENT | 待发货 | 同上 |
| SHIPPED | 已发货 | 同上 |
| CONTENT_PENDING | 待内容发布 | 同上 |
| COMPLETED | 已完成 | 同上 |
| CANCELLED | 已取消 | 同上 |
| ALL | 全部状态 | 仅约定 MCP 值；适配时省略 pageStatus，不能把 ALL 传后端 |

一次原请求一个状态；多状态按实际接口组合。返回未知状态保留，但不擅自新增筛选枚举。日期实际过滤 `createdAtOfficial`，不是 `appliedAtOfficial`；部分记录可能是推算/首次观测时间，沿 U22，不声称官方精确申请时间。未给日期不限制；仅说最近按北京时间含今天近7自然日，回答写明日期，续查继承绝对范围。

临期、不可批准、资料不完整和精确商品编号没有对应的本工具输入。读取已有字段复筛，不能把这些条件假装传给原后端。缺字段不能当否或零。

### 清单结果与计数

`data.result` 保留 `total/page/size/tabCounts/groups`。各组保留 `groupKey`、达人标识、`applicationCount/statusSummary/applications` 及已有字段/空值。

| 字段/信息 | 使用方式与限制 |
| --- | --- |
| `total` | 达人组总数，不是申请条数，也不保证跨系统唯一人数 |
| `tabCounts` | 忽略状态筛选但保留关键词/日期；当前申请条数取所选状态项，ALL才取ALL项，缺项不补零 |
| `applications` | 同组内各条申请，不能只取第一条；因回答长度未展示完须保留位置 |
| `applicationId` | 平台申请编号，详情使用它；不是本地id、合作号或订单号 |
| `status/pageStatus` | 保留真实状态及页面分类，不用审核请求状态替代 |
| `productId/skuId/productTitle/skuName` | S17查询申请的商品及规格（SKU），商品编号、SKU编号和对应名称分别据实表达，缺失不猜测；精确编号核对不能用标题搜索代替 |
| `createdAtOfficial/appliedAtOfficial` | 保留来源字段；筛选实际使用前者，两者不能暗换 |
| `approveExpirationTime/shipmentExpirationTime` | 分别审核/发货截止，可空；无原生截止筛选/排序 |
| `isApprovable/disapprovableReasons` | 当时可批准标志及返回原因；空不等于false，原因空不猜 |
| `detailIncomplete` | 已有资料不完整标志；不据此自动 expand 或补同步 |
| `availableQuantity` | 可用样品库存，不是达人申请数量 |

普通首批源取20个达人组；不要求聊天一次展示完20组。已取未展示数据优先续接，不能直接翻页跳过。源 `page/size/total` 与真实记录判断分页；重复页、计数矛盾或数据变化须说明，不能仅凭空页证明官方全历史完整。无固定快照保证。复筛后不得沿用未复筛计数，未读完只报已读范围内发现的记录。

普通列表没有可靠整店更新时间，`freshness.data_updated_at=null`；读取时刻只表示读取时刻。

## 3. T02 详情及CRM只读关联输入与结果

输入仅 `application_id:string` 必填，映射 `applicationId`，必须是用户明确提供的真实平台申请编号或已读记录。即使申请已发货/完成，也不套 T01 的待审核或日期默认。

`data.result` 保留 `application/reviews`。申请详情按已有字段保留平台申请、达人账号/昵称、商品规格、状态、截止、可批准标志/原因及资料完整性；按卖家问题展示，不无差别倾倒所有字段。

| 字段/信息 | 解释边界 |
| --- | --- |
| `orderId/trackingNumber/fulfillmentStatus` | 系统保存的订单号/运单号/履约状态，不证明签收或提供完整物流轨迹 |
| `lastSyncAt/lastSyncSource` | 只适用本条申请，不能作为全店刷新时间或全量完整证明 |
| `reviews` | 按本地 createTime 倒序最多5条，无分页及审核总数；不是完整审核历史 |
| `reviewResult` | 审核请求的决定，与当前申请状态分开 |
| `requestStatus` | 请求处理状态，与决定及当前申请状态分开 |
| `operatorMemberId/rejectReason` | 真实记录的操作成员/拒绝理由，空不猜人或原因 |
| `submittedAt/confirmedAt/createTime` | 提交、确认、本地记录创建时间分别保留 |
| `errorCode/errorMessage` | 处理错误线索，不等于平台拒绝该申请；脱敏后按需解释 |

`SUBMITTING/SUBMITTED/CONFIRMING` 不是最终平台决定。`CONFIRMED` 仅表示系统标记确认，U30保留：已核代码没有独立核验该决定对应目标状态。`FAILED` 可能为确认超时，不当作达人申请被拒。审核记录为空也不能断言从未在官方后台审核。

`coverage.state=not_applicable`、`pagination=null`，注明最多5条审核请求；不能伪造 `has_more=false` 证明全部历史读完。若采用 `lastSyncAt` 作更新时间，basis 必须限定这条申请。


### 3.1 T02 CRM 关联入口与合并

T02 第二步调用 CRM `GET /samples/sample-applications/{applicationId}`，使用可信 merchant token，固定 `x-api-version: 1`，与云端申样共用 `SCOREHUB_BACKEND`。第二步沿第一步已校验的真实 `applicationId` 及可信商户/当前授权店铺映射；不允许模型补传身份，不凭同名、达人、品牌或商品猜关系。

`data.result` 保留 `application/reviews`，并新增 `crm`：

| 字段 | 运行时含义 |
| --- | --- |
| `crm.state` | `linked` / `not_found` / `unavailable` / `permission_denied` / `auth_failed` |
| `crm.basis` | 脱敏后的状态依据；不包含上游原报文、token 或异常堆栈 |
| `crm.complete` | 仅合作与寄样两层都成功读取且可汇总时为 true；否则 false |
| `crm.cooperation` | 合作摘要对象；可靠未匹配时为 null |
| `crm.sample` | 本次关联寄样摘要；无本次寄样或仅历史已有样时为 null |
| `crm.historical_sample` | `type=4` 或 `isVirtual=true` 的历史已有样记录；不计为本次寄样 |
| `crm.integration` | 当前仅能返回 `{state:"unknown"}`；接口未提供集成状态/原因 |

云端失败/对象校验失败即停止，不查 CRM。云端成功但 CRM 失败、权限不足或范围映射不明时保留可靠详情并 `read_status=partial`，不能用 `[]` 当成功未关联。CRM 可靠未匹配只答当前未查到可读取关联，不证明从未建单。两次业务请求计共享预算，不写 sync、不建单。

本次 CRM 契约一次只返回单个 `sample + cooperation`，无法证明或完整表达 1:N。`crm.complete=false` 时保留可用层，`limitations` 明确缺少合作层、寄样层、历史样区分或集成状态中的哪一部分；不得把单对象结果说成完整关系。完整 CRM 业务契约见开发对照 07（不随包发布）。

S17 定义为“商品与规格：他申请了什么商品、哪些规格（SKU）？”。S17 仅查询申请记录中的商品及规格（SKU），不包含申请件数、按 SKU 统计申请条数或样品订单寄送数量查询。不为此新增件数字段或调用订单明细接口。

### 3.2 合作与寄样摘要：运行时字段口径

下表使用 T02 实际返回的 `crm.*` 字段名；CRM Swagger 原始驼峰字段不作为 MCP 输出承诺。ID 均为 string，可空字段缺失时保留 null，未知不补造。

| 摘要 | 运行时字段 | 解释限制 |
| --- | --- | --- |
| 合作定位 | `cooperation.id`、`cooperation.opportunity_id`、`cooperation.brand.id/name` | 没有显示编码不制造；品牌不等于当前店铺 |
| 合作负责人 | `cooperation.owner.member_id/realname/nickname` | 当前负责人非创建人/操作人；姓名缺失不推无人负责 |
| 合作阶段 | `cooperation.status/status_label` | 0 未开始、1 待寄样、2 已寄样待履约、3 已有样待履约、4 部分履约、5 已履约、6 已结束；未知保留不猜；整单阶段不证明本条申请/SKU 履约 |
| 合作时间、备注 | `cooperation.created_at`、`cooperation.updated_at`、`cooperation.last_fulfilled_at`、`cooperation.remark` | 创建、更新与最近履约分开；空最近履约不判未履约；备注非完整历史/标准失败原因 |
| 寄样定位及类型 | `sample.id`、`sample.cooperation_id`、`sample.application_id`、`sample.code`、`sample.type`、`sample.type_label`、`sample.is_virtual` | 编号与当前申请真实关联；1 线下寄样、2 店铺申样、3 TAP 申样、4 历史已有样；历史已有样走 `historical_sample`，不冒充本次实际寄样 |
| 寄样负责人 | `sample.owner.member_id`、`sample.owner.member_name` | 与合作负责人分别保留，不同则说明；非发货操作人 |
| 寄样商品/SKU | `sample.products[].product_id/product_pid/product_name/sku_name` | 保留有权相关商品数组；缺 SKU 不补造平台 SKU ID；与申请商品分别标源，不互相覆盖 |
| 寄样登记状态 | `sample.status`、`sample.status_label` | 1 待发货、2 已发货；是 CRM 登记，不能推实时运输或签收 |
| 寄样时间、备注 | `sample.sample_at`、`sample.created_at`、`sample.remark` | 寄样登记日、记录创建日分开；备注按问题解释 |
| 已存物流 | `sample.logistics.company`、`sample.logistics.tracking_no`、`sample.logistics.shipped_at` | 承运商可能是字典 ID，名称须 CRM 侧可靠解析；运单、发货时间可空，缺失不证明未寄；不提供实时轨迹/签收 |

所有时间保留源含义和精度，带时区序列化并按既有北京时间规则展示，缺值不借其他时间补齐。只纳入当前申请真实关联寄样，不能把同合作其他申请的寄样全部带入。真实关联的有权已结束合作照常返回，不套普通合作列表排除已结束的默认条件。

本次摘要不包含申请件数、寄送数量、收货地址/电话、合作联系方式/邮箱、原负责人、分组、黑名单、内部释放期限、销售业绩、完整日志或视频/直播明细。现有寄样 quantity 缺失或 0 可能补 1，不能搬作可靠数量。S17 仍只查询申请商品及 SKU，不新增件数或订单明细查询。

已确认关联而合作/寄样摘要某层读取失败或受限：保留关联及可靠摘要，T02 标 `read_status=partial`，在 `crm.basis`/`limitations` 说明具体层/对象及覆盖，不以 null 冒充无记录。可选备注/时间等真实为空单列，不一律当接口失败。平台与 CRM 商品/状态/运单不一致时分别列源，不猜关联、负责人、未发货、未履约或失败原因。

### 3.3 详情回复及跨环节复用

普通详情先答申请本身，再用文字简述关联合作的品牌、当前负责人和阶段，以及关联寄样编码、登记商品/SKU、登记发货状态；已有可靠发货时间、承运商名称和运单号可简要附上。负责人不同时分别说明；合作创建/最近履约、寄样登记/创建时间及备注按问题展开。用户只问某一字段则只答相关信息，不倾倒全部字段，不只列编号。集成状态/原因与合作阶段/寄样登记状态分开。

合作内容或最近履约仅为合作级事实，不分配给每条申请/SKU，不凭CRM已发货判签收。普通详情不查视频/直播。S37原业务编排保持；后续具备相应领域工具时可直接复用T02中仍适用的可靠事实，需要更多信息才按真实关系继续查。本轮不加入T17/T22—T24、其他领域Skill或完整S37；不为摘要失败临时绕调未纳入工具。

模拟回复：这条申请的商品是保温杯、SKU白色500ml。已关联A品牌合作，由小林跟进，CRM阶段为“已寄样待履约”；关联寄样JY-001登记白色500ml保温杯、已发货。若返回可靠发货时间和运单号可简述；不能据此确认达人已签收或该SKU已发布。

## 4. T03 / T04 辅助契约


两项输入均为 `{}`，不收申请编号、task_id、状态、日期或关键词。

T03保留 `shopId/syncType/syncStatus/insertedCount/updatedCount/failReason/startedAt/finishedAt`。无可查记录时 shopId 仍有值，其余7项为null，不代表没有申请。`READY` 为等待、`RUNNING` 为同步中、`DONE` 必须检查 failReason；计数是新增/更新记录数，不是当前申请总数或去重人数。不提供进度百分比/预计完成时间。

T04对应云端申样页“手动刷新”，同步 `PENDING/AWAITING_SHIPMENT/SHIPPED/CONTENT_PENDING` 四类活跃申请；不是重载页面、按清单筛选刷新或全历史同步。返回 `operation_status=accepted/already_in_progress`，保留原 `shopId/syncType/syncStatus`，同义填入 effects，均不代表完成。

仅HTTP200且业务成功才作 accepted。只有已识别409且 `msg=SYNC_IN_PROGRESS`、取得可靠状态，才作 already_in_progress；其他409不套用。提交超时/断网结果unknown，`retryable=false`，不盲目重提。可查T03辅助核对，但状态属于当前店铺共用记录，会被后续同步覆盖，无独立 taskId/runId，不能精确证明本次提交或重建旧任务轨迹。

明确刷新后查询：T04 → 有限T03 → 按原条件重新T01。具体短等/轮询及退避规则见[Agent共享规则](../../../agents/tiktok-creator-outreach.lookup-additions.md)，不在本组重新计时或开预算。同步未结束、带失败原因或无法确认时，可展示可靠已有数据并注明“尚未确认完成刷新”，不称最新。finishedAt不是全店所有历史记录的完整更新时间。

## 5. 公共返回与错误的使用

公共格式以开头所链公共契约为准，不在本组复制完整字段表。申请条数、达人组数及复筛数须按本组真实字段分别解释；同步读取成功不等于同步业务成功。缺字段、失败与可靠空值分开；刷新提交结果未知不自动重提。统一续查按公共契约执行；凭据失效或范围变化须重查。

## 6. 代表性调用与回答核对

下例使用约定注册名；占位说明不是可发送的真实编号或凭据。

| 卖家问题 | 工具/输入 | 回答核对 |
| --- | --- | --- |
| 当前有哪些样品申请？ | T01 `{}` | 当前店铺、待审核、不限申请日期；分别报申请数和达人组数，展示本批及续查范围 |
| 全部状态呢？ | T01 `{"status":"ALL"}` | 省略原pageStatus，不称全历史已完整同步 |
| 哪些待发货申请快到截止？ | T01 `{"status":"AWAITING_SHIPMENT"}` 后复筛 | 不足24小时、已到单列/缺值未知；未读全不报完整临期总数 |
| 他申请了什么商品、哪些规格（SKU）？ | T01按已确认范围查询；已知申请编号则直接T02 | 展示申请记录中的商品及SKU编号和对应名称，缺失不猜测；不扩展件数统计或订单明细查询 |
| 看刚才那条详情，合作和寄样怎么样了？ | T02 `application_id`取已选记录真实applicationId；内部云端→CRM新入口 | 不套待审核或日期；最近最多5条审核；用文字展示真实关联＋合作摘要＋寄样摘要，分层状态及局部失败，不另查寄样列表 |
| 继续看 | T01仅传可靠返回的continuation_token | 先接未展示内容，原条件/绝对日期不变 |
| 刷新后再看看待审申请 | T04 `{}` → 有限T03 `{}` → T01 `{}` | 受理非完成，未确认完成要明说，最终仍只列待审核 |

可直接解析的独立输入示例：

```json
{}
```

```json
{"status":"ALL"}
```

```json
{"status":"AWAITING_SHIPMENT","creator_keyword":"alice"}
```


## 7. 关联边界与实现依赖

原4条云端接口未暴露申请→CRM可靠只读关系，这是现状；本轮已确认新增CRM专门只读入口补齐，由T02第二步调用。orderId不是合作号，不用写sync或同人同商品猜关系。缺审核人可复用活跃合作负责人仍属既有写入规则，不是可读映射证据。

CRM 关联失败、未匹配或部署未具备时如实解释，不能把受限回答当作一期目标完成。U30继续沿原分层解释，不增加单次审核生效机制。S17沿现有商品及SKU字段查询，不新增件数字段或订单明细调用。

原云端字段证据为browsercloudAPI.yaml及Browser-Plugin-Backend origin/main-v2基线839f6e17967c74bcd678854bb84ac112f082c041。本轮CRM新入口及关联＋合作摘要＋寄样摘要范围、S17商品与规格（SKU）定义来自用户明确确认；CRM字段另经本地接口文档及后端df46e7586f3353f1b63c5c1300ad7874338069cd只读核对，详见08，不等于线上验证。实际部署/正式契约及权限须开发提供证据，见06（开发对照，不随包发布）和07（开发对照，不随包发布）。
