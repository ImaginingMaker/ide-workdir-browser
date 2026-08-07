# IDE Workdir Browser

面向 AI 编程 Agent 的 macOS 工作目录浏览器。应用基于 Electron、React 和 TypeScript，
用于在一个窗口中浏览、搜索、预览和管理多个 Agent 的工作目录。

当前支持：

| Agent       | 默认工作目录          |
| ----------- | --------------------- |
| Codex       | `~/.codex`            |
| Claude Code | `~/.claude`           |
| Cursor      | `~/.cursor`           |
| Zed         | `~/.config/zed`       |
| Trae        | `~/.trae-cn`          |
| VS Code     | `~/.copilot`          |
| Gemini CLI  | `~/.gemini`           |
| OpenCode    | `~/.config/opencode`  |
| Windsurf    | `~/.codeium/windsurf` |
| Kiro        | `~/.kiro`             |

每个 Agent 使用独立的路径、导航历史、视图模式、搜索上下文、选中状态和检查器状态。

## 当前状态

项目处于 `0.1.0` 开发阶段，已具备可运行、可测试和可打包的核心浏览能力：

- 图标、列表和 macOS Finder 风格分栏视图
- SQLite、JSON/JSONL、Markdown、配置等文件类型语义图标
- 线框、实心、双色三套可持久化文件夹图标预设
- Agent 工作区切换与独立导航历史
- 文件名搜索和主内容区搜索结果工作台
- 文本、Markdown、图片、二进制及超限文件预览
- 按 Agent 隔离的文档多标签页
- Finder 拖入、跨 Agent 复制/剪切/粘贴、冲突预检及进程内撤销
- 单选项目移到 macOS 废纸篓，带二次确认和路径边界保护
- 文件信息、文件夹统计和 Finder 定位
- 浅色、深色、强调色、缩放及隐藏文件设置
- 可折叠左右面板和窄窗响应式布局
- Electron 原生快捷键与状态栏快捷键速查
- 关于页手动检查最新稳定版并跳转 GitHub Release
- macOS arm64/x64 构建配置

尚未完成的主要能力：

- 文件多选和批量传输
- 真正的目录分页或继续加载
- 当前 Agent / 全部 Agent 搜索范围切换
- 自定义 Agent 新增和移除
- 应用内废纸篓恢复、批量废纸篓和永久删除
- 首次使用向导和完整错误恢复流程

文件操作撤销和浏览状态当前不跨应用重启持久化。已知桌面回归缺陷和限制见
[Computer Use 回归测试归档](ide-workdir-browser-code/docs/computer-use-regression.md)。

## 仓库结构

```text
.
├── .github/workflows/                # CI 与手动版本发布
├── ide-workdir-browser-design/        # OpenPencil 设计、HTML 原型和设计审查
├── ide-workdir-browser-code/          # Electron 应用源码
│   ├── docs/PRD.md                    # 产品需求与验收真源
│   ├── docs/design-decisions.md       # 设计冲突与实现统一规则
│   ├── docs/computer-use-regression.md # Computer Use 回归用例与执行记录
│   ├── src/main/                      # Electron 主进程
│   ├── src/preload/                   # contextBridge 安全桥
│   ├── src/renderer/src/              # React Renderer
│   ├── src/shared/                    # 跨进程类型、常量和纯函数
│   └── src/test/                      # 测试环境与夹具
├── AGENTS.md                          # Agent/贡献者开发规范
├── LICENSE                            # MIT 许可证
└── README.md                          # 项目入口文档
```

产品与实现资料的优先级：

1. `ide-workdir-browser-code/docs/PRD.md`
2. `ide-workdir-browser-code/docs/design-decisions.md`
3. `ide-workdir-browser-code/docs/computer-use-regression.md`
4. `ide-workdir-browser-design/ide-workdir-browser.op`
5. `ide-workdir-browser-design/pages/` 中的 HTML 原型

设计稿与 PRD 冲突时，不直接猜测或照搬旧原型，应按设计决策文档中的统一规则实现。

## 技术栈

- Electron 39、electron-vite、electron-builder
- React 19、TypeScript、Zustand
- Sass、Lucide React、react-markdown
- electron-store
- Vitest、Testing Library、jsdom
- ESLint、Prettier

## 环境要求

- macOS 13 Ventura 或更高版本
- Node.js 22 或更高版本
- npm 11 或兼容版本

本项目只支持 macOS，不维护 Windows 或 Linux 打包入口。

## 本地开发

所有应用命令都在代码目录执行：

```bash
cd ide-workdir-browser-code
npm install
npm run dev
```

生产预览：

```bash
npm run build
npm start
```

## 质量检查

```bash
cd ide-workdir-browser-code

# Prettier、ESLint、TypeScript 和全部单元测试
npm run check

# 与 Git pre-commit hook 相同的提交前检查
npm run precommit

# 监听模式
npm run test:watch

# 覆盖率
npm run test:coverage
```

