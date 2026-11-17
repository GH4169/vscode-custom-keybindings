'use strict';
const vscode = require('vscode'),
  assert = require('node:assert/strict'),
  fs = require('node:fs/promises'),
  path = require('node:path');
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
async function run() {
  const results = [];
  const record = async (name, fn) => {
    if (
      process.env.EDITOR_TOOLS_TEST_FILTER &&
      !new RegExp(process.env.EDITOR_TOOLS_TEST_FILTER).test(name)
    )
      return;
    try {
      await fn();
      results.push({ name, passed: true });
    } catch (e) {
      results.push({ name, passed: false, error: e.stack });
    }
  };
  const ids = [
    'local.vim-sv-match',
    'local.vim-search-highlight-sync',
    'local.vim-navigation',
    'local.gvim-marker-folds',
    'local.color-marks',
    'local.editor-ime-mode',
    'local.shell-ime',
  ];
  for (const id of ids) {
    const ext = vscode.extensions.getExtension(id);
    assert.ok(ext, 'Extension missing: ' + id);
    await ext.activate();
  }
  const vim = vscode.extensions.getExtension('vscodevim.vim');
  await vim.activate();
  const api = require(path.resolve(vim.extensionPath, vim.packageJSON.main));
  async function until(predicate, description) {
    const deadline = Date.now() + 3000;
    while (!(await predicate())) {
      assert.ok(Date.now() < deadline, description);
      await delay(25);
    }
  }
  const type = async (text) => {
    for (const character of text) {
      await vscode.commands.executeCommand('type', { text: character });
      await delay(35);
    }
    await delay(100);
  };
  const escape = async () => {
    await vscode.commands.executeCommand('extension.vim_escape');
    await delay(60);
  };
  const file = path.join(process.env.EDITOR_TOOLS_TEST_WORKSPACE, 'sample.sv');
  await fs.writeFile(
    file,
    'module test;\nbegin\n  begin\n    x = 1; // end ignored\n  end\nend\nendmodule\n'
  );
  const doc = await vscode.workspace.openTextDocument(file);
  let editor = await vscode.window.showTextDocument(doc);
  await vscode.languages.setTextDocumentLanguage(doc, 'systemverilog');
  await delay(700);
  async function position(line, character = 0) {
    await escape();
    const p = new vscode.Position(line, character);
    editor.selection = new vscode.Selection(p, p);
    await delay(80);
    const handler = await api.getAndUpdateModeHandler();
    handler.syncCursors();
    return handler;
  }
  await record('SV % normal roundtrip and native/count fallback', async () => {
    await position(1, 2);
    await type('%');
    assert.equal(editor.selection.active.line, 5);
    await type('%');
    assert.equal(editor.selection.active.line, 1);
    await position(0, 0);
    await type('50%');
    assert.equal(editor.selection.active.line, 3);
  });
  await record('SV Visual anchor and mode are preserved', async () => {
    const h = await position(1);
    await type('v');
    const anchor = editor.selection.anchor;
    await type('%');
    assert.equal(editor.selection.active.line, 5);
    assert.ok(editor.selection.anchor.isEqual(anchor));
    assert.equal(h.vimState.currentMode, 2);
    await escape();
  });
  await record(
    'Normal Enter selects viw and Visual Enter escapes',
    async () => {
      const h = await position(0, 8);
      await type('\n');
      await delay(80);
      assert.equal(h.vimState.currentMode, 2);
      await vscode.commands.executeCommand('vim.remap', { after: ['<Enter>'] });
      await delay(60);
      assert.equal(h.vimState.currentMode, 0);
    }
  );
  await record(
    'same-document split search paints both editors without changing selection',
    async () => {
      await position(1);
      await type('/begin');
      await vscode.commands.executeCommand('vim.remap', { after: ['<Enter>'] });
      await delay(100);
      await vscode.commands.executeCommand('workbench.action.splitEditorRight');
      await delay(150);
      editor = vscode.window.activeTextEditor;
      const same = vscode.window.visibleTextEditors.filter(
        (e) => e.document === doc
      );
      assert.equal(same.length, 2);
      const h = await api.getAndUpdateModeHandler(),
        selections = same.map((e) => e.selection);
      h.updateSearchHighlights(true);
      assert.ok(same.every((e, i) => e.selection.isEqual(selections[i])));
    }
  );
  await record(
    'color marks do not move with text, share splits, and clear all',
    async () => {
      await position(3);
      await vscode.commands.executeCommand('colorMarks.toggle', {
        visual: false,
      });
      let marks = await vscode.commands.executeCommand('colorMarks.inspect');
      assert.equal(marks[0].start.line, 3);
      await editor.edit((b) =>
        b.insert(new vscode.Position(0, 0), '// inserted\n')
      );
      await delay(60);
      marks = await vscode.commands.executeCommand('colorMarks.inspect');
      assert.equal(marks[0].start.line, 3);
      await vscode.commands.executeCommand('colorMarks.clearAll');
      assert.equal(
        (await vscode.commands.executeCommand('colorMarks.inspect')).length,
        0
      );
      await vscode.commands.executeCommand('undo');
    }
  );
  await record(
    'color mark count jumps two distinct fixed destinations',
    async () => {
      await vscode.commands.executeCommand('colorMarks.clearAll');
      for (const line of [1, 3, 5]) {
        await position(line);
        await vscode.commands.executeCommand('colorMarks.toggle', {
          visual: false,
        });
      }
      try {
        await position(1);
        await type('2]h');
        assert.equal(editor.selection.active.line, 5);
      } finally {
        await vscode.commands.executeCommand('colorMarks.clearAll');
      }
    }
  );
  await record(
    'marker fold creates legal comments in one undo operation',
    async () => {
      await position(1);
      await type('V');
      await type('jj');
      const before = doc.getText();
      await vscode.commands.executeCommand('gvimMarkerFolds.createFold');
      await delay(150);
      assert.match(doc.lineAt(1).text, /\/\/ \{\{\{/);
      assert.match(doc.lineAt(3).text, /\/\/ \}\}\}/);
      assert.equal(
        (await api.getAndUpdateModeHandler()).vimState.currentMode,
        0
      );
      await vscode.commands.executeCommand('undo');
      await delay(100);
      assert.equal(doc.getText(), before);
    }
  );
  await record('marker-only folding excludes syntax ranges', async () => {
    const ranges = await vscode.commands.executeCommand(
      'vscode.executeFoldingRangeProvider',
      doc.uri
    );
    assert.deepEqual(ranges, []);
  });
  await record(
    'leader maps coexist; no global editor space chord',
    async () => {
      await position(1);
      await type(' h');
      assert.equal(
        (await vscode.commands.executeCommand('colorMarks.inspect')).length,
        1
      );
      await type(' 0');
      assert.equal(
        (await vscode.commands.executeCommand('colorMarks.inspect')).length,
        0
      );
      await type(' ime');
    }
  );
  await record(
    'raw Enter and modifier-held split bindings resolve through workbench',
    async () => {
      await vscode.commands.executeCommand(
        'workbench.action.focusActiveEditorGroup'
      );
      await delay(200);
      const h = await position(0, 8);
      await rawKey('Return');
      await delay(150);
      assert.equal(h.vimState.currentMode, 2);
      await rawKey('Return');
      await delay(100);
      assert.equal(h.vimState.currentMode, 0);
      await escape();
      const count = vscode.window.tabGroups.all.length;
      await rawKey('ctrl+w');
      await rawKey('ctrl+s');
      await delay(200);
      assert.equal(vscode.window.tabGroups.all.length, count + 1);
      editor = vscode.window.activeTextEditor;
    }
  );
  await record(
    'renderer restricts Normal locally and restores Insert/focus input',
    async () => {
      editor = vscode.window.activeTextEditor;
      await vscode.commands.executeCommand(
        'workbench.action.focusActiveEditorGroup'
      );
      await position(1);
      await delay(100);
      let status = await renderer(
        '({ime:globalThis.__editorImeMode?.inspect(),active:document.activeElement?.className})'
      );
      assert.equal(status.ime.mode, 'Normal');
      assert.equal(status.ime.held, true);
      await rawKey('i');
      await delay(150);
      status = await renderer('globalThis.__editorImeMode.inspect()');
      assert.equal(status.mode, 'Insert');
      assert.equal(status.held, false);
      await escape();
    }
  );
  await record(
    'terminal prompt IME restriction is released for ime system and read',
    async () => {
      const terminal = vscode.window.createTerminal({
        name: 'IME isolated test',
        shellPath: '/bin/bash',
        shellArgs: ['--norc', '--noprofile', '-i'],
        env: { TMUX: null, STY: null, SHELL_IME_BACKEND: 'vscode' },
      });
      terminal.show();
      await delay(500);
      try {
        terminal.sendText(
          'source ' + path.resolve(__dirname, '../../shell-ime/shell/bash.sh')
        );
        await delay(400);
        let input = await renderer(
          '({name:document.activeElement?.className,readOnly:document.activeElement?.readOnly})'
        );
        assert.match(input.name, /xterm-helper-textarea/);
        assert.equal(input.readOnly, true);
        terminal.sendText('ime system');
        await delay(200);
        input = await renderer('({readOnly:document.activeElement?.readOnly})');
        assert.equal(input.readOnly, false);
        terminal.sendText('ime english');
        await delay(200);
        input = await renderer('({readOnly:document.activeElement?.readOnly})');
        assert.equal(input.readOnly, true);
        terminal.sendText('read -r editor_tools_test');
        await delay(200);
        input = await renderer('({readOnly:document.activeElement?.readOnly})');
        assert.equal(input.readOnly, false);
        terminal.sendText('中文测试');
      } finally {
        terminal.dispose();
      }
    }
  );
  await record(
    'raw Leader toggles Explorer without swallowing color marks',
    async () => {
      await vscode.commands.executeCommand('workbench.action.closeSidebar');
      await vscode.commands.executeCommand(
        'workbench.action.focusActiveEditorGroup'
      );
      editor = vscode.window.activeTextEditor;
      await position(1);
      await rawKey('space');
      await rawKey('n');
      await delay(250);
      let state = await renderer(
        '({tree:!!document.activeElement?.closest(".explorer-folders-view"),cls:document.activeElement?.className})'
      );
      assert.equal(state.tree, true);
      await rawKey('space');
      await rawKey('n');
      await delay(200);
      state = await renderer(
        '!!document.activeElement?.closest(".monaco-editor")'
      );
      assert.equal(state, true);
      await rawKey('space');
      await rawKey('h');
      await delay(100);
      assert.equal(
        (await vscode.commands.executeCommand('colorMarks.inspect')).length,
        1
      );
      await vscode.commands.executeCommand('colorMarks.clearAll');
    }
  );
  for (const visual of [false, true]) {
    await record(
      'raw Ctrl+Alt+P calls native Codex with unchanged ' +
        (visual ? 'Visual selection' : 'Normal cursor line'),
      async () => {
        await vscode.commands.executeCommand(
          'workbench.action.focusActiveEditorGroup'
        );
        editor = vscode.window.activeTextEditor;
        const handler = await position(1, 2);
        if (visual) await type('vj');
        const selection = editor.selection;
        const mode = handler.vimState.currentMode;
        const text = doc.getText();
        const calls = [];
        // The native command is intercepted only in this isolated test host.
        // Verify key routing without opening a real chat or sending a request.
        const registration = vscode.commands.registerCommand(
          'chatgpt.addToThread',
          () => calls.push(vscode.window.activeTextEditor.selection)
        );
        try {
          assert.equal(selection.isEmpty, !visual);
          await rawKey('ctrl+alt+p');
          await until(
            () => calls.length > 0,
            'native Codex command received the key'
          );
          assert.equal(calls.length, 1);
          assert.ok(calls[0].isEqual(selection));
          assert.ok(editor.selection.isEqual(selection));
          assert.equal(handler.vimState.currentMode, mode);
          assert.equal(doc.getText(), text);
        } finally {
          registration.dispose();
          await escape();
        }
      }
    );
  }
  const fixture = vscode.extensions.getExtension('test.codex-focus-fixture');
  await fixture.activate();
  const inspectCodex = () =>
    vscode.commands.executeCommand('test.codexFocus.inspect');
  await record(
    'Ctrl+L prioritizes the right editor then focuses the visible webview composer',
    async () => {
      await escape();
      await vscode.commands.executeCommand('workbench.action.joinAllGroups');
      editor = await vscode.window.showTextDocument(doc);
      await vscode.commands.executeCommand('workbench.action.splitEditorRight');
      await vscode.commands.executeCommand(
        'chatgpt.sidebarSecondaryView.focus'
      );
      await delay(600);
      await vscode.commands.executeCommand(
        'workbench.action.focusFirstEditorGroup'
      );
      editor = vscode.window.activeTextEditor;
      await position(1);
      const left = vscode.window.tabGroups.activeTabGroup;
      await rawKey('ctrl+l');
      await delay(200);
      assert.notEqual(vscode.window.tabGroups.activeTabGroup, left);
      assert.equal((await inspectCodex()).focused, false);
      editor = vscode.window.activeTextEditor;
      await rawKey('ctrl+l');
      await delay(300);
      const state = await inspectCodex();
      assert.equal(state.focused, true);
      assert.equal(state.draft, 'isolated draft 中文');
    }
  );
  await record(
    'Ctrl+H returns from the actual webview input and preserves a Visual selection',
    async () => {
      await rawKey('ctrl+h');
      await delay(200);
      assert.equal((await inspectCodex()).focused, false);
      assert.equal(
        await renderer('!!document.activeElement?.closest(".monaco-editor")'),
        true
      );
      editor = vscode.window.activeTextEditor;
      const handler = await position(1);
      await type('vj');
      const selection = editor.selection;
      const group = vscode.window.tabGroups.activeTabGroup;
      await rawKey('ctrl+l');
      await delay(200);
      assert.equal((await inspectCodex()).focused, true);
      await rawKey('ctrl+h');
      await delay(200);
      assert.equal(vscode.window.tabGroups.activeTabGroup, group);
      assert.ok(editor.selection.isEqual(selection));
      assert.equal(handler.vimState.currentMode, 2);
      await escape();
    }
  );
  await record(
    'Ctrl+H also returns after clicking directly into the webview',
    async () => {
      await vscode.commands.executeCommand(
        'workbench.action.focusActiveEditorGroup'
      );
      const point = await renderer(`(() => {
      const frame = document.querySelector('iframe.webview[src*="extensionId=test.codex-focus-fixture"]');
      const bounds = frame.getBoundingClientRect();
      return {
        x: window.screenX + bounds.x + 70,
        y: window.screenY + window.outerHeight - window.innerHeight + bounds.y + 15,
      };
    })()`);
      const { execFileSync } = require('node:child_process');
      execFileSync('xdotool', [
        'mousemove',
        String(Math.round(point.x)),
        String(Math.round(point.y)),
        'click',
        '1',
      ]);
      await delay(200);
      assert.equal((await inspectCodex()).focused, true);
      await rawKey('ctrl+h');
      await delay(200);
      assert.equal((await inspectCodex()).focused, false);
      assert.equal(
        await renderer('!!document.activeElement?.closest(".monaco-editor")'),
        true
      );
    }
  );
  await record(
    'Codex boundary Ctrl+J/K/L leaves the draft and focus intact',
    async () => {
      await rawKey('ctrl+l');
      await delay(200);
      for (const key of ['ctrl+j', 'ctrl+k', 'ctrl+l']) {
        await rawKey(key);
        await delay(120);
        const state = await inspectCodex();
        assert.equal(state.focused, true);
        assert.equal(state.draft, 'isolated draft 中文');
      }
      await rawKey('ctrl+h');
      await delay(150);
    }
  );
  await record('Ctrl+L never opens a hidden Codex sidebar', async () => {
    await vscode.commands.executeCommand('workbench.action.closeAuxiliaryBar');
    await vscode.commands.executeCommand(
      'workbench.action.focusActiveEditorGroup'
    );
    editor = vscode.window.activeTextEditor;
    await position(1);
    await rawKey('ctrl+l');
    await delay(200);
    assert.equal((await inspectCodex()).visible, false);
  });
  await record(
    'Codex visible does not capture Quick Input Ctrl+H/L',
    async () => {
      await vscode.commands.executeCommand(
        'chatgpt.sidebarSecondaryView.focus'
      );
      await delay(200);
      const input = vscode.window.createInputBox();
      input.value = 'keep this input';
      const calls = [];
      const registrations = [
        'workbench.action.focusActiveEditorGroup',
        'workbench.action.navigateLeft',
        'workbench.action.navigateRight',
      ].map((id) => vscode.commands.registerCommand(id, () => calls.push(id)));
      try {
        for (const key of ['ctrl+h', 'ctrl+l']) {
          input.show();
          await delay(150);
          assert.equal(
            await renderer(
              '!!document.activeElement?.closest(".quick-input-widget")'
            ),
            true
          );
          await rawKey(key);
          await delay(100);
          assert.equal((await inspectCodex()).focused, false);
          assert.deepEqual(calls, []);
        }
      } finally {
        input.dispose();
        registrations.forEach((registration) => registration.dispose());
        await vscode.commands.executeCommand('closeFindWidget');
      }
    }
  );
  await fs.writeFile(
    path.join(process.env.EDITOR_TOOLS_TEST_RESULTS, 'integration.json'),
    JSON.stringify(
      { version: vscode.version, platform: process.platform, results },
      null,
      2
    )
  );
  const failed = results.filter((r) => !r.passed);
  for (const result of results)
    console.log(
      (result.passed ? 'PASS ' : 'FAIL ') +
        result.name +
        (result.error ? '\n' + result.error : '')
    );
  if (failed.length)
    throw new Error(failed.length + ' integration test(s) failed');
}
module.exports = { run };
async function rawKey(key) {
  const { execFile } = require('node:child_process');
  await new Promise((resolve, reject) =>
    execFile('xdotool', ['key', '--clearmodifiers', key], (error) =>
      error ? reject(error) : resolve()
    )
  );
}
async function renderer(expression) {
  const targets = await (
    await fetch(
      'http://127.0.0.1:' +
        process.env.EDITOR_TOOLS_TEST_CDP_PORT +
        '/json/list'
    )
  ).json();
  const target = targets.find(
    (t) => t.type === 'page' && t.url.includes('workbench')
  );
  assert.ok(target, 'Isolated renderer target');
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(target.webSocketDebuggerUrl),
      timer = setTimeout(() => {
        socket.close();
        reject(new Error('Renderer probe timeout'));
      }, 4000);
    socket.onopen = () =>
      socket.send(
        JSON.stringify({
          id: 1,
          method: 'Runtime.evaluate',
          params: { expression, returnByValue: true, awaitPromise: true },
        })
      );
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.id !== 1) return;
      clearTimeout(timer);
      socket.close();
      if (data.result?.exceptionDetails)
        reject(new Error(JSON.stringify(data.result.exceptionDetails)));
      else resolve(data.result?.result?.value);
    };
    socket.onerror = reject;
  });
}
