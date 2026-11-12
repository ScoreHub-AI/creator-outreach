const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { execFileSync, spawnSync } = require('node:child_process');

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
const similaritySkillPath = path.join(__dirname, '..', 'skills', 'tiktok-similar-creators', 'SKILL.md');
const similaritySkill = fs.readFileSync(similaritySkillPath, 'utf8');
const similarityModelPath = path.join(__dirname, '..', 'skills', 'tiktok-similar-creators', 'references', 'similarity-model.md');
const similarityModel = fs.readFileSync(similarityModelPath, 'utf8');
const outreachSkillPath = path.join(__dirname, '..', 'skills', 'tiktok-batch-outreach', 'SKILL.md');
const outreachSkill = fs.readFileSync(outreachSkillPath, 'utf8');
const messageTemplatesPath = path.join(__dirname, '..', 'skills', 'tiktok-batch-outreach', 'references', 'message-templates.md');
const messageTemplates = fs.readFileSync(messageTemplatesPath, 'utf8');
const sampleSkillPath = path.join(__dirname, '..', 'skills', 'scorehub-sample-lookup', 'SKILL.md');
const sampleSkill = fs.readFileSync(sampleSkillPath, 'utf8');
const sampleFieldsPath = path.join(__dirname, '..', 'skills', 'scorehub-sample-lookup', 'references', 'tools-and-fields.md');
const sampleFields = fs.readFileSync(sampleFieldsPath, 'utf8');
const messageSkillPath = path.join(__dirname, '..', 'skills', 'scorehub-creator-message-lookup', 'SKILL.md');
const messageSkill = fs.readFileSync(messageSkillPath, 'utf8');
const messageFieldsPath = path.join(__dirname, '..', 'skills', 'scorehub-creator-message-lookup', 'references', 'tools-and-fields.md');
const messageFields = fs.readFileSync(messageFieldsPath, 'utf8');
const emailSkillPath = path.join(__dirname, '..', 'skills', 'scorehub-email-lookup', 'SKILL.md');
const emailSkill = fs.readFileSync(emailSkillPath, 'utf8');
const emailFieldsPath = path.join(__dirname, '..', 'skills', 'scorehub-email-lookup', 'references', 'tools-and-fields.md');
const emailFields = fs.readFileSync(emailFieldsPath, 'utf8');
const lookupAdditionsPath = path.join(__dirname, '..', 'agents', 'tiktok-creator-outreach.lookup-additions.md');
const lookupAdditions = fs.readFileSync(lookupAdditionsPath, 'utf8');
const quickLookupReferenceDir = path.join(__dirname, '..', 'agents', 'references', 'quick-lookup');
const commonContract = fs.readFileSync(path.join(quickLookupReferenceDir, 'common-contract.md'), 'utf8');
const identifiersReference = fs.readFileSync(path.join(quickLookupReferenceDir, 'identifiers-and-relations.md'), 'utf8');
const supportContract = fs.readFileSync(path.join(quickLookupReferenceDir, 'reply-support-tool-contracts.md'), 'utf8');
const docsReadmePath = path.join(__dirname, '..', 'docs', 'README.md');
const docsReadme = fs.readFileSync(docsReadmePath, 'utf8');
const packageReadmePath = path.join(__dirname, '..', 'README.md');
const packageReadme = fs.readFileSync(packageReadmePath, 'utf8');
const packageReadmeEnPath = path.join(__dirname, '..', 'README.en.md');
const packageReadmeEn = fs.readFileSync(packageReadmeEnPath, 'utf8');
const listingReadme = fs.readFileSync(path.join(__dirname, '..', 'listing', 'README.md'), 'utf8');
const onboardingPath = path.join(__dirname, '..', 'docs', 'WORKBUDDY_PUBLIC_ONBOARDING.md');
const onboardingDoc = fs.readFileSync(onboardingPath, 'utf8');
const repositoryRoot = path.join(__dirname, '..', '..', '..');
const brochure = fs.readFileSync(path.join(repositoryRoot, 'docs', 'TIKY-PROMOTIONAL-BROCHURE.md'), 'utf8');
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
  assert.match(agent, /bootstrap 未完成时不执行.*搜索、分析、建联或 `authorize`/);
  assert.match(agent, /`restart_required` 分支允许仅为验证重启是否生效而调用本地 `status`/);
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
  assert.match(agent, /仅为确认重启是否生效调用本地 `status`/);
  assert.match(agent, /`config_source\.creator_outreach_version` 与本次 bootstrap 检查返回的 `installed_creator_outreach_version` 一致/);
  assert.match(agent, /bootstrap --mark-ready --json/);
  assert.doesNotMatch(agent, /bootstrap 未完成时不执行搜索、分析、建联、`authorize` 或 `status`/);
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
  assert.match(searchSkill, /选择一位或多位达人进行 Rank 评分/);
  assert.match(searchSkill, /未找到符合条件的达人/);
  assert.match(searchSkill, /`category_details\[\]\.local_name`/);
  assert.match(searchSkill, /主列表最多显示 3 个名称，更多显示“\+N”/);
  assert.match(searchSkill, /未识别类目（N）/);
  assert.match(searchSkill, /不得展示 `category_details\[\]\.id` 或 `category_ids`/);
  assert.match(searchSkill, /闭环校验继续使用原始 `category_ids`/);
  assert.match(searchSkill, /`selection_region`.*当前授权店铺市场代码/);
  assert.match(searchSkill, /不匹配的达人不得作为合格结果展示.*不得进入分析或建联/);
  assert.match(searchSkill, /`selection_region` 缺失.*地区未校验/);
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
  assert.match(agent, /单人或多人均可使用 Rank 返回的分数和排名；评分请求不设人数下限或上限/);
  assert.doesNotMatch(agent, /100 分制综合评分/);
  assert.match(agent, /不具备剩余配额查询或逐次精确消耗统计能力/);
  assert.doesNotMatch(agent, /每次操作都会告知消耗量/);
  assert.match(agent, /本包无持久化存储/);
  assert.doesNotMatch(agent, /建联记录都保留完整/);

  assert.match(outreachSkill, /不支持定时或跨时区调度/);
  assert.doesNotMatch(outreachSkill, /9:00-21:00/);
});

