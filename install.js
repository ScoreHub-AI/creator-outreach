#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const pkg = require('./package.json');
console.log(`${pkg.name} v${pkg.version}\n`);

// === Claude Code 路径 ===
const CLAUDE_DIR = path.join(os.homedir(), '.claude');
const AGENTS_DIR = path.join(CLAUDE_DIR, 'agents');
const CLAUDE_JSON = path.join(os.homedir(), '.claude.json');

const AGENT_SRC = path.join(__dirname, 'agents', 'tiktok-creator-outreach.md');
const AGENT_DEST = path.join(AGENTS_DIR, 'tiktok-creator-outreach.md');

// === WorkBuddy 路径 ===
const WORKBUDDY_DIR = path.join(os.homedir(), '.workbuddy');
const WORKBUDDY_PLUGIN_DIR = path.join(
  WORKBUDDY_DIR, 'plugins', 'marketplaces', 'my-experts', 'plugins', 'tiktok-creator-outreach',
);
const WORKBUDDY_MCP_JSON = path.join(WORKBUDDY_DIR, 'mcp.json');

// === 共享 MCP 配置 ===
const MCP_CONFIG = {
  type: 'stdio',
  command: 'npx',
  args: ['-y', '@scorehub/mcp-server@latest'],
  env: {
    SCOREHUB_REMOTE_MCP_URL: 'https://app.scorehub.cn/mcp',
  },
};

// 工具函数：解析 WorkBuddy 捆绑的 node bin 目录
// WorkBuddy spawn 子进程的 PATH 不含 node，npx 及其下载的包依赖 #!/usr/bin/env node，
// 找不到 node 会秒退导致 "Connection closed"。返回 npx 全路径 + bin 目录用于注入 PATH。
function resolveWorkBuddyNode() {
  const versionsDir = path.join(WORKBUDDY_DIR, 'binaries', 'node', 'versions');
  try {
    const versions = fs.readdirSync(versionsDir);
    if (versions.length > 0) {
      const binDir = path.join(versionsDir, versions[0], 'bin');
      const npxPath = path.join(binDir, 'npx');
      if (fs.existsSync(npxPath)) return { npx: npxPath, binDir };
    }
  } catch {
    // 目录不存在或无权限
  }
  return { npx: 'npx', binDir: null };
}

// 工具函数：查询 mcp-server 在 npm registry 的当前最新版本
// 注意：这是 install 此刻的最新版；实际 MCP 拉起时由 npx 现场解析 @latest，
// 若之后 registry 更新，运行时版本可能与此不同。失败时静默返回 null（不阻断安装）。
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

// 工具函数：合并 MCP Server 配置到 JSON 文件
function mergeMcpConfig(configPath, serverName, serverConfig, extraFields) {
  let config = {};
  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch {
      console.warn(`警告：${configPath} 解析失败，将重新写入`);
    }
  }

  config.mcpServers = config.mcpServers || {};
  config.mcpServers[serverName] = Object.assign({}, serverConfig, extraFields);

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
}

// ========== Claude Code ==========

// 1. 复制 Agent 定义文件
fs.mkdirSync(AGENTS_DIR, { recursive: true });
fs.copyFileSync(AGENT_SRC, AGENT_DEST);
console.log(`✓ Claude Code: Agent 已安装 → ${AGENT_DEST}`);

// 2. 合并 MCP Server 配置到 ~/.claude.json
mergeMcpConfig(CLAUDE_JSON, 'scorehub', MCP_CONFIG, {});
console.log(`✓ Claude Code: MCP Server 已配置 → ${CLAUDE_JSON}`);

// ========== WorkBuddy ==========

const hasWorkBuddy = fs.existsSync(WORKBUDDY_DIR);

if (hasWorkBuddy) {
  // 3. 复制插件文件到 WorkBuddy 插件目录
  const pluginDirs = ['.codebuddy-plugin', 'agents', 'skills', 'avatars'];
  const pluginFiles = ['package.json', 'README.md'];

  fs.mkdirSync(WORKBUDDY_PLUGIN_DIR, { recursive: true });

  for (const dir of pluginDirs) {
    const src = path.join(__dirname, dir);
    const dest = path.join(WORKBUDDY_PLUGIN_DIR, dir);
    if (fs.existsSync(src)) {
      fs.cpSync(src, dest, { recursive: true });
    }
  }

  for (const file of pluginFiles) {
    const src = path.join(__dirname, file);
    const dest = path.join(WORKBUDDY_PLUGIN_DIR, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
    }
  }

  console.log(`✓ WorkBuddy: 插件文件已安装 → ${WORKBUDDY_PLUGIN_DIR}`);

  // 4. 合并 MCP Server 配置到 ~/.workbuddy/mcp.json
  //    - 去掉 type 字段（WorkBuddy 不识别）
  //    - command 用 npx 全路径（WorkBuddy PATH 不含系统 npx）
  //    - env.PATH 注入 node bin 目录（否则 npx 及其子进程的 shebang 找不到 node，秒退报 Connection closed）
  const { npx, binDir } = resolveWorkBuddyNode();
  const { type: _, ...baseMCPConfig } = MCP_CONFIG;
  const wbEnv = binDir
    ? Object.assign({}, MCP_CONFIG.env, { PATH: `${binDir}:/usr/local/bin:/usr/bin:/bin` })
    : MCP_CONFIG.env;
  const wbMCPConfig = Object.assign({}, baseMCPConfig, { command: npx, env: wbEnv });
  mergeMcpConfig(WORKBUDDY_MCP_JSON, 'scorehub', wbMCPConfig, { disabled: false });
  console.log(`✓ WorkBuddy: MCP Server 已配置 → ${WORKBUDDY_MCP_JSON}`);
}

// ========== 完成 ==========

const platforms = ['Claude Code'];
if (hasWorkBuddy) platforms.push('WorkBuddy');

const mcpServerVersion = fetchLatestMcpServerVersion();
if (mcpServerVersion) {
  console.log(`\n→ mcp-server 当前最新版本：v${mcpServerVersion}（运行时由 npx 解析 @latest，届时可能更新）`);
} else {
  console.log('\n→ mcp-server：@latest（运行时由 npx 解析，未能查询到具体版本号）');
}

console.log(`\n安装完成！重启 ${platforms.join(' / ')} 后使用 Tiky。`);
if (!hasWorkBuddy) {
  console.log('提示：未检测到 WorkBuddy，仅安装了 Claude Code。如需 WorkBuddy 支持请先安装 WorkBuddy 后重新运行本命令。');
}

