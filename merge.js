'use strict';
const fs = require('node:fs'),
  path = require('node:path'),
  crypto = require('node:crypto');
const jsonc = require('jsonc-parser');
const options = {
  formattingOptions: { insertSpaces: true, tabSize: 2, eol: '\n' },
};
function parse(text) {
  const errors = [];
  const value = jsonc.parse(text, errors, {
    allowTrailingComma: true,
    disallowComments: false,
  });
  if (errors.length)
    throw new Error(
      'Invalid JSONC: ' +
        errors.map((e) => jsonc.printParseErrorCode(e.error)).join(', ')
    );
  return value;
}
function edit(text, key, value) {
  return jsonc.applyEdits(text, jsonc.modify(text, [key], value, options));
}
function keyFor(mapping) {
  return JSON.stringify(mapping.before);
}
function mergeSettings(text, desired) {
  const before = parse(text);
  if (!before || Array.isArray(before))
    throw new Error('settings.json must be an object');
  let result = text;
  for (const [key, value] of Object.entries(desired)) {
    let next = value;
    if (key.endsWith('KeyBindingsNonRecursive')) {
      next = [...(before[key] || [])];
      for (const mapping of value) {
        const i = next.findIndex((m) => keyFor(m) === keyFor(mapping));
        if (i < 0) next.push(mapping);
        else next[i] = mapping;
      }
    } else if (key === 'vim.handleKeys')
      next = { ...(before[key] || {}), ...value };
    else if (key === 'vim.foldfix' && before[key] === false) next = false;
    if (JSON.stringify(before[key]) !== JSON.stringify(next))
      result = edit(result, key, next);
  }
  return result;
}
function mergeBindings(text, desired) {
  const old = parse(text);
  if (!Array.isArray(old)) throw new Error('keybindings.json must be an array');
  const retired = (binding) =>
    /^-?codexDiffContext\./.test(binding.command || '');
  if (
    !old.some(retired) &&
    desired.length <= old.length &&
    JSON.stringify(old.slice(-desired.length)) === JSON.stringify(desired)
  )
    return text;
  const requested = new Set(desired.map((b) => b.key)),
    conflicts = new Set([
      'ctrl+h',
      'ctrl+j',
      'ctrl+k',
      'ctrl+l',
      'tab',
      'shift+tab',
      'space n',
      'ctrl+alt+p',
      'ctrl+alt+u',
      'ctrl+alt+q',
      'alt+shift+q',
    ]);
  let result = text;
  const remove = [];
  for (let i = 0; i < old.length; i++) {
    const binding = old[i];
    const same = desired.some(
      (d) =>
        d.key === binding.key &&
        d.command === binding.command &&
        d.when === binding.when
    );
    const obsolete =
      conflicts.has(binding.key) &&
      requested.has(binding.key) &&
      (/^(workbench\.action\.(navigate|nextEditorInGroup|previousEditorInGroup|toggleSidebarVisibility)|chatgpt\.addToThread|codexQuickExplain\.|codexDiffContext\.)/.test(
        binding.command
      ) ||
        binding.command === 'vimNavigation.closeExplorer');
    const obsoleteCodexFocus =
      ['ctrl+h', 'ctrl+j', 'ctrl+k', 'ctrl+l'].includes(binding.key) &&
      /chatgpt\.sidebarSecondaryView/.test(binding.when || '') &&
      [
        '',
        'workbench.action.focusActiveEditorGroup',
        'vimNavigation.navigateRightToCodex',
      ].includes(binding.command);
    const obsoleteVimEnter =
      binding.key === 'enter' &&
      binding.command === 'vim.remap' &&
      binding.when ===
        'editorTextFocus && vim.active && vim.mode =~ /^(Normal|Visual|VisualLine|VisualBlock)$/' &&
      JSON.stringify(binding.args) === JSON.stringify({ after: ['<Enter>'] });
    if (
      same ||
      obsolete ||
      obsoleteCodexFocus ||
      obsoleteVimEnter ||
      retired(binding)
    )
      remove.push(i);
  }
  // Delete array entries by syntax-node offsets. jsonc-parser's formatted
  // deletion can produce an extra brace for compact arrays with comments.
  for (const index of remove.reverse()) {
    const root = jsonc.parseTree(result),
      nodes = root.children,
      node = nodes[index];
    const start =
      index > 0
        ? nodes[index - 1].offset + nodes[index - 1].length
        : node.offset;
    const end =
      index + 1 < nodes.length
        ? nodes[index + 1].offset
        : node.offset + node.length;
    if (index > 0 && index + 1 < nodes.length) {
      result = result.slice(0, node.offset) + result.slice(end);
    } else result = result.slice(0, start) + result.slice(end);
  }
  for (const binding of desired)
    result = jsonc.applyEdits(
      result,
      jsonc.modify(result, [-1], binding, options)
    );
  return result;
}
const hash = (text) => crypto.createHash('sha256').update(text).digest('hex');
function plan(user) {
  return ['settings', 'keybindings'].map((name) => {
    const file = path.join(user, name + '.json');
    const before = fs.existsSync(file)
      ? fs.readFileSync(file, 'utf8')
      : name === 'settings'
        ? '{}\n'
        : '[]\n';
    const desired = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'config', name + '.json'), 'utf8')
    );
    const after =
      name === 'settings'
        ? mergeSettings(before, desired)
        : mergeBindings(before, desired);
    return { name, file, before, after, changed: before !== after };
  });
}
function apply(user) {
  const changes = plan(user);
  fs.mkdirSync(user, { recursive: true });
  const id = new Date().toISOString().replace(/[:.]/g, '-'),
    backup = path.join(__dirname, 'backups', id);
  fs.mkdirSync(backup, { recursive: true, mode: 0o700 });
  const manifest = { user, files: [] };
  for (const item of changes) {
    if (!item.changed) continue;
    fs.writeFileSync(path.join(backup, item.name + '.json'), item.before, {
      mode: 0o600,
    });
    fs.writeFileSync(item.file, item.after);
    manifest.files.push({
      name: item.name,
      file: item.file,
      beforeHash: hash(item.before),
      afterHash: hash(item.after),
    });
  }
  fs.writeFileSync(
    path.join(backup, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
    { mode: 0o600 }
  );
  return backup;
}
function rollback(backup) {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(backup, 'manifest.json'))
  );
  for (const item of manifest.files) {
    if (hash(fs.readFileSync(item.file, 'utf8')) !== item.afterHash)
      throw new Error(
        item.name +
          ' changed after installation; refusing to overwrite later edits. Use the backup to merge the affected entries.'
      );
  }
  for (const item of manifest.files)
    fs.writeFileSync(
      item.file,
      fs.readFileSync(path.join(backup, item.name + '.json'))
    );
}
if (require.main === module) {
  const [command, arg] = process.argv.slice(2);
  if (command === 'apply') {
    if (!arg) throw new Error('Pass the actual Code User directory');
    console.log('Backup: ' + apply(path.resolve(arg)));
  } else if (command === 'check') {
    console.log(
      JSON.stringify(
        plan(path.resolve(arg)).map((p) => ({
          file: p.file,
          changed: p.changed,
        })),
        null,
        2
      )
    );
  } else if (command === 'rollback') rollback(path.resolve(arg));
  else
    throw new Error(
      'Usage: node merge.js check|apply <Code User directory> | rollback <backup directory>'
    );
}
module.exports = { parse, mergeSettings, mergeBindings, plan, apply, rollback };