test('keeps the 24-country market boundary authoritative in the agent', () => {
  const supportedMarkets = [
    ['泰国', 'Thailand', 'TH'],
    ['马来西亚', 'Malaysia', 'MY'],
    ['越南', 'Vietnam', 'VN'],
    ['菲律宾', 'Philippines', 'PH'],
    ['印度尼西亚', 'Indonesia', 'ID'],
    ['新加坡', 'Singapore', 'SG'],
    ['美国', 'United States', 'US'],
    ['英国', 'United Kingdom', 'GB'],
    ['德国', 'Germany', 'DE'],
    ['意大利', 'Italy', 'IT'],
    ['法国', 'France', 'FR'],
    ['西班牙', 'Spain', 'ES'],
    ['爱尔兰', 'Ireland', 'IE'],
    ['波兰', 'Poland', 'PL'],
    ['捷克', 'Czechia', 'CZ'],
    ['葡萄牙', 'Portugal', 'PT'],
    ['比利时', 'Belgium', 'BE'],
    ['荷兰', 'Netherlands', 'NL'],
    ['奥地利', 'Austria', 'AT'],
    ['希腊', 'Greece', 'GR'],
    ['匈牙利', 'Hungary', 'HU'],
    ['日本', 'Japan', 'JP'],
    ['巴西', 'Brazil', 'BR'],
    ['墨西哥', 'Mexico', 'MX'],
  ];

  assert.equal((agent.match(/当前覆盖 24 个国家市场/g) || []).length, 2);
  const marketBoundary = agent.split('- **支持市场**：')[1].split('\n')[0];
  const marketCodes = [...marketBoundary.matchAll(/（([A-Z]{2})）/g)].map((match) => match[1]);
  assert.deepEqual(marketCodes, supportedMarkets.map(([, , code]) => code));
  assert.equal(new Set(marketCodes).size, 24);
  const welcome = getMarkdownSection(agent, '> ## 支持的市场');
  const welcomeCodes = [...welcome.matchAll(/（([A-Z]{2})）/g)].map((match) => match[1]);
  assert.equal(welcomeCodes.length, 24);
  assert.deepEqual([...welcomeCodes].sort(), [...marketCodes].sort());
  assert.match(marketBoundary, /用户明确提到其他市场时，主动说明不支持/);
  assert.doesNotMatch(marketBoundary, /（AU）|（CA）/);
  assert.doesNotMatch(agent, /其他市场（如[^）]*(?:日本|巴西|墨西哥|波兰|捷克|葡萄牙|比利时|荷兰|奥地利|希腊|匈牙利)/);
  for (const [countryZh, countryEn, code] of supportedMarkets) {
    for (const source of [agent, packageReadme, listingReadme]) {
      assert.match(source, new RegExp(`${countryZh}（${code}）`));
    }
    assert.match(brochure, new RegExp(countryZh));
    assert.match(packageReadmeEn, new RegExp(`${countryEn} \\(${code}\\)`));
  }

  assert.match(searchSkill, /支持市场 allowlist.*以 Agent.*唯一权威来源/);
  assert.doesNotMatch(searchSkill, /\| 国家 \| 代码 \|/);
  for (const [, , code] of supportedMarkets) {
    assert.doesNotMatch(searchSkill, new RegExp(`（${code}）`));
  }
  assert.doesNotMatch(searchSkill, /覆盖 \d+ 个国家/);
  assert.match(pluginJson.description, /24 markets.*Southeast Asia.*United States.*Europe.*Japan.*Brazil.*Mexico/);
  // 官方字段表要求 tags 固定 3 个，市场覆盖改由 description 承载（见上一行断言）
  assert.equal(pluginJson.tags.length, 3);
  for (const tag of pluginJson.tags) {
    assert.match(tag.en, /\S/);
    assert.match(tag.zh, /\S/);
  }
  assert.match(packageReadme, /当前覆盖 24 个国家市场/);
  assert.match(packageReadmeEn, /currently covers 24 country markets/);
  assert.match(brochure, /24 个国家市场协同/);
  assert.match(listingReadme, /覆盖 24 个国家市场/);
  for (const source of [agent, packageReadme, packageReadmeEn, brochure, listingReadme, pluginJson.description]) {
    assert.doesNotMatch(source, /覆盖 (?:16|19) 个国家|covers (?:16|19) country markets|across (?:16|19) markets/);
  }
});

test('only asks for category confirmation when multiple matches remain ambiguous', () => {
  assert.match(searchSkill, /多个同样合理/);
  assert.match(searchSkill, /无法.*用户原话判定/);
  assert.match(searchSkill, /唯一明确匹配时直接/);
  assert.match(agent, /类目解析.*遵循 `tiktok-creator-search` Skill/);
});

