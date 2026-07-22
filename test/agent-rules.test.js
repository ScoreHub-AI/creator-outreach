const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const agentPath = path.join(__dirname, '..', 'agents', 'tiktok-creator-outreach.md');
const agent = fs.readFileSync(agentPath, 'utf8');
const searchSkillPath = path.join(__dirname, '..', 'skills', 'tiktok-creator-search', 'SKILL.md');
const searchSkill = fs.readFileSync(searchSkillPath, 'utf8');
const searchFiltersPath = path.join(__dirname, '..', 'skills', 'tiktok-creator-search', 'references', 'creator-search-filters.md');
const searchFilters = fs.readFileSync(searchFiltersPath, 'utf8');
const analysisSkillPath = path.join(__dirname, '..', 'skills', 'tiktok-creator-analysis', 'SKILL.md');
const analysisSkill = fs.readFileSync(analysisSkillPath, 'utf8');
const scoringModelPath = path.join(__dirname, '..', 'skills', 'tiktok-creator-analysis', 'references', 'scoring-model.md');
const scoringModel = fs.readFileSync(scoringModelPath, 'utf8');
const outreachSkillPath = path.join(__dirname, '..', 'skills', 'tiktok-batch-outreach', 'SKILL.md');
const outreachSkill = fs.readFileSync(outreachSkillPath, 'utf8');
const messageTemplatesPath = path.join(__dirname, '..', 'skills', 'tiktok-batch-outreach', 'references', 'message-templates.md');
const messageTemplates = fs.readFileSync(messageTemplatesPath, 'utf8');
const docsReadmePath = path.join(__dirname, '..', 'docs', 'README.md');
const docsReadme = fs.readFileSync(docsReadmePath, 'utf8');
const packageReadmePath = path.join(__dirname, '..', 'README.md');
const packageReadme = fs.readFileSync(packageReadmePath, 'utf8');
const packageReadmeEnPath = path.join(__dirname, '..', 'README.en.md');
const packageReadmeEn = fs.readFileSync(packageReadmeEnPath, 'utf8');
const onboardingPath = path.join(__dirname, '..', 'docs', 'WORKBUDDY_PUBLIC_ONBOARDING.md');
const onboardingDoc = fs.readFileSync(onboardingPath, 'utf8');
const repositoryRoot = path.join(__dirname, '..', '..', '..');
const agentsDoc = fs.readFileSync(path.join(repositoryRoot, 'AGENTS.md'), 'utf8');
const claudeDoc = fs.readFileSync(path.join(repositoryRoot, 'CLAUDE.md'), 'utf8');
const packageJson = require('../package.json');
const pluginJson = require('../.codebuddy-plugin/plugin.json');
const {
  CREATOR_OUTREACH_SELF_BOOTSTRAP_COMMAND,
  WORKBUDDY_SHARE_URL,
} = require('../install.js');

function getMarkdownSection(source, heading) {
  const start = source.indexOf(heading);
  assert.notEqual(start, -1, `Missing section: ${heading}`);
  const contentStart = start + heading.length;
  const nextHeading = source.indexOf('\n## ', contentStart);
  return source.slice(start, nextHeading === -1 ? source.length : nextHeading).trim();
}

test('keeps the agent as the single authority for shared behavior', () => {
  assert.match(agent, /共享行为规范的唯一权威来源/);
  assert.match(agent, /`skills\/\*\/SKILL\.md` 是各领域特有.*权威来源/);
  assert.match(agent, /共享行为冲突时以本文件为准，领域专项行为冲突时以对应 Skill 为准/);
  assert.match(agent, /`docs\/README\.md` 与包级 README 仅做产品、安装和协作文档说明/);
});

