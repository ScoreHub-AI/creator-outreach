const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  CREATOR_OUTREACH_SELF_BOOTSTRAP_COMMAND,
  MCP_SERVER_SELF_CHECK_COMMAND,
  WORKBUDDY_SHARE_URL,
  check,
  defaultMcpSelfCheck,
  getPaths,
  install,
  isSupportedNode,
  markReady,
  needsMcpLauncherMigration,
  resolveWorkBuddyLauncher,
  UPDATE_INTERVAL_MS,
  update,
} = require('../install.js');

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

function makeManagedWindowsRuntime(homeDir, version = '22.22.2') {
  const versionDir = path.join(homeDir, '.workbuddy', 'binaries', 'node', 'versions', version);
  const node = path.join(versionDir, 'node.exe');
  const npxCli = path.join(versionDir, 'node_modules', 'npm', 'bin', 'npx-cli.js');
  fs.mkdirSync(path.dirname(npxCli), { recursive: true });
  fs.writeFileSync(node, 'managed node');
  fs.writeFileSync(npxCli, 'managed npx cli');
  return { versionDir, node, npxCli };
}

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

test('installs the plugin and always configures mcp-server latest', () => {
  const homeDir = makeHome();
  makeWorkBuddy(homeDir);
  const paths = getPaths(homeDir);
  fs.writeFileSync(paths.workBuddyMcpJson, JSON.stringify({
    mcpServers: { existing: { command: 'existing-server' } },
  }));

  const result = install({ homeDir, selfCheck: successfulSelfCheck });
  const mcpConfig = JSON.parse(fs.readFileSync(paths.workBuddyMcpJson, 'utf8'));
  const state = JSON.parse(fs.readFileSync(paths.bootstrapState, 'utf8'));
  const manifest = JSON.parse(fs.readFileSync(path.join(paths.workBuddyPluginDir, '.codebuddy-plugin', 'plugin.json'), 'utf8'));

  assert.equal(result.status, 'restart_required');
  assert.deepEqual(mcpConfig.mcpServers.scorehub.args, ['-y', '@scorehub/mcp-server@latest']);
  assert.equal(mcpConfig.mcpServers.existing.command, 'existing-server');
  assert.equal(mcpConfig.mcpServers.scorehub.env.SCOREHUB_CLIENT_HOST, 'workbuddy');
  assert.equal(mcpConfig.mcpServers.scorehub.env.SCOREHUB_MANAGED_BY, '@scorehub/creator-outreach');
  assert.equal(state.consent_granted, true);
  assert.equal(state.observed_mcp_server_version, '0.3.4');
  assert.equal(state.restart_required, true);
  assert.equal(manifest.version, require('../package.json').version);
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
      replacePlugin: () => { throw new Error('plugin replacement failed'); },
    }),
    /plugin replacement failed/,
  );
  assert.equal(fs.readFileSync(paths.workBuddyMcpJson, 'utf8'), original);
  assert.equal(fs.readFileSync(path.join(paths.workBuddyPluginDir, 'sentinel.txt'), 'utf8'), 'original plugin');
  assert.equal(fs.existsSync(paths.bootstrapState), false);
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
