const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  CREATOR_OUTREACH_SELF_BOOTSTRAP_COMMAND,
  CUSTOM_EXPERT_MARKETPLACE,
  DEV_DISPLAY_NAME,
  MCP_SERVER_SELF_CHECK_COMMAND,
  PLATFORM_PLUGIN_ID,
  PLUGIN_ID,
  PLUGIN_NAME,
  WORKBUDDY_SHARE_URL,
  check,
  defaultMcpSelfCheck,
  detectActivationGap,
  findLegacyLocalCopy,
  getPaths,
  install,
  isLocalChannelEnabled,
  isMaterializedCacheValid,
  isPlatformChannelEnabled,
  isSupportedNode,
  isVersionBehind,
  markReady,
  needsMcpLauncherMigration,
  readEffectivePluginVersion,
  readLocalChannelSkillIds,
  readLocalChannelSourceDir,
  readSkillIds,
  readSourcePluginVersion,
  resolveWorkBuddyLauncher,
  UPDATE_INTERVAL_MS,
  update,
} = require('../install.js');

const PACKAGE_VERSION = require('../package.json').version;

function makeHome() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'creator-outreach-'));
}

function successfulSelfCheck() {
  return {
    schema_version: 1,
    ok: true,
    package_name: '@scorehub/mcp-server',
    server_version: '0.3.4',
    node_version: '22.14.0',
  };
}

function makeWorkBuddy(homeDir) {
  fs.mkdirSync(path.join(homeDir, '.workbuddy'), { recursive: true });
}

/** 读 my-experts 的注册清单（插件管理器的扫描输入）。 */
function readMarketplaceManifest(homeDir) {
  return JSON.parse(fs.readFileSync(getPaths(homeDir).marketplaceManifest, 'utf8'));
}

/** 读自测通道源码位 plugin.json。 */
function readDevManifest(paths) {
  return JSON.parse(fs.readFileSync(
    path.join(paths.workBuddyPluginDir, '.codebuddy-plugin', 'plugin.json'), 'utf8',
  ));
}

function makeManagedWindowsRuntime(homeDir, version = '22.22.2') {
  const versionDir = path.join(homeDir, '.workbuddy', 'binaries', 'node', 'versions', version);
  const node = path.join(versionDir, 'node.exe');
  const npxCli = path.join(versionDir, 'node_modules', 'npm', 'bin', 'npx-cli.js');
  fs.mkdirSync(path.dirname(npxCli), { recursive: true });
  fs.writeFileSync(node, 'managed node');
  fs.writeFileSync(npxCli, 'managed npx cli');
  return { versionDir, node, npxCli };
}

/**
 * 模拟 WorkBuddy 的加载位：写出与登记表一致的版本化缓存目录。
 * 这是判定「用户实际跑哪一版」的唯一来源，测试不得绕过它。
 */
function makeEffectivePlugin(homeDir, version) {
  const paths = getPaths(homeDir);
  const cacheDir = path.join(paths.pluginCacheRoot, version);
  fs.mkdirSync(path.join(cacheDir, '.codebuddy-plugin'), { recursive: true });
  fs.writeFileSync(
    path.join(cacheDir, '.codebuddy-plugin', 'plugin.json'),
    JSON.stringify({ name: 'tiktok-creator-outreach', version }),
  );
  const registry = fs.existsSync(paths.installedPluginsRegistry)
    ? JSON.parse(fs.readFileSync(paths.installedPluginsRegistry, 'utf8'))
    : { version: 2, plugins: {} };
  registry.plugins[PLUGIN_ID] = [{
    scope: 'user',
    installPath: cacheDir,
    version,
    installedAt: '2026-08-11T02:20:13.592Z',
    lastUpdated: '2026-08-11T02:20:13.592Z',
  }];
  fs.mkdirSync(path.dirname(paths.installedPluginsRegistry), { recursive: true });
  fs.writeFileSync(paths.installedPluginsRegistry, JSON.stringify(registry, null, 2));
  return cacheDir;
}

/**
 * 复现旧版安装器留下的「与平台版同名的 my-experts 副本」：
 * 目录 + 缓存 + 市场清单 + 登记表 + settings 五处全齐。
 * 这套残留实测会让平台版与本地副本在同一台机器上同时加载同名技能（先加载者占用）。
 */
