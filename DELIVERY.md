# 交付与当前生效范围

日期：2026-11-16。目标：Windows Code 1.145.2 / `c4453f8ea430795f941c1b2ff6c9321135a74a02`、VSCodeVim 1.32.4、Codex 26.1111.21308、WSL Ubuntu 26.04。每行目录是独立 Git 仓库，未设置 GitHub remote。

| 仓库 | 已交付 | 当前状态 / 限制 |
| --- | --- | --- |
| `vscode-vim-sv-match` | 词法匹配、内存 movement 适配、配置、VSIX、测试 | 已安装 Windows UI 端；Normal/Visual/count 联合回归通过 |
| `vscode-vim-search-highlight-sync` | 原生绘制包装、每 editor 缓存、事件刷新、VSIX | 已安装；同文档分屏刷新及选区保持通过 |
| `vscode-vim-navigation` | Explorer 开关、安全替换标签、键位片段、VSIX | 已安装；真实 Leader Explorer 与快速分屏通过；真实 Codex 焦点尚未验收 |
| `vscode-vim-marker-folds` | marker 创建/安全删除、provider、行数装饰、VSIX | 已安装；创建/撤销/provider 通过；EOF 行数等边缘视觉情况未完整验证 |
| `vscode-color-marks` | 固定坐标/组/颜色/跳转/重命名、VSIX | 已安装；跨次数跳转、固定坐标、Leader 共存通过 |
| `vscode-codex-stability` | 只读诊断 CLI、测试、说明 | 未见原诊断信号，未改 http.electronFetch |
| `vscode-codex-diff-context` | 旧版本/WSL 当前缓冲区/多选区正文、安全围栏、串行操作、就绪等待、Windows UIA/X11 助手、VSIX | 已安装；快照测试和 Windows PowerShell 语法通过；本地单选区使用原生附件并检查卡片；真实 Codex 发送端到端未验证，不在生产草稿测试 |
| `shell-ime` | Bash/Zsh/tcsh 脚本、Linux 状态 helper、Code bridge/renderer、VSIX | Bash/Zsh PTY 与 Code xterm 提示符/read/ime 切换通过；tmux 跳过；GNOME/VTE 不在当前目标，未部署 |
| `editor-ime-mode` | 用户运行副本构建器、版本/校验保护、renderer/VSIX、Vim/GVim 脚本和终端助手 | Windows/Linux 用户副本已生成；Linux renderer 模式切换通过；Windows 真实微软拼音、GVim/IBus 尚未完整验收 |
| `clipboard` | X11 内存 50 条历史、热键/弹窗/粘贴、启动/单实例/服务/测试、ETX 检测入口 | 独立桌面 :97 已运行，服务启用；并发和显示别名通过；没有 ETX，未实现代理内存修复，不影响现有 Windows 工具 |
| `vscode-custom-keybindings` | 全量目标片段、JSONC 合并/备份/回滚、逻辑与独立 GUI 回归 | Windows User 配置已合并；保留无关映射/Insert 设置、无全局 Space chord |

## 开始使用

普通扩展安装与配置已完成，现有窗口是否已加载取决于 VS Code 生命周期。用户可在合适时机执行 Developer: Reload Window。

输入法补丁需要运行用户副本。保存文件并完全退出所有 Code 窗口后，运行 Windows `%LOCALAPPDATA%\editor-tools\code-ime.cmd`；不能只 Reload Window 切换主程序。原系统 Code 文件未改，随时可退出用户副本后从系统入口恢复。

新 Bash/Zsh 已接入带存在性检查的 Shell source。当前 Codex Shell 在 tmux 内，按设计跳过。新 Code 终端还需加载扩展与运行副本。GVim 的局部输入上下文需新进程初始化，入口脚本在 editor-ime-mode/bin/gvim。

剪贴板保留当前常驻进程及内存历史，没有为代码更新而重启。磁盘上的最后修正将在下次自然启动时加载；手动执行 cliprestart 会清空历史。

## 证据

`test-results/integration.json` 为最新联合结果；`test/run-integration.sh` 可重现专用 Xvnc、隔离配置/扩展/工作区。真实按键注入限定该 X server，调试端口只绑定回环并随测试退出；没有 Windows 全局输入事件。

19 项核心 JS 逻辑测试、3 项配置合并/回滚测试、2 项 renderer/补丁保护单元测试（合计 24 项 JS）、2 项 Python 逻辑测试、2 项 Bash/Zsh PTY 测试、1 项 X11 单实例测试已通过。联合集成现为 13 项，包含真实 Enter、Ctrl+W/Ctrl+S、Leader Explorer、颜色次数跳转、IME 状态检查。逻辑/结构验证不能代替 Windows 拼音或真实 Codex 模型请求验证。

原指南有条件的平台内容不会因为用户选择 Windows + WSL 而被伪装为已部署。ETX 没有目标代理符号布局，桥接修复只有检测入口；GNOME/VTE 没有对应目标终端，未实现该动态库后端。终端 Vim 助手可恢复 IBus 引擎名称，尚未实现拼音内部 Shift 中英文状态的完整保存与恢复。真实 Windows 输入法、Codex 请求验收需要后续在匹配桌面进行受控测试；当前未据此声明所有平台验收完成。

## 备份和 Git

配置及 Shell/Vim source 前的备份在本仓库 `backups/`，不提交。`node merge.js rollback <backup>` 校验安装后散列，拒绝覆盖后续用户修改。恢复跨多次 apply 的初始状态时按时间逆序逐个回滚；Shell/Vim 的独立 managed source 块可移除。

11 个仓库只提交源码、配置片段、测试与文档；VSIX、Code 副本、用户配置、日志、缓存和登录信息不纳入 Git。之后可逐仓库执行 `git remote add origin <url>`、`git push -u origin main`。
