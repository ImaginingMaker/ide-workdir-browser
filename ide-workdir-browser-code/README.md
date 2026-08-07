# IDE Workdir Browser

仅支持 macOS 的 Electron 工作目录浏览器，面向 Codex、Claude Code、Cursor、Zed、Trae、
VS Code、Gemini CLI、OpenCode、Windsurf 和 Kiro。

## 技术栈

- Electron 39 + electron-vite
- React 19 + TypeScript
- Zustand
- Sass
- electron-store
- Vitest + Testing Library
- ESLint + Prettier

## 开发

要求 Node.js 22+，运行平台必须是 macOS 13+。

```bash
npm install
npm run dev
```

应用不要求完全磁盘访问权限。访问桌面、文稿等受保护文件夹时，由 macOS 按目录提示用户授权；
拒绝授权只影响对应 Agent，其他工作区仍可正常使用。

质量检查和生产构建：

```bash
npm run privacy:check
npm run version:check
npm run precommit
npm run check
npm run build
npm run build:mac
```

`npm run precommit` 与根目录 `.husky/pre-commit` 保持一致；Git hook 会在每次提交前执行隐私扫描、
版本一致性检查、Prettier、ESLint、TypeScript 和覆盖率测试。`npm run prepare` 会把当前 Git
仓库的 hook 路径指向根目录 `.husky`。

版本号递增使用：

```bash
npm run version:bump -- patch
npm run version:bump -- minor
npm run version:bump -- major
npm run version:bump -- prerelease --preid beta
npm run version:bump -- 0.2.0
```

脚本会同步 `package.json`、`package-lock.json`、共享版本常量、PRD、Computer Use 回归归档和根
README。使用 `--dry-run` 可以预览结果而不写文件。

## GitHub Actions 发布

仓库提供两个工作流：

- `CI` 在 Pull Request 和 `main` 推送时执行 `npm run check` 与生产 Bundle 构建。
- `Release` 通过 `workflow_dispatch` 手动选择 patch、minor、major 或 prerelease，并自动执行
  版本同步、质量门禁、双架构 DMG、`SHA256SUMS`、版本提交、Tag 和 GitHub Release。

发布工作流默认 `dry_run=true`。dry-run 会上传 Actions Artifact，但不会提交、打 Tag 或创建
Release；正式发布使用 GitHub Actions Bot 和原子 push，不需要个人 PAT。

Tag 和 Release 标题使用 `v<semver>`，预发布版本使用 `v<semver>-<preid>.<n>`。每个 Release
固定包含 `arm64`/`x64` 两个 DMG 与 `SHA256SUMS`，正文按“下载、安装、完整性校验、自动生成变更”
的格式输出。完整示例见[根 README](../README.md#版本与发布格式)。

构建后的 `out/update-config.json` 由 `postbuild` 生成。GitHub Actions 使用
`APP_UPDATE_REPOSITORY=${GITHUB_REPOSITORY}` 注入公开仓库坐标；未配置时应用明确禁用更新源，
不会从本地 Git remote 推测账号。

根 README 使用的模拟界面图维护在 [docs/screenshots](docs/screenshots/README.md)，必须从当前
OpenPencil 高保真设计稿导出并逐张执行隐私检查。

桌面端回归使用 TRAE Computer Use，并同时覆盖正向、边缘和负向场景。用例、执行记录和已知缺陷
统一维护在 [docs/computer-use-regression.md](docs/computer-use-regression.md)。

## 目录结构

```text
.
├── docs/                    # PRD、设计决策和 Computer Use 回归归档
└── src/
    ├── main/
    │   ├── ipc/             # 类型化 IPC 注册
    │   └── services/        # 窗口、设置、路径策略、文件系统
    ├── preload/             # contextBridge 最小 API
    ├── renderer/src/
    │   ├── components/ui/   # 通用基础组件
    │   ├── features/        # app-shell/browser/preview/search/settings
    │   ├── store/           # Agent 独立工作区状态
    │   ├── styles/          # Sass token 和功能样式
    │   └── utils/           # 无副作用工具
    ├── shared/              # 跨进程共享契约和默认值
    └── test/                # 测试夹具与环境
```

## 安全边界

- Renderer 不启用 Node.js，使用 `contextIsolation` 和沙箱。
- 所有文件访问都在主进程执行。
- 相对路径和绝对路径的访问入口必须位于 Agent 配置根目录内；根目录任意层级中的符号链接允许指向并访问根目录外的文件或文件夹。
- 应用不执行文件内容。
- 外部打开和 Finder 定位同样经过路径边界校验。
- Renderer 不直接联网；用户在关于页触发更新检查后，由 Main Process 匿名读取最新稳定版
  GitHub Release，并只返回经过仓库 URL allowlist 校验的结果。

## 当前里程碑

已实现应用基础架构、10 个默认 Agent、真实目录读取、图标/列表/分栏视图、Agent
独立导航与文档标签状态、搜索、文本/代码高亮、Markdown GFM 与 Mermaid、图片/二进制预览、
文件夹统计、Finder 拖入复制、跨 Agent 复制/剪切/粘贴、冲突处理、进程内撤销、浅深色主题、
响应式布局和独立设置工作台。文件区还提供 SQLite、JSON/JSONL、Markdown、配置等语义图标，
以及线框、实心、双色三套可持久化文件夹图标预设。单选项目支持经二次确认移到 macOS
废纸篓，并由主进程执行路径边界和符号链接保护；关于页支持用户主动检查最新稳定版本。

当前仍未开放文件多选、真正的目录分页、搜索范围切换、自定义 Agent 管理、应用内废纸篓恢复、
批量废纸篓和永久删除。撤销记录与浏览状态不跨应用重启持久化。当前自动发布的 DMG 未签名且
未公证，只提供 Release 页面跳转和手动下载，不支持自动安装更新。

当前产品基线见 [docs/PRD.md](docs/PRD.md)，设计纠正记录见
[docs/design-decisions.md](docs/design-decisions.md)，桌面回归基线见
[docs/computer-use-regression.md](docs/computer-use-regression.md)。

当前自动化基线为 62 个测试文件、338 项测试，覆盖率通过语句/行 `90%`、分支/函数 `80%`
门禁；具体百分比以后续最新 `npm run check` 输出为准。