test('keeps the WorkBuddy HTML brand palette in the agent', () => {
  assert.match(agent, /WorkBuddy HTML 共享配色/);
  assert.match(agent, /--color-primary: #6e38f5/);
  assert.match(agent, /--color-primary-hover: #5f2be0/);
  assert.match(agent, /--color-primary-active: #5120c7/);
  assert.match(agent, /--color-primary-soft: #f1ecff/);
  assert.match(agent, /--color-primary-subtle: #faf8ff/);
  assert.match(agent, /--color-primary-border: #d9ccff/);
  assert.match(agent, /--color-primary-focus: rgba\(110, 56, 245, 0\.25\)/);
  assert.match(agent, /成功、警告和错误状态.*绿、黄和红语义色/);
  assert.match(searchSkill, /共享品牌配色遵循 Agent/);
  assert.match(analysisSkill, /共享品牌配色遵循 Agent/);

  const paletteValue = /#6e38f5|#5f2be0|#5120c7|#f1ecff|#faf8ff|#d9ccff|rgba\(110, 56, 245, 0\.25\)/;
  assert.doesNotMatch(searchSkill, paletteValue);
  assert.doesNotMatch(analysisSkill, paletteValue);
});

test('recognizes account and shop switching only after bootstrap is ready', () => {
  assert.match(agent, /bootstrap 返回 `ready` 后，再识别以下明确意图/);
  assert.match(agent, /bootstrap 未完成时不执行.*`authorize` 或 `status`/);
  assert.match(agent, /\{ "switch_shop": true \}/);
  assert.match(agent, /\{ "force": true \}/);
  assert.match(agent, /你想切换账号还是店铺？/);
  assert.match(agent, /不得先输出欢迎语/);
});

test('centralizes runtime recovery and error routing in the agent', () => {
  assert.match(agent, /本地运行环境恢复（仅限明确证据）/);
  assert.match(agent, /普通的 MCP 工具不可见.*不是.*运行环境缺失的证据/);
  assert.match(agent, /优先复用 WorkBuddy 已捆绑且可用的 Node\.js \/ npx/);
  assert.match(agent, /`node --version`、`npm --version`、`npx --version`/);
  assert.match(agent, /WorkBuddy.*捆绑 Node\.js \/ npx/);
  assert.match(agent, /必须等待用户明确确认/);
  assert.match(agent, /https:\/\/nodejs\.org\/en\/download/);
  assert.match(agent, /NodeSource/);
  assert.match(agent, /不得静默下载、安装或修改 PATH/);
  assert.match(agent, /不要将 `shop_auth_invalid`、`oauth_invalid`、`rate_limited` 或 `quota_exhausted` 误判为运行环境问题/);
  assert.match(agent, /`oauth_invalid` → 允许建议 `authorize`/);
  assert.match(agent, /`shop_auth_invalid` → 提示去 ScoreHub 重新绑定店铺/);
});

test('enforces the WorkBuddy bootstrap state machine before the standard welcome', () => {
  assert.match(agent, /npx -y @scorehub\/creator-outreach@latest bootstrap --check --json/);
  assert.match(agent, /`uninitialized`/);
  assert.match(agent, /`restart_required`/);
  assert.match(agent, /`repair_required`/);
  assert.match(agent, /`ready`/);
  assert.match(agent, /bootstrap --install --json/);
  assert.match(agent, /bootstrap --update --silent --json/);
  assert.match(agent, /后续静默更新/);
  assert.match(agent, /不再对每个 creator-outreach 新版本重复询问/);
  assert.match(agent, /必须等待用户明确确认/);
  assert.match(agent, /重新打开分享链接/);
  assert.match(agent, /`config_source\.managed_by = "@scorehub\/creator-outreach"`/);
  assert.doesNotMatch(agent, /没有明确信号时，不猜测、不阻塞欢迎语/);
});

test('keeps shared runtime and authorization rules out of the skills', () => {
  for (const skill of [searchSkill, analysisSkill, outreachSkill]) {
    assert.match(skill, /遵循 Agent 的权威规则，本技能不重复展开/);
    assert.doesNotMatch(skill, /https:\/\/nodejs\.org\/en\/download/);
    assert.doesNotMatch(skill, /NodeSource/);
    assert.doesNotMatch(skill, /`oauth_invalid`/);
    assert.doesNotMatch(skill, /`shop_auth_invalid`/);
    assert.doesNotMatch(skill, /`rate_limited`/);
    assert.doesNotMatch(skill, /`quota_exhausted`/);
  }
});

test('confirms shop details after a successful authorization or shop switch', () => {
  assert.match(agent, /当前登录账号：`<工具返回的手机号码>`/);
  assert.match(agent, /当前授权店铺：`<工具返回的店铺名称>`/);
  assert.match(agent, /店铺所属国家：`<工具返回的国家>`/);
  assert.match(agent, /店铺关联品牌：`<工具返回的品牌>`/);
  assert.match(agent, /“未绑定”与“未获取”也必须如实告知/);
});

test('constrains creator search results to the stable presentation contract', () => {
  assert.match(searchSkill, /禁止直接展示 MCP 原始 JSON/);
  assert.match(searchSkill, /排名 \/ 昵称 \/ 用户名 \/ 粉丝数 \/ 近 30 天 GMV 区间 \/ 类目 \/ 达人 ID/);
  assert.match(searchSkill, /默认保持 `search_creators` 返回顺序/);
  assert.match(searchSkill, /https:\/\/www\.tiktok\.com\/@\{username\}/);
  assert.match(searchSkill, /“昵称”列应链接到该主页/);
  assert.match(searchSkill, /“用户名”列继续显示纯文本 `@username`/);
  assert.match(searchSkill, /不要向用户展示 `page_token`/);
  assert.match(searchSkill, /调用 `creator_performance` 时将该值放入兼容入参 `creator_user_id`/);
  assert.match(searchSkill, /调用 `create_conversation` 时将同一个值放入 `creator_open_id`/);
  assert.match(searchSkill, /达人 ID 不可用/);
  assert.match(searchSkill, /选择 2 位及以上达人进行相对评分排名/);
  assert.match(searchSkill, /未找到符合条件的达人/);
  assert.match(searchSkill, /`category_details\[\]\.local_name`/);
  assert.match(searchSkill, /主列表最多显示 3 个名称，更多显示“\+N”/);
  assert.match(searchSkill, /未识别类目（N）/);
  assert.match(searchSkill, /不得展示 `category_details\[\]\.id` 或 `category_ids`/);
  assert.match(searchSkill, /闭环校验继续使用原始 `category_ids`/);
});

test('keeps internal search parameters private and caps a search session at 60 creators', () => {
  assert.match(searchSkill, /不新增等待用户二次确认的回合/);
  assert.match(searchSkill, /最终实际生效的条件作为本轮搜索条件/);
  assert.match(searchSkill, /用户未指定数量时，默认展示 20 位达人/);
  assert.match(searchSkill, /超过 60 时按 60 执行/);
  assert.match(searchSkill, /首次搜索和“继续翻页”视为同一搜索会话/);
  assert.match(searchSkill, /累计展示 60 位时必须停止/);
  assert.match(searchSkill, /“已应用画像”/);
  assert.match(searchSkill, /不得包含内部字段、枚举、类目 ID、搜索键、分页令牌或目标展示人数/);
  assert.match(searchSkill, /同时传入首次响应的 `search_key`/);
  assert.ok(searchSkill.indexOf('**结果摘要**') < searchSkill.indexOf('**达人列表**'));
  assert.match(searchSkill, /本次搜索已达到 60 位达人上限；请调整条件后重新搜索/);
  assert.match(agent, /用户未指定数量时默认展示 20 位；同一搜索会话累计最多展示 60 位/);
  assert.match(agent, /分页.*遵循 `tiktok-creator-search` Skill/);
});

test('keeps the welcome example and capability promises aligned with actual behavior', () => {
  assert.match(agent, /帮我找 20 位印尼美妆达人/);
  assert.doesNotMatch(agent, /帮我找 5 位印尼美妆达人/);
  assert.match(agent, /粉丝 1万–10万.*女性粉丝占比至少 60%.*带货视频平均播放 5000\+.*快速增长的独立达人/);
  assert.doesNotMatch(agent, /粉丝画像（年龄、性别、地区）/);
  assert.match(packageReadme, /GMV、销量、粉丝量级与年龄\/性别、内容表现和合作特征/);
  assert.match(packageReadme, /女性粉丝占比至少 60%.*带货视频平均播放 5000\+/);
  assert.match(packageReadmeEn, /units sold, follower count and age\/gender profile, content performance, and collaboration traits/);
  assert.match(agent, /单人给出画像与合作建议，2 位及以上可进行 100 分制相对评分排名/);
  assert.doesNotMatch(agent, /为每位达人给出 100 分制综合评分/);
  assert.match(agent, /不具备剩余配额查询或逐次精确消耗统计能力/);
  assert.doesNotMatch(agent, /每次操作都会告知消耗量/);
  assert.match(agent, /本包无持久化存储/);
  assert.doesNotMatch(agent, /建联记录都保留完整/);

  assert.match(outreachSkill, /不支持定时或跨时区调度/);
  assert.doesNotMatch(outreachSkill, /9:00-21:00/);
});

test('only asks for category confirmation when multiple matches remain ambiguous', () => {
  assert.match(searchSkill, /多个同样合理/);
  assert.match(searchSkill, /无法.*用户原话判定/);
  assert.match(searchSkill, /唯一明确匹配时直接/);
  assert.match(agent, /类目解析.*遵循 `tiktok-creator-search` Skill/);
});

test('uses WorkBuddy AskUserQuestion for ambiguous creator search filters', () => {
  assert.match(searchSkill, /`AskUserQuestion`/);
  assert.match(searchSkill, /`multiSelect: true`/);
  assert.match(searchSkill, /2–4 个.*选项/);
  assert.match(searchSkill, /已给出的可执行条件不二次确认/);
  assert.match(searchSkill, /类目.*自定义输入.*`keyword`.*`get_categories`/);
  assert.match(searchSkill, /自由文本.*类目 ID/);
  assert.match(searchFilters, /`0–100` \/ `100–1K` \/ `1K–10K` \/ `10K\+`/);
  assert.match(searchSkill, /同一次 `AskUserQuestion` 中提交两个问题/);
  assert.match(searchSkill, /取消.*不调用 `search_creators`/);
  assert.match(searchSkill, /最多 4 个带编号的文本选项/);
  assert.match(searchSkill, /不使用 Markdown 表格/);
  assert.doesNotMatch(searchSkill, /用(?:\*\*)?表格展示(?:\*\*)?.*让用户确认/);
  assert.match(searchSkill, /规范化名称完全匹配.*名称包含关键词.*工具原始返回顺序/);
});

test('guides zero-condition searches and keeps filter mappings in their reference owner', () => {
  assert.match(searchSkill, /品类与身份 \/ 商业表现 \/ 粉丝受众 \/ 内容与合作特征/);
  assert.match(searchSkill, /没有提供任何可执行条件时，不立即调用 `search_creators`/);
  assert.match(searchSkill, /输入“直接搜索”/);
  assert.match(searchSkill, /至少一个可执行条件，就直接搜索/);
  assert.match(searchFilters, /筛选字段、自然语言映射、取值范围和互斥关系的唯一权威来源/);
  assert.match(searchFilters, /`follower_demographics\.gender_distribution`/);
  assert.match(searchFilters, /`content_performance\.avg_shoppable_video_views`/);
  assert.match(searchFilters, /`affiliate_data\.creator_agency_staus`/);
  assert.match(searchFilters, /本阶段不传 `advanced_filters`/);
  assert.match(searchFilters, /“地区”不是粉丝受众筛选字段/);
  assert.match(docsReadme, /creator-search-filters\.md/);
  assert.doesNotMatch(searchSkill, /GMV_RANGE_0_100/);
  assert.doesNotMatch(agent, /AGE_RANGE_18_24/);
  assert.doesNotMatch(agent, /creator_agency_staus/);
});

test('keeps creator-search implementation details out of the agent', () => {
  assert.match(searchSkill, /达人搜索专项行为的权威来源/);
  assert.match(agent, /搜索参数.*遵循 `tiktok-creator-search` Skill/);
  assert.doesNotMatch(agent, /`multiSelect: true`/);
  assert.doesNotMatch(agent, /GMV_RANGE_0_100/);
  assert.doesNotMatch(agent, /child_category_id_list/);
  assert.doesNotMatch(agent, /`page_token`/);
  assert.doesNotMatch(agent, /rel="noopener noreferrer"/);
  assert.doesNotMatch(agent, /HTML 产物通道/);
});

test('constrains creator scoring results and avoids misleading single-creator scores', () => {
  assert.match(analysisSkill, /达人分析与评分专项行为的权威来源/);
  assert.match(analysisSkill, /禁止直接展示 MCP 原始 JSON/);
  assert.match(analysisSkill, /不输出综合分或五维相对分/);
  assert.match(analysisSkill, /至少需要 2 位候选人才可评分排名/);
  assert.match(analysisSkill, /排名 \/ 达人 \/ 综合分 \/ 带货能力 \/ 内容影响力 \/ 粉丝规模 \/ 品类匹配 \/ 粉丝质量 \/ 标签/);
  assert.match(analysisSkill, /综合分降序.*带货能力分.*内容影响力分.*粉丝数降序/);
  assert.match(analysisSkill, /失败值作为 0 分参与排序/);
  assert.match(analysisSkill, /入参名保留为 `creator_user_id`，其值必须直接使用搜索结果中的 `creator_open_id`/);
  assert.match(analysisSkill, /`creator_performance` 不返回该 ID/);
  assert.match(analysisSkill, /评分对象范围/);
  assert.match(analysisSkill, /评分公式、权重、标签、字段映射和缺失值计算的唯一权威来源/);
  assert.doesNotMatch(analysisSkill, /\| 带货能力 \| 30% \|/);

  assert.match(scoringModel, /综合评分 = 带货能力×30%.*粉丝质量×10%/);
  assert.match(scoringModel, /## MCP 字段映射说明/);
  assert.match(scoringModel, /## 参考实现（Python）/);
  assert.match(scoringModel, /`score_creator\(\)` 仅用于帮助理解/);
  assert.match(scoringModel, /不是独立权威口径/);
  assert.match(scoringModel, /以上文正文中的明文规则为准/);
  assert.match(scoringModel, /def score_creator\(c, all_creators\):/);
});

test('keeps outreach-specific confirmation and delivery rules in the outreach skill', () => {
  assert.match(outreachSkill, /小范围达人建联验证专项行为的权威来源/);
  assert.match(outreachSkill, /发送前\*\*必须\*\*与用户确认/);
  assert.match(outreachSkill, /品牌名/);
  assert.match(outreachSkill, /佣金比例/);
  assert.match(outreachSkill, /`create_conversation`/);
  assert.match(outreachSkill, /`send_message`/);
  assert.match(outreachSkill, /5-8 秒 \+ 随机抖动/);
  assert.match(outreachSkill, /话术正文、轮换规则和变量定义的唯一权威来源/);
  assert.doesNotMatch(outreachSkill, /3 套模板 A\/B\/C/);
  assert.match(outreachSkill, /`creator_open_id` \*\*仅来自搜索接口\*\*/);

  assert.match(messageTemplates, /3 套英文模板轮换发送/);
  assert.match(messageTemplates, /`\{name\}` 达人昵称、`\{brand\}` 品牌名、`\{commission\}` 佣金比例/);
  assert.match(messageTemplates, /## Template A/);
  assert.match(messageTemplates, /## Template B/);
  assert.match(messageTemplates, /## Template C/);
  assert.match(messageTemplates, /发送前确认行为由建联 Skill 统一规定/);
});

test('keeps analysis and outreach implementation details out of the agent', () => {
  assert.match(agent, /评分模型.*遵循 `tiktok-creator-analysis` Skill/);
  assert.match(agent, /发送前确认.*遵循 `tiktok-batch-outreach` Skill/);
  assert.doesNotMatch(agent, /带货能力30%/);
  assert.doesNotMatch(agent, /PRODUCT_CARD/);
  assert.doesNotMatch(agent, /TARGET_COLLABORATION_CARD/);
  assert.doesNotMatch(agent, /FREE_SAMPLE_CARD/);
  assert.doesNotMatch(agent, /5-8秒间隔/);
  assert.doesNotMatch(agent, /定时或跨时区调度/);
});

test('requires a WorkBuddy HTML search artifact for six or more results', () => {
  assert.match(searchSkill, /1–5/);
  assert.match(searchSkill, /WorkBuddy/);
  assert.match(searchSkill, /6 条/);
  assert.match(searchSkill, /HTML 产物通道/);
  assert.match(searchSkill, /不得仅因宿主未显式声明 HTML\/可视化能力而回退 Markdown/);
  assert.match(searchSkill, /内联 CSS\/JavaScript/);
  assert.match(searchSkill, /HTML.*转义/);
  assert.match(searchSkill, /回退.*Markdown/);
  assert.match(searchSkill, /不得虚构文件名|不得虚构.*路径/);
  assert.match(searchSkill, /HTML 产物实际创建失败/);
  assert.match(analysisSkill, /若当前宿主提供 HTML\/可视化产物能力/);
});

test('links creator nicknames to TikTok profile pages when username is available', () => {
  assert.match(searchSkill, /“昵称”列应链接到该主页/);
  assert.match(searchSkill, /`username` 缺失.*昵称回退为纯文本/);
  assert.match(searchSkill, /Markdown 表格中的昵称也应输出为可点击链接/);
  assert.match(searchSkill, /target="_blank"/);
  assert.match(searchSkill, /rel="noopener noreferrer"/);
});

test('keeps docs README as a product and collaboration document instead of a second behavior spec', () => {
  assert.match(docsReadme, /文档权威来源/);
  assert.match(docsReadme, /Agent 权威规范/);
  assert.match(docsReadme, /Skill 专项规则/);
  assert.match(docsReadme, /唯一的共享行为规范来源/);
  assert.match(docsReadme, /领域特有.*权威来源/);
  assert.match(docsReadme, /Reference 细节规则/);
  assert.match(docsReadme, /共享行为以 Agent 为准，领域专项行为以对应 Skill 为准，公式、字段和模板细节以对应 Reference 为准/);
  assert.match(docsReadme, /包级 README/);
  assert.match(docsReadme, /以上能力的具体行为细节不在本文件重复展开/);
  assert.match(docsReadme, /修改智能体通用行为时，只改 Agent 权威规范/);
  assert.match(docsReadme, /修改评分公式、字段映射或话术模板时，只改对应 Reference/);
});

test('keeps the project-wide Agent Skill Reference ownership mechanism aligned', () => {
  const heading = '## Agent / Skill / Reference 文档分层与去重';
  const agentsSection = getMarkdownSection(agentsDoc, heading);
  const claudeSection = getMarkdownSection(claudeDoc, heading);

  assert.equal(agentsSection, claudeSection);
  assert.match(agentsSection, /唯一权威来源（owner）/);
  assert.match(agentsSection, /\*\*Agent\*\* 负责共享行为/);
  assert.match(agentsSection, /\*\*Skill\*\* 负责单一领域/);
  assert.match(agentsSection, /\*\*Reference\*\* 负责公式、字段映射、模板正文/);
  assert.match(agentsSection, /共享行为以 Agent 为准.*领域行为以对应 Skill 为准.*公式 \/ 字段 \/ 模板细节以 Reference 为准/);
  assert.match(agentsSection, /对非 owner 增加必要的反向断言/);
});

test('uses the WorkBuddy share link and self-bootstrap command as the public path', () => {
  for (const source of [agent, packageReadme, packageReadmeEn, onboardingDoc]) {
    assert.match(source, new RegExp(WORKBUDDY_SHARE_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(source, new RegExp(CREATOR_OUTREACH_SELF_BOOTSTRAP_COMMAND.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  assert.doesNotMatch(packageReadme, /插件市场搜索 `@scorehub\/creator-outreach`/);
  assert.doesNotMatch(packageReadmeEn, /plugin marketplace/);
  assert.match(onboardingDoc, /WorkBuddy 分享链接只负责将 Tiky 代码包安装到 WorkBuddy/);
  assert.match(onboardingDoc, /"args": \["-y", "@scorehub\/mcp-server@latest"\]/);
});

test('keeps the WorkBuddy plugin version aligned with the npm package', () => {
  assert.equal(pluginJson.version, packageJson.version);
});

test('keeps ScoreHub AI as the master brand and Tiky as the named expert agent', () => {
  const displayName = 'ScoreHub AI TikTok达人营销专家';
  const profession = 'Tiky · TikTok达人营销专家';

  assert.equal(pluginJson.displayName.zh, displayName);
  assert.equal(pluginJson.profession.zh, profession);
  assert.match(pluginJson.displayDescription.zh, /Tiky 是 ScoreHub AI 打造的 TikTok 达人营销专家/);
  assert.match(pluginJson.displayDescription.zh, /建立清晰准确的达人画像/);
  assert.match(pluginJson.displayDescription.zh, /小范围建联快速验证/);
  assert.match(agent, new RegExp(displayName.replace('·', '\\·')));
  assert.match(agent, new RegExp(profession.replace('·', '\\·')));
  assert.match(agent, /我是 Tiky，ScoreHub AI 的 TikTok 达人营销专家/);
  assert.match(agent, /不是海量群发工具/);
  assert.match(agent, /不会把向成千上万位达人发消息作为交付目标/);
  assert.doesNotMatch(agent, /TikTok达人建联专家|Tiky by ScoreHub AI/);
});
