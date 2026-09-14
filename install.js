#!/usr/bin/env node

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const pkg = require('./package.json');

const MIN_NODE_MAJOR = 18;
const STATE_SCHEMA_VERSION = 1;
const UPDATE_INTERVAL_MS = 24 * 60 * 60 * 1000;
const WORKBUDDY_SHARE_URL = 'https://www.workbuddy.cn/work/launch/?sharecode=lNM8H05BRKoV-dw2gac3ZwQ-p01o3C3KVz1gXJ_CwvtX02-mSRqBB3xepE4V0gr7&expertname=Tiky+%C2%B7+TikTok%E8%BE%BE%E4%BA%BA%E8%90%A5%E9%94%80%E4%B8%93%E5%AE%B6&buddy_type=workbuddy';
const CREATOR_OUTREACH_SELF_BOOTSTRAP_COMMAND = 'npx -y @scorehub/creator-outreach@latest';
const MCP_SERVER_SELF_CHECK_COMMAND = 'npx -y @scorehub/mcp-server@latest --self-check --json';

// 平台通道（对用户发布）：上架到开放平台后，WorkBuddy 自行从 CDN 下载到 experts 市场，
// 与本包安装器无关。用户侧不需要本地副本。
const PLATFORM_PLUGIN_NAME = 'tiktok-creator-outreach';
const PLATFORM_MARKETPLACE = 'experts';
const PLATFORM_PLUGIN_ID = `${PLATFORM_PLUGIN_NAME}@${PLATFORM_MARKETPLACE}`;

// 本地自测通道（仅 `bootstrap --dev`）：写进 my-experts 时换一套独立身份，
// 避免与平台版同名 —— 同名插件在会话里会撞 agent，同名技能会被先加载的一方静默占用。
const CUSTOM_EXPERT_MARKETPLACE = 'my-experts';
const DEV_PLUGIN_SUFFIX = '-dev';
const PLUGIN_NAME = `${PLATFORM_PLUGIN_NAME}${DEV_PLUGIN_SUFFIX}`;
const PLUGIN_ID = `${PLUGIN_NAME}@${CUSTOM_EXPERT_MARKETPLACE}`;
const DEV_DISPLAY_NAME = { en: 'ScoreHub Tiky (local dev)', zh: 'ScoreHub Tiky（本地自测）' };
const DEV_DESCRIPTION_SUFFIX = ' ｜本地自测副本';
const PLUGIN_METADATA_DIR = '.codebuddy-plugin';
const MARKETPLACE_MANIFEST_FILE = 'marketplace.json';
const DEFAULT_PLUGIN_SCOPE = 'user';

const MCP_CONFIG = {
  type: 'stdio',
  command: 'npx',
  args: ['-y', '@scorehub/mcp-server@latest'],
  env: {
    SCOREHUB_REMOTE_MCP_URL: 'https://app.scorehub.cn/mcp',
    SCOREHUB_CLIENT_HOST: 'workbuddy',
    SCOREHUB_MANAGED_BY: '@scorehub/creator-outreach',
  },
};

function getNodeMajorVersion(nodeVersion = process.versions.node) {
  return Number.parseInt(nodeVersion.split('.')[0], 10);
}

function isSupportedNode(nodeVersion = process.versions.node) {
  return getNodeMajorVersion(nodeVersion) >= MIN_NODE_MAJOR;
}

function getPaths(homeDir) {
  const workBuddyDir = path.join(homeDir, '.workbuddy');
  const scorehubDir = path.join(workBuddyDir, 'scorehub');
  const pluginsDir = path.join(workBuddyDir, 'plugins');
  const customMarketplaceDir = path.join(
    pluginsDir, 'marketplaces', CUSTOM_EXPERT_MARKETPLACE,
  );

  return {
    workBuddyDir,
    pluginsDir,
    // 本地自测通道的注册清单：插件管理器把它当「输入」而不是「产物」，
    // 目录写进去但清单没登记等于不存在（且不会自愈）。
    marketplaceManifest: path.join(
      customMarketplaceDir, PLUGIN_METADATA_DIR, MARKETPLACE_MANIFEST_FILE,
    ),
    // 本地自测通道的源码位目录（插件管理器物化时读取）。
    workBuddyPluginDir: path.join(customMarketplaceDir, 'plugins', PLUGIN_NAME),
    // 本地自测通道的版本化缓存根目录（加载位）：实际被加载的代码只来自 <root>/<版本>。
    pluginCacheRoot: path.join(pluginsDir, 'cache', CUSTOM_EXPERT_MARKETPLACE, PLUGIN_NAME),
    // 平台通道的加载位：由 WorkBuddy 从开放平台下载并物化，本安装器只读取不写入。
    platformPluginCacheRoot: path.join(
      pluginsDir, 'cache', PLATFORM_MARKETPLACE, PLATFORM_PLUGIN_NAME,
    ),
    // 安装登记表：本地自测通道的 installPath 与 version 是判定「实际生效版本」的来源。
    installedPluginsRegistry: path.join(pluginsDir, 'installed_plugins.json'),
    // 插件启用开关；本地自测通道是否被加载由此决定。
    workBuddySettings: path.join(workBuddyDir, 'settings.json'),
    workBuddyMcpJson: path.join(workBuddyDir, 'mcp.json'),
    bootstrapState: path.join(scorehubDir, 'bootstrap-state.json'),
    bootstrapDir: scorehubDir,
  };
}

function resolveWorkBuddyLauncher(workBuddyDir, platform = process.platform) {
  const versionsDir = path.join(workBuddyDir, 'binaries', 'node', 'versions');
  try {
    const versions = fs.readdirSync(versionsDir)
      .sort((left, right) => right.localeCompare(left, undefined, { numeric: true }));
    for (const version of versions) {
      const versionDir = path.join(versionsDir, version);
      if (platform === 'win32') {
        const command = path.join(versionDir, 'node.exe');
        const npxCli = path.join(versionDir, 'node_modules', 'npm', 'bin', 'npx-cli.js');
        if (fs.existsSync(command) && fs.existsSync(npxCli)) {
          return { command, argsPrefix: [npxCli], binDir: versionDir };
        }
        continue;
      }

      const binDirs = [path.join(versionDir, 'bin'), versionDir];
      for (const binDir of binDirs) {
        const command = path.join(binDir, 'npx');
        if (fs.existsSync(command)) return { command, argsPrefix: [], binDir };
      }
    }
  } catch {
    // WorkBuddy or its bundled Node.js is not available at this path.
  }
  if (platform === 'win32') return null;
  return { command: 'npx', argsPrefix: [], binDir: null };
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJsonAtomic(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  try {
    fs.renameSync(tempPath, filePath);
  } catch (error) {
    try { fs.rmSync(tempPath, { force: true }); } catch { /* preserve the original error */ }
    throw error;
  }
}

function snapshotFile(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath) : null;
}

