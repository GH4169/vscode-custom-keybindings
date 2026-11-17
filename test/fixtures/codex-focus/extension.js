'use strict';
const vscode = require('vscode');
const { randomBytes } = require('node:crypto');

function activate(context) {
  let view;
  const pending = new Map();
  let sequence = 0;
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'chatgpt.sidebarSecondaryView',
      {
        resolveWebviewView(value) {
          view = value;
          view.webview.options = { enableScripts: true };
          const nonce = randomBytes(16).toString('base64');
          view.webview.html = `<!doctype html><html><head>
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}';">
          </head><body tabindex="0">
          <div id="composer" class="ProseMirror" role="textbox" contenteditable="true">isolated draft 中文</div>
          <script nonce="${nonce}">
          const api = acquireVsCodeApi();
          const composer = document.getElementById('composer');
          window.addEventListener('focus', () => queueMicrotask(() => {
            if(document.hasFocus() && document.activeElement === document.body) composer.focus();
          }));
          window.addEventListener('message', event => {
            const request = event.data;
            if(request.type === 'inspect') api.postMessage({id:request.id, focused:document.hasFocus() && document.activeElement === composer, draft:composer.textContent});
          });
          composer.focus();
          </script></body></html>`;
          context.subscriptions.push(
            view.webview.onDidReceiveMessage((message) => {
              pending.get(message.id)?.(message);
              pending.delete(message.id);
            })
          );
        },
      },
      { webviewOptions: { retainContextWhenHidden: true } }
    ),
    vscode.commands.registerCommand('test.codexFocus.inspect', () => {
      if (!view) throw new Error('Fixture view not resolved');
      return new Promise((resolve, reject) => {
        const id = ++sequence;
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error('Fixture response timed out'));
        }, 3000);
        pending.set(id, (message) => {
          clearTimeout(timer);
          resolve({ ...message, visible: view.visible });
        });
        view.webview.postMessage({ type: 'inspect', id });
      });
    })
  );
}

module.exports = { activate };