function plantLegacyLocalCopy(homeDir) {
  const paths = getPaths(homeDir);
  const legacyPluginDir = path.join(path.dirname(paths.workBuddyPluginDir), 'tiktok-creator-outreach');
  const legacyCacheRoot = path.join(path.dirname(paths.pluginCacheRoot), 'tiktok-creator-outreach');
  fs.mkdirSync(path.join(legacyPluginDir, '.codebuddy-plugin'), { recursive: true });
  fs.writeFileSync(
    path.join(legacyPluginDir, '.codebuddy-plugin', 'plugin.json'),
    JSON.stringify({ name: 'tiktok-creator-outreach', version: '1.3.3' }),
  );
  fs.mkdirSync(path.join(legacyCacheRoot, '1.3.3'), { recursive: true });
  fs.writeFileSync(path.join(legacyCacheRoot, '1.3.3', 'SKILL.md'), 'legacy');
  fs.mkdirSync(path.dirname(paths.marketplaceManifest), { recursive: true });
  fs.writeFileSync(paths.marketplaceManifest, JSON.stringify({
    name: CUSTOM_EXPERT_MARKETPLACE,
    description: 'my-experts marketplace (auto-generated)',
    plugins: [
      { name: 'other-expert', source: './plugins/other-expert', description: 'keep me' },
      { name: 'tiktok-creator-outreach', source: './plugins/tiktok-creator-outreach', description: 'legacy' },
    ],
  }));
  fs.mkdirSync(path.dirname(paths.installedPluginsRegistry), { recursive: true });
  fs.writeFileSync(paths.installedPluginsRegistry, JSON.stringify({
    version: 2,
    plugins: {
      'tiktok-creator-outreach@my-experts': [{
        scope: 'user',
        installPath: path.join(legacyCacheRoot, '1.3.3'),
        version: '1.3.3',
      }],
    },
  }));
  fs.writeFileSync(paths.workBuddySettings, JSON.stringify({
    enabledPlugins: { 'tiktok-creator-outreach@my-experts': false, 'other@x': true },
  }));
  return { legacyPluginDir, legacyCacheRoot };
}

const LEGACY_LABELS = ['cache', 'manifest', 'plugin', 'registry', 'settings'];

