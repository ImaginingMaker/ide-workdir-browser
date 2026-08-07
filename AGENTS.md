# IDE Workdir Browser 开发规范

本文件适用于仓库内所有自动化 Agent、代码助手和贡献者。除非用户明确要求，否则所有代码修改
都应遵循以下约束。

## 1. 工作目录

仓库根目录：

```text
.
```

应用源码目录：

```text
./ide-workdir-browser-code
```

运行 npm、TypeScript、ESLint、Vitest、electron-vite 和 electron-builder 命令时，工作目录必须是
`ide-workdir-browser-code`。

## 2. 产品与设计真源

发生需求或设计冲突时按以下优先级判断：

1. `ide-workdir-browser-code/docs/PRD.md`
2. `ide-workdir-browser-code/docs/design-decisions.md`
3. `ide-workdir-browser-code/docs/computer-use-regression.md`
4. `ide-workdir-browser-design/ide-workdir-browser.op`
5. `ide-workdir-browser-design/pages/`
6. 预览图片和历史 HTML

不要把旧 HTML 原型中的 Tailwind、硬编码颜色、失效 `data-dom-id` 或过期 Agent 范围复制到 React
实现中。

产品范围固定为 10 个默认 Agent：

- Codex
- Claude Code
- Cursor
- Zed
- Trae
- VS Code
- Gemini CLI
- OpenCode
- Windsurf
- Kiro

## 3. 技术约束

- 仅支持 macOS 13+。
- Node.js 最低版本为 22。
- UI 使用 React + TypeScript。
- 状态管理使用 Zustand。
- 样式使用 Sass，不引入 Tailwind 或 CSS-in-JS。
- 图标优先使用 Lucide React。
- 设置持久化使用 electron-store。
- 测试使用 Vitest 和 Testing Library。
- 格式化和静态检查使用 Prettier、ESLint、TypeScript。

不要添加 Windows/Linux 打包脚本或平台兼容分支，除非用户明确扩展产品范围。

## 4. 进程边界

### Main Process

路径：`ide-workdir-browser-code/src/main/`

负责：

- BrowserWindow 和 macOS 菜单
- 文件系统访问
- 搜索和预览
- 稳定版更新检查
- 设置持久化
- Finder、系统剪贴板等原生能力
- IPC handler 注册

主进程能力应拆分到 `services/`，避免在 `main/index.ts` 中堆积业务逻辑。

### Preload

路径：`ide-workdir-browser-code/src/preload/`

要求：

- 只暴露最小、类型化 API。
- 使用 `contextBridge`。
- 不暴露原始 `ipcRenderer`。
- 新增 API 时同步更新 `WorkdirApi`、IPC 常量、主进程 handler 和测试。

### Renderer

路径：`ide-workdir-browser-code/src/renderer/src/`

要求：

- 不导入 `node:*`、`electron` 或直接访问文件系统。
- 系统能力全部通过 `window.workdir` 调用。
- 功能组件按 `features/` 归属，不把业务逻辑集中到 `App.tsx`。
- 可复用基础组件放入 `components/ui/`。
- 无副作用纯函数放入 `utils/` 或 `src/shared/`。

### Shared

路径：`ide-workdir-browser-code/src/shared/`

仅放置：

- 跨进程类型和契约
- IPC channel/event 常量
- 默认配置
- 不依赖 Electron、DOM 或 Node.js 的纯函数

## 5. Electron 安全基线

以下配置不得弱化：

```typescript
contextIsolation: true;
nodeIntegration: false;
sandbox: true;
```

文件系统规则：

- Renderer 提供的路径不可信，必须在主进程校验。
- 用户访问入口必须位于对应 Agent 配置的工作目录树内。
- 工作目录内的所有子入口均允许访问。
- 工作目录内的符号链接可以指向目录外，用户可通过该入口浏览和预览目标。
- 搜索默认不递归符号链接目录。
- 开启 `followSymlinks` 后才允许搜索递归符号链接，并应防止循环和超时。
- Finder 定位、外部打开等操作同样经过入口路径校验。
- 不执行、不解释、不动态导入用户文件内容。