test('defaults creator searches to top-level categories and gates child categories on explicit intent', () => {
  assert.match(searchSkill, /对当前支持的店铺调用.*`category_version: "v2"`.*不传 `locale`/);
  assert.match(searchSkill, /宽泛品类.*首次不传 `keyword`.*顶层类目/);
  assert.match(searchSkill, /只有用户明确指定具体子类目时.*店铺当地语言关键词/);
  assert.doesNotMatch(searchSkill, /zh-CN|category_locale/);
  assert.match(searchSkill, /只有 `parent_id == "0"` 的类目才是.*顶层类目/);
  assert.match(searchSkill, /`is_leaf=false`.*不能据此把中间层当作顶层/);
  assert.match(searchSkill, /用户只表达宽泛品类.*只使用 `parent_id == "0"` 的顶层类目/);
  assert.match(searchSkill, /只有用户原话明确点名具体子类目时，才允许传 `child_category_id_list`/);
  assert.match(searchSkill, /仅因关键词查询返回子类目.*不视为用户明确指定子类目/);
  assert.match(searchSkill, /无法从工具结果可靠完成映射时，回退为只传顶层类目/);
  assert.doesNotMatch(searchSkill, /兜底匹配子类目/);
  assert.doesNotMatch(searchSkill, /仅当没有合适父类目时降级/);
  assert.doesNotMatch(scoringModel, /parent_id|category_ids|600024|601303|602118|602284|601450|600025|600026/);
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

test('uses Rank scores and avoids local creator scoring', () => {
  assert.match(analysisSkill, /达人分析专项行为的权威来源/);
  assert.match(analysisSkill, /禁止直接展示 MCP 原始 JSON/);
  assert.match(analysisSkill, /评分请求无论包含 1 位还是任意数量的候选/);
  assert.match(analysisSkill, /评分请求必须调用 `rank_creators`；成功时展示 Rank 返回的 `score`，单人也照常展示/);
  assert.match(analysisSkill, /若用户只请求事实画像而未请求评分，才可单独调用 `creator_performance`/);
  assert.doesNotMatch(analysisSkill, /至少需要 2 位候选人才可评分排名|不调用 `rank_creators`/);
  assert.match(analysisSkill, /排名 \/ 达人 \/ Rank 分数 \/ 关键表现 \/ 推荐结论 \/ 推荐理由/);
  assert.match(analysisSkill, /Rank 分数（如有）、优势\/风险、数据缺口/);
  assert.match(analysisSkill, /严格沿用 `rank_creators` 返回的顺序和排名/);
  assert.match(analysisSkill, /`ranking` 为 `null`.*`performance_documents`.*无法完成 Rank 排名/);
  assert.match(analysisSkill, /不得为同一批候选另行调用 `creator_performance` 代替 Rank/);
  assert.match(analysisSkill, /`ranked\[\]\.score` 是 Rank 返回的综合分/);
  assert.match(analysisSkill, /不推断分数含义、维度、权重或模型策略/);
  assert.match(analysisSkill, /失败值作为 0 分参与排序/);
  assert.match(analysisSkill, /入参名保留为 `creator_user_id`，其值必须直接使用搜索结果中的 `creator_open_id`/);
  assert.match(analysisSkill, /`creator_performance` 不返回该 ID/);
  assert.match(analysisSkill, /Rank 返回的评分对象范围/);
  assert.match(analysisSkill, /Rank 分数来源、格式和缺失处理/);
  assert.doesNotMatch(analysisSkill, /\| 带货能力 \| 30% \|/);
  assert.doesNotMatch(analysisSkill, /降级排序/);

  assert.match(scoringModel, /Rank 服务负责综合评分、候选可用性分组和最终顺序/);
  assert.match(scoringModel, /`ranking\.ranked\[\]\.score`/);
  assert.match(scoringModel, /`model_output\.strategy_score`/);
  assert.match(scoringModel, /不自行归一化、取整、乘除比例或追加 `\/100`/);
  assert.match(scoringModel, /Rank 返回 `ranking: null`.*无法统一排名/);
  assert.match(scoringModel, /无论确认 1 位还是任意数量达人，都调用 `rank_creators`/);
  assert.match(scoringModel, /只拒绝空列表，不设本地人数上限/);
  assert.doesNotMatch(scoringModel, /确认 1 位达人时调用 `creator_performance`/);
  assert.match(scoringModel, /禁止恢复旧版五维公式、标签阈值或百分位结论/);
  assert.doesNotMatch(scoringModel, /综合评分 =|def score_creator|带货能力×30%/);

  for (const summary of [agent, docsReadme, packageReadme, packageReadmeEn]) {
    assert.doesNotMatch(summary, /p = \(rank - 1\)|p <= 0\.30|0\.30 < p <= 0\.70|60 个中文字符/);
  }
});

test('uses the external service as the only final similarity scorer', () => {
  assert.match(similaritySkill, /相似达人推荐专项行为的权威来源/);
  assert.match(similaritySkill, /外部相似度服务/);
  assert.match(similaritySkill, /不切换到其他评分方法/);
  assert.match(similarityModel, /唯一评分来源/);
  assert.match(similarityModel, /最终排序唯一依据/);
  assert.match(similarityModel, /粗排只用于控制 TikTok Performance 调用量，不作为最终对外分数/);
  assert.match(similarityModel, /不能作为失败时的替代结果/);

  for (const source of [similaritySkill, similarityModel]) {
    assert.doesNotMatch(source, /本地六维|本地评分|本地模型|自动降级|local_fallback|similarity_dimensions|scoring_source/);
  }
});

test('keeps outreach-specific confirmation and delivery rules in the outreach skill', () => {
  assert.match(outreachSkill, /^---\nname: tiktok-batch-outreach\ndescription: .*TikTok 达人.*利益前置合作话术/);
  assert.match(outreachSkill, /小范围达人建联验证专项行为的权威来源/);
  assert.match(outreachSkill, /发送前\*\*必须\*\*与用户确认/);
  assert.match(outreachSkill, /品牌名/);
  assert.match(outreachSkill, /精选达人名单/);
  assert.match(outreachSkill, /整批单选的 Offer 类型及其实际金额 \/ 比例/);
  assert.match(outreachSkill, /通知栏前 15 字预览与所有将轮换的完整最终话术/);
  assert.match(outreachSkill, /`AskUserQuestion`/);
  assert.match(outreachSkill, /`multiSelect: false`/);
  assert.match(outreachSkill, /每个选项的描述直接展示默认前缀和前 15 字预览/);
  assert.match(outreachSkill, /同一批达人只能选择一种 Offer/);
  assert.match(outreachSkill, /取消、空选择或自定义值存在歧义时，不调用 `create_conversation` 或 `send_message`/);
  assert.match(outreachSkill, /用户明确提供完整最终文案时不静默改写/);
  assert.match(outreachSkill, /`create_conversation`/);
  assert.match(outreachSkill, /`send_message`/);
  assert.match(outreachSkill, /5-8 秒 \+ 随机抖动/);
  assert.match(outreachSkill, /Offer 预设、通知栏前 15 字规则、话术正文、轮换规则和变量定义的唯一权威来源/);
  assert.doesNotMatch(outreachSkill, /3 套模板 A\/B\/C/);
  assert.doesNotMatch(outreachSkill, /\$200 Cash|35% Comm|Exclusive 50%/);
  assert.match(outreachSkill, /`creator_open_id` \*\*仅来自搜索接口\*\*/);

  assert.match(messageTemplates, /3 套正文按发送序号取模（`i % 3`）轮换/);
  assert.match(messageTemplates, /`\{offer_prefix\}`/);
  assert.match(messageTemplates, /`\{name\}`/);
  assert.match(messageTemplates, /`\{brand\}`/);
  assert.match(messageTemplates, /`\{cash\}`/);
  assert.match(messageTemplates, /`\{commission\}` \/ `\{discount\}`/);
  assert.match(messageTemplates, /## Template A/);
  assert.match(messageTemplates, /## Template B/);
  assert.match(messageTemplates, /## Template C/);
  assert.match(messageTemplates, /发送前的选择、确认与自定义话术行为由建联 Skill 统一规定/);
  assert.match(messageTemplates, /系统生成或改写的话术必须从 `\{offer_prefix\}` 开始/);
  assert.match(messageTemplates, /现金型的完整 `\{cash\}`.*必须完整出现在前 15 个字符内/);

  for (const heading of ['## Template A', '## Template B', '## Template C']) {
    assert.match(getMarkdownSection(messageTemplates, heading), /```\n\{offer_prefix\}/);
  }

  const offerPreviews = [
    ['【$200 Cash + 30% Comm】', '【$200 Cash + 30'],
    ['【35% Comm + Free Sample】', '【35% Comm + Fre'],
    ['【Exclusive 50% Off Code + Free Sample】', '【Exclusive 50% '],
  ];
  for (const [offer, preview] of offerPreviews) {
    assert.match(messageTemplates, new RegExp(offer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.equal(Array.from(offer).slice(0, 15).join(''), preview);
  }
});

test('keeps analysis and outreach implementation details out of the agent', () => {
  assert.match(agent, /Rank 评分.*遵循 `tiktok-creator-analysis` Skill/);
  assert.match(agent, /发送前确认.*遵循 `tiktok-batch-outreach` Skill/);
  assert.match(agent, /利益前置 Offer 预设.*通知栏前 15 字预览/);
  assert.doesNotMatch(agent, /带货能力30%/);
  for (const summary of [agent, docsReadme, packageReadme, packageReadmeEn]) {
    assert.doesNotMatch(summary, /\$200 Cash|35% Comm|Exclusive 50%|\{offer_prefix\}/);
  }
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
  assert.match(docsReadme, /共享行为以 Agent 为准，领域专项行为以对应 Skill 为准，字段、边界和模板细节以对应 Reference 为准/);
  assert.match(docsReadme, /包级 README/);
  assert.match(docsReadme, /以上能力的具体行为细节不在本文件重复展开/);
  assert.match(docsReadme, /修改智能体通用行为时，只改 Agent 权威规范/);
  assert.match(docsReadme, /修改 Rank 分数映射、字段边界或话术模板时，只改对应 Reference/);
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

test('documents the official marketplace link and the npm channel across delivery docs', () => {
  for (const source of [agent, packageReadme, packageReadmeEn, onboardingDoc]) {
    assert.match(source, new RegExp(WORKBUDDY_SHARE_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(source, new RegExp(CREATOR_OUTREACH_SELF_BOOTSTRAP_COMMAND.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  // 渠道定位：官方市场是终端用户主渠道，npm 收敛为备用 / 预览 / 自测
  assert.match(packageReadme, /官方市场（终端用户推荐）/);
  assert.match(packageReadme, /npm 渠道（备用 \/ 预览 \/ 自测）/);
  assert.match(packageReadmeEn, /Official marketplace \(recommended for end users\)/);
  assert.match(packageReadmeEn, /npm channel \(backup \/ preview \/ self-test\)/);
  // 「从 npm 安装指定版本到 WorkBuddy」的预览路径必须在两份包级 README 中可查
  for (const source of [packageReadme, packageReadmeEn]) {
    assert.match(source, /npx -y @scorehub\/creator-outreach@<[^>]+> bootstrap --dev --install/);
  }
  // bootstrap 状态机只属于 npm 渠道副本，市场版无门禁的口径必须同时出现在引导文档中
  assert.match(onboardingDoc, /以下状态机只出现在 \*\*npm 渠道副本\*\*的会话中/);

  assert.doesNotMatch(packageReadme, /插件市场搜索 `@scorehub\/creator-outreach`/);
  assert.doesNotMatch(packageReadmeEn, /plugin marketplace/);
  assert.match(onboardingDoc, /WorkBuddy 分享链接只负责将 Tiky 代码包安装到 WorkBuddy/);
  assert.match(onboardingDoc, /"args": \["-y", "@scorehub\/mcp-server@latest"\]/);
});

test('keeps the WorkBuddy plugin version aligned with the npm package', () => {
  assert.equal(pluginJson.version, packageJson.version);
});

test('keeps ScoreHub AI as the master brand and Tiky as the named expert agent', () => {
  const displayName = 'ScoreHub Tiky';
  const profession = 'TikTok 达人营销专家';

  assert.equal(pluginJson.displayName.zh, displayName);
  assert.equal(pluginJson.profession.zh, profession);
  // 平台表单实测上限：专家名称 15 字（“专家名称：当前 24 字，上限 15 字”）。中英文两侧同限。
  for (const lang of ['zh', 'en']) {
    assert.ok(
      pluginJson.displayName[lang].length <= 15,
      `displayName.${lang} 为 ${pluginJson.displayName[lang].length} 字，超过平台 15 字上限`,
    );
  }
  assert.match(pluginJson.displayDescription.zh, /Tiky 是 ScoreHub AI/);
  assert.match(pluginJson.displayDescription.zh, /TikTok 达人营销专家/);
  assert.match(pluginJson.displayDescription.zh, /达人画像/);
  assert.match(pluginJson.displayDescription.zh, /小范围建联验证/);
  // 官方字段表要求 displayDescription 中文 40–50 字；口径按全字符数计（含拉丁字符与标点）
  const zhLength = pluginJson.displayDescription.zh.length;
  assert.ok(zhLength >= 40 && zhLength <= 50, `displayDescription.zh 为 ${zhLength} 字，需落在 40–50 字`);
  assert.match(agent, new RegExp(displayName.replace('·', '\\·')));
  assert.match(agent, new RegExp(profession.replace('·', '\\·')));
  assert.match(agent, /我是 Tiky，ScoreHub AI 的 TikTok 达人营销专家/);
  assert.match(agent, /不是海量群发工具/);
  assert.match(agent, /不会把向成千上万位达人发消息作为交付目标/);
  assert.doesNotMatch(agent, /TikTok达人建联专家|Tiky by ScoreHub AI/);
});

// 反向断言：权威正文保留分享链接安装路径所需的 bootstrap 门禁，而开放平台上架版必须剥离它，
// 且剥离后不得改动任何领域契约。上架版由 scripts/build-platform-agent.py 生成，不手工维护第二份正文。
test('keeps the open-platform listing agent free of the share-link bootstrap path', (t) => {
  if (spawnSync('python3', ['--version'], { stdio: 'ignore' }).status !== 0) {
    t.skip('python3 不可用');
    return;
  }
  const builderPath = path.join(__dirname, '..', 'scripts', 'build-platform-agent.py');
  const outPath = path.join(os.tmpdir(), `tiky-platform-agent-${process.pid}.md`);
  try {
    execFileSync('python3', [builderPath, agentPath, outPath], { stdio: 'pipe' });
    const variant = fs.readFileSync(outPath, 'utf8');

    assert.doesNotMatch(variant, /bootstrap|sharecode|creator-outreach@latest|分享链接/i);
    assert.match(variant, /由 WorkBuddy 的依赖引导卡片负责/);

    // 领域契约与非安装类业务规则必须原样保留
    assert.match(variant, /不是海量群发工具/);
    assert.match(variant, /`switch_shop`/);
    assert.match(variant, /ScoreHub 服务暂时未连接/);
    // 依赖未就绪时的交付契约必须随上架版分发，且不能再退回「只给重开话术」
    assert.match(variant, /## 能力不可用时的交付契约/);
    assert.match(variant, /按「能力不可用时的交付契约」交付一份可核验的离线方案文档/);
    assert.match(variant, /不得替代本轮交付/);
    assert.match(variant, /首轮引导不阻挡明确业务意图/);
    assert.match(variant, /### 首轮意图分流（先于欢迎语判断）/);
    assert.match(variant, /工具可用时，必须按「首轮意图分流」立即办理/);
    assert.doesNotMatch(variant, /从下一条消息开始，按本文件已有的授权/);
    assert.match(variant, /11\. \*\*整批单一 Offer\*\*/);
    assert.doesNotMatch(variant, /按 `## 调用方式` 一节的固定话术提示用户完全退出/);
    assert.match(variant, /当前覆盖 24 个国家市场/);
    assert.match(variant, /波兰（PL）、捷克（CZ）、葡萄牙（PT）/);
    assert.match(variant, /比利时（BE）、荷兰（NL）、奥地利（AT）、希腊（GR）、匈牙利（HU）/);
    assert.equal(
      getMarkdownSection(variant, '## 限制与注意事项'),
      getMarkdownSection(agent, '## 限制与注意事项'),
    );
    assert.match(variant, /日本（JP）、巴西（BR）、墨西哥（MX）/);
    for (const skill of [
      'tiktok-creator-search',
      'tiktok-creator-analysis',
      'tiktok-batch-outreach',
      'tiktok-similar-creators',
      'tiktok-affiliate-analytics',
      'scorehub-sample-lookup',
      'scorehub-creator-message-lookup',
      'scorehub-email-lookup',
    ]) {
      assert.match(variant, new RegExp(skill));
    }
  } finally {
    fs.rmSync(outPath, { force: true });
  }
});

test('ships analytics as the fifth skill with self-contained references and a single rule owner', () => {
  const skillDir = path.join(__dirname, '..', 'skills', 'tiktok-affiliate-analytics');
  const skill = fs.readFileSync(path.join(skillDir, 'SKILL.md'), 'utf8');
  assert.equal(pluginJson.skills.length, 8);
  assert.equal(pluginJson.skills[4], './skills/tiktok-affiliate-analytics');
  assert.match(agent, /  - tiktok-affiliate-analytics/);
  assert.match(skill, /当前日期为 1–4 号.*上一个完整自然月/);
  assert.match(skill, /前 4 天/);
  assert.match(skill, /同月子区间/);
  assert.match(skill, /AskUserQuestion/);
  assert.match(skill, /只有一个可分析店铺时直接继续/);
  assert.match(skill, /analyzable=true/);
  assert.match(skill, /Top5/);
  assert.match(skill, /当前 OAuth 选中店铺/);
  assert.match(skill, /不调用 Rank 改排/);
  const refs = fs.readdirSync(path.join(skillDir, 'references')).map((file) => path.join(skillDir, 'references', file));
  for (const file of [path.join(skillDir, 'SKILL.md'), ...refs]) {
    const content = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(content, /项目文档《|15Tiky\(1\)|deepseek|harness/i);
    for (const match of content.matchAll(/\]\((\.[^)]+)\)/g)) {
      assert.ok(fs.existsSync(path.resolve(path.dirname(file), match[1])), `Missing reference: ${file} -> ${match[1]}`);
    }
  }
  const rules = fs.readFileSync(path.join(skillDir, 'references', 'business-rules.md'), 'utf8');
  assert.match(rules, /no_data.*没有可用记录/);
  assert.match(rules, /不等同于 0/);
  const joins = fs.readFileSync(path.join(skillDir, 'references', 'data-join-and-attribution.md'), 'utf8');
  assert.match(joins, /target_collaboration_id.*creator_username.*至少一个/);
  assert.match(joins, /DISTINCT order_id/);
  assert.match(joins, /不自动排除取消或退款订单/);
  assert.match(joins, /sale_price/);
  assert.match(joins, /不含运费|排除运费/);
  const routing = fs.readFileSync(path.join(skillDir, 'references', 'scenario-routing.md'), 'utf8');
  assert.match(routing, /availability=.*仅表示请求/);
  assert.doesNotMatch(routing, /当前日期.*4|DISTINCT order_id/);
  const summary = getMarkdownSection(agent, '## 核心能力');
  assert.doesNotMatch(summary, /success_day_count|sale_price|DISTINCT|前 4 天/);
});

test('documents the activation_required state as a fifth bootstrap branch', () => {
  assert.match(onboardingDoc, /\| `activation_required` \|/);
  assert.match(onboardingDoc, /重启 WorkBuddy 对 `activation_required` 无效/);
  assert.match(onboardingDoc, /installed_plugins\.json/);
  assert.match(onboardingDoc, /versionSatisfiesRange|版本区间/);
});

test('documents the platform and dev channels as separate deliverables', () => {
  // 两条通道的分工是唯一权威描述，缺任何一条都会让「用户跑旧代码」重新变成谜题。
  assert.match(onboardingDoc, /## 两条通道的分工/);
  assert.match(onboardingDoc, /tiktok-creator-outreach-dev/);
  assert.match(onboardingDoc, /bootstrap --dev/);
  assert.match(onboardingDoc, /enabledPlugins/);
  assert.match(onboardingDoc, /doScanCustomExperts/);
  assert.match(onboardingDoc, /agentName/);
  // skill id 隔离是两条通道能共存的前提。
  assert.match(onboardingDoc, /applyDevSkillIds/);
  // 自测副本的代码来源必须登记：否则来自 npm 发布包的静默更新会覆盖未发布的改动。
  assert.match(onboardingDoc, /sourceDir/);
  assert.match(onboardingDoc, /local_channel_source_dir/);
  assert.doesNotMatch(onboardingDoc, /三条硬约束/);
});

test('records that enabledPlugins is not a load gate', () => {
  // 曾经把 enabledPlugins=false 当成「副本完全不加载」，本机日志证明不成立（两侧 false 却都 Loaded）。
  // 这条断言防止把错误结论写回文档，也防止把那句「只启用一条通道」的旧隔离说法带回来。
  assert.match(onboardingDoc, /拦不住加载/);
  assert.doesNotMatch(onboardingDoc, /残留的 `false` 会让副本完全不加载/);
  assert.doesNotMatch(onboardingDoc, /同一时间只启用一条通道/);
});

test('documents the legacy same-named local copy and its cleanup', () => {
  assert.match(onboardingDoc, /cleanupLegacyLocalCopy/);
  assert.match(onboardingDoc, /tiktok-creator-outreach@my-experts/);
  assert.match(onboardingDoc, /同时\*\*加载同名技能/);
});

test('self-heals the dev channel instead of sending users to the plugin manager', () => {
  assert.match(agent, /bootstrap --update --json/);
  assert.match(agent, /不得提示用户去插件管理页点「更新」/);
  assert.doesNotMatch(agent, /指引其打开 WorkBuddy 插件管理页对 Tiky 点「更新」/);
});

test('keeps the platform listing body free of every share-link bootstrap branch', () => {
  const outputPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'platform-agent-')), 'agent.md');
  const runner = process.env.PYTHON || 'python3';
  const result = spawnSync(
    runner,
    [path.join(__dirname, '..', 'scripts', 'build-platform-agent.py'), agentPath, outputPath],
    { encoding: 'utf8' },
  );

  if (result.error && result.error.code === 'ENOENT') return;

  assert.equal(result.status, 0, result.stderr);
  const platformAgent = fs.readFileSync(outputPath, 'utf8');
  for (const token of ['bootstrap', 'sharecode', 'activation_required', 'restart_required']) {
    assert.doesNotMatch(platformAgent, new RegExp(token));
  }
});

test('registers the three quick-lookup skills in the plugin, agent and disk layout', () => {
  const quickLookupSkills = [
    'scorehub-sample-lookup',
    'scorehub-creator-message-lookup',
    'scorehub-email-lookup',
  ];
  const frontmatter = agent.split('---')[1] || '';

  assert.equal(pluginJson.skills.length, 8);
  for (const skillId of quickLookupSkills) {
    assert.ok(
      pluginJson.skills.includes(`./skills/${skillId}`),
      `plugin.json missing ${skillId}`,
    );
    assert.match(frontmatter, new RegExp(`^  - ${skillId}$`, 'm'));
    assert.match(agent, new RegExp(skillId));
    const skillFile = path.join(__dirname, '..', 'skills', skillId, 'SKILL.md');
    assert.ok(fs.existsSync(skillFile), `missing ${skillFile}`);
    assert.match(fs.readFileSync(skillFile, 'utf8'), new RegExp(`^name: ${skillId}$`, 'm'));
    assert.ok(fs.existsSync(path.join(path.dirname(skillFile), 'references', 'tools-and-fields.md')));
  }
});

test('routes sample, reply/chat and email requests through their domain skills', () => {
  assert.match(agent, /六大核心能力/);
  assert.match(agent, /6\. 随手查/);
  assert.match(agent, /scorehub-sample-lookup/);
  assert.match(agent, /scorehub-creator-message-lookup/);
  assert.match(agent, /scorehub-email-lookup/);
  assert.match(agent, /T12\/T14 只开放 `direct_message`/);
  assert.match(agent, /不审批/);
  assert.match(agent, /不寄样/);
  assert.match(agent, /不建合作/);
  assert.match(agent, /T04 刷新、T06\/T09 标读、T07 补存、T39 维护未知/);
  assert.match(agent, /Agent 共享规则/);
  for (const tool of [
    'list_sample_applications',
    'get_sample_application_detail',
    'refresh_sample_applications',
    'list_creator_reply_notifications',
    'get_creator_reply_notification',
    'get_creator_chat_messages',
    'get_outreach_task_config',
    'get_creator_task_send_records',
    'list_email_records',
    'get_received_email',
    'query_email_send_statistics',
    'query_crm_members',
  ]) {
    assert.match(agent, new RegExp(`\\b${tool}\\b`));
  }
});

test('owns sample inventory field exclusions in the reference and keeps summaries free of field rules', () => {
  const listContract = getMarkdownSection(sampleFields, '## 2. T01 清单输入');
  const detailContract = getMarkdownSection(sampleFields, '## 3. T02 详情及CRM只读关联输入与结果');
  assert.match(listContract, /T01 的 `data\.result\.groups\[\]\.applications\[\]` 与 T02 的 `data\.result\.application` 均排除上游 `availableQuantity` 字段/);
  assert.match(listContract, /无论源值为 0、正数、null 或其他值，输出都不包含该键；源字段缺失时也不补造/);
  assert.match(listContract, /不展示、不汇总，也不据此推断有货\/缺货或给出基于库存的审批建议/);
  assert.match(listContract, /用户问库存时说明当前查询无法确认/);
  assert.match(detailContract, /申请对象遵循第2节的字段排除契约/);
  assert.doesNotMatch(sampleFields, /\|\s*`availableQuantity`\s*\|/);
  assert.doesNotMatch(sampleFields + sampleSkill, /可用样品库存/);
  assert.match(sampleSkill, /样品查询不提供可靠库存数据/);
  assert.match(sampleSkill, /不依据申请记录判断有货或缺货/);
  assert.match(sampleSkill, /\.\/references\/tools-and-fields\.md#清单结果与计数/);
  for (const summary of [sampleSkill, agent, lookupAdditions, packageReadme, packageReadmeEn, listingReadme]) {
    assert.doesNotMatch(summary, /availableQuantity/);
  }
});

test('keeps quick-lookup triggers, tool names and read boundaries in the skills', () => {
  assert.match(sampleSkill, /get_sample_application_detail/);
  assert.match(sampleSkill, /不审批/);
  assert.match(sampleSkill, /不寄样/);
  assert.match(sampleSkill, /商品与规格/);
  assert.match(sampleFields, /list_sample_applications/);
  assert.match(sampleFields, /get_sample_application_detail/);
  assert.match(sampleFields, /get_sample_sync_status/);
  assert.match(sampleFields, /refresh_sample_applications/);
  assert.match(sampleFields, /approveExpirationTime/);
  assert.match(sampleFields, /shipmentExpirationTime/);
  assert.match(sampleFields, /\/samples\/sample-applications\/\{applicationId\}/);
  assert.match(sampleFields, /crm\.historical_sample/);
  assert.match(sampleFields, /crm\.integration/);

  assert.match(messageSkill, /list_creator_reply_notifications|get_creator_reply_notification/);
  assert.match(messageSkill, /T12\/T14/);
  assert.match(messageSkill, /不发送/);
  assert.match(messageSkill, /不调用read-all/);
  assert.match(messageFields, /list_creator_reply_notifications/);
  assert.match(messageFields, /get_creator_reply_notification/);
  assert.match(messageFields, /get_creator_chat_messages/);
  assert.match(messageFields, /notification_mark_read/);
  assert.match(messageFields, /chat_message_sync/);

  assert.match(emailSkill, /list_email_records|get_received_email/);
  assert.match(emailSkill, /T39/);
  assert.match(emailSkill, /不发送/);
  assert.match(emailFields, /list_email_records/);
  assert.match(emailFields, /get_received_email/);
  assert.match(emailFields, /query_email_send_statistics/);
  assert.match(emailFields, /email_mark_read/);
  assert.match(emailSkill, /all_members/);
  assert.match(emailSkill, /CRM成员编号必须经可信关系映射成邮件目标/);

  for (const skill of [sampleSkill, messageSkill, emailSkill]) {
    assert.match(skill, /Agent共享规则/);
    assert.doesNotMatch(skill, /10\s*次[\s\S]{0,40}30\s*秒/);
  }
});

test('keeps shared query contracts and T12/T14/T39 support in references', () => {
  assert.match(commonContract, /read_status/);
  assert.match(commonContract, /partial/);
  assert.match(commonContract, /effects/);
  assert.match(commonContract, /continuation_token/);
  assert.match(commonContract, /subscription_status_maintenance/);
  assert.match(identifiersReference, /member_id/);
  assert.match(identifiersReference, /task_creator_row_id/);
  assert.match(identifiersReference, /authUserId/);
  assert.match(supportContract, /T12/);
  assert.match(supportContract, /T14/);
  assert.match(supportContract, /T39/);
  assert.match(supportContract, /direct_message/);
  assert.match(supportContract, /all_members/);
  assert.match(supportContract, /result=\{task,creator,messages,count\}/);
  assert.match(lookupAdditions, /10次/);
  assert.match(lookupAdditions, /30秒/);
  assert.match(lookupAdditions, /T04/);
  assert.match(lookupAdditions, /T39/);
  for (const source of [sampleSkill, sampleFields, messageSkill, messageFields, emailSkill, emailFields, lookupAdditions]) {
    assert.doesNotMatch(source, /待开发对齐|正式注册仍待开发确认|目前未执行|由开发评审|拟新增/);
  }
});

test('keeps every shipped quick-lookup relative reference resolvable', () => {
  const files = [
    lookupAdditionsPath,
    path.join(quickLookupReferenceDir, 'common-contract.md'),
    path.join(quickLookupReferenceDir, 'identifiers-and-relations.md'),
    path.join(quickLookupReferenceDir, 'reply-support-tool-contracts.md'),
    sampleSkillPath,
    sampleFieldsPath,
    messageSkillPath,
    messageFieldsPath,
    emailSkillPath,
    emailFieldsPath,
  ];
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /\]\(\.\.\/\.\.\/\.\.\/\.\.\/0/, `external requirement link in ${file}`);
    for (const match of source.matchAll(/\]\((\.[^)]+)\)/g)) {
      const target = path.resolve(path.dirname(file), match[1].split('#')[0]);
      assert.ok(fs.existsSync(target), `Missing relative reference: ${file} -> ${match[1]}`);
    }
  }
});