test('exports the public commands and accepts Node.js 18 and later', () => {
  assert.equal(isSupportedNode('18.0.0'), true);
  assert.equal(isSupportedNode('24.6.0'), true);
  assert.equal(isSupportedNode('17.9.1'), false);
  assert.equal(CREATOR_OUTREACH_SELF_BOOTSTRAP_COMMAND, 'npx -y @scorehub/creator-outreach@latest');
  assert.equal(MCP_SERVER_SELF_CHECK_COMMAND, 'npx -y @scorehub/mcp-server@latest --self-check --json');
  assert.match(WORKBUDDY_SHARE_URL, /^https:\/\/www\.workbuddy\.cn\/work\/launch\//);
});

test('check is read-only and reports unsupported or missing environments', () => {
  const unsupportedHome = makeHome();
  assert.equal(check({ homeDir: unsupportedHome, nodeVersion: '16.20.0' }).status, 'repair_required');
  assert.deepEqual(fs.readdirSync(unsupportedHome), []);

  const missingHome = makeHome();
  assert.equal(check({ homeDir: missingHome }).status, 'repair_required');
  assert.deepEqual(fs.readdirSync(missingHome), []);
});

test('reports an uninitialized WorkBuddy before user confirmation', () => {
  const homeDir = makeHome();
  makeWorkBuddy(homeDir);

  const result = check({ homeDir });

  assert.equal(result.status, 'uninitialized');
  assert.equal(result.consent_granted, false);
  assert.equal(fs.existsSync(getPaths(homeDir).bootstrapState), false);
});

test('bootstrap install configures mcp-server latest without touching the expert marketplace', () => {
  const homeDir = makeHome();
  makeWorkBuddy(homeDir);
  const paths = getPaths(homeDir);
  fs.writeFileSync(paths.workBuddyMcpJson, JSON.stringify({
    mcpServers: { existing: { command: 'existing-server' } },
  }));

  const result = install({ homeDir, selfCheck: successfulSelfCheck });
  const mcpConfig = JSON.parse(fs.readFileSync(paths.workBuddyMcpJson, 'utf8'));
  const state = JSON.parse(fs.readFileSync(paths.bootstrapState, 'utf8'));

  assert.equal(result.status, 'restart_required');
  assert.deepEqual(mcpConfig.mcpServers.scorehub.args, ['-y', '@scorehub/mcp-server@latest']);
  assert.equal(mcpConfig.mcpServers.existing.command, 'existing-server');
  assert.equal(mcpConfig.mcpServers.scorehub.env.SCOREHUB_CLIENT_HOST, 'workbuddy');
  assert.equal(mcpConfig.mcpServers.scorehub.env.SCOREHUB_MANAGED_BY, '@scorehub/creator-outreach');
  assert.equal(state.consent_granted, true);
  assert.equal(state.observed_mcp_server_version, '0.3.4');
  assert.equal(state.restart_required, true);
  assert.equal(check({ homeDir }).installed_creator_outreach_version, PACKAGE_VERSION);
  // 用户路径不写自测通道：不注册清单、不落源码、不在 my-experts 里留同名副本。
  assert.equal(fs.existsSync(paths.workBuddyPluginDir), false);
  assert.equal(fs.existsSync(paths.marketplaceManifest), false);
  assert.equal(fs.existsSync(paths.installedPluginsRegistry), false);
  assert.equal(result.local_channel_version, undefined);
});

test('bootstrap --dev activates the local self-test channel end to end', () => {
  const homeDir = makeHome();
  makeWorkBuddy(homeDir);
  const paths = getPaths(homeDir);

  const result = install({ homeDir, selfCheck: successfulSelfCheck, dev: true });
  const manifest = readMarketplaceManifest(homeDir);
  const devManifest = readDevManifest(paths);
  const cacheDir = path.join(paths.pluginCacheRoot, PACKAGE_VERSION);

  // 1. 源码位换成自测身份，且不再与平台版同名。
  assert.equal(devManifest.name, PLUGIN_NAME);
  assert.equal(devManifest.plugin, PLUGIN_NAME);
  assert.equal(devManifest.displayName.zh, DEV_DISPLAY_NAME.zh);
  assert.match(devManifest.description, /本地自测副本$/);
  assert.notEqual(PLUGIN_NAME, 'tiktok-creator-outreach');
  // agentName 与 agents/ 文件名保持原样，否则运行时会找不到 agent markdown。
  assert.equal(devManifest.agentName, 'tiktok-creator-outreach');
  assert.deepEqual(devManifest.agents, ['./agents/tiktok-creator-outreach.md']);

  // 2. 注册清单写进去了 —— 否则「我的专家」列表里根本没有这个条目。
  assert.equal(manifest.name, CUSTOM_EXPERT_MARKETPLACE);
  assert.deepEqual(manifest.plugins, [{
    name: PLUGIN_NAME,
    source: `./plugins/${PLUGIN_NAME}`,
    description: `${devManifest.description.replace(/ ｜本地自测副本$/, '')} ｜本地自测副本`,
  }]);

  // 3. 缓存物化到 <root>/<版本>，即真正被加载的位置。
  assert.equal(fs.existsSync(cacheDir), true);
  const cachedManifest = JSON.parse(fs.readFileSync(
    path.join(cacheDir, '.codebuddy-plugin', 'plugin.json'), 'utf8',
  ));
  assert.equal(cachedManifest.name, PLUGIN_NAME);
  assert.equal(cachedManifest.version, PACKAGE_VERSION);
  assert.equal(fs.existsSync(path.join(cacheDir, 'agents', 'tiktok-creator-outreach.md')), true);
  assert.equal(cachedManifest.skills.length, 5);
  const analyticsDir = path.join(cacheDir, 'skills', 'tiktok-affiliate-analytics');
  assert.match(fs.readFileSync(path.join(analyticsDir, 'SKILL.md'), 'utf8'), /name: tiktok-affiliate-analytics-dev/);
  for (const reference of fs.readdirSync(path.join(__dirname, '..', 'skills', 'tiktok-affiliate-analytics', 'references'))) {
    assert.ok(fs.existsSync(path.join(analyticsDir, 'references', reference)), `Missing packaged analytics reference: ${reference}`);
  }

  // 4. 登记表与启用开关就位，声明「自测通道已加载这一版」。
  assert.deepEqual(readEffectivePluginVersion(paths), {
    version: PACKAGE_VERSION,
    installPath: cacheDir,
  });
  assert.equal(isLocalChannelEnabled(paths), true);

  assert.equal(result.local_channel_version, PACKAGE_VERSION);
  assert.equal(result.local_channel_install_path, cacheDir);
  assert.equal(result.local_channel_registered, true);
  assert.equal(result.local_channel_enabled, true);
  assert.equal(devManifest.version, PACKAGE_VERSION);
});

test('bootstrap --dev is idempotent and preserves other custom experts', () => {
  const homeDir = makeHome();
  makeWorkBuddy(homeDir);
  const paths = getPaths(homeDir);
  fs.mkdirSync(path.dirname(paths.marketplaceManifest), { recursive: true });
  fs.writeFileSync(paths.marketplaceManifest, JSON.stringify({
    name: CUSTOM_EXPERT_MARKETPLACE,
    description: 'my-experts marketplace (auto-generated)',
    plugins: [{ name: 'other-expert', source: './plugins/other-expert', description: 'keep me' }],
  }));
  fs.writeFileSync(paths.workBuddyMcpJson, '{broken');

  // 坏掉的 mcp.json 必须让整次激活回滚，不能留下半激活状态。
  assert.throws(
    () => install({ homeDir, selfCheck: successfulSelfCheck, dev: true }),
    /mcp\.json is invalid/,
  );
  assert.deepEqual(readMarketplaceManifest(homeDir).plugins, [
    { name: 'other-expert', source: './plugins/other-expert', description: 'keep me' },
  ]);
  assert.equal(fs.existsSync(paths.workBuddyPluginDir), false);

  fs.writeFileSync(paths.workBuddyMcpJson, JSON.stringify({ mcpServers: {} }));
  install({ homeDir, selfCheck: successfulSelfCheck, dev: true });
  const second = install({ homeDir, selfCheck: successfulSelfCheck, dev: true });
  const manifest = readMarketplaceManifest(homeDir);

  // 清单不重复登记，也不吞掉别人的条目。
  assert.equal(manifest.plugins.length, 2);
  assert.deepEqual(manifest.plugins[0], {
    name: 'other-expert', source: './plugins/other-expert', description: 'keep me',
  });
  assert.deepEqual(manifest.plugins[1], {
    name: PLUGIN_NAME,
    source: `./plugins/${PLUGIN_NAME}`,
    description: `${readDevManifest(paths).description.replace(/ ｜本地自测副本$/, '')} ｜本地自测副本`,
  });
  // 每次都重新物化缓存（自测循环里 version 常常不变，不能按版本跳过），因此仍需一次重启。
  assert.equal(second.status, 'restart_required');
  assert.equal(second.local_channel_registered, false);
  assert.equal(isMaterializedCacheValid(paths, PACKAGE_VERSION), true);
});

test('bootstrap --dev gives the self-test copy its own skill ids so the two channels cannot shadow each other', () => {
  const homeDir = makeHome();
  makeWorkBuddy(homeDir);
  const paths = getPaths(homeDir);

  const result = install({ homeDir, selfCheck: successfulSelfCheck, dev: true });
  const cacheDir = path.join(paths.pluginCacheRoot, PACKAGE_VERSION);
  const devSkillIds = readSkillIds(cacheDir);
  const sourceSkillIds = readSkillIds(path.join(__dirname, '..'));

  // 技能 id 与源包一一对应、且全部带 -dev 后缀：WorkBuddy 对同名技能是「先加载者占用、
  // 后者静默跳过」，且 settings 的 enabledPlugins 拦不住加载，改名是唯一的隔离手段。
  assert.ok(sourceSkillIds.length > 0);
  assert.equal(devSkillIds.length, sourceSkillIds.length);
  for (const id of sourceSkillIds) {
    assert.equal(devSkillIds.includes(`${id}-dev`), true);
    assert.equal(devSkillIds.includes(id), false);
  }
  assert.deepEqual([...result.local_channel_skill_ids].sort(), [...devSkillIds].sort());
  assert.deepEqual([...readLocalChannelSkillIds(paths)].sort(), [...devSkillIds].sort());

  // agent 文件里的 skills 清单与正文引用必须一起改，否则 agent 指向不存在的技能。
  const agentPath = path.join(cacheDir, 'agents', 'tiktok-creator-outreach.md');
  const agentText = fs.readFileSync(agentPath, 'utf8');
  for (const id of sourceSkillIds) {
    assert.equal(agentText.includes(`${id}-dev`), true);
    assert.equal(new RegExp(`\\b${id}\\b(?!-dev)`).test(agentText), false);
  }
  // 幂等：再激活一次不会叠出 -dev-dev。
  install({ homeDir, selfCheck: successfulSelfCheck, dev: true });
  assert.equal(fs.readFileSync(agentPath, 'utf8').includes('-dev-dev'), false);
  assert.deepEqual(readSkillIds(cacheDir), devSkillIds);
});

/** 造一个「开发者仓库」替身：身份与正式包同族，内容带可辨认的标记。 */
function makeFakeSourceRepo(rootDir, { version, marker }) {
  const sourceDir = path.join(rootDir, 'fake-repo');
  fs.mkdirSync(path.join(sourceDir, '.codebuddy-plugin'), { recursive: true });
  fs.mkdirSync(path.join(sourceDir, 'skills', 'tiktok-creator-search'), { recursive: true });
  fs.writeFileSync(path.join(sourceDir, '.codebuddy-plugin', 'plugin.json'), JSON.stringify({
    name: 'tiktok-creator-outreach',
    plugin: 'tiktok-creator-outreach',
    agentName: 'tiktok-creator-outreach',
    displayName: { en: 'Fake Tiky', zh: '替身 Tiky' },
    description: 'fake source repo for the dev channel test',
    version,
    skills: ['./skills/tiktok-creator-search'],
  }, null, 2));
  const skillFile = path.join(sourceDir, 'skills', 'tiktok-creator-search', 'SKILL.md');
  fs.writeFileSync(skillFile, `---\nname: tiktok-creator-search\ndescription: fake\n---\n\n${marker}\n`);
  return { sourceDir, skillFile };
}

test('refreshes the dev channel from its recorded source repo, not from the package that happens to be running', () => {
  const homeDir = makeHome();
  makeWorkBuddy(homeDir);
  const paths = getPaths(homeDir);
  const { sourceDir, skillFile } = makeFakeSourceRepo(homeDir, {
    version: '0.9.9',
    marker: 'FAKE-REPO-ONE',
  });

  const first = install({ homeDir, selfCheck: successfulSelfCheck, dev: true, devSourceDir: sourceDir });
  const cacheDir = path.join(paths.pluginCacheRoot, '0.9.9');
  const cachedSkill = () => fs.readFileSync(path.join(cacheDir, 'skills', 'tiktok-creator-search', 'SKILL.md'), 'utf8');

  assert.equal(first.local_channel_version, '0.9.9');
  assert.equal(first.local_channel_source_dir, sourceDir);
  assert.match(cachedSkill(), /FAKE-REPO-ONE/);
  assert.deepEqual(readSkillIds(cacheDir), ['tiktok-creator-search-dev']);
  assert.equal(
    JSON.parse(fs.readFileSync(paths.installedPluginsRegistry, 'utf8')).plugins[PLUGIN_ID][0].sourceDir,
    sourceDir,
  );

  // 模拟 agent 会话里的静默更新：它跑的是 npm 发布包，`__dirname` 指向 npm 缓存而不是
  // 开发者仓库，因此不带 devSourceDir。刷新必须回到登记表记录的仓库 —— 否则一次 --update
  // 就会把还没发布的改动覆盖成发布版代码，而版本号看上去仍然正常。
  fs.writeFileSync(skillFile, '---\nname: tiktok-creator-search\ndescription: fake\n---\n\nFAKE-REPO-TWO\n');
  const second = update({ homeDir, selfCheck: successfulSelfCheck });

  assert.equal(second.local_channel_source_dir, sourceDir);
  assert.match(cachedSkill(), /FAKE-REPO-TWO/);
  assert.match(cachedSkill(), /^name: tiktok-creator-search-dev$/m);
  assert.equal(check({ homeDir }).local_channel_source_dir, sourceDir);
});

test('falls back to the running package when the recorded dev source is gone', () => {
  const homeDir = makeHome();
  makeWorkBuddy(homeDir);
  const paths = getPaths(homeDir);
  const { sourceDir } = makeFakeSourceRepo(homeDir, { version: '0.9.9', marker: 'FAKE-REPO-ONE' });

  install({ homeDir, selfCheck: successfulSelfCheck, dev: true, devSourceDir: sourceDir });
  fs.rmSync(sourceDir, { recursive: true, force: true });

  // 仓库被删/挪走后不能卡死：读不到记录来源就退回当前包根，自测通道照常刷新。
  assert.equal(readLocalChannelSourceDir(paths), null);
  const result = install({ homeDir, selfCheck: successfulSelfCheck, dev: true });
  assert.equal(result.local_channel_version, PACKAGE_VERSION);
  assert.equal(result.local_channel_source_dir, path.resolve(__dirname, '..'));
});

test('bootstrap --dev removes the legacy same-named my-experts copy that used to shadow the platform build', () => {
  const homeDir = makeHome();
  makeWorkBuddy(homeDir);
  const paths = getPaths(homeDir);
  const { legacyPluginDir, legacyCacheRoot } = plantLegacyLocalCopy(homeDir);

  // 探测本身必须只读。
  assert.deepEqual([...findLegacyLocalCopy(paths)].sort(), LEGACY_LABELS);
  assert.equal(check({ homeDir }).legacy_local_copy.sort().join(','), LEGACY_LABELS.join(','));

  const result = install({ homeDir, selfCheck: successfulSelfCheck, dev: true });

  assert.deepEqual([...result.legacy_local_copy_removed].sort(), LEGACY_LABELS);
  assert.equal(fs.existsSync(legacyPluginDir), false);
  assert.equal(fs.existsSync(legacyCacheRoot), false);
  const registry = JSON.parse(fs.readFileSync(paths.installedPluginsRegistry, 'utf8'));
  assert.equal('tiktok-creator-outreach@my-experts' in registry.plugins, false);
  assert.equal(PLUGIN_ID in registry.plugins, true);
  const settings = JSON.parse(fs.readFileSync(paths.workBuddySettings, 'utf8'));
  assert.equal('tiktok-creator-outreach@my-experts' in settings.enabledPlugins, false);
  assert.equal(settings.enabledPlugins['other@x'], true);
  // 别人的自定义专家条目一个都不能少。
  assert.deepEqual(readMarketplaceManifest(homeDir).plugins.map((plugin) => plugin.name),
    ['other-expert', PLUGIN_NAME]);
  assert.deepEqual(findLegacyLocalCopy(paths), []);
  assert.deepEqual(check({ homeDir }).legacy_local_copy, []);
});

test('the user path cleans the legacy copy too, and silent update does not short-circuit to ready while it lingers', () => {
  const homeDir = makeHome();
  makeWorkBuddy(homeDir);
  const paths = getPaths(homeDir);
  const { legacyPluginDir } = plantLegacyLocalCopy(homeDir);

  // 用户路径（不带 --dev）同样清残留：那是本安装器自己写坏的，与装不装自测无关。
  const userInstall = install({ homeDir, selfCheck: successfulSelfCheck });
  assert.deepEqual([...userInstall.legacy_local_copy_removed].sort(), LEGACY_LABELS);
  assert.equal(fs.existsSync(legacyPluginDir), false);

  // 残留再次出现时，静默更新不能直接报 ready 了事。
  markReady({ homeDir });
  plantLegacyLocalCopy(homeDir);
  let selfCheckCalls = 0;
  const result = update({
    homeDir,
    selfCheck: () => {
      selfCheckCalls += 1;
      return successfulSelfCheck();
    },
  });

  assert.deepEqual([...result.legacy_local_copy_removed].sort(), LEGACY_LABELS);
  assert.equal(selfCheckCalls, 1);
  assert.deepEqual(findLegacyLocalCopy(paths), []);
});

test('uses WorkBuddy managed node.exe and npx-cli.js on Windows', () => {
  const homeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'creator outreach-'));
  makeWorkBuddy(homeDir);
  makeManagedWindowsRuntime(homeDir, '22.9.0');
  const runtime = makeManagedWindowsRuntime(homeDir);
  const paths = getPaths(homeDir);

  const launcher = resolveWorkBuddyLauncher(paths.workBuddyDir, 'win32');
  assert.deepEqual(launcher, {
    command: runtime.node,
    argsPrefix: [runtime.npxCli],
    binDir: runtime.versionDir,
  });

  const result = install({ homeDir, platform: 'win32', selfCheck: successfulSelfCheck });
  const server = JSON.parse(fs.readFileSync(paths.workBuddyMcpJson, 'utf8')).mcpServers.scorehub;
  assert.equal(result.status, 'restart_required');
  assert.equal(server.command, runtime.node);
  assert.deepEqual(server.args, [runtime.npxCli, '-y', '@scorehub/mcp-server@latest']);
  assert.equal(server.env.PATH.split(path.delimiter)[0], runtime.versionDir);
  assert.equal(needsMcpLauncherMigration({ mcpServers: { scorehub: server } }, 'win32'), false);
});

