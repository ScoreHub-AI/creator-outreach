# 邮件查询与发送统计：工具与字段

本文件定义邮件查询工具T08—T10的输入、结果及原字段映射，与04 工具定义与调用流程（开发对照，不随包发布）共同使用。执行流程见[SKILL.md](../SKILL.md)；新增包装要求与原云端能力分别说明。

公共输入/返回、错误与续查格式见[公共契约](../../../agents/references/quick-lookup/common-contract.md)，标识区别见[编号和关联](../../../agents/references/quick-lookup/identifiers-and-relations.md)；共享预算、退避、恢复与跨组流程由[Agent共享规则](../../../agents/tiktok-creator-outreach.lookup-additions.md) 统一维护。下文只保留领域字段和必要边界。

## 1. 工具与可信范围

| 工具 | 原接口 | 可信范围与影响 |
| --- | --- | --- |
| T08 `list_email_records` | GET /email/list；必要时内部只读GET /emailConfig | 当前成员配置邮箱；清单/计数及本人发件正文，不标读 |
| T09 `get_received_email` | GET /email/detail/{id} | 当前配置邮箱指定收件，原详情直接更新单封已读 |
| T10 `query_email_send_statistics` | GET /email/statistics、/email/statistics/list | 现有本人/管理团队主动发信汇总或记录，不获得他人正文权限 |

注册名不含宿主前缀，沿现有 `mcp__scorehub__` 引用形式，已按此名注册。输入JSON对象拒绝未定义字段，不开放邮箱登录身份、店铺、凭据、角色或权限声明。成员/团队编号只为已授权业务目标，不能替代调用身份；原数字主键须校验字符串格式及安全整数。

配置整行仅适配层内部读取，向模型最多提供配置存在/当前邮箱等安全摘要，不能透凭据。邮箱查询不机械套TikTok店铺授权门禁。

共用 `continuation_token:string` 是新增可信续查凭据，续查仅传它，不夹view/编号/筛选。须绑定身份、邮箱或实际目标、工具、原条件和已取未展示位置，每次重验权限，不可猜造或当权限凭证。源页码/token及缓存由可信端维护，失效明确重查。

## 2. T08 收发清单、计数与本人发件正文

| 输入 | 类型/默认 | 原映射及限制 |
| --- | --- | --- |
| `view` | list/count/sent_body，默认list | list首批page=1/size=20/isall=0；count正数size=1取同次count；sent_body仅已定位本人发件正文 |
| `direction` | all/received/sent，默认all | type分别序列化[0,1,2]/[1]/[0,2]；sent含主动及回复发信，不等于已成功发送 |
| `subject_keyword` | string，可选 | content，实际只对subject模糊匹配，不搜正文/地址/达人 |
| `email_time_start/email_time_end` | 带时区ISO 8601 string，必须成对或均省略 | 转原startTime/endTime筛emailDate；旧解析为YYYY-MM-DD HH:mm:ss，适配按核定服务时区转换，不直接塞偏移字符串；单边条件不得静默忽略 |
| `opened/replied` | boolean，可选 | openStatus/replyStatus，false须序列化字符串0，true为1；按收发方向解释 |
| `send_status` | integer 0/1/2/3/4，可选 | sendStatus=未发送/发送中/已发送/失败/接收；和方向矛盾须校验，不暗改方向 |
| `email_id` | string，仅sent_body必填 | 原list无id筛选；只可信已读上下文或有限安全定位的当前邮箱发件 |
| `continuation_token` | string，仅续查单传 | 原邮箱/条件/源页或已取正文位置 |

list/count不接收email_id。sent_body首次仅view＋email_id，不夹其他条件、不重套日期/状态；裸编号无可信邮箱及发件归属先安全定位，预算内不能定位就说明未能确认，不调用收件详情试探、不无限扫描。

| 模式 | data.result | 展示/计数 |
| --- | --- | --- |
| list | {list,count} | 逐封必要id、sendType、from/fromName、to/toName、subject、emailDate/createTime、sendStatus/openStatus/replyStatus、已有失败说明及可靠达人摘要；默认不展开正文 |
| count | {count} | `counts.name=email_record_total, unit=email_record`，来自同次list.count，不是去重人数 |
| sent_body | {email} | 同封摘要及安全提取body_text，coverage=not_applicable；正文续看只接已取内容 |

