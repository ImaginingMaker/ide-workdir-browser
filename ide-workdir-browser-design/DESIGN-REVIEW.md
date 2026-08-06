# IDE Workdir Browser — 设计一致性 Review

> 当前设计稿已按最新 React/Sass 实现重塑。产品范围、功能状态和验收标准以
> [产品 PRD](../ide-workdir-browser-code/docs/PRD.md) 为准，桌面真实行为以
> [Computer Use 回归归档](../ide-workdir-browser-code/docs/computer-use-regression.md) 为准。

## 审查范围

- `ide-workdir-browser.op`：7 个分类画布，由 43 个最新源状态合并生成。
- `scripts/generate.mjs`：从真实应用资产和当前 UI 结构生成设计稿，并将 SVG 图标栅格化为 PNG
  data URL。
- `tokens.json`：对齐 `src/renderer/src/styles/_tokens.scss` 的核心 token。
- 参考实现：`Titlebar`、`Sidebar`、`Toolbar`、`DocumentTabs`、`FileBrowser`、`SearchWorkspace`、
  `Inspector`、`SettingsWorkspace` 和相关 Sass。

旧 `pages/` HTML、历史预览图和 `ide-workdir-browser.before-agent-space.op` 不再作为当前 UI
审查依据。

## 结论

本轮重塑后，OpenPencil 主设计稿已与当前软件 UI/UX 基线对齐：窗口层级、面板尺寸、10 个默认
Agent、三种浏览视图、文档标签、搜索工作台、文件操作弹窗、设置工作台、文件类型图标和文件夹
图标预设均已有对应状态稿。

当前未发现需要阻断实现的设计冲突。后续若真实 UI 继续变化，应优先修改生成器并重新生成 `.op`，
避免手工编辑后的设计稿再次偏离实现。

## 2026-08-06 视觉复核

本轮使用打包后的 `com.ideworkdir.browser` 与 OpenPencil A01、B17、E37 逐屏对照，修正了三处
偏差：

- 应用标准窗搜索框改为按工具栏容器宽度计算，恢复到 A01 约 `415px` 的比例，并保留
  `360–560px` 响应式边界。
- 展开侧边栏的 Agent 品牌图标改为 `24px` 图形加 `28px` 容器；折叠态保持 `20px` 图形加
  `24px` 容器。
- B17 将 Agent 的启用状态与路径可用状态分离；Windsurf、Kiro 默认开关保持开启，同时显示
  “路径不可用”。

`scripts/generate.mjs` 已重新生成 43 个源状态，`scripts/consolidate.mjs` 已重新合并 7 个评审
画布。当时的标准窗、设置页和 `560 × 420` 最小窗已通过 Computer Use 抽查；该最小窗口基线
现已被后续 `900 × 540` 约束取代。

## 2026-08-06 最小窗口修正

旧 `560 × 420` 最小宽度小于展开侧边栏、主内容最小宽度和 Inspector 的总和，用户手动恢复左右
面板后会挤压工具栏、路径栏和状态栏。`760px` 仍会裁剪工具栏左侧操作，当前最小窗口最终提升为
`900 × 540`，并在 `150%` UI 缩放下验证无溢出；E37 状态稿已同步重建。

## 已对齐项

| 类别       | 对齐结果                                                                                                                        |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 窗口与布局 | 标准 `1440 × 960`、最小 `900 × 540`、标题栏/工具栏 `44px`、侧栏 `220/48px`、Inspector `256px`、Pathbar `30px`、Statusbar `24px` |
| Agent 范围 | 固定 10 个默认 Agent，顺序与 `DEFAULT_AGENTS` 一致，Windsurf/Kiro 可呈现路径不可用状态                                          |
| 浏览工作台 | 图标、列表、分栏视图均按真实组件结构建模，长文件名、隐藏文件、分页截断和 Agent 隔离有状态稿                                     |
| 文件图标   | 设计系统页覆盖 `file-icons.ts` 中的语义类型，主界面、搜索和 Inspector 使用同一映射                                              |
| 预览体验   | 代码、Markdown、图片、大文件和不支持预览状态与 `DocumentPreview` 结构一致                                                       |
| 搜索       | 使用主内容区搜索工作台，范围 chip 默认表现“当前目录”，未开放的全局范围不在设计中伪装为可用                                      |
| 文件操作   | Finder 拖入覆盖完整文件舞台；确认弹窗使用完整遮罩并居中；右键菜单含真实分隔线和禁用态；操作消息使用右下角 notification stack    |
| 设置       | 设置页为独立工作台，不显示浏览工具栏/标签/路径栏/状态栏；支持 IDE 管理、路径编辑、外观、高级、重置和关于                        |
| 响应式     | 窄窗侧栏折叠、Inspector 关闭、最小窗口和暗色状态均已覆盖                                                                        |

## 残余风险

- OpenPencil 中的 `icon_font` 渲染依赖 Lucide 名称解析；生成器已使用当前应用语义名称，但仍需在
  OpenPencil 视觉面板中抽查关键功能图标是否正确显示。
- OpenPencil lint 仍会把同色结构容器、工具栏中的异尺寸控件和禁用态浅色文字报告为启发式
  warning/info；7 个画布执行 refine 均为 0 项自动修复，当前未发现结构错误。
- 旧 HTML 原型未重写，仍可能包含过期 DOM 映射和 6 Agent/自定义 Agent 口径；交付时应明确只以
  `.op` 和 PRD/实现为准。
- 本次是设计资产变更，不涉及 Electron 运行时；未新增 Computer Use 执行记录。真实应用行为仍沿用
  最近一次回归结果。

## 后续验收建议

1. 在 OpenPencil 中打开 `ide-workdir-browser.op`，逐页检查 7 个分类画布是否完整显示。
2. 随真实 UI 变更同步更新 `scripts/generate.mjs`、`tokens.json` 和设计文档。
3. 若下一步调整 React UI，再按 `AGENTS.md` 要求执行 `npm run check`、必要的生产构建和
   Computer Use 回归。
