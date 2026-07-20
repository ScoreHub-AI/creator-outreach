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
const packageJson = require('../package.json');
const pluginJson = require('../.codebuddy-plugin/plugin.json');

test('recognizes account and shop switching before the first-turn welcome', () => {
  assert.match(agent, /在输出欢迎语前，先识别以下明确意图/);
  assert.match(agent, /\{ "switch_shop": true \}/);
  assert.match(agent, /\{ "force": true \}/);
  assert.match(agent, /你想切换账号还是店铺？/);
  assert.match(agent, /不得先输出欢迎语/);
});

test('keeps shop rebind errors separate from switching', () => {
  assert.match(agent, /shop_auth_invalid/);
  assert.match(agent, /不能把它误作账号或店铺切换/);
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
  assert.match(searchSkill, /排名 \/ 昵称 \/ 用户名 \/ 粉丝数 \/ 近 30 天 GMV 区间 \/ 类目匹配 \/ 标识/);
  assert.match(searchSkill, /默认保持 `search_creators` 返回顺序/);
  assert.match(searchSkill, /不要向用户展示 `page_token`/);
  assert.match(searchSkill, /`creator_user_id` 和 `creator_open_id` 的一一映射/);
  assert.match(searchSkill, /建联 ID 不可用/);
  assert.match(searchSkill, /未找到符合条件的达人/);
});

test('constrains creator scoring results and avoids misleading single-creator scores', () => {
  assert.match(analysisSkill, /禁止直接展示 MCP 原始 JSON/);
  assert.match(analysisSkill, /不输出综合分或五维相对分/);
  assert.match(analysisSkill, /至少需要 2 位候选人才可评分排名/);
  assert.match(analysisSkill, /排名 \/ 达人 \/ 综合分 \/ 带货能力 \/ 内容影响力 \/ 粉丝规模 \/ 品类匹配 \/ 粉丝质量 \/ 标签/);
  assert.match(analysisSkill, /综合分降序.*带货能力分.*内容影响力分.*粉丝数降序/);
  assert.match(analysisSkill, /失败值作为 0 分参与排序/);
  assert.match(analysisSkill, /`creator_performance` 不返回 `creator_open_id`/);
});

test('uses HTML visualization only when supported and preserves a complete fallback', () => {
  for (const source of [agent, searchSkill, analysisSkill]) {
    assert.match(source, /1–5/);
    assert.match(source, /6 条|6 位/);
    assert.match(source, /内联 CSS\/JavaScript/);
    assert.match(source, /HTML.*转义/);
    assert.match(source, /回退.*Markdown/);
    assert.match(source, /不得虚构文件名|不得虚构.*路径/);
  }
});

test('keeps the WorkBuddy plugin version aligned with the npm package', () => {
  assert.equal(pluginJson.version, packageJson.version);
});

test('keeps ScoreHub AI as the master brand and Tiky as the named expert agent', () => {
  const displayName = 'ScoreHub AI TikTok达人营销专家 · Tiky';

  assert.equal(pluginJson.displayName.zh, displayName);
  assert.equal(pluginJson.profession.zh, 'TikTok达人营销专家');
  assert.match(pluginJson.displayDescription.zh, /Tiky 是 ScoreHub AI 打造的 TikTok 达人营销智能体/);
  assert.match(agent, new RegExp(displayName.replace('·', '\\·')));
  assert.match(agent, /我是 Tiky，ScoreHub AI 的 TikTok 达人营销专家/);
  assert.doesNotMatch(agent, /TikTok达人建联专家|Tiky by ScoreHub AI/);
});
