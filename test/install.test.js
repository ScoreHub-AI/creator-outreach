const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { install, isSupportedNode } = require('../install.js');

function makeHome() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'creator-outreach-'));
}

function runInstall(options) {
  return install(Object.assign({ getLatestMcpServerVersion: () => null }, options));
}

test('accepts Node.js 18 and later', () => {
  assert.equal(isSupportedNode('18.0.0'), true);
  assert.equal(isSupportedNode('24.6.0'), true);
  assert.equal(isSupportedNode('17.9.1'), false);
});

test('does not write files for an unsupported Node.js version', () => {
  const homeDir = makeHome();
  assert.equal(runInstall({ homeDir, nodeVersion: '16.20.0' }), 1);
  assert.deepEqual(fs.readdirSync(homeDir), []);
});

test('does not write files when no supported client is detected', () => {
  const homeDir = makeHome();
  assert.equal(runInstall({ homeDir }), 1);
  assert.deepEqual(fs.readdirSync(homeDir), []);
});

test('configures only Claude Code when its directory exists', () => {
  const homeDir = makeHome();
  fs.mkdirSync(path.join(homeDir, '.claude'));

  assert.equal(runInstall({ homeDir }), 0);
  assert.equal(fs.existsSync(path.join(homeDir, '.claude', 'agents', 'tiktok-creator-outreach.md')), true);
  assert.equal(fs.existsSync(path.join(homeDir, '.claude.json')), true);
  assert.equal(fs.existsSync(path.join(homeDir, '.workbuddy')), false);
});

test('configures only WorkBuddy when its directory exists', () => {
  const homeDir = makeHome();
  fs.mkdirSync(path.join(homeDir, '.workbuddy'));

  assert.equal(runInstall({ homeDir }), 0);
  const pluginDir = path.join(homeDir, '.workbuddy', 'plugins', 'marketplaces', 'my-experts', 'plugins', 'tiktok-creator-outreach');
  const manifest = JSON.parse(fs.readFileSync(path.join(pluginDir, '.codebuddy-plugin', 'plugin.json'), 'utf8'));
  assert.equal(fs.existsSync(path.join(homeDir, '.workbuddy', 'mcp.json')), true);
  assert.equal(fs.existsSync(path.join(pluginDir, 'README.en.md')), true);
  assert.equal(manifest.avatar, 'avatars/scorehub-ai-white.png');
  assert.equal(fs.existsSync(path.join(pluginDir, manifest.avatar)), true);
  assert.deepEqual(manifest.quickPrompts, [
    { en: 'What can Tiky help me do?', zh: '我想了解 Tiky 能帮我做什么' },
  ]);
  assert.equal(fs.existsSync(path.join(homeDir, '.claude.json')), false);
});

test('configures both clients when both directories exist', () => {
  const homeDir = makeHome();
  fs.mkdirSync(path.join(homeDir, '.claude'));
  fs.mkdirSync(path.join(homeDir, '.workbuddy'));

  assert.equal(runInstall({ homeDir }), 0);
  assert.equal(fs.existsSync(path.join(homeDir, '.claude.json')), true);
  assert.equal(fs.existsSync(path.join(homeDir, '.workbuddy', 'mcp.json')), true);
});
