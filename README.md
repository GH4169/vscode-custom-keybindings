# VS Code 自定义快捷键

根据《VSCode自定义快捷键.md》正文复现；原文件引用的附录 A/B/C 未随文件提供，因此 config 是功能等价的重建配置，不宣称逐字恢复缺失附录。

本仓库独立 Git 管理，与 10 个工具仓库分别上传。目标为 Windows Code 1.145.2 + WSL，VSCodeVim 1.32.4。

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
| zf/zd/zo | marker 创建/删除/切换；Normal zf 不创建临时折叠 |
| Enter | Normal viw；Visual Esc；Insert 不变 |
| > / < | Visual 缩进后 gv |
| * | 原位整词搜索，n/N 仍原生 |
| 空格 ime | 临时切命令/搜索 IME 规则 |
| Ctrl+Alt+P/U | 添加上下文 / 显式解释发送；仅 editorTextFocus |
| Ctrl+Alt+Q，Alt+Shift+Q | 移除旧绑定 |
| Codex Ctrl+H / J/K/L | 右侧栏返回编辑组 / 消费边界按键，实际 view 上下文需 Windows 验收 |

Ctrl+A/F/Z 交给 VS Code。已有 Insert 的 Ctrl+H/J/K/L 映射保留。

## 验证

```sh
npm test
bash test/run-integration.sh
```

逻辑测试验证注释/映射合并、幂等、后续编辑保护及回滚。集成在独立 Xvnc :98、临时配置/扩展/工作区进行；可执行副本/VSCodeVim 路径由 EDITOR_TOOLS_TEST_CODE / EDITOR_TOOLS_TEST_VIM 指定。测试调试端口仅绑定回环且随进程退出，不用于日常配置。

2026-11-16：13 项 Linux Code 1.145.2 联合检查通过，含真实 Enter、Ctrl+W/Ctrl+S、Leader Explorer、颜色次数跳转和输入上下文检查。真实 Windows 微软拼音与 Codex 请求尚未完整端到端验收。详细状态见 DELIVERY.md。