`npm run check` 会执行隐私扫描、版本一致性检查、Prettier、ESLint、TypeScript 和覆盖率测试。
根目录已配置 `.husky/pre-commit`，每次提交前会进入代码目录执行 `npm run precommit`。如需重新
安装 hook，可在代码目录执行 `npm run prepare`。

版本号由 `package.json`、lockfile、共享版本常量和版本相关文档共同约束：

```bash
# 检查版本标记是否一致
npm run version:check

# 预览下一个 patch 版本，不写文件
npm run version:bump -- patch --dry-run

# 实际递增版本，可用 major、minor、patch、prerelease 或显式 x.y.z
npm run version:bump -- patch
```

`npm run build` 会先执行完整的 `npm run check`，检查失败时不生成生产构建。

GitHub Actions 包含：

- `CI`：Pull Request 和 `main` 推送时执行完整检查与生产 Bundle 构建。
- `Release`：手动选择 patch、minor、major 或 prerelease，默认 dry-run；验证通过后可生成双架构
  DMG、SHA-256 校验和、版本提交、Tag 和 GitHub Release。

Release dry-run 不修改 `main`，也不创建 Tag 或 Release。正式发布使用 GitHub Actions Bot，
并拒绝覆盖已有版本。

桌面端真实用户回归使用正向、边缘和负向用例库：

- [Computer Use 回归测试归档](ide-workdir-browser-code/docs/computer-use-regression.md)
- Electron 运行时、窗口、原生快捷键、响应式布局、设置持久化或主要用户流程变更时，应执行
  受影响用例并追加执行记录。

## macOS 构建

生成未打包的 `.app` 目录：

```bash
cd ide-workdir-browser-code
npm run build:unpack
```

生成 DMG：

```bash
npm run build:mac
```

典型本地产物：

```text
ide-workdir-browser-code/dist/mac-arm64/IDE Workdir Browser.app
```

当前自动发布的 DMG 未配置 Developer ID Application 签名和 notarization。使用前应校验
`SHA256SUMS`；正式分发和自动安装更新前必须补充签名与公证。

## 软件更新

应用在“设置 > 关于”提供“检查更新”。只有用户点击后，Main Process 才匿名读取公开仓库的最新
稳定版 GitHub Release；不会上传工作目录、文件内容、应用设置、设备标识或凭据。

发现新版后，应用通过系统浏览器打开经过仓库 allowlist 校验的 Release 页面。当前不自动下载或
安装更新，draft 和 prerelease 也不会进入稳定版检查结果。

## 架构

```text
Renderer (React)
    │  window.workdir
    ▼
Preload (contextBridge)
    │  typed IPC
    ▼
Main Process
    ├── WindowService
    ├── MenuService
    ├── SettingsService
    ├── UpdateService
    ├── FileSystemService
    └── PathPolicy
```

关键边界：

- Renderer 禁止直接访问 Node.js 和文件系统。
- `contextIsolation`、sandbox 开启，`nodeIntegration` 关闭。
- IPC 契约集中定义在 `src/shared/contracts.ts`。
- 文件读取、搜索、预览和外部打开统一由主进程执行。
- 用户请求的入口路径必须位于已配置的 Agent 工作目录内。
- 工作目录内的符号链接入口允许访问其目标，即使目标位于工作目录外。
- 搜索默认不递归符号链接目录；仅在开启“跟随符号链接”后递归。
- 应用只读取和展示文件内容，不执行文件内容。
- Renderer 不直接联网；更新检查通过最小类型化 IPC 交给 Main Process。

## UI 基线

- 标准窗口：`1440 × 960`
- 最小窗口：`900 × 540`
- 标题栏和工具栏：`44px`
- 展开侧边栏：`220px`
- 折叠侧边栏：`48px`
- Inspector：`256px`
- 内容区最小宽度：`256px`
- 面板动画：`180ms cubic-bezier(0.2, 0, 0, 1)`
- Inspector 收起后主内容区不得出现无意义横向滚动条
- 图标视图文件名：最多两行，溢出显示省略号

更完整的设计取舍见
[ide-workdir-browser-code/docs/design-decisions.md](ide-workdir-browser-code/docs/design-decisions.md)。
产品状态与验收标准见 [PRD](ide-workdir-browser-code/docs/PRD.md)。

## 贡献约定

修改代码前请先阅读 [AGENTS.md](AGENTS.md)。所有行为变更应：

1. 遵守主进程、preload、Renderer 的边界。
2. 为新增或修改的模块补充测试。
3. 运行 `npm run check`。
4. 提交前确认 `.husky/pre-commit` 或 `npm run precommit` 通过。
5. 涉及构建或 Electron 运行时行为时，额外运行 `npm run build` 和应用冒烟测试。
6. 涉及桌面用户流程时，更新并执行相应 Computer Use 正向、边缘和负向用例。
7. 修改任意文档时，检查 PRD、设计决策、回归归档、两个 README 和 `AGENTS.md` 是否需要同步。

## 许可证

本项目基于 [MIT License](LICENSE) 开源。