test('runs self-check through the launcher without a shell', () => {
  const launcher = {
    command: 'C:\\Program Files\\WorkBuddy\\node.exe',
    argsPrefix: ['C:\\Program Files\\WorkBuddy\\node_modules\\npm\\bin\\npx-cli.js'],
  };
  const env = { PATH: 'managed' };
  let invocation;

  const result = defaultMcpSelfCheck({
    launcher,
    env,
    execFile(command, args, options) {
      invocation = { command, args, options };
      return `${JSON.stringify(successfulSelfCheck())}\n`;
    },
  });

  assert.equal(result.ok, true);
  assert.equal(invocation.command, launcher.command);
  assert.deepEqual(invocation.args, [
    launcher.argsPrefix[0],
    '-y',
    '@scorehub/mcp-server@latest',
    '--self-check',
    '--json',
  ]);
  assert.equal(invocation.options.env, env);
  assert.equal(invocation.options.timeout, 30000);
  assert.equal(Object.hasOwn(invocation.options, 'shell'), false);
});

test('does not mutate files when the Windows managed runtime is incomplete', () => {
  const homeDir = makeHome();
  makeWorkBuddy(homeDir);
  const paths = getPaths(homeDir);
  const original = JSON.stringify({ mcpServers: { existing: { command: 'existing-server' } } });
  fs.writeFileSync(paths.workBuddyMcpJson, original);

  assert.throws(
    () => install({ homeDir, platform: 'win32', selfCheck: successfulSelfCheck }),
    /managed Node\.js\/npm runtime is incomplete/,
  );
  assert.equal(fs.readFileSync(paths.workBuddyMcpJson, 'utf8'), original);
  assert.equal(fs.existsSync(paths.workBuddyPluginDir), false);
  assert.equal(fs.existsSync(paths.bootstrapState), false);
});

