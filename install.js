#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

const CLAUDE_DIR = path.join(os.homedir(), '.claude');
const AGENTS_DIR = path.join(CLAUDE_DIR, 'agents');
const SETTINGS_FILE = path.join(CLAUDE_DIR, 'settings.json');

const AGENT_SRC = path.join(__dirname, 'agents', 'tiktok-creator-outreach.md');
const AGENT_DEST = path.join(AGENTS_DIR, 'tiktok-creator-outreach.md');

const MCP_CONFIG = {
  command: 'npx',
  args: ['-y', '@scorehub/mcp-server'],
  env: {
    SCOREHUB_REMOTE_MCP_URL: 'https://mcp.scorehub.cn',
  },
};

// 1. 复制 Agent 定义文件
fs.mkdirSync(AGENTS_DIR, { recursive: true });
fs.copyFileSync(AGENT_SRC, AGENT_DEST);
console.log(`✓ Agent 已安装: ${AGENT_DEST}`);

// 2. 合并 MCP Server 配置到 settings.json
let settings = {};
if (fs.existsSync(SETTINGS_FILE)) {
  try {
    settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
  } catch {
    console.warn(`警告：${SETTINGS_FILE} 解析失败，将重新写入`);
  }
}

settings.mcpServers = settings.mcpServers || {};
settings.mcpServers.scorehub = MCP_CONFIG;

fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2) + '\n');
console.log(`✓ MCP Server 已配置: ${SETTINGS_FILE}`);

console.log('\n安装完成！重启 Claude Code 后，使用 @tiktok-creator-outreach 唤起 Tiky。');
