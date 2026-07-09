#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

const CLAUDE_DIR = path.join(os.homedir(), '.claude');
const AGENTS_DIR = path.join(CLAUDE_DIR, 'agents');
const CLAUDE_JSON = path.join(os.homedir(), '.claude.json');

const AGENT_SRC = path.join(__dirname, 'agents', 'tiktok-creator-outreach.md');
const AGENT_DEST = path.join(AGENTS_DIR, 'tiktok-creator-outreach.md');

const MCP_CONFIG = {
  type: 'stdio',
  command: 'npx',
  args: ['-y', '@scorehub/mcp-server@latest'],
  env: {
    SCOREHUB_REMOTE_MCP_URL: 'https://mcp.scorehub.cn',
  },
};

// 1. 复制 Agent 定义文件
fs.mkdirSync(AGENTS_DIR, { recursive: true });
fs.copyFileSync(AGENT_SRC, AGENT_DEST);
console.log(`✓ Agent 已安装: ${AGENT_DEST}`);

// 2. 合并 MCP Server 配置到 ~/.claude.json
let claudeConfig = {};
if (fs.existsSync(CLAUDE_JSON)) {
  try {
    claudeConfig = JSON.parse(fs.readFileSync(CLAUDE_JSON, 'utf8'));
  } catch {
    console.warn(`警告：${CLAUDE_JSON} 解析失败，将重新写入`);
  }
}

claudeConfig.mcpServers = claudeConfig.mcpServers || {};
claudeConfig.mcpServers.scorehub = MCP_CONFIG;

fs.writeFileSync(CLAUDE_JSON, JSON.stringify(claudeConfig, null, 2) + '\n');
console.log(`✓ MCP Server 已配置: ${CLAUDE_JSON}`);

console.log('\n安装完成！重启 Claude Code 后，使用 @tiktok-creator-outreach 唤起 Tiky。');

