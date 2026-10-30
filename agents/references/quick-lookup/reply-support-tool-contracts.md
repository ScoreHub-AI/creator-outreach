# 一期回复与邮件：跨组支撑工具契约

本文件仅纳入用户已确认的S13私信任务追溯和S15成员定位，不开放完整任务或配置分组。沿原工具名及编号；正式注册及Schema须由开发对齐。参见[公共契约](./common-contract.md)、[编号与关系](./identifiers-and-relations.md)、[Agent共享规则](../../tiktok-creator-outreach.lookup-additions.md)及04工具定义（开发对照，不随包发布）。

## 1. 共用输入、范围和执行

模型输入JSON对象、additionalProperties=false，业务编号用string。可信端绑定当前成员/商户/权限；任务还绑定当前授权店铺。不可传身份、凭据、角色、page/size/isall或预算。普通安全读取补试、限流、共享10次/普通30秒、单次15秒或剩余时间、取消及停止均沿Agent规则，每个底层请求和定位页计入，不在支撑工具内重开预算。

continuation_token仅适用下文允许模式，续查只传该字段；绑定身份/权限、工具/对象/条件、任务店铺或成员定位范围、源位置和已取未展示内容，每次重验。缺工具/范围/真实关系就说明限制，不改用任意接口。字段裁剪不消除原详情可能加载整任务达人带来的上游大响应开销。新包装不能补出已清理记录或原服务吞掉的信号。

## 2. T12 get_outreach_task_config：S13所需私信任务配置

| 输入 | 类型与本期限制 |
| --- | --- |
| task_type | string必填，本期仅direct_message；invitation不开放 |
| task_id | string必填，通知已保存的真实ExtendSendTask主任务编号 |
| continuation_token | string，仅已取长内容续展时单传 |

底层GET /extendSendTask/detail/{id}，归属云端/插件中的云端任务服务；来源沿任务实际versionType，不凭通知名称猜版本。可信端在返回模型前核当前成员、当前店铺及任务归属。detail=null不是已取得配置；失败不换同名任务、不扫描任务列表。

direct_message表示本期ExtendSendTask查询分支；不开放invitation对应的独立邀约任务查询。ExtendSendTask.isInvitation仅为源标记，返回为is_invitation（缺失或不可识别为null），不能凭true/缺失、任务名称或邀约卡片将该关系转成invitation或拒绝查询。

result={task,config}。task按需保留task_type、真实id/name/versionType/shopId/status/createTime/sendType/scheduleTime及上述源标记；config保留保存顺序的contents(type/content)，以及用户确实询问的queryCondition/filterCondition/skipDays，不返回凭据、整包达人关系或无关联系方式。缺值不补造。

这是当前保存配置，可在执行前后被修改，不能称不可变的历史发送原文，也不能据配置推实际发送成功。单对象coverage=not_applicable；没有剩余内容时pagination=null，仅已取长内容允许展示续查，不造底层详情分页。effects=[]；data_updated_at无全范围可靠依据则null。

长文续查只展示首次已取配置，不重读任务详情；可信端仍重验当前身份与店铺范围，旧缓存不能在业务成员或店铺变化后继续展示。

## 3. T14 get_creator_task_send_records：指定私信任务的指定达人记录

| 输入 | 类型与本期限制 |
| --- | --- |
| task_type | string必填，本期仅direct_message |
| task_id | string必填，已保存真实私信主任务编号 |
| task_creator_row_id / tk_uid | string，恰选一项；前者为真实任务达人行ID，后者为任务记录侧可靠达人UID |
| continuation_token | string，仅续查单传，绑定任务/达人及定位和展示位置 |