function restoreFile(filePath, snapshot) {
  if (snapshot === null) {
    fs.rmSync(filePath, { force: true });
    return;
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.restore`;
  fs.writeFileSync(tempPath, snapshot);
  fs.renameSync(tempPath, filePath);
}

function defaultState() {
  return {
    schema_version: STATE_SCHEMA_VERSION,
    consent_granted: false,
    status: 'uninitialized',
    creator_outreach_version: null,
    observed_mcp_server_version: null,
    last_check_at: null,
    last_error: null,
    restart_required: false,
  };
}

function loadState(statePath) {
  if (!fs.existsSync(statePath)) return defaultState();
  try {
    const state = readJson(statePath);
    if (state.schema_version !== STATE_SCHEMA_VERSION) throw new Error('unsupported state schema');
    return Object.assign(defaultState(), state);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return Object.assign(defaultState(), {
      status: 'repair_required',
      last_error: `bootstrap state is invalid: ${reason}`,
    });
  }
}

/**
 * 源码位版本：本安装器写入的官方专家目录里的 plugin.json。
 * 它只代表「本地已准备好哪个版本」，不代表 WorkBuddy 已经加载它。
 */
function readSourcePluginVersion(paths) {
  const manifestPath = path.join(paths.workBuddyPluginDir, PLUGIN_METADATA_DIR, 'plugin.json');
  try {
    const manifest = readJson(manifestPath);
    return typeof manifest.version === 'string' ? manifest.version : null;
  } catch {
    return null;
  }
}

/**
 * 实际生效版本：WorkBuddy 安装登记表里指向、且缓存目录真实存在的版本。
 * 这是判断「用户手上跑的是哪一版」的唯一权威来源；插件代码只从加载位读取。
 */
function readEffectivePluginVersion(paths, scope = DEFAULT_PLUGIN_SCOPE) {
  let registry;
  try {
    registry = readJson(paths.installedPluginsRegistry);
  } catch {
    return null;
  }
  const records = registry && registry.plugins ? registry.plugins[PLUGIN_ID] : null;
  if (!Array.isArray(records)) return null;
  const candidates = records.filter((record) => (
    record
    && record.scope === scope
    && typeof record.installPath === 'string'
    && fs.existsSync(record.installPath)
  ));
  if (candidates.length === 0) return null;
  const chosen = candidates[candidates.length - 1];
  const raw = typeof chosen.resolvedVersion === 'string' && chosen.resolvedVersion
    ? chosen.resolvedVersion
    : chosen.version;
  return {
    version: typeof raw === 'string' ? raw : null,
    installPath: chosen.installPath,
  };
}

function parseSemver(value) {
  if (typeof value !== 'string') return null;
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(value.trim());
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

/** 仅在两侧都能解析为语义化版本时判定落后；无法比较时保守返回 false。 */
function isVersionBehind(installed, required) {
  const left = parseSemver(installed);
  const right = parseSemver(required);
  if (!left || !right) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return left[index] < right[index];
  }
  return false;
}

/**
 * 本地自测通道的「源码位版本」与「加载位版本」不一致时的落差。
 *
 * 只在自测通道已安装（源码位有 plugin.json）时才有意义 —— 平台通道由 WorkBuddy
 * 自己下载并物化，本安装器不参与，也无权替它判定生效状态。
 */
function detectActivationGap(paths) {
  const sourceVersion = readSourcePluginVersion(paths);
  if (!sourceVersion) return null;
  const effective = readEffectivePluginVersion(paths);
  if (!effective || !effective.version) return null;
  if (!isVersionBehind(effective.version, sourceVersion)) return null;
  return {
    effectiveVersion: effective.version,
    requiredVersion: sourceVersion,
    reason: `本地自测通道的加载位停在 ${effective.version}，落后于源码位的 ${sourceVersion}：重跑 bootstrap --dev 会把缓存推进到新版本，重启 WorkBuddy 无效。`,
  };
}

function buildMcpEnvironment(version, binDir) {
  const existingPath = process.env.PATH || process.env.Path || '';
  return Object.assign({}, MCP_CONFIG.env, {
    SCOREHUB_CREATOR_OUTREACH_VERSION: version,
    ...(binDir ? { PATH: [binDir, existingPath].filter(Boolean).join(path.delimiter) } : {}),
  });
}

function buildMcpConfig(version, launcher) {
  return {
    command: launcher.command,
    args: launcher.argsPrefix.concat(MCP_CONFIG.args),
    env: buildMcpEnvironment(version, launcher.binDir),
  };
}

function readMcpConfig(configPath) {
  if (!fs.existsSync(configPath)) return { exists: false, config: {} };
  try {
    return { exists: true, config: readJson(configPath) };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { exists: true, config: null, error: `mcp.json is invalid: ${reason}` };
  }
}

function isManagedMcpConfig(config) {
  const server = config && config.mcpServers && config.mcpServers.scorehub;
  return !!server
    && Array.isArray(server.args)
    && server.args.includes('@scorehub/mcp-server@latest')
    && server.env
    && server.env.SCOREHUB_MANAGED_BY === '@scorehub/creator-outreach'
    && server.env.SCOREHUB_CLIENT_HOST === 'workbuddy';
}

function needsMcpLauncherMigration(config, platform = process.platform, expectedLauncher) {
  if (platform !== 'win32' || !isManagedMcpConfig(config)) return false;
  const server = config.mcpServers.scorehub;
  const npxCli = server.args.find((arg) => /(?:^|[\\/])npx-cli\.js$/i.test(arg));
  if (!/(?:^|[\\/])node\.exe$/i.test(server.command || '') || !npxCli) return true;
  if (expectedLauncher === undefined) return false;
  if (expectedLauncher === null) return true;
  return server.command.toLowerCase() !== expectedLauncher.command.toLowerCase()
    || npxCli.toLowerCase() !== expectedLauncher.argsPrefix[0].toLowerCase();
}

function mergeMcpConfig(configPath, serverConfig) {
  const current = readMcpConfig(configPath);
  if (current.config === null) throw new Error(current.error);
  const config = current.config || {};
  config.mcpServers = config.mcpServers || {};
  const changed = JSON.stringify(config.mcpServers.scorehub) !== JSON.stringify(serverConfig);
  config.mcpServers.scorehub = serverConfig;
  writeJsonAtomic(configPath, config);
  return changed;
}

/**
 * 把插件源码复制进 stage 目录，并改写成本地自测身份。
 *
 * `sourceDir` 默认是**当前正在执行的 install.js 所在包根**。自测通道必须显式传入
 * 「开发者仓库」那个根，不能靠默认值：agent 会话里的静默更新走的是
 * `npx @scorehub/creator-outreach@latest`，此时 `__dirname` 指向 npm 缓存里的**发布版**，
 * 用它刷新自测副本会把未发布的新功能直接覆盖回旧代码（见 `readLocalChannelSourceDir`）。
 */
function copyPluginToStage(stageDir, sourceDir = __dirname) {
  const pluginDirs = ['.codebuddy-plugin', 'agents', 'skills', 'avatars'];
  const pluginFiles = ['package.json', 'README.md', 'README.en.md', 'install.js'];
  fs.mkdirSync(stageDir, { recursive: true });
  for (const dir of pluginDirs) {
    const source = path.join(sourceDir, dir);
    if (fs.existsSync(source)) fs.cpSync(source, path.join(stageDir, dir), { recursive: true });
  }
  for (const file of pluginFiles) {
    const source = path.join(sourceDir, file);
    if (fs.existsSync(source)) fs.copyFileSync(source, path.join(stageDir, file));
  }
  applyDevIdentity(stageDir);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 取 markdown 的 YAML frontmatter 正文；没有则返回 null。 */
function readFrontmatter(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  return match ? match[1] : null;
}

/** 递归列出目录下匹配后缀的文件（跳过 `.` 开头的目录）。 */
function listTextFiles(dir, pattern) {
  if (!fs.existsSync(dir)) return [];
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listTextFiles(full, pattern));
    else if (entry.isFile() && pattern.test(entry.name)) files.push(full);
  }
  return files;
}

/** stage 内的技能 id：各 skills/<目录>/SKILL.md frontmatter 的 name。 */
function readSkillIds(stageDir) {
  const skillsDir = path.join(stageDir, 'skills');
  if (!fs.existsSync(skillsDir)) return [];
  const ids = [];
  for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const skillFile = path.join(skillsDir, entry.name, 'SKILL.md');
    if (!fs.existsSync(skillFile)) continue;
    const frontmatter = readFrontmatter(skillFile);
    const match = frontmatter && /^name:[ \t]*(\S+)[ \t]*$/m.exec(frontmatter);
    if (match) ids.push(match[1]);
  }
  return ids;
}

/**
 * 给自测副本的技能 id 加 dev 后缀。
 *
 * 技能 id 在 WorkBuddy 里是全局按 `name` 索引的，且**同名不会报错**：`SkillExtensionLoader`
 * 是「先加载者占用、后者静默跳过」，实测同一台机器上平台版与本地副本会同时加载各自的
 * 同名技能（日志里两侧都报 Loaded）。更要命的是 settings 里的 `enabledPlugins` **不**
 * 阻止加载 —— 实测该值为 false 的插件照样加载技能。所以自测副本必须持有自己的技能 id，
 * 否则两个 Tiky 在同一台机器上互相遮蔽，自测结果不可信。
 *
 * 只改 frontmatter 的 `name` 与 agent 文件里的 id 引用，**不改目录名**：plugin.json 的
 * `skills` 数组用的是路径（`./skills/<目录>`），目录名保持不变就不用同步它。带
 * `-dev` 后缀的 id 会被跳过，保证重复执行幂等。
 */
function applyDevSkillIds(stageDir) {
  const ids = readSkillIds(stageDir);
  if (ids.length === 0) return [];
  const targets = listTextFiles(path.join(stageDir, 'skills'), /\.md$/i)
    .concat(listTextFiles(path.join(stageDir, 'agents'), /\.md$/i));
  const renamed = [];
  for (const id of ids) {
    if (id.endsWith(DEV_PLUGIN_SUFFIX)) continue;
    const pattern = new RegExp(`\\b${escapeRegExp(id)}\\b(?!${escapeRegExp(DEV_PLUGIN_SUFFIX)})`, 'g');
    let hit = false;
    for (const file of targets) {
      const before = fs.readFileSync(file, 'utf8');
      const after = before.replace(pattern, `${id}${DEV_PLUGIN_SUFFIX}`);
      if (after !== before) {
        fs.writeFileSync(file, after);
        hit = true;
      }
    }
    if (hit) renamed.push(`${id}${DEV_PLUGIN_SUFFIX}`);
  }
  return renamed;
}

/**
 * 把拷贝出来的插件包改写成本地自测身份。
 *
 * 改 name / plugin / displayName / description 四个身份字段，并给技能 id 加 `-dev` 后缀
 * （见 `applyDevSkillIds`）。**不动 agentName 和 agents/ 下的文件名**：专家运行时会按
 * agentName 在自己的 plugin 目录里定位 agent markdown，改名会连带要求重命名文件与
 * frontmatter，而 agentName 重名不会造成遮蔽（两侧各自的 agent 目录是独立的）。
 *
 * 返回被改名的技能 id 列表，供调用方与 `--check` 对照。
 */
function applyDevIdentity(stageDir) {
  const manifestPath = path.join(stageDir, PLUGIN_METADATA_DIR, 'plugin.json');
  if (!fs.existsSync(manifestPath)) return [];
  const skillIds = applyDevSkillIds(stageDir);
  const manifest = readJson(manifestPath);
  manifest.name = PLUGIN_NAME;
  manifest.plugin = PLUGIN_NAME;
  manifest.displayName = DEV_DISPLAY_NAME;
  if (typeof manifest.description === 'string' && !manifest.description.includes(DEV_DESCRIPTION_SUFFIX)) {
    manifest.description = `${manifest.description}${DEV_DESCRIPTION_SUFFIX}`;
  }
  writeJsonAtomic(manifestPath, manifest);
  return skillIds;
}

/** 自测通道在注册清单里的条目；字段与平台 updateCustomExpertMarketplaceManifest 一致。 */
function buildMarketplaceEntry() {
  let description = `${PLATFORM_PLUGIN_NAME} 本地自测副本`;
  try {
    const manifest = readJson(path.join(__dirname, PLUGIN_METADATA_DIR, 'plugin.json'));
    if (typeof manifest.description === 'string' && manifest.description) {
      description = `${manifest.description}${DEV_DESCRIPTION_SUFFIX}`;
    }
  } catch { /* 回退到默认描述 */ }
  return { name: PLUGIN_NAME, source: `./plugins/${PLUGIN_NAME}`, description };
}

/**
 * 在 my-experts 注册清单里 upsert 自测通道条目。
 *
 * WorkBuddy 从 5.5.x 起把该清单当扫描的**输入**：`doScanCustomExperts` 只返回清单里
 * 已登记的条目，`reconcileCustomMarketplaceManifest` 也只做清理、**不主动注册磁盘裸
 * 目录**。所以只写目录不写清单 = 插件在任何列表里都不存在，且不会自愈。
 * 其余条目一律原样保留（同目录下可能还有别的自定义专家）。
 */
function registerMarketplaceEntry(paths) {
  let manifest = {
    name: CUSTOM_EXPERT_MARKETPLACE,
    description: `${CUSTOM_EXPERT_MARKETPLACE} marketplace (auto-generated)`,
    plugins: [],
  };
  if (fs.existsSync(paths.marketplaceManifest)) {
    try {
      const parsed = readJson(paths.marketplaceManifest);
      if (parsed && typeof parsed === 'object') {
        manifest = {
          name: typeof parsed.name === 'string' ? parsed.name : manifest.name,
          description: typeof parsed.description === 'string' ? parsed.description : manifest.description,
          plugins: Array.isArray(parsed.plugins) ? parsed.plugins.slice() : [],
        };
      }
    } catch { /* 清单损坏时重建骨架，无法保留其余条目 */ }
  }
  const entry = buildMarketplaceEntry();
  const index = manifest.plugins.findIndex((plugin) => (
    plugin && (plugin.source === entry.source || plugin.name === entry.name)
  ));
  if (index >= 0 && JSON.stringify(manifest.plugins[index]) === JSON.stringify(entry)) return false;
  if (index >= 0) manifest.plugins[index] = entry;
  else manifest.plugins.push(entry);
  writeJsonAtomic(paths.marketplaceManifest, manifest);
  return true;
}

/** 旧版安装器写入的本地副本 id：与平台版同名，已废弃。 */
const LEGACY_LOCAL_PLUGIN_ID = `${PLATFORM_PLUGIN_NAME}@${CUSTOM_EXPERT_MARKETPLACE}`;

/** JSON 文件里是否存在某个键路径（任意一层缺失即 false；文件损坏也返回 false）。 */
function jsonHasKey(filePath, keyPath) {
  if (!fs.existsSync(filePath)) return false;
  try {
    let cursor = readJson(filePath);
    for (const key of keyPath) {
      if (!cursor || typeof cursor !== 'object' || !(key in cursor)) return false;
      cursor = cursor[key];
    }
    return true;
  } catch {
    return false;
  }
}

/** 删掉 JSON 文件里的一个键；键不存在或文件不可读时返回 false，不改动文件。 */
function dropJsonKey(filePath, keyPath) {
  if (!jsonHasKey(filePath, keyPath)) return false;
  const root = readJson(filePath);
  let cursor = root;
  for (const key of keyPath.slice(0, -1)) cursor = cursor[key];
  delete cursor[keyPath[keyPath.length - 1]];
  writeJsonAtomic(filePath, root);
  return true;
}

/** 目录是否是旧版安装器写的同名副本（按 plugin.json 身份判定，不误删别人的专家）。 */
function isLegacyLocalPluginDir(dir) {
  const manifestPath = path.join(dir, PLUGIN_METADATA_DIR, 'plugin.json');
  if (!fs.existsSync(manifestPath)) return false;
  try {
    const manifest = readJson(manifestPath);
    return !!manifest && manifest.name === PLATFORM_PLUGIN_NAME;
  } catch {
    return false;
  }
}

/** my-experts 注册清单里是否还有指定 name 的条目。 */
function marketplaceHasEntry(paths, name) {
  if (!fs.existsSync(paths.marketplaceManifest)) return false;
  try {
    const manifest = readJson(paths.marketplaceManifest);
    if (!manifest || !Array.isArray(manifest.plugins)) return false;
    return manifest.plugins.some((plugin) => (
      plugin && (plugin.name === name || plugin.source === `./plugins/${name}`)
    ));
  } catch {
    return false;
  }
}

/**
 * 只读探测旧版安装器留下的同名本地副本残留。
 *
 * 旧实现只把插件目录拷进 `my-experts` 就结束了：不在市场清单里注册（列表里看不见、
 * 也不会自愈），却照样参与扩展加载。实测同一台机器上 `@experts` 与 `@my-experts`
 * 会**同时**加载同名技能，先加载者占用 —— 这正是「装了新版本却仍在跑旧代码」的成因之一。
 * 自测副本改用独立 `-dev` 身份后，带同名残留只会污染加载，必须清掉。
 */
function findLegacyLocalCopy(paths) {
  // 身份重合时无法判断目录属于谁，宁可不动。
  if (PLUGIN_NAME === PLATFORM_PLUGIN_NAME) return [];
  const legacyMarketplacePlugins = path.dirname(paths.workBuddyPluginDir);
  const legacyCacheRoot = path.dirname(paths.pluginCacheRoot);
  const found = [];
  if (isLegacyLocalPluginDir(path.join(legacyMarketplacePlugins, PLATFORM_PLUGIN_NAME))) found.push('plugin');
  if (fs.existsSync(path.join(legacyCacheRoot, PLATFORM_PLUGIN_NAME))) found.push('cache');
  if (jsonHasKey(paths.installedPluginsRegistry, ['plugins', LEGACY_LOCAL_PLUGIN_ID])) found.push('registry');
  if (jsonHasKey(paths.workBuddySettings, ['enabledPlugins', LEGACY_LOCAL_PLUGIN_ID])) found.push('settings');
  if (marketplaceHasEntry(paths, PLATFORM_PLUGIN_NAME)) found.push('manifest');
  return found;
}

/** 清掉 `findLegacyLocalCopy` 找到的残留，返回实际清掉的项。 */
function cleanupLegacyLocalCopy(paths) {
  const removed = [];
  for (const item of findLegacyLocalCopy(paths)) {
    const target = item === 'plugin'
      ? path.join(path.dirname(paths.workBuddyPluginDir), PLATFORM_PLUGIN_NAME)
      : path.join(path.dirname(paths.pluginCacheRoot), PLATFORM_PLUGIN_NAME);
    if (item === 'plugin' || item === 'cache') {
      fs.rmSync(target, { recursive: true, force: true });
    } else if (item === 'registry') {
      dropJsonKey(paths.installedPluginsRegistry, ['plugins', LEGACY_LOCAL_PLUGIN_ID]);
    } else if (item === 'settings') {
      dropJsonKey(paths.workBuddySettings, ['enabledPlugins', LEGACY_LOCAL_PLUGIN_ID]);
    } else if (item === 'manifest') {
      const manifest = readJson(paths.marketplaceManifest);
      manifest.plugins = manifest.plugins.filter((plugin) => !(
        plugin && (plugin.name === PLATFORM_PLUGIN_NAME || plugin.source === `./plugins/${PLATFORM_PLUGIN_NAME}`)
      ));
      writeJsonAtomic(paths.marketplaceManifest, manifest);
    }
    removed.push(item);
  }
  return removed;
}

function copyDirSync(sourceDir, targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    if (entry.name === '.git') continue;
    const source = path.join(sourceDir, entry.name);
    const target = path.join(targetDir, entry.name);
    if (entry.isDirectory()) copyDirSync(source, target);
    else if (entry.isSymbolicLink()) fs.symlinkSync(fs.readlinkSync(source), target);
    else if (entry.isFile()) fs.copyFileSync(source, target);
  }
}

/**
 * 把源码位物化成 <pluginCacheRoot>/<version>，让新代码真的进入加载位。
 *
 * 对齐插件管理器的 `materializePluginCache`：缓存目录名取 plugin.json 的 `version`
 * （`resolvePluginCacheIdentity`），用 .staging-* → rename 原子发布。临时目录必须以
 * `.` 开头，否则会被 `findCachedPluginByDirectory` 当成一个额外版本参与挑选。
 */
function materializePluginCache(paths, version) {
  const stageDir = path.join(paths.pluginCacheRoot, `.staging-${process.pid}-${Date.now()}`);
  const backupDir = path.join(paths.pluginCacheRoot, `.backup-${process.pid}-${Date.now()}`);
  const targetDir = path.join(paths.pluginCacheRoot, version);
  fs.mkdirSync(paths.pluginCacheRoot, { recursive: true });
  copyDirSync(paths.workBuddyPluginDir, stageDir);
  try {
    if (fs.existsSync(targetDir)) fs.renameSync(targetDir, backupDir);
    fs.renameSync(stageDir, targetDir);
  } catch (error) {
    if (fs.existsSync(backupDir) && !fs.existsSync(targetDir)) fs.renameSync(backupDir, targetDir);
    if (fs.existsSync(stageDir)) fs.rmSync(stageDir, { recursive: true, force: true });
    throw error;
  }
  // WorkBuddy 可能正持有旧缓存目录，删不掉也不该让安装失败（`.backup-*` 不会被当成版本）。
  try {
    if (fs.existsSync(backupDir)) fs.rmSync(backupDir, { recursive: true, force: true });
  } catch { /* 留待下次重跑时清理 */ }
  return targetDir;
}

/** 在 installed_plugins.json 里 upsert 自测通道的 user 作用域记录（字段对齐平台实现）。 */
function recordInstalledPlugin(paths, version, installPath, sourceDir = null) {
  let registry = {};
  try {
    const parsed = readJson(paths.installedPluginsRegistry);
    if (parsed && typeof parsed === 'object') registry = parsed;
  } catch { /* 登记表缺失或损坏时重建，避免坏文件把自测通道卡死 */ }
  if (typeof registry.version !== 'number') registry.version = 2;
  if (!registry.plugins || typeof registry.plugins !== 'object') registry.plugins = {};
  const records = Array.isArray(registry.plugins[PLUGIN_ID]) ? registry.plugins[PLUGIN_ID] : [];
  const isUserScope = (record) => (
    !!record && record.scope === DEFAULT_PLUGIN_SCOPE && record.projectPath === undefined
  );
  const previous = records.find(isUserScope);
  if (
    previous
    && previous.version === version
    && previous.installPath === installPath
    && (previous.sourceDir || null) === sourceDir
  ) return false;
  const now = new Date().toISOString();
  const next = records.filter((record) => !isUserScope(record));
  next.push({
    scope: DEFAULT_PLUGIN_SCOPE,
    installPath,
    version,
    // 记录自测副本的代码来源（开发者仓库根）。平台实现没有这个字段，白名单外的字段
    // WorkBuddy 会原样忽略，所以加它不影响插件管理器读取本条记录。
    ...(sourceDir ? { sourceDir } : {}),
    installedAt: (previous && previous.installedAt) || now,
    lastUpdated: now,
  });
  registry.plugins[PLUGIN_ID] = next;
  writeJsonAtomic(paths.installedPluginsRegistry, registry);
  return true;
}

/**
 * 读回自测副本当初的代码来源（开发者仓库根）。目录已不存在时返回 null。
 *
 * 这是「本地安装用来测新功能」能成立的关键：静默更新（来自 npm 发布包）刷新自测通道时，
 * 必须从**这里记录的仓库**取代码，而不是从它自己的 npm 缓存里取，否则一次 `--update`
 * 就会把未发布的改动覆盖掉，且版本号看起来还正常。
 */
function readLocalChannelSourceDir(paths) {
  try {
    const registry = readJson(paths.installedPluginsRegistry);
    const records = registry && registry.plugins ? registry.plugins[PLUGIN_ID] : null;
    if (!Array.isArray(records)) return null;
    for (let i = records.length - 1; i >= 0; i -= 1) {
      const record = records[i];
      if (!record || record.scope !== DEFAULT_PLUGIN_SCOPE) continue;
      const dir = record.sourceDir;
      if (typeof dir === 'string' && dir && fs.existsSync(dir)) return dir;
    }
    return null;
  } catch {
    return null;
  }
}

/** settings.json 里某个插件 id 的启用态；文件或键缺失时返回 null（未知）。 */
function isPluginEnabled(paths, pluginId) {
  try {
    const settings = readJson(paths.workBuddySettings);
    const enabled = settings && settings.enabledPlugins;
    if (!enabled || typeof enabled !== 'object') return null;
    const value = enabled[pluginId];
    return typeof value === 'boolean' ? value : null;
  } catch {
    return null;
  }
}

/**
 * 确保自测通道在 settings.json 里是启用态。
 *
 * 实测 `enabledPlugins` **不是**加载开关：该值为 false 的插件照样加载技能（本机日志里
 * `@experts` 与 `@my-experts` 在 false 状态下都报过 Loaded）。它决定插件管理页显示的
 * 启用态，所以自测副本仍要显式写 true —— 否则它在 UI 里看着是关的，容易被误判成没装好。
 * 真正决定“加载哪一份代码”的是市场清单 + 缓存物化 + 技能 id 是否撞名。
 */
function ensureLocalChannelEnabled(paths) {
  let settings = {};
  try {
    const parsed = readJson(paths.workBuddySettings);
    if (parsed && typeof parsed === 'object') settings = parsed;
  } catch { /* settings.json 缺失或损坏时只建最小骨架，其余字段无法保留 */ }
  if (!settings.enabledPlugins || typeof settings.enabledPlugins !== 'object') {
    settings.enabledPlugins = {};
  }
  if (settings.enabledPlugins[PLUGIN_ID] === true) return false;
  settings.enabledPlugins[PLUGIN_ID] = true;
  writeJsonAtomic(paths.workBuddySettings, settings);
  return true;
}

/** 缓存目录是否已经是本安装器要的那个身份+版本（对齐 isValidMaterializedPluginCache）。 */
function isMaterializedCacheValid(paths, version) {
  try {
    const manifest = readJson(
      path.join(paths.pluginCacheRoot, version, PLUGIN_METADATA_DIR, 'plugin.json'),
    );
    return !!manifest && manifest.name === PLUGIN_NAME && manifest.version === version;
  } catch {
    return false;
  }
}

/**
 * 把自测通道整体推到「可见 + 可加载」：
 * 写源码位之后 → 注册清单（列表可见）→ settings 启用（不被 disable 挡住）→ 物化缓存（新代码进加载位）→ 写登记表。
 *
 * **每次都重新物化**，不按版本跳过：自测循环里 `plugin.json` 的 version 常常不变，
 * 按版本判定「缓存已是最新」会让加载位继续跑旧代码 —— 正是这套机制要消灭的失灵模式。
 * 缓存目录名仍是 version，所以旧目录换新内容，登记表记录的 installPath 不变。
 */
function activateLocalChannel(paths, { sourceDir = __dirname } = {}) {
  const version = readSourcePluginVersion(paths);
  if (!version) {
    throw new Error(`${PLUGIN_NAME} 源码位缺少 ${PLUGIN_METADATA_DIR}/plugin.json，无法激活本地自测通道。`);
  }
  const registered = registerMarketplaceEntry(paths);
  const enabledChanged = ensureLocalChannelEnabled(paths);
  const installPath = materializePluginCache(paths, version);
  if (!isMaterializedCacheValid(paths, version)) {
    throw new Error(`${PLUGIN_NAME} 缓存物化后自检失败：${installPath} 的身份或版本不匹配。`);
  }
  const recorded = recordInstalledPlugin(paths, version, installPath, sourceDir);
  return {
    version,
    installPath,
    // 从加载位读回技能 id，既能对外汇报，也顺带验证 dev 后缀真的落到了缓存里。
    skillIds: readSkillIds(installPath),
    registered,
    enabledChanged,
    materialized: true,
    recorded,
    changed: true,
  };
}

function replacePluginAtomic(pluginDir, sourceDir = __dirname) {
  const parentDir = path.dirname(pluginDir);
  const stageDir = path.join(parentDir, `.${PLUGIN_NAME}.stage-${process.pid}-${Date.now()}`);
  const backupDir = path.join(parentDir, `.${PLUGIN_NAME}.backup-${process.pid}-${Date.now()}`);
  copyPluginToStage(stageDir, sourceDir);
  try {
    if (fs.existsSync(pluginDir)) fs.renameSync(pluginDir, backupDir);
    fs.renameSync(stageDir, pluginDir);
    return backupDir;
  } catch (error) {
    if (fs.existsSync(pluginDir) && fs.existsSync(backupDir)) fs.rmSync(pluginDir, { recursive: true, force: true });
    if (fs.existsSync(backupDir) && !fs.existsSync(pluginDir)) fs.renameSync(backupDir, pluginDir);
    if (fs.existsSync(stageDir)) fs.rmSync(stageDir, { recursive: true, force: true });
    throw error;
  }
}

function restorePlugin(pluginDir, backupDir) {
  if (fs.existsSync(pluginDir)) fs.rmSync(pluginDir, { recursive: true, force: true });
  if (backupDir && fs.existsSync(backupDir)) fs.renameSync(backupDir, pluginDir);
}

function parseSelfCheckOutput(output) {
  const lines = String(output).trim().split(/\r?\n/).reverse();
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      if (parsed && parsed.schema_version === 1 && typeof parsed.ok === 'boolean') return parsed;
    } catch { /* npx may print non-JSON diagnostics before the payload */ }
  }
  throw new Error('mcp-server self-check did not return a valid JSON payload');
}

function runMcpSelfCheck({ launcher, env, selfCheck = defaultMcpSelfCheck } = {}) {
  return selfCheck({ launcher, env });
}

function defaultMcpSelfCheck({ launcher, env, execFile = execFileSync }) {
  try {
    const output = execFile(
      launcher.command,
      launcher.argsPrefix.concat(['-y', '@scorehub/mcp-server@latest', '--self-check', '--json']),
      {
        encoding: 'utf8',
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 30000,
      },
    );
    const payload = parseSelfCheckOutput(output);
    if (!payload.ok) throw new Error(`mcp-server self-check failed for Node.js ${payload.node_version}`);
    return payload;
  } catch (error) {
    if (error && typeof error === 'object' && 'stderr' in error && error.stderr) {
      throw new Error(String(error.stderr).trim());
    }
    throw error;
  }
}

function detectStatus({ paths, state, nodeVersion }) {
  if (!isSupportedNode(nodeVersion)) {
    return { status: 'repair_required', reason: `Node.js ${MIN_NODE_MAJOR}+ is required. Detected ${nodeVersion}.` };
  }
  if (!fs.existsSync(paths.workBuddyDir)) {
    return { status: 'repair_required', reason: 'WorkBuddy has not been started on this machine.' };
  }
  const mcp = readMcpConfig(paths.workBuddyMcpJson);
  if (mcp.config === null) return { status: 'repair_required', reason: mcp.error };
  if (state.status === 'repair_required') return { status: 'repair_required', reason: state.last_error || 'Bootstrap requires repair.' };
  if (!state.consent_granted || !isManagedMcpConfig(mcp.config)) {
    return { status: 'uninitialized', reason: 'WorkBuddy MCP bootstrap has not been confirmed.' };
  }
  if (state.restart_required) return { status: 'restart_required', reason: 'WorkBuddy must be restarted to load the updated MCP configuration and plugin.' };
  const gap = detectActivationGap(paths);
  if (gap) return { status: 'activation_required', reason: gap.reason };
  return { status: 'ready', reason: null };
}

/** 平台通道的有效版本：WorkBuddy 从开放平台下载并物化出的缓存目录名。本安装器只读。 */
function readPlatformChannelVersion(paths) {
  try {
    const versions = fs.readdirSync(paths.platformPluginCacheRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
      .map((entry) => entry.name);
    if (versions.length === 0) return null;
    versions.sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
    return versions[versions.length - 1];
  } catch {
    return null;
  }
}

/** 本地自测通道是否在 settings.json 里被启用；文件或键缺失时返回 null（未知）。 */
function isLocalChannelEnabled(paths) {
  return isPluginEnabled(paths, PLUGIN_ID);
}

/** 本地自测通道加载位里的技能 id；空数组表示自测通道尚未安装。 */
function readLocalChannelSkillIds(paths) {
  const version = readSourcePluginVersion(paths);
  if (!version) return [];
  return readSkillIds(path.join(paths.pluginCacheRoot, version));
}

/** 平台通道（开放平台版本）是否被启用；本安装器只读，不写。 */
function isPlatformChannelEnabled(paths) {
  return isPluginEnabled(paths, PLATFORM_PLUGIN_ID);
}

function check({
  homeDir = os.homedir(),
  nodeVersion = process.versions.node,
  now = Date.now(),
  platform = process.platform,
} = {}) {
  const paths = getPaths(homeDir);
  const state = loadState(paths.bootstrapState);
  const detected = detectStatus({ paths, state, nodeVersion });
  const effective = readEffectivePluginVersion(paths);
  const lastCheckAt = state.last_check_at ? Date.parse(state.last_check_at) : Number.NaN;
  const mcp = readMcpConfig(paths.workBuddyMcpJson);
  const expectedLauncher = platform === 'win32'
    ? resolveWorkBuddyLauncher(paths.workBuddyDir, platform)
    : undefined;
  const launcherMigrationDue = mcp.config !== null
    && needsMcpLauncherMigration(mcp.config, platform, expectedLauncher);
  const updateDue = detected.status === 'ready'
    && (launcherMigrationDue || !Number.isFinite(lastCheckAt) || now - lastCheckAt >= UPDATE_INTERVAL_MS);
  return {
    schema_version: STATE_SCHEMA_VERSION,
    status: detected.status,
    reason: detected.reason,
    creator_outreach_version: pkg.version,
    source_creator_outreach_version: readSourcePluginVersion(paths),
    effective_creator_outreach_version: effective ? effective.version : null,
    installed_creator_outreach_version: state.creator_outreach_version,
    // 平台通道（对用户发布）：由 WorkBuddy 从开放平台下载并物化，本安装器只汇报。
    platform_creator_outreach_version: readPlatformChannelVersion(paths),
    platform_channel_enabled: isPlatformChannelEnabled(paths),
    // 本地自测通道：只有 bootstrap --dev 会创建，用它自测未发布的新功能。
    local_channel_version: readSourcePluginVersion(paths),
    local_channel_enabled: isLocalChannelEnabled(paths),
    local_channel_skill_ids: readLocalChannelSkillIds(paths),
    // 自测副本的代码来源（开发者仓库根）；静默更新会从它刷新，而不是从 npm 发布包。
    local_channel_source_dir: readLocalChannelSourceDir(paths),
    // 旧版安装器留下的同名副本；非空即说明该机器上曾有第二个 Tiky 参与加载。
    legacy_local_copy: findLegacyLocalCopy(paths),
    consent_granted: state.consent_granted,
    mcp_configured: detected.status === 'ready'
      || detected.status === 'restart_required'
      || detected.status === 'activation_required',
    restart_required: state.restart_required,
    update_due: updateDue,
  };
}

function assertInstallable({ homeDir, nodeVersion, platform }) {
  const paths = getPaths(homeDir);
  if (!isSupportedNode(nodeVersion)) throw new Error(`Node.js ${MIN_NODE_MAJOR}+ is required. Detected ${nodeVersion}.`);
  if (!fs.existsSync(paths.workBuddyDir)) throw new Error('No supported client was found. Launch WorkBuddy once, then retry.');
  const launcher = resolveWorkBuddyLauncher(paths.workBuddyDir, platform);
  if (!launcher) {
    throw new Error('WorkBuddy managed Node.js/npm runtime is incomplete: expected node.exe and node_modules/npm/bin/npx-cli.js in the same version directory.');
  }
  return { paths, launcher };
}

/**
 * 安装 / 初始化。
 *
 * `dev: false`（默认，用户路径）：只写 MCP 配置。插件的发布版由 WorkBuddy 从开放平台
 * 下载，本安装器不碰，也不会在 my-experts 里留一个跟平台版打架的同名副本。
 *
 * `dev: true`（`bootstrap --dev`，自测路径）：额外把本地源码写进 my-experts 的自测身份
 * 目录（插件名与技能 id 都带 `-dev` 后缀），并整体激活（注册清单 + 启用态 + 物化缓存 +
 * 写登记表），让未发布的新功能立刻可加载。
 *
 * 两条路径都会顺手清掉旧版安装器留下的同名 `my-experts` 残留（见 `findLegacyLocalCopy`）。
 */
function install({
  homeDir = os.homedir(),
  nodeVersion = process.versions.node,
  selfCheck = defaultMcpSelfCheck,
  markConsent = true,
  replacePlugin = replacePluginAtomic,
  platform = process.platform,
  dev = false,
  devSourceDir = null,
} = {}) {
  const { paths, launcher } = assertInstallable({ homeDir, nodeVersion, platform });
  // 自测副本的代码来源：显式参数（CLI 本地运行 = 仓库根）→ 登记表记录 → 当前包根。
  // 中间的「登记表记录」保证来自 npm 发布包的静默更新也是从开发者仓库刷新，而不是自我覆盖。
  const devSource = dev ? (devSourceDir || readLocalChannelSourceDir(paths) || __dirname) : __dirname;
  const env = buildMcpEnvironment(pkg.version, launcher.binDir);
  const mcpCheck = runMcpSelfCheck({ launcher, env, selfCheck });
  const mcpSnapshot = snapshotFile(paths.workBuddyMcpJson);
  const stateSnapshot = snapshotFile(paths.bootstrapState);
  // 自测通道会额外写这三处，失败时一并回滚，避免留下半激活状态。
  const marketplaceSnapshot = snapshotFile(paths.marketplaceManifest);
  const registrySnapshot = snapshotFile(paths.installedPluginsRegistry);
  const settingsSnapshot = snapshotFile(paths.workBuddySettings);
  let pluginBackup = null;
  let pluginReplaced = false;
  let status = 'restart_required';
  let reason = null;
  let localChannel = null;
  let legacyRemoved = [];
  try {
    const mcpChanged = mergeMcpConfig(paths.workBuddyMcpJson, buildMcpConfig(pkg.version, launcher));
    // 先清旧版同名残留，再写自测通道：残留不清掉就会和自测副本一起被加载、互相遮蔽。
    legacyRemoved = cleanupLegacyLocalCopy(paths);
    if (dev) {
      pluginBackup = replacePlugin(paths.workBuddyPluginDir, devSource);
      pluginReplaced = true;
      localChannel = activateLocalChannel(paths, { sourceDir: devSource });
    }

    // 源码位写入后才可能出现激活落差：加载位仍指向缓存里的旧版本。
    // 自测通道刚刚自己把缓存推进过，不存在落差；只有用户路径（dev=false）才可能残留。
    const gap = dev ? null : detectActivationGap(paths);
    if (mcpChanged || (localChannel && localChannel.changed)) status = 'restart_required';
    else if (gap) status = 'activation_required';
    else status = 'ready';
    reason = status === 'activation_required' ? gap.reason : null;

    const state = loadState(paths.bootstrapState);
    state.consent_granted = markConsent || state.consent_granted;
    state.status = status;
    state.creator_outreach_version = pkg.version;
    state.observed_mcp_server_version = mcpCheck.server_version || null;
    state.last_check_at = new Date().toISOString();
    state.last_error = null;
    state.restart_required = status === 'restart_required';
    writeJsonAtomic(paths.bootstrapState, state);
  } catch (error) {
    if (pluginReplaced) restorePlugin(paths.workBuddyPluginDir, pluginBackup);
    restoreFile(paths.workBuddyMcpJson, mcpSnapshot);
    restoreFile(paths.bootstrapState, stateSnapshot);
    restoreFile(paths.marketplaceManifest, marketplaceSnapshot);
    restoreFile(paths.installedPluginsRegistry, registrySnapshot);
    restoreFile(paths.workBuddySettings, settingsSnapshot);
    throw error;
  }
  if (pluginBackup && fs.existsSync(pluginBackup)) fs.rmSync(pluginBackup, { recursive: true, force: true });
  return {
    status,
    reason,
    mcp_server_version: mcpCheck.server_version || null,
    ...(legacyRemoved.length ? { legacy_local_copy_removed: legacyRemoved } : {}),
    ...(dev ? {
      local_channel_version: localChannel ? localChannel.version : null,
      local_channel_install_path: localChannel ? localChannel.installPath : null,
      local_channel_skill_ids: localChannel ? localChannel.skillIds : [],
      local_channel_source_dir: devSource,
      local_channel_registered: localChannel ? localChannel.registered : false,
      local_channel_enabled: isLocalChannelEnabled(paths),
      platform_channel_enabled: isPlatformChannelEnabled(paths),
    } : {}),
  };
}

function markReady({ homeDir = os.homedir(), nodeVersion = process.versions.node } = {}) {
  const paths = getPaths(homeDir);
  const state = loadState(paths.bootstrapState);
  const detected = detectStatus({ paths, state: Object.assign({}, state, { restart_required: false }), nodeVersion });
  const acceptable = detected.status === 'ready' || detected.status === 'activation_required';
  if (!acceptable) throw new Error(detected.reason || `Cannot mark bootstrap as ready: ${detected.status}`);
  const activationGap = detected.status === 'activation_required';
  state.status = detected.status;
  state.restart_required = false;
  state.last_error = null;
  writeJsonAtomic(paths.bootstrapState, state);
  return activationGap
    ? { status: 'activation_required', reason: detected.reason }
    : { status: 'ready' };
}

/**
 * 静默更新。
 *
 * 自测通道一旦装过就一直跟着刷新，并且**必须放在 `restart_required` 早退之前**：
 * 否则「上一轮装了东西、还在等重启」会把代码刷新整个挡掉，用户重启后仍跑旧代码，
 * 而且因为源码位与加载位版本相同，也不会再出现 `activation_required` 提示。
 */
function update({
  homeDir = os.homedir(),
  nodeVersion = process.versions.node,
  selfCheck = defaultMcpSelfCheck,
  platform = process.platform,
  dev = false,
  devSourceDir = null,
} = {}) {
  const paths = getPaths(homeDir);
  const state = loadState(paths.bootstrapState);
  if (!state.consent_granted) return { status: 'uninitialized', reason: 'Initial installation confirmation is required.' };
  const detected = detectStatus({ paths, state: Object.assign({}, state, { restart_required: false }), nodeVersion });
  if (detected.status === 'repair_required' || detected.status === 'uninitialized') {
    return { status: detected.status, reason: detected.reason };
  }
  // 自测通道：源码位存在就说明装过；`activation_required`（加载位落后）也由这一次安装自愈。
  // 注意这里**不传** devSourceDir：静默更新可能来自 npm 发布包，刷新时必须回到登记表记录的
  // 开发者仓库，否则会把未发布的改动覆盖成发布版代码。
  const devChannelInstalled = !!readSourcePluginVersion(paths);
  if (dev || devChannelInstalled) {
    return install({
      homeDir, nodeVersion, selfCheck, markConsent: false, platform, dev: true, devSourceDir,
    });
  }
  if (state.restart_required) return { status: 'restart_required', reason: 'WorkBuddy must be restarted to load the updated MCP configuration and plugin.' };
  const mcp = readMcpConfig(paths.workBuddyMcpJson);
  const expectedLauncher = platform === 'win32'
    ? resolveWorkBuddyLauncher(paths.workBuddyDir, platform)
    : undefined;
  const launcherMigrationDue = mcp.config !== null
    && needsMcpLauncherMigration(mcp.config, platform, expectedLauncher);
  // 用户路径没有任何本地插件可刷新：只有 Windows 启动器需要迁移、或旧版同名副本还留着
  // 需要清理时，才值得走一次完整安装。
  const legacyPending = findLegacyLocalCopy(paths).length > 0;
  if (!launcherMigrationDue && !legacyPending) {
    state.status = 'ready';
    state.creator_outreach_version = pkg.version;
    state.last_check_at = new Date().toISOString();
    state.last_error = null;
    writeJsonAtomic(paths.bootstrapState, state);
    return {
      status: 'ready',
      creator_outreach_version: pkg.version,
      local_channel_version: readSourcePluginVersion(paths),
      local_channel_enabled: isLocalChannelEnabled(paths),
      platform_channel_enabled: isPlatformChannelEnabled(paths),
    };
  }
  return install({
    homeDir, nodeVersion, selfCheck, markConsent: false, platform, dev: false,
  });
}

function printJson(value) {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

function runCli(argv = process.argv.slice(2)) {
  const action = argv[0];
  const options = {
    homeDir: process.env.SCOREHUB_BOOTSTRAP_HOME || os.homedir(),
    nodeVersion: process.versions.node,
  };
  const dev = argv.includes('--dev');
  // 只有显式 `--dev`（本地仓库运行）才把「当前包根」当作自测通道的代码来源。发布包里的
  // install.js 被静默更新调用时不得覆盖它，否则会从 npm 缓存反向刷新自测副本。
  const devSourceDir = dev ? __dirname : null;
  try {
    let result;
    if (action === 'bootstrap' && argv.includes('--check')) result = check(options);
    else if (action === 'bootstrap' && argv.includes('--install')) result = install({ ...options, dev, devSourceDir });
    else if (action === 'bootstrap' && argv.includes('--update')) result = update({ ...options, dev, devSourceDir });
    else if (action === 'bootstrap' && argv.includes('--mark-ready')) result = markReady(options);
    else result = install({ ...options, dev, devSourceDir });
    printJson(result);
    return result.status === 'repair_required' ? 1 : 0;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    printJson({ schema_version: STATE_SCHEMA_VERSION, status: 'repair_required', reason });
    return 1;
  }
}

if (require.main === module) process.exitCode = runCli();

module.exports = {
  CREATOR_OUTREACH_SELF_BOOTSTRAP_COMMAND,
  CUSTOM_EXPERT_MARKETPLACE,
  DEV_DISPLAY_NAME,
  MCP_SERVER_SELF_CHECK_COMMAND,
  MIN_NODE_MAJOR,
  PLATFORM_MARKETPLACE,
  PLATFORM_PLUGIN_ID,
  PLATFORM_PLUGIN_NAME,
  PLUGIN_ID,
  PLUGIN_NAME,
  UPDATE_INTERVAL_MS,
  WORKBUDDY_SHARE_URL,
  activateLocalChannel,
  applyDevIdentity,
  applyDevSkillIds,
  buildMarketplaceEntry,
  check,
  cleanupLegacyLocalCopy,
  defaultMcpSelfCheck,
  detectActivationGap,
  detectStatus,
  ensureLocalChannelEnabled,
  findLegacyLocalCopy,
  getNodeMajorVersion,
  getPaths,
  install,
  isLocalChannelEnabled,
  isManagedMcpConfig,
  isMaterializedCacheValid,
  isPlatformChannelEnabled,
  isPluginEnabled,
  isSupportedNode,
  isVersionBehind,
  markReady,
  materializePluginCache,
  needsMcpLauncherMigration,
  readEffectivePluginVersion,
  readLocalChannelSkillIds,
  readLocalChannelSourceDir,
  readPlatformChannelVersion,
  readSkillIds,
  readSourcePluginVersion,
  recordInstalledPlugin,
  registerMarketplaceEntry,
  resolveWorkBuddyLauncher,
  runCli,
  update,
};
