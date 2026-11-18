# 交付与当前生效范围

日期：2026-11-16。目标：Windows Code 1.145.2 / `c4453f8ea430795f941c1b2ff6c9321135a74a02`、VSCodeVim 1.32.4、Codex 26.1111.21308、WSL Ubuntu 26.04。每行目录是独立 Git 仓库，未设置 GitHub remote。

| 仓库 | 已交付 | 当前状态 / 限制 |
| --- | --- | --- |
| `vscode-vim-sv-match` | 词法匹配、内存 movement 适配、配置、VSIX、测试 | 已安装 Windows UI 端；Normal/Visual/count 联合回归通过 |
| `vscode-vim-search-highlight-sync` | 原生绘制包装、每 editor 缓存、事件刷新、VSIX | 已安装；同文档分屏刷新及选区保持通过 |
| `vscode-vim-navigation` | Explorer 开关、安全替换标签、Codex 焦点桥与右边界导航、键位片段、0.1.1 VSIX | Windows UI 已升级，系统版及用户运行副本均含焦点桥；6 项焦点 GUI 回归通过；已登录官方 Codex 的 Windows 输入框仍待实际验收 |
| `vscode-vim-marker-folds` | marker motion 操作符、嵌套/递归操作、层级/开关/导航、provider、行数、VSIX | 0.2.0；35 项折叠 GUI 与 13 项逻辑检查通过，含真实 RTL 副本、EOF、撤销重做、保存重开与分屏 |
| `vscode-color-marks` | 固定坐标/组/颜色/跳转/重命名、VSIX | 已安装；跨次数跳转、固定坐标、Leader 共存通过 |
| `vscode-codex-stability` | 只读诊断 CLI、测试、说明 | 未见原诊断信号，未改 http.electronFetch |
| `vscode-codex-diff-context` | 已按用户后续要求停用 | 扩展已卸载，源码及独立 Git 历史移至本机归档；Ctrl+Alt+P 直接执行 Codex 原生 `chatgpt.addToThread` |
| `shell-ime` | Bash/Zsh/tcsh 脚本、Linux 状态 helper、Code bridge/renderer、VSIX | Bash/Zsh PTY 与 Code xterm 提示符/read/ime 切换通过；tmux 跳过；GNOME/VTE 不在当前目标，未部署 |
| `editor-ime-mode` | 用户运行副本构建器、版本/校验保护、renderer/VSIX、Vim/GVim 脚本和终端助手 | Windows/Linux 用户副本已生成；Linux renderer 模式切换通过；Windows 真实微软拼音、GVim/IBus 尚未完整验收 |
| `clipboard` | X11 内存 50 条历史、热键/弹窗/粘贴、启动/单实例/服务/测试、ETX 检测入口 | 独立桌面 :97 已运行，服务启用；并发和显示别名通过；没有 ETX，未实现代理内存修复，不影响现有 Windows 工具 |
| `vscode-custom-keybindings` | 全量目标片段、JSONC 合并/备份/回滚、逻辑与独立 GUI 回归 | Windows User 配置已合并；保留无关映射/Insert 设置、无全局 Space chord |

## 开始使用

普通扩展安装与配置已完成，现有窗口是否已加载取决于 VS Code 生命周期。用户可在合适时机执行 Developer: Reload Window。

Codex 快捷键已按后续要求简化：Ctrl+Alt+P 与右键 Add to Codex Chat / F13 完全相同。Normal 使用光标当前行，存在选区使用原生选区范围；生成文件名/行号附件卡片后由用户输入问题。旧 P/U/Q 自定义扩展绑定已清理，Ctrl+Alt+U 自动解释随扩展移除，不自动发送。

本次补齐 H/L 往返：Normal/Visual Ctrl+L 优先右侧已有编辑器组，到边界再进入已显示的 Codex；Codex Ctrl+H 返回最近活动代码组，保留选区和 Vim 模式，鼠标点入后同样适用。J/K/L 在 Codex 内消费按键，不改草稿、不提交。依赖 `vimNavigation.focusedWebview` 焦点标识；Windows 系统版与用户运行副本现均包含该桥，已打开的窗口需 Reload Window 加载。

输入法补丁需要运行用户副本。保存文件并完全退出所有 Code 窗口后，运行 Windows `%LOCALAPPDATA%\editor-tools\code-ime.cmd`；不能只 Reload Window 切换主程序。系统 Code 此次仅补焦点桥，退出用户副本后从系统入口启动即可恢复系统版输入法行为。

新 Bash/Zsh 已接入带存在性检查的 Shell source。当前 Codex Shell 在 tmux 内，按设计跳过。新 Code 终端还需加载扩展与运行副本。GVim 的局部输入上下文需新进程初始化，入口脚本在 editor-ime-mode/bin/gvim。

剪贴板保留当前常驻进程及内存历史，没有为代码更新而重启。磁盘上的最后修正将在下次自然启动时加载；手动执行 cliprestart 会清空历史。

## 证据

`test-results/integration.json` 为最新联合结果；`test/run-integration.sh` 通过 `codex-desktop run` 复用独立桌面 :97，使用隔离配置/扩展/工作区。真实按键注入限定该 X server，调试端口只绑定回环并随测试退出；没有 Windows 全局输入事件。