普通列表按createTime倒序，日期筛选/优先展示emailDate；缺emailDate只能另标createTime为系统记录时间。独立/email/count筛createTime，不替代list.count；size=0在实际管道回默认值，不当只计数能力。即使size=1也可能因补取达人资料整体失败，不可当成功零。地址/达人筛选原生不存在，相关页复筛后另说明覆盖及数量。

| 状态 | 收件含义 | 发件含义 |
| --- | --- | --- |
| openStatus | 系统内该封查看标记 | 系统记录的对方打开标记 |
| replyStatus | 系统记录我方已回复 | 系统记录对方已回复 |

这些标记不保证覆盖站外/未关联行为，不等于接受合作。原list已含text/html但不标读；可由可信适配层保存已授权正文供后续使用，重验归属后返回body_text，不能信任模型自行提供的历史正文。只取text或安全解析html，摘要/截断注明；不返回rawMessage路径或未加载附件。

身份/邮箱配置未确认，不能把原空/0当无邮件。缺配置沿公共upstream_error，user_message提示先完成系统邮箱配置、retryable=false，不假称授权过期。无法核范围停止，确知无权才permission_denied。effects=[]，读取时间非可靠更新时刻，freshness.data_updated_at无依据则null。管理员T10范围不扩大T08正文范围。

## 3. T09 打开指定收件正文

首次仅 `email_id:string` 必填，来自当前邮箱真实收件；长文续看仅 `continuation_token`，绑定同成员/邮箱/邮件，消费已取未展示正文，不再调用标读详情。不收方向、团队/成员、店铺、已读开关或批量编号。

调用前用可信T08记录或安全定位核 `sendType=1` 且to为当前配置邮箱。原detail只核id＋to，不能先调再补收件校验。裸ID无法确认时先定位，预算不足说明不能打开，不调用接口试探；发件正文交T08。

明确打开时提示会标已读，不另加确认。`result={email}`保留id、subject、双方地址/名称、emailDate/createTime、sendType、原返回openStatus/replyStatus及body_text。优先text，否则安全提取html可读内容；外链仅文字，不自动加载远程图片/跟踪链接/附件，缺值不补全文。detail未加载attachments/emailCreator，不承诺附件或完整往来；引用旧信只是本封内容。

`coverage=not_applicable`；仅长文分段续接可有公共pagination，该位置不是后端详情分页。业务成功表示已有openStatus=true更新完成，effects.kind=email_mark_read/status=succeeded；返回实体可能仍为更新前false，不据此报失败/重调或造readAt。超时/断网效果unknown，retryable=false，不盲重调。更新报错则没有正常成功详情，沿错误外层；先前T08内容可另标来源保留，不冒充本次成功。未取得记录不推全系统不存在。

## 4. T10 主动发信统计与记录

| 输入 | 类型/默认 | 映射及限制 |
| --- | --- | --- |
| `view` | summary/records/count，默认summary | summary只statistics七项；records首批20条/isall=0；count该列表size=1取同条件count |
| `target_scope` | default/self/member/team，默认default | default沿普通本人/管理员管理范围；self绑定当前成员；member/team须明确目标并复核权限 |
| `member_id/team_id` | string，条件必填且互斥 | member仅member_id→原user；team仅team_id→原team；default/self不收两项。可信映射系统编号，不能直接拿CRM编号当邮件成员/团队编号 |
| `created_time_start/created_time_end` | 带时区ISO 8601 string，成对或均省略 | startTime/endTime筛createTime；未给不加日期，最近用北京时间含今天近7自然日，汇总与明细复用同一绝对范围 |
| `send_status` | integer 0/1/2/3，仅records/count | 明细sendStatus；0须序列化字符串0。summary传此项invalid_input，不忽略后返回全状态指标 |
| `continuation_token` | string，仅记录续查单传 | 同实际目标范围/日期/状态/页次及未展示位置；summary无分页 |

成员可按需用T39可靠定位，团队若无可靠定位来源须追问或说明未定位，不创造团队搜索工具。原接口参数为user，不照搬CRM页面的memberId。普通成员指定他人时，不能接受后台忽略user后返回本人数据的退回结果；须先核目标。管理员默认本团队及manage_teams，说明实际纳入的配置邮箱。超管无筛选的原默认路径可能无from限制，安全范围未核定前停止并说明需明确可授权目标，不默认全系统。

缺成员/配置/范围外目标可被服务折为空/全零；没有安全证据确认目标/覆盖时只说明受限，不假装已有成员全量邮箱配置接口。

