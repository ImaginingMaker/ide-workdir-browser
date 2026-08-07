# IDE Workdir Browser — OpenPencil Design Set

Electron macOS 工作目录浏览器的 OpenPencil 高保真设计稿。当前版本已按最新 React/Sass
实现重塑，设计稿中的窗口结构、尺寸、文案、Agent 范围和主要状态以真实应用 UI 为基准。

产品范围、实现状态和验收标准仍以
[产品 PRD](../ide-workdir-browser-code/docs/PRD.md) 为准；本目录中的旧 HTML 页面只作为历史原型
留档，不再作为实现真源。

## 交付内容

- `ide-workdir-browser.op`：7 页分类式 OpenPencil 设计文件
- `tokens.json`：与 `src/renderer/src/styles/_tokens.scss` 对齐的语义 token
- `scripts/generate.mjs`：从真实应用资产和当前 UI 结构生成 43 个源状态；运行时使用 macOS
  `sips` 将 SVG 图标栅格化为 PNG data URL，避免 OpenPencil image 节点显示占位图
- `scripts/consolidate.mjs`：将 43 个源状态合并为 7 个分类画布
- 生成脚本、HTML 原型和 OpenPencil 文件中的路径必须使用 `~`、`<workspace>`、`<tool-cache>`
  等脱敏形式，不写入本机用户名或真实绝对路径

重新生成：

```bash
cd ide-workdir-browser-design
node scripts/generate.mjs
node scripts/consolidate.mjs
```

## 当前设计基准

- 标准窗口 `1440 × 960`，最小窗口 `900 × 540`，宽窗 `1600 × 960`。
- Electron 使用 `hiddenInset` 标题栏，设计稿保留原生交通灯占位；应用内标题栏高度为 `44px`。
- 浏览工作台结构为：`Sidebar 220/48px`、`Toolbar 44px`、可选 `DocumentTabs 34px`、主内容区、
  `Inspector 256px`、`Pathbar 30px`、`Statusbar 24px`。
- 设置工作台不显示浏览工具栏、文档标签、路径栏或状态栏；左侧为设置分类与“返回浏览器 Esc”。
- 产品固定为 10 个默认 Agent：Codex、Claude Code、Cursor、Zed、Trae、VS Code、Gemini CLI、
  OpenCode、Windsurf、Kiro；当前 UI 不开放自定义新增或移除 Agent。
- Agent 是否启用与路径是否可用分别建模；Windsurf/Kiro 默认保持启用并显示“路径不可用”。
- 搜索设计表现当前目录搜索；“当前 Agent / 全部 Agent”范围切换仍未开放。
- 文件类型图标覆盖 SQLite、JSON/JSONL/NDJSON、Markdown、配置、脚本、密钥、表格、归档、
  图片、代码、文档、二进制、文本和未知文件。
- 文件夹图标保留线框、实心、双色三套全局预设，外观设置页展示并说明其影响范围。
- 关于页展示当前版本、用户主动检查更新、新版本状态和安全下载入口；不表现未开放的自动安装。
- 设计系统页使用真实应用资产：`app-icon.svg` 和 `agent-icons/*.svg`，生成时统一转换为 PNG
  data URL 写入 `.op`。

## 7 个分类画布

1. `01 设计系统`：App 图标、10 个 Agent 品牌资产、文件类型图标系统。
2. `02 核心浏览体验`：图标/列表/分栏视图、Inspector、隐藏文件、长文件名、分页、宽窗和
   Agent 隔离。
3. `03 文件预览`：代码、Markdown、图片、大文件、二进制/不支持预览和暗色预览。
4. `04 搜索与文件操作`：搜索结果、无结果、超量、右键菜单、Finder 拖入、复制确认、冲突、
   通知和跨 Agent 粘贴。
5. `05 设置`：IDE 管理、路径编辑、外观、文件夹图标、高级、重置确认，以及关于页的手动更新
   检查。
6. `06 边缘与系统状态`：工作目录不可用、权限、空目录和加载态。
7. `07 主题响应式与帮助`：暗色、窄窗、最小窗口和快捷键速查。

## 一致性原则

- 设计稿只向最新软件 UI 收敛，不把旧 HTML 中的 Tailwind 类名、过期 Agent 范围、失效
  `data-dom-id` 或未开放功能带回 React 实现。
- 新增或调整真实 UI 后，应先更新 `scripts/generate.mjs` 和 `tokens.json`，再重新生成
  `ide-workdir-browser.op`。
- 生成或归档设计资产前，必须执行隐私扫描并清理 `.DS_Store`、本机绝对路径、内部域名和凭据形态
  数据。
- 修改设计文档时，同步检查 PRD、设计决策、Computer Use 回归、根 README、代码 README 和
  `AGENTS.md` 是否需要调整。