test('routes historical task questions to creator records in the message skill', () => {
  const workflow = getMarkdownSection(messageSkill, '## 已有任务关系与停止');
  assert.match(workflow, /“当时发了什么”优先查询T14指定达人的现存发送记录/);
  assert.match(workflow, /问当前保存文案、查询\/过滤设置时才按需T12/);
  assert.match(workflow, /不强制先T12再T14/);
  assert.match(workflow, /已有关系无须重新打开通知或标读/);
  assert.match(workflow, /不为任务追溯默认读取整段聊天/);
  assert.match(workflow, /配置或回填称为历史实发原文/);
  assert.match(workflow, /含占位符的文本照源引用/);
  assert.match(workflow, /关系已确认而消息读取失败时保留关系/);
  assert.match(workflow, /不凭时间相邻断言/);
  assert.match(workflow, /跨组支撑工具/);
  // The workflow owner must not copy the field or identity implementation.
  assert.doesNotMatch(workflow, /isInvitation|is_invitation|task_config_backfill|\/auth\/me|authUserId/);
});

test('keeps the task branch and source-content contract in the support reference', () => {
  assert.match(supportContract, /direct_message表示本期ExtendSendTask查询分支/);
  assert.match(supportContract, /不开放invitation对应的独立邀约任务查询/);
  assert.match(supportContract, /ExtendSendTask\.isInvitation仅为源标记/);
  assert.match(supportContract, /缺失或不可识别为null/);
  assert.match(supportContract, /不能凭true\/缺失、任务名称或邀约卡片/);
  assert.match(supportContract, /message_record只说明内容来自该达人现存任务消息记录/);
  assert.match(supportContract, /是否发送成功按实际status\/result表达/);
  assert.match(supportContract, /task_config_backfill只说明按当前配置回填/);
  assert.match(supportContract, /长文续查只展示首次已取配置，不重读任务详情/);
  assert.match(supportContract, /业务成员或店铺变化后/);
  for (const summary of [agent, lookupAdditions, identifiersReference, messageFields]) {
    assert.doesNotMatch(summary, /isInvitation|is_invitation|task_config_backfill/);
  }
  for (const summary of [agent, lookupAdditions]) {
    assert.doesNotMatch(summary, /“当时发了什么”优先查询T14|不强制先T12再T14/);
  }
});