### 汇总指标与时间

summary `result={statistics}`，保留下列原指标，不补推未发送数或默认转化率。

| 字段 | 单位/含义 |
| --- | --- |
| total | 主动发信记录总数，含未发送等，不是成功数 |
| successTotal | 原系统发送成功记录数，不证明实际收到/打开/接受 |
| errorTotal | 失败记录数 |
| sendingTotal | 发送中记录数 |
| openTotal | 这批记录当前有打开标记的邮件记录数 |
| replyTotal | 这批记录当前有回复标记的邮件记录数 |
| linkOpenTotal | 关联累计点击事件次数，可重复，不是人数或封数 |

仅sendType=0，不含收到邮件或sendType=2回复信。日期限定创建于该期间的主动发信，打开/回复是当前标记、点击为关联累计，不能称行为都发生在所选期间；问今日收件回复应走T08按邮件时间查。打开/回复可交叉，不相加为总人数。summary coverage=not_applicable，无分页不代表全部历史齐备。

records/count `result={list,count}/{count}`，必要字段仅id、subject、双方地址、createTime/emailDate、sendStatus、openStatus/replyStatus、已有失败说明及可靠达人摘要；不透团队正文/html/rawMessage/附件/配置。按createTime倒序，count为同条件主动发信记录数。已打开/已回复没有原生筛选，须相关页复筛并另记覆盖/匹配数；源count不是复筛总数。状态明细不能冒充全状态汇总，分次取得不称同一快照。

effects=[]，freshness.data_updated_at=null。汇总与明细一支失败另一支可靠，可公共partial分别说明；原单次接口整体失败不能拆造成功指标，第一页不能重算全量。统计权限不取得团队正文权限，不调用T09或发送/补发/改状态。

## 5. 公共返回、分页及失败

公共返回、覆盖、分页及错误格式以开头所链公共契约为准。本组区分邮件清单计数与独立统计口径；未读集合会随查看变化，不能凭旧偏移去重保证不漏。T09长正文续接只消费已取内容，不产生后端详情分页或再次标读。

共享读取、等待、限流和停止沿[Agent共享规则](../../../agents/tiktok-creator-outreach.lookup-additions.md)，不按工具或分支重开预算。邮箱配置缺失不等于TikTok授权失效；正文标读结果未知不自动重试。

## 6. 代表性调用

下列编号/凭据应来自可信已读记录，不能将说明占位当真值。

| 问题 | 调用与重点 |
| --- | --- |
| 看看邮件 | T08 `{}`；当前成员邮箱收发合并20封，不默认未读/今天，不按店铺 |
| 多少封收到的合作邮件？ | T08 `{"view":"count","direction":"received","subject_keyword":"合作"}`；同条件封数，主题非全文 |
| 打开刚才收件 | T09 email_id取可靠当前邮箱收件id；提示标读，长文续看不重开 |
| 看本人发件正文 | T08 `view=sent_body`＋可靠发件email_id；不走收件详情 |
| 我主动发信怎么样？ | T10 `{"target_scope":"self"}`；当前标记/累计点击按创建期解释 |
| 我有哪些失败发信？ | T10 `{"view":"records","target_scope":"self","send_status":3}`；20封主动发信记录，不扩大团队 |

可解析的独立输入示例：

```json
{"direction":"received"}
```

```json
{"view":"count","direction":"received","subject_keyword":"合作"}
```

```json
{"target_scope":"self"}
```

```json
{"view":"records","target_scope":"self","send_status":3}
```

来源：browsercloudAPI.yaml邮件list/detail/statistics/statistics/list/emailConfig；Browser-Plugin-Backend origin/main-v2提交839f6e17967c74bcd678854bb84ac112f082c041的Controller/Service/Entity及CRM页面。权限、部署、分页、邮件口径、日期与维护行为见06 实现依赖与开发评审事项（开发对照，不随包发布）中的U03、U04、U12、U16、U22、U23、U25；接入须验证成员邮箱映射、续查缓存、字段裁剪及共享预算。

## 一期已确认支撑范围

T39必要的成员定位已纳入本期，详细输入/返回、范围、维护影响及编号映射边界见[跨组支撑工具契约](../../../agents/references/quick-lookup/reply-support-tool-contracts.md)。不包含店铺资格分支，不新增成员映射HTTP入口的承诺；可靠映射与鉴权需由开发提交证据，无映射不得以猜测替代。