test('does not mutate files when self-check fails', () => {
  const homeDir = makeHome();
  makeWorkBuddy(homeDir);
  const paths = getPaths(homeDir);
  const original = JSON.stringify({ mcpServers: { existing: { command: 'existing-server' } } });
  fs.writeFileSync(paths.workBuddyMcpJson, original);

  assert.throws(
    () => install({ homeDir, selfCheck: () => { throw new Error('registry unavailable'); } }),
    /registry unavailable/,
  );
  assert.equal(fs.readFileSync(paths.workBuddyMcpJson, 'utf8'), original);
  assert.equal(fs.existsSync(paths.workBuddyPluginDir), false);
  assert.equal(fs.existsSync(paths.bootstrapState), false);
});

test('refuses to overwrite invalid mcp.json', () => {
  const homeDir = makeHome();
  makeWorkBuddy(homeDir);
  const paths = getPaths(homeDir);
  fs.writeFileSync(paths.workBuddyMcpJson, '{broken');

  assert.throws(() => install({ homeDir, selfCheck: successfulSelfCheck }), /mcp\.json is invalid/);
  assert.equal(fs.readFileSync(paths.workBuddyMcpJson, 'utf8'), '{broken');
  assert.equal(fs.existsSync(paths.workBuddyPluginDir), false);
});

