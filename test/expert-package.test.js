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
  const generated = execFileSync('unzip', ['-p', copy.archive,
    `${copy.root}/agents/tiktok-creator-outreach.md`], { encoding: 'utf8' });
  assert.match(generated, /scorehub-creator-message-lookup/);
  assert.doesNotMatch(generated, /bootstrap|sharecode/);
  execFileSync('unzip', ['-tq', copy.archive], { stdio: 'pipe' });
});

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