网络更新规则：

- Renderer 不直接发起更新网络请求，只通过类型化 IPC 调用 Main Process。
- 更新检查只能由用户主动触发，不在应用启动时静默请求。
- 请求固定公开仓库的 GitHub 稳定版 Release，不发送工作目录、文件内容、设置、设备标识或凭据。
- Release 外链必须校验为 HTTPS、`github.com` 且属于构建时配置的同一仓库。
- 未完成 Developer ID 签名和 notarization 前，不启用自动下载或安装更新。

涉及写操作时，必须先实现完整的影响范围、二次确认、冲突策略和恢复方案。不要为了“先可用”
而绕过这些约束。

隐私与数据脱敏规则：

- 代码、测试、文档、回归记录、截图说明和最终回复不得暴露个人信息，包括但不限于真实姓名、姓名
  拼音、邮箱、账号、设备名、内部域名、token、cookie、密钥和带有真实用户名的绝对路径。
- 需要展示路径时，优先使用相对路径、`~`、`<workspace>`、`<user>`、`/tmp/...` 等脱敏形式；
  不保留可识别个人身份的本机绝对路径。
- 测试夹具、示例数据、截图说明和日志摘要必须使用虚构或脱敏数据，不得从用户真实工作目录、配置、
  会话、私有文件或命令输出中复制可识别内容。
- Computer Use、终端日志和工具输出进入文档或回复前，必须筛除或改写敏感字段；必须报告证据时
  只保留完成任务所需的最小信息。
- 禁止把用户姓名拼音、真实账号、组织内部标识等写入代码标识符、分支名、提交信息、文档示例或
  测试数据。

## 6. 状态管理

每个 Agent 的工作区状态必须相互隔离。至少包含：

- 当前路径
- 前进/后退历史
- 打开的标签
- 搜索关键词和范围
- 选中项
- 视图模式
- Inspector 状态

切换 Agent 时不得把前一个 Agent 的目录、选择或搜索结果泄漏到新工作区。

全局 UI 状态与 Agent 状态分开：

- 侧边栏收起状态属于全局 UI 状态。
- Inspector 是否显示属于每个 Agent 的工作区状态。
- 设置页分类属于全局设置工作台状态。

## 7. UI 和响应式规范

硬性尺寸：

| 项目           | 规范                                                       |
| -------------- | ---------------------------------------------------------- |
| 标准窗口       | `1440 × 960`                                               |
| 最小窗口       | `900 × 540`                                                |
| 标题栏         | `44px`                                                     |
| 工具栏         | `44px`                                                     |
| 侧边栏         | 展开 `220px`，折叠 `48px`                                  |
| Inspector      | `256px`                                                    |
| 内容区最小宽度 | `256px`                                                    |
| 状态栏         | `24px`                                                     |
| 面包屑最大宽度 | `200px`                                                    |
| 搜索框         | 标准 `360–560px`，中窗 `300px`，窄窗 `220px`，最小 `160px` |

布局要求：

- 工具栏必须裁剪溢出，最小窗口不能出现不可恢复截断。
- 窄窗首次显示时侧边栏默认折叠、Inspector 默认关闭，但用户可以手动恢复。
- 左右面板收缩使用统一动画：
  `180ms cubic-bezier(0.2, 0, 0, 1)`。
- 不使用 `display: none` 代替面板收缩动画；面板应保持挂载并过渡宽度、透明度和位移。
- Inspector 收起后不得在主内容区留下残余布局占位或无意义横向滚动条。
- 折叠侧边栏中的顶部按钮、Agent 图标和设置图标必须共享同一水平中心线。
- 图标视图文件名最多两行，长连续字符和下划线可断行，超出显示省略号。
- 列表视图文件名单行省略。
- Finder 风格分栏视图单击目录在右侧增加列，每列独立滚动，选择上层目录时裁剪旧的后续列。
- 搜索结果在主内容区显示，不使用小型弹层承载大量结果。
- 设置页不得显示浏览器工具栏。