test('restores mcp.json when plugin replacement fails', () => {
  const homeDir = makeHome();
  makeWorkBuddy(homeDir);
  const paths = getPaths(homeDir);
  const original = JSON.stringify({ mcpServers: { existing: { command: 'existing-server' } } });
  fs.writeFileSync(paths.workBuddyMcpJson, original);
  fs.mkdirSync(paths.workBuddyPluginDir, { recursive: true });
  fs.writeFileSync(path.join(paths.workBuddyPluginDir, 'sentinel.txt'), 'original plugin');

  assert.throws(
    () => install({
      homeDir,
      selfCheck: successfulSelfCheck,
      dev: true,
      replacePlugin: () => { throw new Error('plugin replacement failed'); },
    }),
    /plugin replacement failed/,
  );
  assert.equal(fs.readFileSync(paths.workBuddyMcpJson, 'utf8'), original);
  assert.equal(fs.readFileSync(path.join(paths.workBuddyPluginDir, 'sentinel.txt'), 'utf8'), 'original plugin');
  assert.equal(fs.existsSync(paths.bootstrapState), false);
  assert.equal(fs.existsSync(paths.marketplaceManifest), false);
  assert.equal(fs.existsSync(paths.installedPluginsRegistry), false);
});

test('marks a restarted installation ready and avoids rewriting the same version', () => {
  const homeDir = makeHome();
  makeWorkBuddy(homeDir);
  install({ homeDir, selfCheck: successfulSelfCheck });

  assert.deepEqual(markReady({ homeDir }), { status: 'ready' });
  let selfCheckCalls = 0;
  const result = update({
    homeDir,
    selfCheck: () => {
      selfCheckCalls += 1;
      return successfulSelfCheck();
    },
  });

  assert.equal(result.status, 'ready');
  assert.equal(selfCheckCalls, 0);
  assert.equal(check({ homeDir }).status, 'ready');
  assert.equal(check({ homeDir, now: Date.now() + UPDATE_INTERVAL_MS + 1000 }).update_due, true);
});