test('requires actual chat identifiers and task links in the chat field reference', () => {
  assert.match(messageFields, /店铺出站消息的taskId表示产生该消息的发送任务/);
  assert.match(messageFields, /达人入站消息的replyToTaskId是系统关联到的最近出站任务/);
  assert.match(messageFields, /不代表达人主观回复原因/);
  assert.match(messageFields, /核对通知与聊天的messageId/);
  assert.match(messageFields, /不能凭时间相邻、同一达人或卡片内容/);
  assert.doesNotMatch(messageSkill, /店铺出站消息的taskId表示|replyToTaskId是系统关联到/);
});

test('documents the quick-lookup skill set in the package docs', () => {
  for (const skillId of [
    'scorehub-sample-lookup',
    'scorehub-creator-message-lookup',
    'scorehub-email-lookup',
  ]) {
    assert.match(docsReadme, new RegExp(skillId));
  }
  assert.match(docsReadme, /八个 Skill|8 个 Skill/);
  assert.match(packageReadme, /样品申请/);
  assert.match(packageReadme, /达人回复/);
  assert.match(packageReadme, /邮件/);
  assert.match(packageReadmeEn, /sample application/i);
  assert.match(packageReadmeEn, /creator replies/i);
  assert.match(packageReadmeEn, /email records/i);
});