主题和颜色：

- 使用 Sass 语义 token，不在组件中散落主题色。
- 品牌强调只使用 `--primary`。
- 绿、黄、红仅用于成功、警告和错误状态。
- 同时支持浅色、深色和自动主题。

可访问性：

- 图标按钮必须提供 `aria-label`。
- 键盘焦点必须可见。
- 视图切换使用 `role="tablist"`、`role="tab"` 和 `aria-selected`。
- 状态不能只依赖颜色，必须同时提供文字。
- 隐藏或折叠区域应正确设置 `aria-hidden`、`inert` 或等效语义。

## 8. 快捷键

快捷键定义集中在：

```text
src/shared/shortcuts.ts
```

实现规则：

- macOS 原生 accelerator 在 `MenuService` 注册。
- Renderer 通过类型化 app command 统一执行命令。
- 不要只在局部组件监听快捷键。
- 新增快捷键时同步更新原生菜单、状态栏速查卡、命令类型和测试。
- `⌘R` 等 Electron/Chromium 可能拦截的组合必须由原生菜单接管。

## 9. 代码风格

- 默认使用 ASCII；中文 UI 文案和文档可使用中文。
- TypeScript 禁止无必要的 `any`、非空断言和类型绕过。
- 函数和组件保持单一职责。
- 优先复用现有服务、store action、共享类型和 UI 组件。
- 仅在代码意图不明显时添加简短注释。
- 不做与当前任务无关的重构。
- 不手工编辑 `out/`、`dist/`、`.eslintcache` 或 `node_modules/`。
- 不提交 `.DS_Store` 等系统文件。

Sass：

- token 定义放在 `styles/_tokens.scss`。
- 应用壳样式放在 `styles/_shell.scss`。
- 浏览和预览样式放在 `styles/_browser.scss`。
- 设置样式放在 `styles/_settings.scss`。
- 保持选择器归属清晰，避免跨文件覆盖同一组件。

## 10. 测试要求

行为修改必须补充或更新测试。

测试位置：

- 主进程服务：与实现文件同目录的 `*.test.ts`
- React 组件：与组件同目录的 `*.test.tsx`
- Shared 纯函数：`src/shared/*.test.ts`
- 公共夹具：`src/test/fixtures.ts`

覆盖重点：

- 路径边界和符号链接语义
- IPC channel 注册
- Agent 状态隔离
- 导航历史
- 快捷键映射和命令执行
- 侧边栏、Inspector 收缩状态
- 图标/列表/分栏视图交互
- 搜索、预览和设置行为
- 版本递增、更新源生成、稳定版检查和 Release URL allowlist
- 错误、空态和超限状态
- 仓库隐私扫描，确保维护范围内的代码、文档、设计资产和测试夹具不包含个人路径、内部域名或
  凭据形态数据

禁止通过删除断言、跳过测试或弱化类型来让检查通过。

### Computer Use 回归

桌面端真实用户回归统一维护在：

```text
ide-workdir-browser-code/docs/computer-use-regression.md
```

执行规则：

- 用例必须同时覆盖正向、边缘和负向场景，并使用稳定编号。
- Electron 运行时、窗口、菜单、原生快捷键、响应式布局、设置持久化或主要用户流程变更时，
  必须更新并执行受影响的 Computer Use 用例。
- 每次执行必须追加日期、构建来源、Bundle ID、窗口尺寸、通过、失败、阻塞、外部限制和清理
  结果，不覆盖历史记录。
- 发现缺陷时保留失败用例并关联缺陷；不得降低预期、删除用例或把工具故障误报为产品缺陷。
- 同一 Bundle ID 只保留一个被测实例；开发实例和生产预览冲突时先停止本次启动的实例，不得
  关闭用户原本运行的进程。