test('migrates a legacy Windows batch launcher even when the plugin version is current', () => {
  const homeDir = makeHome();
  makeWorkBuddy(homeDir);
  const paths = getPaths(homeDir);
  install({ homeDir, selfCheck: successfulSelfCheck });
  markReady({ homeDir });
  const runtime = makeManagedWindowsRuntime(homeDir);
  const config = JSON.parse(fs.readFileSync(paths.workBuddyMcpJson, 'utf8'));
  config.mcpServers.scorehub.command = path.join(runtime.versionDir, 'npx.bat');
  fs.writeFileSync(paths.workBuddyMcpJson, JSON.stringify(config));

  assert.equal(check({ homeDir, platform: 'win32' }).update_due, true);
  const result = update({ homeDir, platform: 'win32', selfCheck: successfulSelfCheck });
  const migrated = JSON.parse(fs.readFileSync(paths.workBuddyMcpJson, 'utf8')).mcpServers.scorehub;

  assert.equal(result.status, 'restart_required');
  assert.equal(migrated.command, runtime.node);
  assert.deepEqual(migrated.args, [runtime.npxCli, '-y', '@scorehub/mcp-server@latest']);
  assert.equal(check({ homeDir, platform: 'win32' }).status, 'restart_required');
});

test('updates stale Windows launcher paths after WorkBuddy rotates its managed Node.js', () => {
  const homeDir = makeHome();
  makeWorkBuddy(homeDir);
  const oldRuntime = makeManagedWindowsRuntime(homeDir, '22.22.2');
  install({ homeDir, platform: 'win32', selfCheck: successfulSelfCheck });
  markReady({ homeDir });
  const newRuntime = makeManagedWindowsRuntime(homeDir, '24.1.0');

  assert.equal(check({ homeDir, platform: 'win32' }).update_due, true);
  const result = update({ homeDir, platform: 'win32', selfCheck: successfulSelfCheck });
  const server = JSON.parse(fs.readFileSync(getPaths(homeDir).workBuddyMcpJson, 'utf8')).mcpServers.scorehub;

  assert.equal(result.status, 'restart_required');
  assert.equal(server.command, newRuntime.node);
  assert.notEqual(server.command, oldRuntime.node);
  assert.equal(server.args[0], newRuntime.npxCli);
});

test('silent update requires prior installation consent', () => {
  const homeDir = makeHome();
  makeWorkBuddy(homeDir);
  assert.equal(update({ homeDir, selfCheck: successfulSelfCheck }).status, 'uninitialized');
});

test('reads the loaded version from the registry only when its cache directory exists', () => {
  const homeDir = makeHome();
  makeWorkBuddy(homeDir);
  const paths = getPaths(homeDir);

  assert.equal(readEffectivePluginVersion(paths), null);

  fs.mkdirSync(path.dirname(paths.installedPluginsRegistry), { recursive: true });
  fs.writeFileSync(paths.installedPluginsRegistry, JSON.stringify({
    version: 2,
    plugins: {
      [PLUGIN_ID]: [{ scope: 'user', installPath: path.join(paths.pluginCacheRoot, '1.0.0'), version: '1.0.0' }],
    },
  }));
  assert.equal(readEffectivePluginVersion(paths), null);

  const cacheDir = makeEffectivePlugin(homeDir, '1.0.0');
  assert.deepEqual(readEffectivePluginVersion(paths), { version: '1.0.0', installPath: cacheDir });
});

test('compares versions conservatively and never guesses on unparsable input', () => {
  assert.equal(isVersionBehind('1.2.0', '1.10.0'), true);
  assert.equal(isVersionBehind('1.10.0', '1.2.0'), false);
  assert.equal(isVersionBehind(PACKAGE_VERSION, PACKAGE_VERSION), false);
  assert.equal(isVersionBehind('unknown', PACKAGE_VERSION), false);
  assert.equal(isVersionBehind(undefined, PACKAGE_VERSION), false);
});

test('reports activation_required when WorkBuddy still loads an older cached version', () => {
  const homeDir = makeHome();
  makeWorkBuddy(homeDir);
  install({ homeDir, selfCheck: successfulSelfCheck, dev: true });
  markReady({ homeDir });
  makeEffectivePlugin(homeDir, '1.0.0');

  const result = check({ homeDir });

  assert.equal(result.status, 'activation_required');
  assert.equal(result.source_creator_outreach_version, PACKAGE_VERSION);
  assert.equal(result.effective_creator_outreach_version, '1.0.0');
  assert.equal(result.installed_creator_outreach_version, PACKAGE_VERSION);
  assert.equal(result.mcp_configured, true);
  assert.equal(result.restart_required, false);
  assert.match(result.reason, /1\.0\.0/);
});

test('does not report activation when the loaded version is not behind', () => {
  const homeDir = makeHome();
  makeWorkBuddy(homeDir);
  install({ homeDir, selfCheck: successfulSelfCheck, dev: true });
  markReady({ homeDir });
  makeEffectivePlugin(homeDir, '99.0.0');

  assert.equal(check({ homeDir }).status, 'ready');
  assert.equal(detectActivationGap(getPaths(homeDir)), null);
});