| 顺序 | 底层接口/归属 | 关系及执行要求 |
| --- | --- | --- |
| 1 | GET /extendSendTask/detail/{id}；云端/插件：云端任务 | 先核父任务成员/当前店铺；已有可信且仍适用的T12父任务事实可复用，不强制重复取同一详情 |
| 2 | GET /extendSendTask/creators/{id}；同服务 | id仍为主任务ID；通过对应达人分页或可信已验证结果核父子及达人关系；原无精确达人筛选，tk_uid不能直传成不存在的上游查询参数 |
| 3 | GET /extendSendTask/creator/messages/{id}；同服务 | 此处id是真实任务达人行ID，核关系后才调用；首批page=1/size=20/isall=0，向后续查该行保存的发送记录 |

裸行ID也不能越过步骤1/2的父子验证，不能先取消息再猜归属。有限分页尚未找到只称已读范围未找到，不无界扫描。通知taskId指ExtendSendTask关系，不转成定向邀约；任务达人UID与IM tkUid须按真实来源核对，不因名称相近互换。

result={task,creator,messages,count}。保留真实任务/达人关系，消息id/type/content/status/result/order/handleTime/createTime及必要关系；首批最多20条，按order升序，同order按createTime/id升序。count为该行现存task_message_record数，不是聊天总数/人数。部分内容按当前主contents的order回填，必须标清回填及非历史原文；发送记录不同于双向聊天或送达/接受证明。

message_record只说明内容来自该达人现存任务消息记录，是否发送成功按实际status/result表达；task_config_backfill只说明按当前配置回填。两者均不能自行证明实际投递或回复原因。

父任务/达人行无权停止；记录清理与可靠空、失败分别表达，空行ID不查消息。达人行可靠但必要消息失败read_status=partial；不补0、不用配置冒充实际记录。effects=[]；单对象与分页记录分别说明覆盖，无可靠全范围更新时间则null。

## 4. T39 query_crm_members：S15所需成员定位

约定注册名为query_crm_members，沿原总工具表，不自行新增另一个成员工具。底层GET /members，接口归属CRM，当前商户未删除成员的合法定位，不使用仅管理员GET /members/{id}作为普通成员搜索。

| 输入 | 类型与本期限制 |
| --- | --- |
| view | list/count，默认list |
| realname_prefix | trim后string→realname，不区分大小写前缀，非任意包含 |
| username | trim后准确string，最长20 |
| role_filter | admin/bd，可选；映射HTTP role，不直接传role_filter |
| shop_qualification | 本期仅all_members，默认all_members；current_shop_assigned/current_shop_candidates不开放 |
| continuation_token | string，仅续查单传 |

“我”直接复用可信身份，不为本人统计强制调T39。按姓名/用户名定位时首批page=1/size=20，创建倒序；重名让用户选择，可靠原total用于成员计数。result={members,source_total}，白名单member_id/realname/nickname/username/role/status/frozen及确需created_at，不透authUserId、手机邮箱、passwordSet、AI配置、冻结原因、备注等。包含停用/冻结成员；status=1正常、0停用，不据列表推完整权限/可操作资格。

T39只取得CRM成员对象，不能把CRM成员ID直接传给邮件系统user。须经可信已有关系映射、确认邮件目标并校验统计权限；无可靠映射停止，不返回本人结果冒充他人，不凭同名/用户名/邮箱猜连。不新增团队名称搜索工具，不扩大T08/T09正文权限，不把成员列表当调用身份。

ACCOUNT_LIMIT检查可能异步维护过期订阅；按实际记effects.kind=subscription_status_maintenance/status=unknown，不声称一定发生，不说扣额度或修改权限。含维护的未知超时不按纯读盲重试。

## 5. 来源与本期裁剪

原任务Skill字段参考第1、3、5、8节及原公共support-tool-contracts.md的T39。原资料云端核查基线为839f6e17967c74bcd678854bb84ac112f082c041、CRM为6e58ab7a19277f4717fac000d9ed645c691d447d；不代表本次重核该提交或正式部署已验证。API文档的{id}占位在消息入口指达人行，不能与主任务id混用。T12/T14保留原名但仅注册本期direct_message分支；T39仅成员定位，不纳入其他支撑工具、完整任务Skill或店铺资格查询。
