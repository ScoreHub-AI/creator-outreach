const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const agentPath = path.join(__dirname, '..', 'agents', 'tiktok-creator-outreach.md');
const agent = fs.readFileSync(agentPath, 'utf8');
const searchSkillPath = path.join(__dirname, '..', 'skills', 'tiktok-creator-search', 'SKILL.md');
const searchSkill = fs.readFileSync(searchSkillPath, 'utf8');
const analysisSkillPath = path.join(__dirname, '..', 'skills', 'tiktok-creator-analysis', 'SKILL.md');
const analysisSkill = fs.readFileSync(analysisSkillPath, 'utf8');
const outreachSkillPath = path.join(__dirname, '..', 'skills', 'tiktok-batch-outreach', 'SKILL.md');
const outreachSkill = fs.readFileSync(outreachSkillPath, 'utf8');
const docsReadmePath = path.join(__dirname, '..', 'docs', 'README.md');
const docsReadme = fs.readFileSync(docsReadmePath, 'utf8');
const packageReadmePath = path.join(__dirname, '..', 'README.md');
const packageReadme = fs.readFileSync(packageReadmePath, 'utf8');
const packageReadmeEnPath = path.join(__dirname, '..', 'README.en.md');
const packageReadmeEn = fs.readFileSync(packageReadmeEnPath, 'utf8');
const onboardingPath = path.join(__dirname, '..', 'docs', 'WORKBUDDY_PUBLIC_ONBOARDING.md');
const onboardingDoc = fs.readFileSync(onboardingPath, 'utf8');
const packageJson = require('../package.json');
const pluginJson = require('../.codebuddy-plugin/plugin.json');
const {
  CREATOR_OUTREACH_SELF_BOOTSTRAP_COMMAND,
  WORKBUDDY_SHARE_URL,
} = require('../install.js');

test('keeps the agent as the single authority for shared behavior', () => {
  assert.match(agent, /唯一权威来源/);
  assert.match(agent, /`skills\/\*\/SKILL\.md` 只保留各领域特有/);
  assert.match(agent, /`docs\/README\.md` 与包级 README 仅做产品、安装和协作文档说明/);
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
  assert.match(searchSkill, /排名 \/ 昵称 \/ 用户名 \/ 粉丝数 \/ 近 30 天 GMV 区间 \/ 类目匹配 \/ 达人 ID/);
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
});

test('keeps search conditions internal and caps a search session at 60 creators', () => {
  assert.match(searchSkill, /不新增等待用户二次确认的回合/);
  assert.match(searchSkill, /最终实际生效的条件作为本轮搜索条件/);
  assert.match(searchSkill, /用户未指定数量时，默认展示 20 位达人/);
  assert.match(searchSkill, /超过 60 时按 60 执行/);
  assert.match(searchSkill, /首次搜索和“继续翻页”视为同一搜索会话/);
  assert.match(searchSkill, /累计展示 60 位时必须停止/);
  assert.match(searchSkill, /禁止展示市场、类目、GMV、关键词、粉丝画像或目标展示人数等搜索条件/);
  assert.ok(searchSkill.indexOf('**结果摘要**') < searchSkill.indexOf('**达人列表**'));
  assert.match(searchSkill, /本次搜索已达到 60 位达人上限；请调整条件后重新搜索/);
  assert.match(agent, /搜索条件确定后不等待二次确认/);
});

test('constrains creator scoring results and avoids misleading single-creator scores', () => {
  assert.match(analysisSkill, /禁止直接展示 MCP 原始 JSON/);
  assert.match(analysisSkill, /不输出综合分或五维相对分/);
  assert.match(analysisSkill, /至少需要 2 位候选人才可评分排名/);
  assert.match(analysisSkill, /排名 \/ 达人 \/ 综合分 \/ 带货能力 \/ 内容影响力 \/ 粉丝规模 \/ 品类匹配 \/ 粉丝质量 \/ 标签/);
  assert.match(analysisSkill, /综合分降序.*带货能力分.*内容影响力分.*粉丝数降序/);
  assert.match(analysisSkill, /失败值作为 0 分参与排序/);
  assert.match(analysisSkill, /入参名保留为 `creator_user_id`，其值必须直接使用搜索结果中的 `creator_open_id`/);
  assert.match(analysisSkill, /`creator_performance` 不返回该 ID/);
  assert.match(analysisSkill, /评分对象范围/);
});

test('keeps outreach-specific confirmation and delivery rules in the outreach skill', () => {
  assert.match(outreachSkill, /发送前\*\*必须\*\*与用户确认/);
  assert.match(outreachSkill, /品牌名/);
  assert.match(outreachSkill, /佣金比例/);
  assert.match(outreachSkill, /`create_conversation`/);
  assert.match(outreachSkill, /`send_message`/);
  assert.match(outreachSkill, /5-8 秒 \+ 随机抖动/);
  assert.match(outreachSkill, /3 套模板 A\/B\/C/);
  assert.match(outreachSkill, /`creator_open_id` \*\*仅来自搜索接口\*\*/);
});

test('requires a WorkBuddy HTML search artifact for six or more results', () => {
  for (const source of [agent, searchSkill]) {
    assert.match(source, /1–5/);
    assert.match(source, /WorkBuddy/);
    assert.match(source, /6 条/);
    assert.match(source, /HTML 产物通道/);
    assert.match(source, /不得仅因宿主未显式声明 HTML\/可视化能力而回退 Markdown/);
    assert.match(source, /内联 CSS\/JavaScript/);
    assert.match(source, /HTML.*转义/);
    assert.match(source, /回退.*Markdown/);
    assert.match(source, /不得虚构文件名|不得虚构.*路径/);
  }

  assert.match(searchSkill, /HTML 产物实际创建失败/);
  assert.match(agent, /非 WorkBuddy 宿主使用完整 Markdown/);
  assert.match(analysisSkill, /若当前宿主提供 HTML\/可视化产物能力/);
});

test('links creator nicknames to TikTok profile pages when username is available', () => {
  assert.match(agent, /“昵称”列链接到 `https:\/\/www\.tiktok\.com\/@\{username\}`/);
  assert.match(agent, /`username` 缺失时昵称保持纯文本/);
  assert.match(agent, /新标签页打开并带 `rel="noopener noreferrer"`/);
  assert.match(searchSkill, /Markdown 表格中的昵称也应输出为可点击链接/);
  assert.match(searchSkill, /target="_blank"/);
  assert.match(searchSkill, /rel="noopener noreferrer"/);
});

test('keeps docs README as a product and collaboration document instead of a second behavior spec', () => {
  assert.match(docsReadme, /文档权威来源/);
  assert.match(docsReadme, /Agent 权威规范/);
  assert.match(docsReadme, /Skill 专项规则/);
  assert.match(docsReadme, /包级 README/);
  assert.match(docsReadme, /以上能力的具体行为细节不在本文件重复展开/);
  assert.match(docsReadme, /修改智能体通用行为时，只改 Agent 权威规范/);
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