test('silent update advances the local channel cache instead of asking the user to click 更新', () => {
  const homeDir = makeHome();
  makeWorkBuddy(homeDir);
  install({ homeDir, selfCheck: successfulSelfCheck, dev: true });
  markReady({ homeDir });
  const staleDir = makeEffectivePlugin(homeDir, '1.0.0');
  const paths = getPaths(homeDir);
  let selfCheckCalls = 0;

  const result = update({
    homeDir,
    selfCheck: () => {
      selfCheckCalls += 1;
      return successfulSelfCheck();
    },
  });

  // 自测通道由本安装器自己推进：不再停在 activation_required 等用户去点「更新」。
  assert.equal(result.status, 'restart_required');
  assert.equal(selfCheckCalls, 1);
  assert.equal(result.local_channel_version, PACKAGE_VERSION);
  assert.deepEqual(readEffectivePluginVersion(paths), {
    version: PACKAGE_VERSION,
    installPath: path.join(paths.pluginCacheRoot, PACKAGE_VERSION),
  });
  // 旧缓存目录不动，只是不再是登记表指向的版本。
  assert.equal(fs.existsSync(staleDir), true);
  assert.equal(check({ homeDir }).status, 'restart_required');
  assert.equal(markReady({ homeDir }).status, 'ready');
  assert.equal(check({ homeDir }).status, 'ready');
});

test('refreshes the dev cache on update even while a restart is pending', () => {
  const homeDir = makeHome();
  makeWorkBuddy(homeDir);
  const paths = getPaths(homeDir);
  install({ homeDir, selfCheck: successfulSelfCheck, dev: true });
  assert.equal(check({ homeDir }).restart_required, true);

  // 在**加载位**放一个脏文件：只有重新物化缓存才会把它清掉。
  // 若 update() 在刷新自测通道之前就因 restart_required 早退，用户重启后仍会跑旧代码，
  // 而且因为两端版本相同，也不会再出现 activation_required 提示。
  const cachedMarker = path.join(paths.pluginCacheRoot, PACKAGE_VERSION, 'skills', 'MARKER.md');
  fs.writeFileSync(cachedMarker, 'stale');

  const result = update({ homeDir, selfCheck: successfulSelfCheck });

  assert.equal(result.status, 'restart_required');
  assert.equal(result.local_channel_version, PACKAGE_VERSION);
  assert.equal(fs.existsSync(cachedMarker), false);
});

test('skips the pointless restart when only the loaded plugin version is stale', () => {
  const homeDir = makeHome();
  makeWorkBuddy(homeDir);
  install({ homeDir, selfCheck: successfulSelfCheck, dev: true });
  markReady({ homeDir });
  makeEffectivePlugin(homeDir, '1.0.0');

  const result = install({ homeDir, markConsent: false, selfCheck: successfulSelfCheck });

  assert.equal(result.status, 'activation_required');
  assert.equal(result.mcp_server_version, '0.3.4');
  assert.equal(check({ homeDir }).status, 'activation_required');
  assert.equal(readSourcePluginVersion(getPaths(homeDir)), PACKAGE_VERSION);
});

test('clears the restart flag while the activation is still pending', () => {
  const homeDir = makeHome();
  makeWorkBuddy(homeDir);
  install({ homeDir, selfCheck: successfulSelfCheck, dev: true });
  makeEffectivePlugin(homeDir, '1.0.0');

  const result = markReady({ homeDir });
  const state = JSON.parse(fs.readFileSync(getPaths(homeDir).bootstrapState, 'utf8'));

  assert.equal(result.status, 'activation_required');
  assert.match(result.reason, /1\.0\.0/);
  assert.equal(state.restart_required, false);
  assert.equal(check({ homeDir }).status, 'activation_required');
});

test('keeps activation_required read-only', () => {
  const homeDir = makeHome();
  makeWorkBuddy(homeDir);
  install({ homeDir, selfCheck: successfulSelfCheck, dev: true });
  markReady({ homeDir });
  makeEffectivePlugin(homeDir, '1.0.0');
  const snapshot = fs.readFileSync(getPaths(homeDir).bootstrapState, 'utf8');
  const registry = fs.readFileSync(getPaths(homeDir).installedPluginsRegistry, 'utf8');

  check({ homeDir, platform: 'win32' });

  assert.equal(fs.readFileSync(getPaths(homeDir).bootstrapState, 'utf8'), snapshot);
  assert.equal(fs.readFileSync(getPaths(homeDir).installedPluginsRegistry, 'utf8'), registry);
});

test('reads both channels read-only and never enables the platform one', () => {
  const homeDir = makeHome();
  makeWorkBuddy(homeDir);
  const paths = getPaths(homeDir);
  const platformCache = path.join(
    paths.pluginsDir, 'cache', 'experts', 'tiktok-creator-outreach',
  );
  fs.mkdirSync(path.join(platformCache, '1.8.1'), { recursive: true });
  fs.mkdirSync(path.join(platformCache, '1.8.0'), { recursive: true });
  fs.writeFileSync(paths.workBuddySettings, JSON.stringify({
    enabledPlugins: { [PLATFORM_PLUGIN_ID]: false },
  }));
  const settingsBefore = fs.readFileSync(paths.workBuddySettings, 'utf8');

  const result = check({ homeDir });

  assert.equal(result.platform_creator_outreach_version, '1.8.1');
  assert.equal(result.platform_channel_enabled, false);
  assert.equal(result.local_channel_version, null);
  assert.equal(result.local_channel_enabled, null);
  assert.equal(isPlatformChannelEnabled(paths), false);
  assert.equal(fs.readFileSync(paths.workBuddySettings, 'utf8'), settingsBefore);
  assert.equal(fs.existsSync(path.join(platformCache, '1.8.1', 'plugin.json')), false);
});
