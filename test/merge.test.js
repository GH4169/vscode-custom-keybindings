'use strict';
const { test } = require('node:test'),
  a = require('node:assert/strict'),
  fs = require('node:fs'),
  os = require('node:os'),
  path = require('node:path');
const {
  parse,
  mergeSettings,
  mergeBindings,
  apply,
  rollback,
} = require('../merge');
test('JSONC comments, unrelated mappings and explicit foldfix are preserved', () => {
  const text =
    '{// user comment\n"vim.foldfix":false,"other":1,"vim.normalModeKeyBindingsNonRecursive":[{"before":["x"],"after":["y"]}],}';
  const desired = {
    'vim.foldfix': true,
    'vim.normalModeKeyBindingsNonRecursive': [
      { before: ['n'], commands: ['n'] },
    ],
  };
  const merged = mergeSettings(text, desired);
  a.match(merged, /user comment/);
  const result = parse(merged);
  a.equal(result.other, 1);
  a.equal(result['vim.foldfix'], false);
  a.equal(result['vim.normalModeKeyBindingsNonRecursive'].length, 2);
  a.equal(mergeSettings(merged, desired), merged);
});
test('obsolete terminal-hijacking navigation is replaced and unrelated shortcuts survive', () => {
  const old =
    '[// custom\n{"key":"f13","command":"chatgpt.addToThread"},{"key":"ctrl+h","command":"workbench.action.navigateLeft","when":"terminalFocus"}]';
  const desired = [
    {
      key: 'ctrl+h',
      command: 'workbench.action.navigateLeft',
      when: '!inputFocus',
    },
  ];
  const result = mergeBindings(old, desired);
  a.match(result, /custom/);
  a.equal(parse(result).length, 2);
  a.equal(parse(result)[1].when, '!inputFocus');
  a.deepEqual(parse(mergeBindings(result, desired)), parse(result));
});
test('retired Codex extension bindings are removed while native shortcuts survive', () => {
  const desired = require('../config/keybindings.json');
  const old = JSON.stringify([
    { key: 'f13', command: 'chatgpt.addToThread' },
    {
      key: 'ctrl+alt+p',
      command: 'codexDiffContext.addSelectionInline',
      when: 'editorTextFocus',
    },
    {
      key: 'ctrl+alt+u',
      command: 'codexDiffContext.explainSelection',
      when: 'editorTextFocus',
    },
    { key: 'ctrl+alt+q', command: '-codexDiffContext.addSelectionInline' },
    { key: 'alt+shift+q', command: '-codexDiffContext.addSelectionInline' },
    { key: 'ctrl+alt+u', command: 'user.unrelated', when: 'terminalFocus' },
    ...desired,
  ]);
  const result = parse(mergeBindings(old, desired));
  a.ok(
    !result.some((binding) => /^-?codexDiffContext\./.test(binding.command))
  );
  a.ok(
    result.some(
      (binding) =>
        binding.key === 'f13' && binding.command === 'chatgpt.addToThread'
    )
  );
  a.ok(result.some((binding) => binding.command === 'user.unrelated'));
  a.deepEqual(
    result.filter((binding) => binding.key === 'ctrl+alt+p'),
    [
      {
        key: 'ctrl+alt+p',
        command: 'chatgpt.addToThread',
        when: 'editorTextFocus',
      },
    ]
  );
  a.equal(
    mergeBindings(JSON.stringify(result), desired),
    JSON.stringify(result)
  );
});
test('reversible installation refuses to overwrite subsequent user edits', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'keybindings-'));
  fs.writeFileSync(path.join(dir, 'settings.json'), '{}');
  fs.writeFileSync(path.join(dir, 'keybindings.json'), '[]');
  const backup = apply(dir);
  rollback(backup);
  a.equal(fs.readFileSync(path.join(dir, 'settings.json'), 'utf8'), '{}');
  const second = apply(dir);
  fs.appendFileSync(path.join(dir, 'settings.json'), '\n// later');
  a.throws(() => rollback(second), /changed after/);
  fs.rmSync(dir, { recursive: true });
  fs.rmSync(backup, { recursive: true });
  fs.rmSync(second, { recursive: true });
});