// 开放平台质检驳回修复：依赖未就绪时不得交白卷，也不得为凑表格格式编造达人数据。
// Agent 是四段交付结构的唯一 owner；两个 Skill 只声明本领域离线可交付项，反向断言防止结构回流。
test('defines the shared degraded-delivery contract as the single owner', () => {
  const section = getMarkdownSection(agent, '## 能力不可用时的交付契约');
  assert.match(section, /不执行任何搜索、分析、建联或随手查工具调用/);
  assert.match(section, /\*\*能力状态\*\*/);
  assert.match(section, /\*\*本轮未执行项\*\*/);
  assert.match(section, /\*\*离线可交付方案\*\*/);
  assert.match(section, /\*\*恢复清单与待执行计划\*\*/);
  assert.match(section, /禁止生成达人表、表头示例、示例行、占位数值或标注为「示例」的达人数据/);
  assert.match(section, /平台约束，实际以工具返回为准/);
  assert.match(section, /本节是共享行为的唯一权威来源/);
  assert.match(section, /不能替代本轮交付/);
  assert.match(agent, /ScoreHub 依赖未就绪时的交付边界以本文件「能力不可用时的交付契约」为唯一权威来源/);
  assert.match(agent, /按「能力不可用时的交付契约」交付本轮方案文档/);
  assert.match(searchSkill, /四段交付结构遵循 Agent/);
  assert.match(outreachSkill, /按 Agent 的「能力不可用时的交付契约」交付/);
  assert.doesNotMatch(searchSkill, /1\. \*\*能力状态\*\*/);
  assert.doesNotMatch(outreachSkill, /1\. \*\*能力状态\*\*/);
});