- 写操作只能使用隔离临时夹具，并遵守 Computer Use 动作时确认策略；默认优先验证取消路径。
- Computer Use 不能替代 Vitest、类型检查、Lint、覆盖率和生产构建。

## 11. 文档一致性

文档变更必须执行配套同步检查，不能只修改当前被点名的文件。

核心文档集合：

```text
AGENTS.md
README.md
ide-workdir-browser-code/README.md
ide-workdir-browser-code/docs/PRD.md
ide-workdir-browser-code/docs/design-decisions.md
ide-workdir-browser-code/docs/computer-use-regression.md
ide-workdir-browser-design/README.md
ide-workdir-browser-design/DESIGN-REVIEW.md
ide-workdir-browser-design/UX-AUDIT.md
ide-workdir-browser-code/src/renderer/src/assets/agent-icons/README.md
```

任何文档新增、删除或修改时，必须逐项判断并同步：

- 产品能力、状态和验收口径是否需要更新 PRD。
- 设计取舍、交互和视觉规则是否需要更新设计决策。
- 用户流程、边缘场景、负向保护或已知缺陷是否需要更新 Computer Use 回归用例。
- 功能列表、限制、目录结构、命令和链接是否需要更新两个 README。
- 开发流程、质量门禁或完成标准是否需要更新 `AGENTS.md`。
- 设计范围和历史状态说明是否需要更新设计目录中的 README、Review 或 Audit。
- 第三方图标资产及来源变化时，是否需要更新 Agent 图标资产 README 和许可证说明。
- 文档路径、相对链接、版本号、日期、测试数量和“已实现/受限/未开放”状态是否一致。

允许某个文档无需改动，但交付前必须完成检查。禁止保留指向不存在文件的链接，禁止让 README
宣称 PRD 标记为“未开放”的能力已经完成，也禁止用一次性的测试数量覆盖“以最新命令输出为准”
的说明。

## 12. 常用命令

```bash
cd ide-workdir-browser-code

npm install
npm run dev
npm run format
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:coverage
npm run privacy:check
npm run generate:update-config
npm run version:check
npm run version:bump -- patch --dry-run
npm run precommit
npm run check
npm run build
npm run build:unpack
npm run build:mac
```

## 13. 完成标准

普通代码修改完成前：

1. 运行 `npm run format`。
2. 运行 `npm run check`，其中包含隐私扫描、版本一致性检查、格式、Lint、类型和覆盖率测试。
3. 如修改版本号，必须通过 `npm run version:bump -- <major|minor|patch|prerelease|x.y.z>` 递增，
   不手工只改单个文件。
4. 提交前确认 `.husky/pre-commit` 或 `npm run precommit` 通过。
5. 检查核心文档集合是否需要同步。
6. 确认没有遗留所需的 Electron/终端进程。

涉及构建、IPC、preload、菜单、窗口或 Electron 运行时行为时，还必须：

1. 运行 `npm run build`。
2. 启动生产预览或打包后的 `.app` 做冒烟验证。
3. 更新并执行受影响的 Computer Use 正向、边缘和负向用例，追加执行记录。

涉及打包配置时，还必须：

1. 运行 `npm run build:unpack` 或 `npm run build:mac`。
2. 说明代码签名和 notarization 状态。

涉及 `.github/workflows/`、版本发布或 Release 产物时，还必须：

1. 使用 GitHub Actions Bot 和最小 `GITHUB_TOKEN` 权限，不写入个人 PAT。
2. 先执行 Release workflow dry-run，确认质量门禁、双架构 DMG、`SHA256SUMS` 和 Artifact。
3. dry-run 不得修改 `main`、创建 Tag 或 Release；已有 Release 不得静默覆盖。
4. 正式发布必须原子推送版本提交与 Tag，并明确报告签名和 notarization 状态。

最终说明应简洁列出：

- 修改内容
- 验证结果
- Computer Use 执行范围和回归归档位置
- 已检查并同步或确认无需修改的配套文档
- 未完成或受外部环境限制的事项