19 项核心 JS 逻辑测试、3 项配置合并/回滚测试、2 项 renderer/补丁保护单元测试（合计 24 项 JS）、2 项 Python 逻辑测试、2 项 Bash/Zsh PTY 测试、1 项 X11 单实例测试已通过。联合集成现为 13 项，包含真实 Enter、Ctrl+W/Ctrl+S、Leader Explorer、颜色次数跳转、IME 状态检查。逻辑/结构验证不能代替 Windows 拼音或真实 Codex 模型请求验证。

后续移除 Codex 自定义扩展后，配置合并/回滚测试共 4 项通过，联合集成更新为 15 项通过。新增两项在隔离 Code 中实际发送 Ctrl+Alt+P，并拦截原生命令验证 Normal 当前行、Visual 选区及 Vim 模式不变；不连接实际会话、不发送模型请求。此项验证的是按键路由，原生附件显示行为由已安装的官方 Codex 提供。

本次 H/L 修复：导航逻辑与运行副本补丁共 6 项通过，配置合并/回滚 5 项、IME 原有 2 项通过；联合 GUI 共 21 项通过。新增 6 项在隔离的真实 Webview 中验证焦点往返、Visual 保留、鼠标点入、边界草稿、隐藏侧栏及 Quick Input 排除。测试夹具仅安装到临时扩展目录，不是替换官方 Codex。官方 26.1111.21308 在无凭据隔离实例中仅到登录页，因此没有把夹具结果表述为已登录官方输入框实测。未触碰日常桌面、会话或草稿。

原指南有条件的平台内容不会因为用户选择 Windows + WSL 而被伪装为已部署。ETX 没有目标代理符号布局，桥接修复只有检测入口；GNOME/VTE 没有对应目标终端，未实现该动态库后端。终端 Vim 助手可恢复 IBus 引擎名称，尚未实现拼音内部 Shift 中英文状态的完整保存与恢复。真实 Windows 输入法、Codex 请求验收需要后续在匹配桌面进行受控测试；当前未据此声明所有平台验收完成。

## 备份和 Git

配置及 Shell/Vim source 前的备份在本仓库 `backups/`，不提交。`node merge.js rollback <backup>` 校验安装后散列，拒绝覆盖后续用户修改。恢复跨多次 apply 的初始状态时按时间逆序逐个回滚；Shell/Vim 的独立 managed source 块可移除。

当前 ~/.install 中保留 10 个活跃独立仓库。停用的 vscode-codex-diff-context 源码及 Git 历史已移至 `~/.local/share/editor-tools/retired/vscode-codex-diff-context/`，不再作为插件安装或快捷键依赖。

各仓库只提交源码、配置片段、测试与文档；VSIX、Code 副本、用户配置、日志、缓存和登录信息不纳入 Git。之后可逐仓库执行 `git remote add origin <url>`、`git push -u origin main`。

2026-11-17 marker 修复：Windows UI 已安装 `local.gvim-marker-folds` 0.2.0 和 `local.vim-sv-match` 0.1.2，安装源码与构建核对一致。配置只修改 Normal/Visual 的折叠映射，备份在 `backups/2026-11-17T09-11-42-594Z`。35 项 marker GUI、13 项折叠逻辑（含真实 Vim 层级对照）、6 项配置合并、5 项 SV 逻辑和 21 项联合回归通过。GUI 在 Linux Code 同版本的独立桌面 :97 运行；日常 Windows 窗口需要 Reload Window 加载新版。

2026-11-17 `:w` 修复：输入法限制开启时，命令/搜索模式的默认回车无法产生 Vim 输入；工作台 Enter 规则此前仅覆盖 Normal/Visual。现增加 `CommandlineInProgress`、`SearchInProgressMode`，保留其余模式行为，Windows User 配置自动加载。修复前已在隔离编辑器复现 `:w` 后保持命令模式且磁盘未更新；修复后 25 项联合 GUI、7 项配置合并/回滚全部通过，包含真实回车保存临时文件、英文限制开/关、正反搜索、Insert 换行。测试使用同版本 Linux Code；未操作日常 Windows 窗口，也未修改用户 RTL 文件。

本机 WSL Ctrl+H 修复：最近一次 WSL 窗口日志中的主进程来自 Windows 系统安装；此前只有用户运行副本带 `vimNavigation.focusedWebview` 焦点桥。`code .` 可转交已有主进程，故只调整 CLI 软链接不足以保证桥存在。此次保留现有键位，将相同、受版本和校验和保护的焦点桥补到系统 Code 1.145.2，核对系统版和用户副本的焦点函数一致及各自工作台校验和。备份为 `vscode-vim-navigation/backups/2026-11-18T02-18-39Z-system-focus/`，无登录信息。仅此焦点修复现在可通过 Reload Window 加载；不再要求切换运行副本。

同版本隔离运行时去掉桥后，两项 Ctrl+H GUI 返回检查失败；补回后 6 项焦点 GUI 与 6 项导航逻辑检查通过，涵盖 Normal/Visual 往返、鼠标点入、草稿保持、隐藏 Codex 和 Quick Input。原始前后结果及实际 Windows 文件核对见 `test-results/focus-before-integration.json`、`integration.json`、`focus-windows-runtime.json`。GUI 使用独立桌面 Linux Code 与 Webview 夹具，未宣称已操作已登录 Windows 官方 Codex。Code 升级将替换系统补丁，届时需重新适配。