test('replaces sample creator rows with a real offline search plan', () => {
  const section = getMarkdownSection(searchSkill, '## 工具不可用时的离线交付');
  assert.match(section, /不生成达人列表、表头、示例行、占位数值或空表/);
  assert.match(section, /筛选口径/);
  assert.match(section, /数量与分页计划/);
  assert.match(section, /结果格式预告/);
  assert.match(section, /恢复后的验证顺序/);
  assert.match(section, /口红等深层词需上卷到顶层或所属直接子类目/);
  assert.match(section, /不得为了凑齐表格格式编造昵称、GMV、粉丝数或达人 ID/);
  assert.match(section, /不得把方案表述为「搜索结果」或「已筛选名单」/);
  assert.match(searchSkill, /工具不可用不属于搜索专属错误分支/);
  assert.match(searchSkill, /结果为空时不生成空表/);
  assert.match(searchSkill, /未找到符合条件的达人/);
});

test('surfaces the single-Offer-per-batch rule with explicit trigger phrases', () => {
  assert.match(agent, /11\. \*\*整批单一 Offer\*\*/);
  assert.match(agent, /话术正文可轮换但 Offer 不可轮换/);
  assert.match(agent, /三组轮着来/);
  assert.match(agent, /必须显式援引本条/);
  const section = getMarkdownSection(outreachSkill, '### 整批单一 Offer（硬约束）');
  assert.match(section, /同一批达人只能选择一种 Offer 承诺/);
  assert.match(section, /商业承诺必须整批一致/);
  assert.match(section, /不得只从「无法归因」「测试设计」等角度回应/);
  assert.match(section, /A\/B 测试不同条件/);
  assert.match(section, /单 Offer 多套文案/);
  assert.match(outreachSkill, /整批单一 Offer 约束见上节，不在此重复/);
  assert.match(outreachSkill, /不得声称已创建会话或已发送/);
  assert.doesNotMatch(outreachSkill, /i % 3|取模/);
  assert.match(messageTemplates, /同一批达人始终使用同一个已确认 Offer/);
});

