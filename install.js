#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const pkg = require('./package.json');
const MIN_NODE_MAJOR = 18;

const MCP_CONFIG = {
  type: 'stdio',
  command: 'npx',
  args: ['-y', '@scorehub/mcp-server@latest'],
  env: {
    SCOREHUB_REMOTE_MCP_URL: 'https://app.scorehub.cn/mcp',
  },
};

function getNodeMajorVersion(nodeVersion = process.versions.node) {
  return Number.parseInt(nodeVersion.split('.')[0], 10);
}

function isSupportedNode(nodeVersion = process.versions.node) {
  return getNodeMajorVersion(nodeVersion) >= MIN_NODE_MAJOR;
}

function getPaths(homeDir) {
  const claudeDir = path.join(homeDir, '.claude');
  const workBuddyDir = path.join(homeDir, '.workbuddy');

  return {
    claudeDir,
    agentsDir: path.join(claudeDir, 'agents'),
    claudeJson: path.join(homeDir, '.claude.json'),
    workBuddyDir,
    workBuddyPluginDir: path.join(
      workBuddyDir, 'plugins', 'marketplaces', 'my-experts', 'plugins', 'tiktok-creator-outreach',
    ),
    workBuddyMcpJson: path.join(workBuddyDir, 'mcp.json'),
  };
}

function resolveWorkBuddyNode(workBuddyDir) {
  const versionsDir = path.join(workBuddyDir, 'binaries', 'node', 'versions');
  const npxExecutable = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  try {
    const versions = fs.readdirSync(versionsDir);
    if (versions.length > 0) {
      const versionDir = path.join(versionsDir, versions[0]);
      const binDirs = [path.join(versionDir, 'bin'), versionDir];
      for (const binDir of binDirs) {
        const npxPath = path.join(binDir, npxExecutable);
        if (fs.existsSync(npxPath)) return { npx: npxPath, binDir };
      }
    }
  } catch {
    // WorkBuddy or its bundled Node.js is not available at this path.
  }
  return { npx: 'npx', binDir: null };
}

function fetchLatestMcpServerVersion() {
  try {
    const out = execSync('npm view @scorehub/mcp-server version', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 10000,
    });
    return out.trim() || null;
  } catch {
    return null;
  }
}

function mergeMcpConfig(configPath, serverName, serverConfig, extraFields) {
  let config = {};
  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch {
      console.warn(`Warning: ${configPath} could not be parsed and will be replaced.`);
    }
  }

  config.mcpServers = config.mcpServers || {};
  config.mcpServers[serverName] = Object.assign({}, serverConfig, extraFields);
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
}

function install({
  homeDir = os.homedir(),
  nodeVersion = process.versions.node,
  getLatestMcpServerVersion = fetchLatestMcpServerVersion,
} = {}) {
  console.log(`${pkg.name} v${pkg.version}\n`);

  if (!isSupportedNode(nodeVersion)) {
    console.error(`Node.js ${MIN_NODE_MAJOR}+ is required. Detected ${nodeVersion}. No configuration files were changed.`);
    return 1;
  }

  const paths = getPaths(homeDir);
  const hasClaudeCode = fs.existsSync(paths.claudeDir);
  const hasWorkBuddy = fs.existsSync(paths.workBuddyDir);

  if (!hasClaudeCode && !hasWorkBuddy) {
    console.error('No supported client was found. Launch Claude Code or WorkBuddy once, then run this command again. No configuration files were changed.');
    return 1;
  }

  if (hasClaudeCode) {
    const agentSource = path.join(__dirname, 'agents', 'tiktok-creator-outreach.md');
    const agentDestination = path.join(paths.agentsDir, 'tiktok-creator-outreach.md');
    fs.mkdirSync(paths.agentsDir, { recursive: true });
    fs.copyFileSync(agentSource, agentDestination);
    mergeMcpConfig(paths.claudeJson, 'scorehub', MCP_CONFIG, {});
    console.log(`Claude Code: Agent installed at ${agentDestination}`);
    console.log(`Claude Code: MCP server configured at ${paths.claudeJson}`);
  }

  if (hasWorkBuddy) {
    const pluginDirs = ['.codebuddy-plugin', 'agents', 'skills', 'avatars'];
    const pluginFiles = ['package.json', 'README.md', 'README.en.md'];

    fs.mkdirSync(paths.workBuddyPluginDir, { recursive: true });
    for (const dir of pluginDirs) {
      const source = path.join(__dirname, dir);
      const destination = path.join(paths.workBuddyPluginDir, dir);
      if (fs.existsSync(source)) {
        fs.cpSync(source, destination, { recursive: true });
      }
    }

    for (const file of pluginFiles) {
      const source = path.join(__dirname, file);
      const destination = path.join(paths.workBuddyPluginDir, file);
      if (fs.existsSync(source)) {
        fs.copyFileSync(source, destination);
      }
    }

    const { npx, binDir } = resolveWorkBuddyNode(paths.workBuddyDir);
    const { type: _, ...baseMcpConfig } = MCP_CONFIG;
    const existingPath = process.env.PATH || process.env.Path || '';
    const env = binDir
      ? Object.assign({}, MCP_CONFIG.env, { PATH: [binDir, existingPath].filter(Boolean).join(path.delimiter) })
      : MCP_CONFIG.env;
    const workBuddyMcpConfig = Object.assign({}, baseMcpConfig, { command: npx, env });
    mergeMcpConfig(paths.workBuddyMcpJson, 'scorehub', workBuddyMcpConfig, { disabled: false });
    console.log(`WorkBuddy: Plugin installed at ${paths.workBuddyPluginDir}`);
    console.log(`WorkBuddy: MCP server configured at ${paths.workBuddyMcpJson}`);
  }

  const mcpServerVersion = getLatestMcpServerVersion();
  if (mcpServerVersion) {
    console.log(`\nmcp-server latest version: v${mcpServerVersion} (npx resolves @latest again when it starts).`);
  } else {
    console.log('\nmcp-server: @latest (the current version could not be queried).');
  }

  const platforms = [];
  if (hasClaudeCode) platforms.push('Claude Code');
  if (hasWorkBuddy) platforms.push('WorkBuddy');
  console.log(`\nInstallation complete. Restart ${platforms.join(' / ')} and use Tiky.`);
  return 0;
}

if (require.main === module) {
  process.exitCode = install();
}

module.exports = {
  MIN_NODE_MAJOR,
  getNodeMajorVersion,
  getPaths,
  install,
  isSupportedNode,
};
