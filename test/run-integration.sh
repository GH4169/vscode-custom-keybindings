#!/usr/bin/env bash
set -euo pipefail
root_dir="$(cd -- "$(dirname -- "$0")/.." && pwd)"
code_dir="${EDITOR_TOOLS_TEST_CODE:-$HOME/.local/share/editor-tools/code-linux-1.145.2}"
test_dir="$(mktemp -d "${TMPDIR:-/tmp}/editor-tools-test.XXXXXX")"
chmod 700 "$test_dir"
mkdir -p "$test_dir/user/User" "$test_dir/extensions" "$test_dir/workspace" "$root_dir/test-results"
mkdir -p "$test_dir/user/User/globalStorage/vscodevim.vim"
export EDITOR_TOOLS_TEST_WORKSPACE="$test_dir/workspace" EDITOR_TOOLS_TEST_RESULTS="$root_dir/test-results"
export EDITOR_TOOLS_TEST_CDP_PORT="$(python3 -c 'import socket;s=socket.socket();s.bind(("127.0.0.1",0));print(s.getsockname()[1]);s.close()')"
cp "$root_dir/config/settings.json" "$test_dir/user/User/settings.json"
cp "$root_dir/config/keybindings.json" "$test_dir/user/User/keybindings.json"
cp -a "${EDITOR_TOOLS_TEST_VIM:-$HOME/.cache/editor-tools/integration/extensions/vscodevim.vim-1.32.4}" "$test_dir/extensions/"
cp -a "$root_dir/test/fixtures/codex-focus" "$test_dir/extensions/test.codex-focus-fixture-1.0.0"
mkdir -p "$test_dir/extensions/test.sv-language-1.0.0"
printf '%s\n' '{"name":"sv-language","publisher":"test","version":"1.0.0","engines":{"vscode":"*"},"contributes":{"languages":[{"id":"systemverilog","extensions":[".sv"]}]}}' > "$test_dir/extensions/test.sv-language-1.0.0/package.json"
printf '%s\n' "$test_dir" > "$root_dir/test-results/LAST_SESSION"
Xvnc :98 -geometry 1440x1000 -depth 24 -rfbport -1 -rfbunixpath "$test_dir/vnc.sock" -rfbunixmode 0600 -SecurityTypes None -localhost -nolisten tcp > "$test_dir/xvnc.log" 2>&1 &
test_x_pid=$!
trap 'kill "$test_x_pid" 2>/dev/null || true' EXIT
export DISPLAY=:98
unset WAYLAND_DISPLAY XAUTHORITY ELECTRON_RUN_AS_NODE VSCODE_IPC_HOOK_CLI VSCODE_IPC_HOOK VSCODE_CWD NODE_OPTIONS
for attempt in {1..50}; do if xdpyinfo >/dev/null 2>&1;then break;fi;sleep .1;done
openbox > "$test_dir/openbox.log" 2>&1 &
test_wm_pid=$!
trap 'kill "$test_wm_pid" "$test_x_pid" 2>/dev/null || true' EXIT
args=()
for directory in vscode-vim-sv-match vscode-vim-search-highlight-sync vscode-vim-navigation vscode-vim-marker-folds vscode-color-marks editor-ime-mode shell-ime;do
 args+=(--extensionDevelopmentPath="$root_dir/../$directory")
done
export DONT_PROMPT_WSL_INSTALL=1
timeout 120 "$code_dir/code" --no-sandbox --remote-debugging-address=127.0.0.1 --remote-debugging-port="$EDITOR_TOOLS_TEST_CDP_PORT" --disable-gpu --disable-workspace-trust --skip-welcome --skip-release-notes --user-data-dir "$test_dir/user" --extensions-dir "$test_dir/extensions" "${args[@]}" --extensionTestsPath="$root_dir/test/integration.js" "$test_dir/workspace" > "$root_dir/test-results/code.log" 2>&1
