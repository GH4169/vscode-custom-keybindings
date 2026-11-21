# VS Code 自定义快捷键

根据《VSCode自定义快捷键.md》正文复现；原文件引用的附录 A/B/C 未随文件提供，因此 config 是功能等价的重建配置，不宣称逐字恢复缺失附录。

本仓库独立 Git 管理，与各工具仓库分别上传。目标为 Windows Code 1.145.2 + WSL，VSCodeVim 1.32.4。

## 合并与回滚

```sh
npm ci --ignore-scripts
node merge.js check "<实际 Code/User 目录>"
node merge.js apply "<实际 Code/User 目录>"
node merge.js rollback "<返回的 backup 目录>"
```

保留 JSONC 注释、无关设置和映射；按 before 合并 Vim 数组，保留用户明确的 vim.foldfix=false。替换本功能旧导航/上下文键位，避免旧 terminalFocus 规则劫持终端；其他键位保留。备份仅在本机 backups/，权限受限且被 Git 忽略。若后续用户修改配置，回滚拒绝覆盖，需从备份按键合并。重复 apply 幂等。

## 主要键位

| 按键 | 范围及行为 |
| --- | --- |
| Ctrl+H/J/K/L | Normal/Visual 与侧栏非输入区的可见区域导航；终端/普通输入框保留 |
| Tab / Shift+Tab | Normal 当前组标签循环 |
| H/L，空格 q | Normal 前/后编辑器、关闭 |
| Ctrl+W → s/h 或 Ctrl+S/H | Normal 上下/左右分屏；独立 Ctrl+S 保存、Ctrl+H 向左 |
| 空格 n，Explorer 空格 n | 显式打开聚焦文件树/关闭 |
| Explorer Enter / t | 安全替换当前标签 / 原生打开保留原标签 |
| 空格 h/H/0/1-4，]h/[h | 会话颜色标记；次数和 Explorer 补充由扩展支持 |
| zf{motion}/Visual zf、zF | marker 创建；Normal zf 等待动作，支持 `%`、次数、文本对象 |
| zd/zD/zE | marker 单层/递归/全部删除 |
| Normal `zo` / `za`，`zc` | 切换折叠，收起折叠。Normal `zo` 沿用 `.vimrc` 的 `nnoremap zo za` |
| zO/zC/zA、zr/zm、zR/zM | 递归操作、逐层展开/收起、全部展开/收起 |
| zn/zN/zi、zv/zx/zX、zj/zk/[z/]z | 临时折叠开关、刷新/显示光标、折叠边界跳转 |
| Enter | Normal viw；Visual Esc；命令行/搜索提交；Insert 正常换行 |
| > / < | Visual 缩进后 gv |
| * | 原位整词搜索，n/N 仍原生 |
| 空格 ime | 临时切命令/搜索 IME 规则 |
| Ctrl+Alt+P | 直接执行 Codex 原生 Add to Codex Chat；Normal 附当前行，有选区附所选范围 |
| Ctrl+Alt+Q，Alt+Shift+Q | 移除旧绑定 |
| 编辑器 Ctrl+L → Codex | Normal/Visual 先去右侧编辑组，到边界后进入已显示的 Codex 输入框 |
| Codex Ctrl+H / J/K/L | 返回最近活动代码组 / 消费边界按键，保留草稿与选区 |

Ctrl+A/F/Z 交给 VS Code。已有 Insert 的 Ctrl+H/J/K/L 映射保留。

开启输入法限制时，命令行/搜索的回车由工作台键位显式转交 VSCodeVim，避免只读输入区吞掉提交。Enter 规则覆盖 `CommandlineInProgress` 和 `SearchInProgressMode`，因此 `:w` 可保存，`/`、`?` 可提交搜索；Insert 仍走原生换行。修改该规则后配置自动加载，无需重启编辑器。

`local.editor-ime-mode` 0.2.0 在 Windows 用原生助手把代码区 Normal/Visual 切为英文，离开代码输入区或进入 Insert/Replace 后恢复之前输入法。需要用户运行副本的焦点桥；桌面/开始菜单快捷方式已改到该副本。其余输入框保留中文输入；微软拼音的 `Process/229` 键也有英文物理键回退。

Codex 往返需要 `local.vim-navigation` 0.1.1 及实际运行 Code 的焦点桥。当前 Code 1.145.2 不会在 sidebar Webview 获焦时保持 `focusedView/auxiliaryBarFocus`；规则改用 `vimNavigation.focusedWebview`，仅匹配右侧 Codex，鼠标点入也有效。Ctrl+L 不打开隐藏的 Codex，不修改草稿、不发送。详情及补丁入口见同级 `vscode-vim-navigation/README.md`。

已修复 WSL `code .` 转交系统版进程时 Ctrl+H 失效：Windows 系统版与用户运行副本的 Code 1.145.2 现均含相同焦点桥，配置和扩展继续共用。已打开的窗口执行 Developer: Reload Window 即可加载此次焦点补丁。切换到用户副本的其他运行时功能仍需退出所有窗口再运行 `%LOCALAPPDATA%\editor-tools\code-ime.cmd`。升级 Code 后需重新检查焦点桥兼容性。

Ctrl+Alt+P 绑定 `chatgpt.addToThread`，与右键菜单 Add to Codex Chat / 既有 F13 使用同一命令。Codex 显示带文件名和行号的原生附件卡片，随后在输入框填写问题；不模拟 Visual、不插入解释正文、不自动发送。编辑器 Normal、Visual 和鼠标选区均使用原生语义，只在 `editorTextFocus` 生效。

已按用户要求卸载 `local.codex-diff-context-inline`；合并器清除该扩展的旧 P/U/Q 规则。Ctrl+Alt+U 的自定义自动发送功能随该扩展移除。原生 Codex 支持的文件类型、diff 与多光标行为以其当前版本为准。

## 验证

```sh
npm test
bash test/run-integration.sh
```

逻辑测试验证注释/映射合并、幂等、后续编辑保护及回滚。集成通过 `codex-desktop run` 在独立桌面 :97、临时配置/扩展/工作区进行；可执行副本/VSCodeVim 路径由 EDITOR_TOOLS_TEST_CODE / EDITOR_TOOLS_TEST_VIM 指定。测试调试端口仅绑定回环且随进程退出，不用于日常配置。

2026-11-16：15 项 Linux Code 1.145.2 联合检查通过，含真实 Enter、Ctrl+W/Ctrl+S、Leader Explorer、颜色次数跳转、输入上下文及 Normal/Visual 中 Ctrl+Alt+P 原生命令路由。后两项通过隔离宿主拦截命令验证，不连接实际 Codex 会话。真实 Windows 微软拼音与 Codex 请求尚未完整端到端验收。详细状态见 DELIVERY.md。

本次 H/L 修复后联合检查为 21 项通过，新增 6 项使用真正 Webview 的独立夹具验证右组优先、Normal/Visual 往返、鼠标点入后返回、草稿与边界、隐藏侧栏、Quick Input 不触发导航。夹具与官方 Codex 使用相同的 view ID 和 composer 获焦逻辑；没有使用真实会话或用户草稿，尚不能替代已登录官方 Codex 的 Windows 验收。可用 `EDITOR_TOOLS_TEST_FILTER` 正则筛选检查名称。

2026-11-17：修复 `:w` 回车被吞，联合检查更新为 25 项全部通过，配置合并/回滚共 7 项通过。新增真实按键验证英文限制开/关时的 `:w` 落盘、正反向搜索提交和 Insert 单次换行。原有测试改为等待 Vim 队列完成及终端输入状态，避免固定延时导致误判；配置迁移保留其他 Enter 规则和 JSONC 注释。

同日输入法修复后联合检查为 26 项全部通过，新增 Normal 的模拟 Windows IME `Process/229` 和中文 composition 拦截、Insert 中文输入恢复及 native bridge 请求状态检查。Windows 原生 helper 另以不可见窗口验证英文布局切换和恢复；真实微软拼音候选窗/中英内部状态仍需实际输入确认。
