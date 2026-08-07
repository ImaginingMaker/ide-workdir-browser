# README 截图说明

本目录保存根 README 使用的产品界面图。

## 来源

- 设计真源：`ide-workdir-browser-design/ide-workdir-browser.op`
- 设计生成器：`ide-workdir-browser-design/scripts/generate.mjs`
- 当前范围：10 个默认 Agent
- 导出方式：OpenPencil `op export`

这些图片是从当前高保真设计稿导出的模拟界面，不是用户设备或真实工作目录的截图。界面只使用
`~/.codex`、`~/.claude` 等产品默认路径和虚构文件名，不得包含本机绝对路径、账号、设备名、
内部域名或用户文件内容。

## 文件

| 文件                      | OpenPencil 状态         | 内容                                 |
| ------------------------- | ----------------------- | ------------------------------------ |
| `browser-overview.png`    | A01 浏览器 · 图标视图   | 文件浏览总览、Agent 侧边栏和语义图标 |
| `markdown-preview.png`    | A05 文档预览 · Markdown | Markdown、文档标签和 Agent 独立状态  |
| `appearance-settings.png` | B19 设置 · 外观         | 主题、强调色、缩放和文件夹图标设置   |

## 重新导出

启动当前设计稿后，定位状态中的 `app-window` 节点并导出：

```bash
cd ide-workdir-browser-design
OPENPENCIL_DESKTOP_BIN=/Applications/OpenPencil.app/Contents/MacOS/openpencil-desktop \
  op start --headless --file ide-workdir-browser.op

op export --item <app-window-node-id> \
  --output ../ide-workdir-browser-code/docs/screenshots/<name>.png \
  --format png \
  --scale 1

op stop
```

覆盖图片前必须逐张检查路径、Agent 范围、功能状态和隐私字段，并确认没有退回旧 HTML 原型的
6 Agent 或自定义 Agent 口径。
