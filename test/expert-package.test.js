const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const test = require('node:test');

const source = path.join(__dirname, '..');
const manifest = require('../.codebuddy-plugin/plugin.json');
const supportPath = 'agents/references/quick-lookup/reply-support-tool-contracts.md';

function fixture(t) {
  for (const command of ['bash', 'python3', 'zip', 'unzip']) {
    if (spawnSync('which', [command], { stdio: 'ignore' }).status !== 0) {
      t.skip(`${command} 不可用`);
      return null;
    }
  }
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'tiky-expert-package-'));
  t.after(() => fs.rmSync(temporary, { recursive: true, force: true }));
  const directory = path.join(temporary, 'expert');
  fs.cpSync(source, directory, {
    recursive: true,
    filter: (file) => !['dist', 'node_modules', '.git'].includes(path.basename(file)),
  });
  return {
    directory,
    script: path.join(directory, 'scripts', 'pack-expert.sh'),
    archive: path.join(directory, 'dist', `${manifest.name}-${manifest.version}.zip`),
    root: `${manifest.name}-${manifest.version}`,
  };
}

test('expert ZIP ships the current quick-lookup contracts and a generated platform agent', (t) => {
  const copy = fixture(t);
  if (!copy) return;
  execFileSync('bash', [copy.script, '--skip-baseline-check'], { stdio: 'pipe' });
  for (const relative of [
    '.codebuddy-plugin/plugin.json',
    'agents/tiktok-creator-outreach.lookup-additions.md',
    'agents/references/quick-lookup/common-contract.md',
    'agents/references/quick-lookup/identifiers-and-relations.md',
    supportPath,
    'skills/scorehub-sample-lookup/SKILL.md',
    'skills/scorehub-sample-lookup/references/tools-and-fields.md',
    'skills/scorehub-creator-message-lookup/SKILL.md',
    'skills/scorehub-creator-message-lookup/references/tools-and-fields.md',
  ]) {
    const contents = execFileSync('unzip', ['-p', copy.archive, `${copy.root}/${relative}`]);
    assert.deepEqual(contents, fs.readFileSync(path.join(source, relative)), relative);
  }
  const packagedManifest = JSON.parse(execFileSync('unzip', ['-p', copy.archive,
    `${copy.root}/.codebuddy-plugin/plugin.json`], { encoding: 'utf8' }));
  assert.deepEqual(packagedManifest.dependencies, { connectors: ['scorehub-tiktok'] });
  const entries = execFileSync('unzip', ['-Z1', copy.archive], { encoding: 'utf8' });
  assert.doesNotMatch(entries, /(?:^|\/)\.mcp\.json$/m);
  assert.doesNotMatch(entries, /avatars\/scorehub-ai\.png$/m);
  const generated = execFileSync('unzip', ['-p', copy.archive,
    `${copy.root}/agents/tiktok-creator-outreach.md`], { encoding: 'utf8' });
  assert.match(generated, /scorehub-creator-message-lookup/);
  assert.match(generated, /已上架的 ScoreHub TikTok 达人营销连接器/);
  assert.doesNotMatch(generated, /bootstrap|sharecode/);
  execFileSync('unzip', ['-tq', copy.archive], { stdio: 'pipe' });
});

for (const [name, dependencies, expected] of [
  ['missing connector dependency', undefined, /dependencies\.connectors/],
  ['empty connector list', { connectors: [] }, /dependencies\.connectors/],
  ['MCP server key used as connector ID', { connectors: ['scorehub'] }, /dependencies\.connectors/],
  ['connector ID without an array', { connectors: 'scorehub-tiktok' }, /dependencies\.connectors/],
  ['invalid dependency object', [], /dependencies 需为对象/],
  ['mixed embedded MCP dependency', { connectors: ['scorehub-tiktok'], mcpServers: './other.json' }, /dependencies\.mcpServers/],
]) {
  test(`expert packaging refuses ${name}`, (t) => {
    const copy = fixture(t);
    if (!copy) return;
    const file = path.join(copy.directory, '.codebuddy-plugin', 'plugin.json');
    fs.writeFileSync(file, JSON.stringify({ ...manifest, dependencies }));
    const result = spawnSync('bash', [copy.script, '--skip-baseline-check'], { encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, expected);
    assert.equal(fs.existsSync(copy.archive), false);
  });
}

for (const relative of ['.mcp.json', 'listing/.mcp.json']) {
  test(`expert packaging refuses a stale ${relative}`, (t) => {
    const copy = fixture(t);
    if (!copy) return;
    fs.writeFileSync(path.join(copy.directory, relative), JSON.stringify({ mcpServers: {} }));
    const result = spawnSync('bash', [copy.script, '--skip-baseline-check'], { encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.ok(result.stderr.includes(`市场连接器交付不得保留 ${relative}`));
    assert.equal(fs.existsSync(copy.archive), false);
  });
}

test('expert packaging refuses a missing shared task contract', (t) => {
  const copy = fixture(t);
  if (!copy) return;
  fs.unlinkSync(path.join(copy.directory, supportPath));
  const result = spawnSync('bash', [copy.script, '--skip-baseline-check'], { encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /缺少随包契约: agents\/references\/quick-lookup\/reply-support-tool-contracts.md/);
  assert.equal(fs.existsSync(copy.archive), false);
});

test('expert packaging refuses a broken quick-lookup reference', (t) => {
  const copy = fixture(t);
  if (!copy) return;
  fs.appendFileSync(path.join(copy.directory, 'skills', 'scorehub-creator-message-lookup', 'SKILL.md'),
    '\n[missing reference](./references/missing.md)\n');
  const result = spawnSync('bash', [copy.script, '--skip-baseline-check'], { encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /包内引用缺失: .* -> .\/references\/missing.md/);
  assert.equal(fs.existsSync(copy.archive), false);
});
