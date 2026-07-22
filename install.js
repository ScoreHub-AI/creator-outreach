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

  return {
    workBuddyDir,
    workBuddyPluginDir: path.join(
      workBuddyDir, 'plugins', 'marketplaces', 'my-experts', 'plugins', 'tiktok-creator-outreach',
    ),
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

function readInstalledPluginVersion(pluginDir) {
  const packagePath = path.join(pluginDir, 'package.json');
  try {
    const installed = readJson(packagePath);
    return typeof installed.version === 'string' ? installed.version : null;
  } catch {
    return null;
  }
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
  config.mcpServers.scorehub = serverConfig;
  writeJsonAtomic(configPath, config);
}

function copyPluginToStage(stageDir) {
  const pluginDirs = ['.codebuddy-plugin', 'agents', 'skills', 'avatars'];
  const pluginFiles = ['package.json', 'README.md', 'README.en.md', 'install.js'];
  fs.mkdirSync(stageDir, { recursive: true });
  for (const dir of pluginDirs) {
    const source = path.join(__dirname, dir);
    if (fs.existsSync(source)) fs.cpSync(source, path.join(stageDir, dir), { recursive: true });
  }
  for (const file of pluginFiles) {
    const source = path.join(__dirname, file);
    if (fs.existsSync(source)) fs.copyFileSync(source, path.join(stageDir, file));
  }
}

function replacePluginAtomic(pluginDir) {
  const parentDir = path.dirname(pluginDir);
  const stageDir = path.join(parentDir, `.tiktok-creator-outreach.stage-${process.pid}-${Date.now()}`);
  const backupDir = path.join(parentDir, `.tiktok-creator-outreach.backup-${process.pid}-${Date.now()}`);
  copyPluginToStage(stageDir);
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
  if (state.restart_required) return { status: 'restart_required', reason: 'WorkBuddy must be restarted to load the updated plugin and MCP configuration.' };
  return { status: 'ready', reason: null };
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
    consent_granted: state.consent_granted,
    mcp_configured: detected.status === 'ready' || detected.status === 'restart_required',
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

function install({
  homeDir = os.homedir(),
  nodeVersion = process.versions.node,
  selfCheck = defaultMcpSelfCheck,
  markConsent = true,
  replacePlugin = replacePluginAtomic,
  platform = process.platform,
} = {}) {
  const { paths, launcher } = assertInstallable({ homeDir, nodeVersion, platform });
  const env = buildMcpEnvironment(pkg.version, launcher.binDir);
  const mcpCheck = runMcpSelfCheck({ launcher, env, selfCheck });
  const mcpSnapshot = snapshotFile(paths.workBuddyMcpJson);
  const stateSnapshot = snapshotFile(paths.bootstrapState);
  let pluginBackup = null;
  let pluginReplaced = false;
  try {
    mergeMcpConfig(paths.workBuddyMcpJson, buildMcpConfig(pkg.version, launcher));
    pluginBackup = replacePlugin(paths.workBuddyPluginDir);
    pluginReplaced = true;

    const state = loadState(paths.bootstrapState);
    state.consent_granted = markConsent || state.consent_granted;
    state.status = 'restart_required';
    state.creator_outreach_version = pkg.version;
    state.observed_mcp_server_version = mcpCheck.server_version || null;
    state.last_check_at = new Date().toISOString();
    state.last_error = null;
    state.restart_required = true;
    writeJsonAtomic(paths.bootstrapState, state);
  } catch (error) {
    if (pluginReplaced) restorePlugin(paths.workBuddyPluginDir, pluginBackup);
    restoreFile(paths.workBuddyMcpJson, mcpSnapshot);
    restoreFile(paths.bootstrapState, stateSnapshot);
    throw error;
  }
  if (pluginBackup && fs.existsSync(pluginBackup)) fs.rmSync(pluginBackup, { recursive: true, force: true });
  return { status: 'restart_required', mcp_server_version: mcpCheck.server_version || null };
}

function markReady({ homeDir = os.homedir(), nodeVersion = process.versions.node } = {}) {
  const paths = getPaths(homeDir);
  const state = loadState(paths.bootstrapState);
  const detected = detectStatus({ paths, state: Object.assign({}, state, { restart_required: false }), nodeVersion });
  if (detected.status !== 'ready') throw new Error(detected.reason || `Cannot mark bootstrap as ready: ${detected.status}`);
  state.status = 'ready';
  state.restart_required = false;
  state.last_error = null;
  writeJsonAtomic(paths.bootstrapState, state);
  return { status: 'ready' };
}

function update({
  homeDir = os.homedir(),
  nodeVersion = process.versions.node,
  selfCheck = defaultMcpSelfCheck,
  platform = process.platform,
} = {}) {
  const paths = getPaths(homeDir);
  const state = loadState(paths.bootstrapState);
  if (!state.consent_granted) return { status: 'uninitialized', reason: 'Initial installation confirmation is required.' };
  const detected = detectStatus({ paths, state: Object.assign({}, state, { restart_required: false }), nodeVersion });
  if (detected.status === 'repair_required' || detected.status === 'uninitialized') {
    return { status: detected.status, reason: detected.reason };
  }
  if (state.restart_required) return { status: 'restart_required', reason: 'WorkBuddy must be restarted to load the updated plugin and MCP configuration.' };
  const mcp = readMcpConfig(paths.workBuddyMcpJson);
  const expectedLauncher = platform === 'win32'
    ? resolveWorkBuddyLauncher(paths.workBuddyDir, platform)
    : undefined;
  const launcherMigrationDue = mcp.config !== null
    && needsMcpLauncherMigration(mcp.config, platform, expectedLauncher);
  if (readInstalledPluginVersion(paths.workBuddyPluginDir) === pkg.version && !launcherMigrationDue) {
    state.status = 'ready';
    state.creator_outreach_version = pkg.version;
    state.last_check_at = new Date().toISOString();
    state.last_error = null;
    writeJsonAtomic(paths.bootstrapState, state);
    return { status: 'ready', creator_outreach_version: pkg.version };
  }
  return install({ homeDir, nodeVersion, selfCheck, markConsent: false, platform });
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
  try {
    let result;
    if (action === 'bootstrap' && argv.includes('--check')) result = check(options);
    else if (action === 'bootstrap' && argv.includes('--install')) result = install(options);
    else if (action === 'bootstrap' && argv.includes('--update')) result = update(options);
    else if (action === 'bootstrap' && argv.includes('--mark-ready')) result = markReady(options);
    else result = install(options);
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
  MCP_SERVER_SELF_CHECK_COMMAND,
  MIN_NODE_MAJOR,
  UPDATE_INTERVAL_MS,
  WORKBUDDY_SHARE_URL,
  check,
  defaultMcpSelfCheck,
  detectStatus,
  getNodeMajorVersion,
  getPaths,
  install,
  isManagedMcpConfig,
  isSupportedNode,
  markReady,
  needsMcpLauncherMigration,
  resolveWorkBuddyLauncher,
  runCli,
  update,
};