test('allows an explicit confirmation waiver and qualifies platform limits as tool-return-dependent', () => {
  assert.match(agent, /用户明确表示「不用确认」「直接发」时不再往返索要确认/);
  assert.match(agent, /真实发送前仍须一次性列出名单、话术与规模/);
  assert.match(agent, /只输出计划并说明未发送，不得声称已发送/);
  const limits = getMarkdownSection(agent, '## 限制与注意事项');
  assert.match(limits, /实际剩余量以工具返回为准/);
  assert.match(limits, /不得把「并发必然触发限流」当作既定事实/);
  assert.match(limits, /不据此推断某批名单是否合格/);
  assert.match(limits, /具体上限以工具返回为准/);
});

// 质检 1.12.4 点名的两处冲突：Agent 的免确认豁免被 Skill 优先级覆盖、离线交付并列 A/B Offer。
test('keeps the confirmation waiver and single-Offer wording owned by the outreach skill', () => {
  assert.match(outreachSkill, /发送前\*\*必须\*\*与用户确认/);
  assert.match(outreachSkill, /\*\*明确豁免\*\*/);
  assert.match(outreachSkill, /不再往返索要上述四项决策/);
  assert.match(outreachSkill, /不取消「整批单一 Offer」/);
  assert.match(outreachSkill, /三个选项只用于\*\*择一\*\*/);
  assert.match(outreachSkill, /单一 Offer 候选/);
  assert.match(outreachSkill, /不得并列 A\/B 两套待选/);
  assert.match(docsReadme, /明确免确认豁免/);
  assert.match(docsReadme, /离线交付单一 Offer 候选/);
});

test('mirrors the degraded-delivery summary in product and listing docs', () => {
  assert.match(docsReadme, /能力不可用时的交付契约/);
  assert.match(docsReadme, /依赖未就绪时的交付/);
  assert.match(docsReadme, /不提供绕过 ScoreHub MCP 获取真实达人数据的直连降级路径/);
  assert.match(packageReadme, /交付一份包含能力状态、本轮未执行项、筛选与建联方案、恢复清单的方案文档/);
  assert.match(packageReadmeEn, /never fabricates creator lists or send results/);
  assert.match(listingReadme, /依赖未就绪时，Tiky 不编造达人名单或发送结果/);
  assert.match(listingReadme, /依赖未就绪时不生成达人表格、示例行或占位数值/);
});

// 首轮引导不得吞掉明确业务意图：门禁只保证环境可用，不决定要不要办事。
test('routes an explicit first-turn business intent straight to execution', () => {
  const section = getMarkdownSection(agent, '## 新会话首轮引导（最高优先级）');
  assert.match(section, /### 首轮意图分流（先于欢迎语判断）/);
  assert.match(section, /门禁 \/ 依赖检查只保证环境可用.*不决定是否办理业务/);
  assert.match(section, /立即按对应 Skill 执行/);
  assert.match(section, /不输出欢迎语、不追加「想从哪一步开始？」、不等待下一条消息/);
  assert.match(section, /首轮不是业务操作的等待期/);
  assert.match(section, /原因是依赖不可用或授权缺失/);
  assert.match(section, /不得把未执行归因于轮次、会话阶段或流程/);
  assert.match(section, /仅当命中上述第 2 类时，首轮使用以下完整中文欢迎语/);
  assert.match(agent, /未命中明确业务意图时，首轮回复结束后等待用户下一条消息/);
  assert.doesNotMatch(agent, /从下一条消息开始，按本文件已有的授权/);
  assert.doesNotMatch(agent, /按首轮流程|首轮暂未调用/);
  assert.match(docsReadme, /首轮引导与意图分流/);
});
