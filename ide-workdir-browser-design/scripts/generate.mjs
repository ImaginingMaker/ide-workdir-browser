import { execFileSync } from "node:child_process";
import { readFileSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const maxBuffer = 96 * 1024 * 1024;
const runRaw = (args) =>
  execFileSync("op", args, { encoding: "utf8", maxBuffer });
const runJson = (args) => JSON.parse(runRaw(args));

const assetData = (url, mime = "svg+xml") =>
  `data:image/${mime};base64,${readFileSync(url).toString("base64")}`;

const rasterTemp = mkdtempSync(join(tmpdir(), "workdir-design-raster-"));
const rasterizedSvgData = (url, name, size = 128) => {
  const output = join(rasterTemp, `${name}.png`);
  execFileSync(
    "sips",
    [
      "-s",
      "format",
      "png",
      "-Z",
      String(size),
      fileURLToPath(url),
      "--out",
      output,
    ],
    { stdio: "ignore", maxBuffer },
  );
  return assetData(output, "png");
};

const appIcon = rasterizedSvgData(
  new URL(
    "../../ide-workdir-browser-code/src/renderer/src/assets/app-icon.svg",
    import.meta.url,
  ),
  "app-icon",
  256,
);

const agents = [
  {
    id: "codex",
    name: "Codex",
    workdir: "~/.codex",
    status: "connected",
    icon: "box",
  },
  {
    id: "claude",
    name: "Claude Code",
    workdir: "~/.claude",
    status: "connected",
    icon: "message-square",
    asset: "claude-code.svg",
  },
  {
    id: "cursor",
    name: "Cursor",
    workdir: "~/.cursor",
    status: "connected",
    icon: "sparkles",
  },
  {
    id: "zed",
    name: "Zed",
    workdir: "~/.config/zed",
    status: "connected",
    icon: "bolt",
  },
  {
    id: "trae",
    name: "Trae",
    workdir: "~/.trae-cn",
    status: "connected",
    icon: "zap",
  },
  {
    id: "vscode",
    name: "VS Code",
    workdir: "~/.copilot",
    status: "connected",
    icon: "braces",
  },
  {
    id: "gemini",
    name: "Gemini CLI",
    workdir: "~/.gemini",
    status: "connected",
    icon: "sparkles",
    asset: "gemini-cli.svg",
  },
  {
    id: "opencode",
    name: "OpenCode",
    workdir: "~/.config/opencode",
    status: "connected",
    icon: "code",
  },
  {
    id: "windsurf",
    name: "Windsurf",
    workdir: "~/.codeium/windsurf",
    status: "unavailable",
    icon: "zap",
  },
  {
    id: "kiro",
    name: "Kiro",
    workdir: "~/.kiro",
    status: "unavailable",
    icon: "box",
  },
].map((agent) => ({
  ...agent,
  enabled: true,
  asset: agent.asset ?? `${agent.id}.svg`,
}));

const agentIcons = Object.fromEntries(
  agents.map((agent) => [
    agent.id,
    rasterizedSvgData(
      new URL(
        `../../ide-workdir-browser-code/src/renderer/src/assets/agent-icons/${agent.asset}`,
        import.meta.url,
      ),
      agent.id,
    ),
  ]),
);

const fontSans = "-apple-system, BlinkMacSystemFont, SF Pro Text, Noto Sans SC";
const fontMono = "SF Mono, JetBrains Mono, Menlo";

const light = {
  background: "#FFFFFF",
  foreground: "#1D1D1F",
  canvas: "#E9EBEF",
  sidebar: "rgba(238,241,245,0.92)",
  surface: "#F7F7F8",
  surfaceHover: "#ECECF0",
  control: "#FFFFFF",
  primary: "#007AFF",
  primarySoft: "rgba(0,122,255,0.12)",
  onPrimary: "#FFFFFF",
  secondary: "#66666C",
  disabled: "#A1A1A6",
  separator: "#D9D9DE",
  codeBg: "#F6F8FA",
  codeFg: "#24292F",
  success: "#248A3D",
  warning: "#A05A00",
  error: "#D70015",
  destructive: "#D70015",
  file: {
    archive: "#865B89",
    binary: "#707078",
    code: "#4776C5",
    config: "#6B638C",
    database: "#7257B8",
    document: "#3F6DA8",
    file: "#66666C",
    folder: "#2F8FD7",
    image: "#3B789E",
    json: "#7D55B3",
    key: "#71639B",
    markdown: "#356FA8",
    table: "#34758A",
    terminal: "#53677C",
    text: "#4F73A1",
  },
};

const dark = {
  background: "#232325",
  foreground: "#F5F5F7",
  canvas: "#111214",
  sidebar: "rgba(41,43,47,0.94)",
  surface: "#303034",
  surfaceHover: "#3A3A3F",
  control: "#232325",
  primary: "#0A84FF",
  primarySoft: "rgba(10,132,255,0.18)",
  onPrimary: "#FFFFFF",
  secondary: "#B0B0B6",
  disabled: "#73737A",
  separator: "#414146",
  codeBg: "#1F2329",
  codeFg: "#E6EDF3",
  success: "#30D158",
  warning: "#FFD60A",
  error: "#FF453A",
  destructive: "#FF453A",
  file: {
    archive: "#CE93D0",
    binary: "#A8A8B0",
    code: "#82AAFF",
    config: "#AAA0CF",
    database: "#B39DDB",
    document: "#79A9DF",
    file: "#B0B0B6",
    folder: "#64B5F6",
    image: "#77A9C8",
    json: "#BD93DF",
    key: "#AFA1D4",
    markdown: "#75A9D6",
    table: "#71AABD",
    terminal: "#91A6BA",
    text: "#8AADD2",
  },
};

const fileSamples = [
  {
    name: "src",
    kind: "folder",
    size: "—",
    type: "文件夹",
    modified: "今天 10:20",
  },
  {
    name: "renderer",
    kind: "folder",
    size: "—",
    type: "文件夹",
    modified: "今天 10:18",
  },
  {
    name: "assets",
    kind: "folder",
    size: "—",
    type: "文件夹",
    modified: "昨天 18:44",
  },
  {
    name: "AGENTS.md",
    kind: "markdown",
    size: "18 KB",
    type: "Markdown",
    modified: "今天 09:48",
  },
  {
    name: "settings.jsonl",
    kind: "json",
    size: "42 KB",
    type: "JSONL",
    modified: "今天 09:32",
  },
  {
    name: "state.sqlite",
    kind: "database",
    size: "18.6 MB",
    type: "SQLite",
    modified: "昨天 22:10",
  },
  {
    name: "electron.vite.config.ts",
    kind: "config",
    size: "6 KB",
    type: "配置",
    modified: "周二 16:04",
  },
  {
    name: "build-icons.sh",
    kind: "terminal",
    size: "2 KB",
    type: "Shell",
    modified: "周一 12:21",
  },
  {
    name: "app-icon.svg",
    kind: "image",
    size: "3 KB",
    type: "SVG 图片",
    modified: "7月28日",
  },
  {
    name: "package-lock.json",
    kind: "json",
    size: "512 KB",
    type: "JSON",
    modified: "7月24日",
  },
  {
    name: "fixture.csv",
    kind: "table",
    size: "72 KB",
    type: "表格",
    modified: "7月22日",
  },
  {
    name: ".env.local",
    kind: "key",
    size: "1 KB",
    type: "密钥/环境",
    modified: "7月20日",
    hidden: true,
  },
  {
    name: "renderer.zip",
    kind: "archive",
    size: "4.2 MB",
    type: "归档",
    modified: "7月18日",
  },
  {
    name: "main.js",
    kind: "code",
    size: "24 KB",
    type: "JavaScript",
    modified: "7月17日",
  },
  {
    name: "notes.txt",
    kind: "text",
    size: "9 KB",
    type: "文本",
    modified: "7月16日",
  },
];

const statusLabel = {
  connected: "已连接",
  unavailable: "路径不可用",
  "permission-required": "需授权",
};

const statusColor = (C, status) => {
  if (status === "connected") return C.success;
  if (status === "permission-required") return C.error;
  return C.warning;
};

const kindIcon = {
  archive: "file-archive",
  binary: "binary",
  code: "file-code-2",
  config: "file-cog",
  database: "database",
  document: "file-type-2",
  file: "file",
  folder: "folder",
  image: "image",
  json: "file-json-2",
  key: "file-key-2",
  markdown: "book-open-text",
  table: "table-2",
  terminal: "file-terminal",
  text: "file-text",
};

const pages = [
  { name: "A01 浏览器 · 图标视图", mode: "icon" },
  { name: "A02 浏览器 · 列表视图", mode: "list", viewMode: "list" },
  { name: "A03 浏览器 · Finder 分栏视图", mode: "column", viewMode: "column" },
  {
    name: "A04 文档预览 · 代码文件",
    mode: "preview-code",
    tabs: true,
    activeTab: "electron.vite.config.ts",
  },
  {
    name: "A05 文档预览 · Markdown 渲染",
    mode: "preview-markdown",
    tabs: true,
    activeTab: "AGENTS.md",
  },
  {
    name: "A06 文档预览 · 图片",
    mode: "preview-image",
    tabs: true,
    activeTab: "app-icon.svg",
  },
  { name: "A07 Inspector · 未选择", mode: "icon", inspectorState: "empty" },
  {
    name: "A08 Inspector · 文件信息",
    mode: "icon",
    selectedKind: "database",
    inspectorState: "selected",
  },
  { name: "A09 搜索结果 · 当前 Agent", mode: "search" },
  { name: "A10 搜索结果 · 无匹配", mode: "search-empty" },
  { name: "A11 搜索结果 · 达到上限", mode: "search-truncated" },
  { name: "A12 右键菜单 · 文件项目", mode: "context-menu" },
  { name: "A13 Finder 拖入 · 复制预备", mode: "drop" },
  { name: "A14 文件操作 · 确认复制", mode: "operation" },
  { name: "A15 文件操作 · 冲突策略", mode: "operation-conflict" },
  { name: "A16 通知 · 撤销入口", mode: "notification" },
  {
    name: "B17 设置 · IDE 管理",
    mode: "settings-agents",
    screen: "settings",
    settingsSection: "agents",
  },
  {
    name: "B18 设置 · 路径编辑",
    mode: "settings-agent-edit",
    screen: "settings",
    settingsSection: "agents",
  },
  {
    name: "B19 设置 · 外观",
    mode: "settings-appearance",
    screen: "settings",
    settingsSection: "appearance",
  },
  {
    name: "B20 设置 · 文件夹图标预设",
    mode: "settings-folder-icons",
    screen: "settings",
    settingsSection: "appearance",
  },
  {
    name: "B21 设置 · 高级",
    mode: "settings-advanced",
    screen: "settings",
    settingsSection: "advanced",
  },
  {
    name: "B22 设置 · 还原默认设置确认",
    mode: "settings-reset-dialog",
    screen: "settings",
    settingsSection: "advanced",
  },
  {
    name: "B23 设置 · 关于",
    mode: "settings-about",
    screen: "settings",
    settingsSection: "about",
  },
  { name: "C24 工作目录不可用", mode: "unavailable" },
  { name: "C25 需要文件夹访问权限", mode: "permission" },
  { name: "C26 空目录", mode: "empty-dir" },
  { name: "C27 启动与读取加载态", mode: "loading" },
  {
    name: "C28 文件过大不可预览",
    mode: "too-large",
    tabs: true,
    activeTab: "debug.log",
  },
  {
    name: "C29 不支持预览 / 二进制",
    mode: "unsupported",
    tabs: true,
    activeTab: "state.sqlite",
  },
  { name: "D30 隐藏文件显示", mode: "hidden" },
  { name: "D31 长文件名截断", mode: "long-name" },
  { name: "D32 大目录分页", mode: "pagination", viewMode: "list" },
  { name: "E33 暗色模式 · 主界面", mode: "icon", theme: "dark" },
  {
    name: "E34 暗色模式 · 设置",
    mode: "settings-appearance",
    theme: "dark",
    screen: "settings",
    settingsSection: "appearance",
  },
  {
    name: "E35 暗色模式 · 预览",
    mode: "preview-markdown",
    theme: "dark",
    tabs: true,
    activeTab: "AGENTS.md",
  },
  {
    name: "E36 窄窗 · 侧栏折叠",
    mode: "icon",
    collapsed: true,
    inspector: false,
    width: 720,
    height: 900,
  },
  {
    name: "E37 最小窗口 · 900×540",
    mode: "minimum",
    collapsed: true,
    inspector: false,
    width: 900,
    height: 540,
  },
  { name: "E38 宽窗 · Inspector 展开", mode: "wide", width: 1600, height: 960 },
  { name: "E39 快捷键速查悬停", mode: "shortcuts" },
  {
    name: "F40 Agent 状态隔离",
    mode: "agent-isolation",
    activeAgentId: "claude",
    tabs: true,
    activeTab: "README.md",
  },
  {
    name: "F41 跨 Agent 粘贴",
    mode: "cross-agent-paste",
    activeAgentId: "claude",
  },
  {
    name: "G42 设计系统 · App 与 Agent 图标",
    mode: "design-system",
    kind: "design-system",
  },
  {
    name: "G43 设计系统 · 文件类型图标",
    mode: "file-icons",
    kind: "design-system",
  },
];

const solid = (color) => [{ type: "solid", color }];
const stroke = (color, thickness = 1) => ({ thickness, fill: solid(color) });

const clean = (value) => {
  if (Array.isArray(value)) {
    const result = value.map(clean).filter((item) => item !== undefined);
    return result.length > 0 ? result : undefined;
  }
  if (value && typeof value === "object") {
    const result = {};
    for (const [key, item] of Object.entries(value)) {
      const cleaned = clean(item);
      if (cleaned !== undefined) result[key] = cleaned;
    }
    return Object.keys(result).length > 0 ? result : undefined;
  }
  return value === undefined ? undefined : value;
};

const node = (type, props = {}, children = []) =>
  clean({ type, ...props, children });
const frame = (props = {}, children = []) => node("frame", props, children);
const rectangle = (props = {}, children = []) =>
  node("rectangle", props, children);
const ellipse = (props = {}) => node("ellipse", props);
const text = (content, props = {}) =>
  node("text", {
    width: "fit_content",
    height: "fit_content",
    content,
    fontFamily: fontSans,
    fontSize: 12,
    lineHeight: 1.3,
    ...props,
  });
const icon = (iconFontName, color, size = 16, props = {}) =>
  node("icon_font", {
    iconFontName,
    width: size,
    height: size,
    fill: solid(color),
    ...props,
  });
const image = (src, width, height, props = {}) =>
  node("image", {
    src,
    width,
    height,
    objectFit: "fit",
    ...props,
  });

const iconButton = (name, C, active = false, disabled = false) =>
  frame(
    {
      width: 30,
      height: 30,
      layout: "horizontal",
      alignItems: "center",
      justifyContent: "center",
      cornerRadius: 4,
      opacity: disabled ? 0.35 : 1,
      fill: active ? solid(C.control) : undefined,
      effects: active
        ? [
            {
              type: "shadow",
              offsetX: 0,
              offsetY: 1,
              blur: 3,
              spread: 0,
              color: "rgba(0,0,0,0.12)",
            },
          ]
        : undefined,
    },
    [icon(name, active ? C.foreground : C.secondary, 16)],
  );

const statusPill = (C, status) =>
  frame(
    {
      width: "fit_content",
      height: "fit_content",
      layout: "horizontal",
      gap: 5,
      alignItems: "center",
    },
    [
      ellipse({ width: 6, height: 6, fill: solid(statusColor(C, status)) }),
      text(statusLabel[status], {
        fontSize: 10,
        fill: solid(statusColor(C, status)),
      }),
    ],
  );

const statusText = (C, status) =>
  text(statusLabel[status], {
    fontSize: 10,
    fill: solid(statusColor(C, status)),
  });

const fileIcon = (kind, C, size = 20) =>
  icon(kindIcon[kind] ?? "file", C.file[kind] ?? C.secondary, size, {
    name: `${kind} file icon`,
  });

const toolbarSearchWidth = (width) => {
  if (width <= 600) return 160;
  if (width <= 720) return 220;
  if (width <= 1000) return 300;
  return Math.min(560, Math.max(360, Math.round(width * 0.34)));
};

const activeAgent = (spec) =>
  agents.find((agent) => agent.id === (spec.activeAgentId ?? "codex")) ??
  agents[0];

function buildPage(spec) {
  if (spec.kind === "design-system") return buildDesignSystem(spec);

  const C = spec.theme === "dark" ? dark : light;
  const appWidth = spec.width ?? 1440;
  const appHeight = spec.height ?? 960;
  return frame(
    {
      name: spec.name,
      width: appWidth + 56,
      height: appHeight + 92,
      layout: "vertical",
      gap: 14,
      padding: [24, 28],
      fill: solid(C.canvas),
      fontFamily: fontSans,
    },
    [
      frame(
        {
          width: "fill_container",
          height: 26,
          layout: "horizontal",
          justifyContent: "space_between",
          alignItems: "center",
        },
        [
          text(spec.name, {
            fontSize: 13,
            fontWeight: 650,
            fill: solid(C.foreground),
          }),
          text("真实应用 UI 基准 · Electron / React / Sass", {
            fontSize: 11,
            fill: solid(C.secondary),
          }),
        ],
      ),
      frame(
        {
          name: "app-window",
          width: appWidth,
          height: appHeight,
          layout: "vertical",
          clipContent: true,
          fill: solid(C.background),
          stroke: stroke(C.separator),
          effects: [
            {
              type: "shadow",
              offsetX: 0,
              offsetY: 18,
              blur: 38,
              spread: -8,
              color: "rgba(0,0,0,0.24)",
            },
          ],
        },
        [buildTitlebar(C), buildAppContent(spec, C, appWidth, appHeight - 44)],
      ),
    ],
  );
}

function buildTitlebar(C) {
  return frame(
    {
      name: "titlebar · 44px",
      width: "fill_container",
      height: 44,
      layout: "horizontal",
      alignItems: "center",
      fill: solid(C.sidebar),
      stroke: stroke(C.separator),
    },
    [
      frame(
        {
          width: 86,
          height: "fill_container",
          layout: "horizontal",
          gap: 8,
          alignItems: "center",
          padding: [0, 16],
        },
        ["#FF5F57", "#FEBC2E", "#28C840"].map((color) =>
          ellipse({ width: 12, height: 12, fill: solid(color) }),
        ),
      ),
      frame(
        {
          width: "fill_container",
          height: "fill_container",
          layout: "horizontal",
          justifyContent: "center",
          alignItems: "center",
        },
        [
          text("IDE 工作目录浏览器", {
            fontSize: 11,
            fontWeight: 500,
            fill: solid(C.secondary),
          }),
        ],
      ),
      frame({ width: 86, height: "fill_container" }),
    ],
  );
}

function buildAppContent(spec, C, width, height) {
  if (spec.mode === "loading" && spec.screen !== "settings") {
    return frame(
      {
        name: "boot-screen",
        width: "fill_container",
        height,
        layout: "vertical",
        gap: 10,
        alignItems: "center",
        justifyContent: "center",
        fill: solid(C.background),
      },
      [spinner(C, 24), text("正在载入工作区…", { fill: solid(C.secondary) })],
    );
  }

  if (spec.screen === "settings")
    return buildSettingsWorkspace(spec, C, width, height);
  return buildBrowserWorkspace(spec, C, width, height);
}

function buildBrowserWorkspace(spec, C, width, height) {
  const sidebarWidth = spec.collapsed ? 48 : 220;
  const mainWidth = width - sidebarWidth;
  const browserContentHeight = height - 44 - (spec.tabs ? 34 : 0) - 30 - 24;
  const primaryWidth = mainWidth - (spec.inspector === false ? 0 : 256);
  return frame(
    {
      name: "browser-workspace",
      width: "fill_container",
      height,
      layout: "horizontal",
      fill: solid(C.background),
    },
    [
      buildSidebar(spec, C, sidebarWidth, height),
      frame(
        {
          name: "browser-main",
          width: "fill_container",
          height: "fill_container",
          layout: "vertical",
        },
        [
          buildToolbar(spec, C, mainWidth),
          ...(spec.tabs ? [buildDocumentTabs(spec, C)] : []),
          buildBrowserContent(spec, C, primaryWidth, browserContentHeight),
          buildPathbar(spec, C),
          buildStatusbar(spec, C),
        ],
      ),
    ],
  );
}

function buildSidebar(spec, C, sidebarWidth, height) {
  const collapsed = Boolean(spec.collapsed);
  const footerHeight = 54;
  const navHeight = height - footerHeight - (collapsed ? 44 : 36);
  return frame(
    {
      name: collapsed ? "sidebar collapsed · 48px" : "sidebar · 220px",
      width: sidebarWidth,
      height: "fill_container",
      layout: "vertical",
      fill: solid(C.sidebar),
      stroke: stroke(C.separator),
    },
    [
      frame(
        {
          name: "sidebar__header",
          width: "fill_container",
          height: collapsed ? 44 : 36,
          layout: "horizontal",
          justifyContent: collapsed ? "center" : "space_between",
          alignItems: "center",
          padding: collapsed ? 0 : [0, 8, 0, 12],
        },
        collapsed
          ? [iconButton("panel-left", C, true)]
          : [
              text("AGENT", {
                fontSize: 11,
                fontWeight: 650,
                letterSpacing: 0.5,
                fill: solid(C.secondary),
              }),
              iconButton("panel-left", C),
            ],
      ),
      frame(
        {
          name: "sidebar__nav",
          width: "fill_container",
          height: navHeight,
          layout: "vertical",
          gap: collapsed ? 8 : 2,
          alignItems: collapsed ? "center" : "start",
          padding: collapsed ? [6, 0, 10, 0] : [0, 8],
          clipContent: true,
        },
        agents.map((agent) => buildAgentItem(agent, spec, C, collapsed)),
      ),
      frame(
        {
          name: "sidebar__footer",
          width: "fill_container",
          height: footerHeight,
          layout: "horizontal",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "start",
          padding: collapsed ? 0 : [0, 8],
          stroke: stroke(C.separator),
        },
        [
          frame(
            {
              name: "sidebar__settings",
              width: collapsed ? 30 : "fill_container",
              height: collapsed ? 30 : 44,
              layout: "horizontal",
              gap: 8,
              alignItems: "center",
              justifyContent: collapsed ? "center" : "start",
              padding: collapsed ? 0 : [0, 8],
              cornerRadius: collapsed ? 4 : 6,
              fill:
                spec.screen === "settings" ? solid(C.primarySoft) : undefined,
            },
            [
              icon(
                "settings",
                spec.screen === "settings" ? C.primary : C.secondary,
                16,
              ),
              ...(collapsed
                ? []
                : [text("设置", { fill: solid(C.secondary), fontSize: 13 })]),
            ],
          ),
        ],
      ),
    ],
  );
}

function buildAgentItem(agent, spec, C, collapsed) {
  const active = agent.id === (spec.activeAgentId ?? "codex");
  if (collapsed) {
    return frame(
      {
        name: `${agent.name} agent-item collapsed`,
        width: 30,
        height: 30,
        layout: "horizontal",
        alignItems: "center",
        justifyContent: "center",
        cornerRadius: 4,
        fill: active ? solid(C.primary) : undefined,
      },
      [agentIcon(agent, active ? "#FFFFFF" : C.foreground, 20)],
    );
  }

  return frame(
    {
      name: `${agent.name} agent-item`,
      width: "fill_container",
      height: 64,
      layout: "horizontal",
      gap: 8,
      alignItems: "center",
      padding: [7, 8],
      cornerRadius: 6,
      fill: active ? solid(C.primary) : undefined,
    },
    [
      agentIcon(agent, active ? "#FFFFFF" : C.foreground, 24),
      frame(
        {
          width: "fill_container",
          height: "fit_content",
          layout: "vertical",
          gap: 3,
        },
        [
          text(agent.name, {
            width: "fill_container",
            textGrowth: "fixed-width",
            fontSize: 13,
            fontWeight: 550,
            fill: solid(active ? C.onPrimary : C.foreground),
          }),
          text(agent.workdir, {
            width: "fill_container",
            textGrowth: "fixed-width",
            fontFamily: fontMono,
            fontSize: 10,
            fill: solid(active ? "rgba(255,255,255,0.82)" : C.secondary),
          }),
          statusPill(
            active
              ? {
                  ...C,
                  success: "rgba(255,255,255,0.82)",
                  warning: "rgba(255,255,255,0.82)",
                  error: "rgba(255,255,255,0.82)",
                }
              : C,
            agent.status,
          ),
        ],
      ),
    ],
  );
}

function agentIcon(agent, fallbackColor, size = 20) {
  return frame(
    {
      name: `${agent.name} brand icon`,
      width: size + 4,
      height: size + 4,
      layout: "horizontal",
      alignItems: "center",
      justifyContent: "center",
      cornerRadius: 4,
      fill: solid("#FFFFFF"),
      effects: [
        {
          type: "shadow",
          offsetX: 0,
          offsetY: 0,
          blur: 0,
          spread: 0,
          color: "rgba(0,0,0,0.06)",
        },
      ],
    },
    agentIcons[agent.id]
      ? [image(agentIcons[agent.id], size, size)]
      : [icon(agent.icon, fallbackColor, size)],
  );
}

function buildToolbar(spec, C, mainWidth) {
  const viewMode = spec.viewMode ?? "icon";
  const searchWidth = toolbarSearchWidth(mainWidth);
  return frame(
    {
      name: "toolbar · 44px",
      width: "fill_container",
      height: 44,
      layout: "horizontal",
      gap: 8,
      alignItems: "center",
      padding: [0, 10],
      fill: solid(C.surface),
      stroke: stroke(C.separator),
    },
    [
      frame(
        {
          width: "fill_container",
          height: 30,
          layout: "horizontal",
          gap: 8,
          alignItems: "center",
          clipContent: true,
        },
        [
          frame(
            { width: "fit_content", height: 30, layout: "horizontal", gap: 2 },
            [
              iconButton("chevron-left", C, false, spec.mode === "unavailable"),
              iconButton("chevron-right", C, false, true),
            ],
          ),
          frame(
            {
              name: "segmented role=tablist",
              width: 96,
              height: 30,
              layout: "horizontal",
              gap: 2,
              padding: 2,
              cornerRadius: 6,
              fill: solid(C.surfaceHover),
              stroke: stroke(C.separator),
            },
            [
              iconButton("grid-3x3", C, viewMode === "icon"),
              iconButton("list", C, viewMode === "list"),
              iconButton("columns-3", C, viewMode === "column"),
            ].map((button) => ({ ...button, width: 28, height: 24 })),
          ),
        ],
      ),
      frame(
        {
          name: "toolbar-search",
          width: searchWidth,
          height: 28,
          layout: "horizontal",
          gap: 6,
          alignItems: "center",
          padding: [0, 7],
          cornerRadius: 6,
          fill: solid(C.background),
          stroke: stroke(C.separator),
        },
        [
          icon("search", C.secondary, 14),
          text(searchText(spec), {
            width: "fill_container",
            textGrowth: "fixed-width",
            fontSize: 13,
            fill: solid(
              spec.mode.startsWith("search") ? C.foreground : C.secondary,
            ),
          }),
          ...(spec.mode.startsWith("search")
            ? [icon("x", C.secondary, 13)]
            : []),
        ],
      ),
      frame(
        {
          width: "fill_container",
          height: 30,
          layout: "horizontal",
          gap: 2,
          alignItems: "center",
          justifyContent: "end",
        },
        [
          iconButton("refresh-cw", C),
          iconButton(
            "panel-right",
            C,
            spec.inspector !== false && spec.inspectorState !== "collapsed",
          ),
        ],
      ),
    ],
  );
}

function searchText(spec) {
  if (spec.mode === "search-empty") return "zz-no-match";
  if (spec.mode === "search" || spec.mode === "search-truncated")
    return "config";
  return "搜索";
}

function buildDocumentTabs(spec, C) {
  const agent = activeAgent(spec);
  const tabName = spec.activeTab ?? "AGENTS.md";
  return frame(
    {
      name: "document-tabs · 34px",
      width: "fill_container",
      height: 34,
      layout: "horizontal",
      alignItems: "stretch",
      fill: solid(C.surfaceHover),
      stroke: stroke(C.separator),
    },
    [
      frame(
        {
          width: "fill_container",
          height: "fill_container",
          layout: "horizontal",
          clipContent: true,
        },
        [
          documentTab("projects", "folder", C, false, true),
          documentTab(tabName, kindForFile(tabName), C, true),
          ...(spec.mode.includes("preview") || spec.mode === "agent-isolation"
            ? [
                documentTab(
                  spec.mode === "agent-isolation"
                    ? "release-note.md"
                    : "README.md",
                  "markdown",
                  C,
                  false,
                ),
              ]
            : []),
        ],
      ),
      frame(
        {
          width: "fit_content",
          height: "fill_container",
          layout: "horizontal",
          alignItems: "center",
          padding: [0, 10],
          stroke: stroke(C.separator),
        },
        [
          text(`${agent.name} · 独立标签`, {
            fontSize: 11,
            fill: solid(C.secondary),
          }),
        ],
      ),
    ],
  );
}

function documentTab(label, kind, C, active, isBrowser = false) {
  return frame(
    {
      width: isBrowser ? 180 : 190,
      height: "fill_container",
      layout: "horizontal",
      gap: 6,
      alignItems: "center",
      padding: [0, 10],
      fill: active ? solid(C.control) : undefined,
      stroke: stroke(C.separator),
    },
    [
      isBrowser ? icon("folder", C.file.folder, 14) : fileIcon(kind, C, 14),
      text(label, {
        width: "fill_container",
        textGrowth: "fixed-width",
        fontSize: 12,
        fill: solid(active ? C.foreground : C.secondary),
      }),
      ...(isBrowser ? [] : [icon("x", active ? C.secondary : C.disabled, 12)]),
    ],
  );
}

function kindForFile(name) {
  if (name.endsWith(".sqlite") || name.endsWith(".db")) return "database";
  if (name.endsWith(".md")) return "markdown";
  if (name.endsWith(".json") || name.endsWith(".jsonl")) return "json";
  if (name.endsWith(".ts") || name.endsWith(".js")) return "code";
  if (name.endsWith(".svg") || name.endsWith(".png")) return "image";
  if (name.endsWith(".toml") || name.endsWith(".yml")) return "config";
  if (name.endsWith(".log") || name.endsWith(".txt")) return "text";
  return "file";
}

function buildBrowserContent(spec, C, primaryWidth, contentHeight) {
  const inspectorVisible = spec.inspector !== false;
  const primaryContent = buildPrimaryContent(
    spec,
    C,
    primaryWidth,
    contentHeight,
  );
  return frame(
    {
      name: "browser-content",
      width: "fill_container",
      height: contentHeight,
      layout: "horizontal",
      fill: solid(C.background),
      clipContent: true,
    },
    [
      frame(
        {
          name: "browser-primary",
          width: primaryWidth,
          height: contentHeight,
          layout: "none",
          clipContent: true,
        },
        [
          frame(
            {
              x: 0,
              y: 0,
              width: primaryWidth,
              height: contentHeight,
              layout: "vertical",
            },
            [primaryContent],
          ),
          ...(spec.mode === "notification"
            ? [notificationHost(C, primaryWidth, contentHeight)]
            : []),
        ],
      ),
      buildInspector(spec, C, inspectorVisible),
    ],
  );
}

function buildPrimaryContent(spec, C, primaryWidth, contentHeight) {
  if (
    spec.mode.startsWith("preview") ||
    spec.mode === "too-large" ||
    spec.mode === "unsupported"
  ) {
    return buildDocumentPreview(spec, C);
  }
  if (spec.mode.startsWith("search")) return buildSearchWorkspace(spec, C);
  if (["unavailable", "permission", "empty-dir", "minimum"].includes(spec.mode))
    return buildEmptyState(spec, C);
  if (spec.mode === "column") return fileBrowserShell(C, buildColumnView(C));
  if (spec.mode === "list" || spec.mode === "pagination")
    return fileBrowserShell(C, buildListView(C, spec));
  return fileBrowserShell(
    C,
    buildIconStage(spec, C, primaryWidth - 32, contentHeight - 32),
  );
}

function fileBrowserShell(C, child) {
  return frame(
    {
      name: "file-browser",
      width: "fill_container",
      height: "fill_container",
      layout: "vertical",
      padding: 16,
      fill: solid(C.background),
      clipContent: true,
    },
    [child],
  );
}

function buildIconStage(spec, C, stageWidth, stageHeight) {
  const overlay = overlayForMode(spec, C, stageWidth, stageHeight);

  return frame(
    {
      name: "icon-grid stage",
      width: stageWidth,
      height: stageHeight,
      layout: "none",
      clipContent: true,
    },
    [
      frame(
        {
          x: 0,
          y: 0,
          width: stageWidth,
          height: stageHeight,
          layout: "vertical",
          gap: 14,
          clipContent: true,
        },
        [buildIconGrid(spec, C)],
      ),
      ...(overlay ? [overlay] : []),
    ],
  );
}

function overlayForMode(spec, C, stageWidth, stageHeight) {
  if (spec.mode === "context-menu" || spec.mode === "cross-agent-paste") {
    const activeLabel = spec.mode === "cross-agent-paste" ? "粘贴到此处" : null;
    return positionedOverlay(
      contextMenuOverlay(C, activeLabel),
      Math.min(220, Math.max(18, stageWidth - 242)),
      Math.min(150, Math.max(18, stageHeight - 268)),
    );
  }
  if (spec.mode === "drop")
    return fullOverlay(dropOverlay(C), stageWidth, stageHeight);
  if (spec.mode === "operation")
    return centeredOverlay(
      fileOperationDialog(C, false),
      stageWidth,
      stageHeight,
    );
  if (spec.mode === "operation-conflict")
    return centeredOverlay(
      fileOperationDialog(C, true),
      stageWidth,
      stageHeight,
    );
  if (spec.mode === "shortcuts")
    return bottomRightOverlay(shortcutPopover(C), stageWidth, stageHeight, 18);
  return null;
}

function positionedOverlay(child, x, y) {
  return frame(
    {
      name: "positioned overlay",
      x,
      y,
      width: child.width,
      height: child.height ?? "fit_content",
      layout: "vertical",
    },
    [child],
  );
}

function fullOverlay(child, width, height) {
  return {
    ...child,
    name: "drop-overlay layer",
    x: 0,
    y: 0,
    width,
    height,
  };
}

function centeredOverlay(child, width, height) {
  return frame(
    {
      name: "centered modal layer",
      x: 0,
      y: 0,
      width,
      height,
      layout: "vertical",
      alignItems: "center",
      justifyContent: "center",
      padding: 18,
      fill: solid("rgba(0,0,0,0.08)"),
    },
    [child],
  );
}

function bottomRightOverlay(child, width, height, inset) {
  return frame(
    {
      name: "bottom-right overlay layer",
      x: 0,
      y: 0,
      width,
      height,
      layout: "vertical",
      alignItems: "end",
      justifyContent: "end",
      padding: [0, inset, inset, 0],
    },
    [child],
  );
}

function visibleFiles(spec) {
  if (spec.mode === "long-name") {
    return [
      {
        name: "这是一个用于验证极端情况下文件名截断行为的超级超级长文件名.component.tsx",
        kind: "code",
        size: "24 KB",
        type: "TypeScript",
        modified: "今天 10:45",
      },
      {
        name: "another-extraordinarily-long-project-configuration-file-name.json",
        kind: "json",
        size: "6 KB",
        type: "JSON",
        modified: "今天 10:34",
      },
      ...fileSamples.slice(0, 10),
    ];
  }
  if (spec.mode === "hidden") return fileSamples;
  return fileSamples
    .filter((item) => !item.hidden)
    .slice(0, spec.width === 900 ? 6 : 12);
}

function buildIconGrid(spec, C) {
  const files = visibleFiles(spec);
  const columns =
    spec.width === 900
      ? 4
      : spec.width === 720
        ? 5
        : spec.width === 1600
          ? 13
          : 10;
  const rows = [];
  for (let start = 0; start < files.length; start += columns) {
    rows.push(
      frame(
        {
          width: "fill_container",
          height: 96,
          layout: "horizontal",
          gap: 14,
          alignItems: "start",
        },
        files
          .slice(start, start + columns)
          .map((item, index) => fileTile(item, C, spec, start + index)),
      ),
    );
  }
  return frame(
    {
      name: "icon-grid",
      width: "fill_container",
      height: spec.mode === "shortcuts" ? 260 : "fill_container",
      layout: "vertical",
      gap: 14,
    },
    rows,
  );
}

function fileTile(item, C, spec, index) {
  const selected =
    index === 5 ||
    (spec.selectedKind && item.kind === spec.selectedKind) ||
    (spec.mode === "context-menu" && item.name === "src");
  return frame(
    {
      name: item.hidden
        ? `${item.name} hidden file-tile`
        : `${item.name} file-tile`,
      width: "fill_container",
      height: 90,
      layout: "vertical",
      gap: 7,
      alignItems: "center",
      padding: [9, 6],
      cornerRadius: 6,
      opacity: item.hidden ? 0.55 : 1,
      fill: selected ? solid(C.primarySoft) : undefined,
      stroke: selected ? stroke("rgba(0,122,255,0.45)") : undefined,
    },
    [
      fileIcon(item.kind, C, 42),
      text(item.name, {
        name: "file-tile__name · 2 line clamp",
        width: "fill_container",
        height: 32,
        textGrowth: "fixed-width-height",
        textAlign: "center",
        fontSize: 11,
        lineHeight: 1.25,
        fill: solid(C.foreground),
      }),
    ],
  );
}

function buildListView(C, spec) {
  const files =
    spec.mode === "pagination"
      ? fileSamples.concat(fileSamples.slice(0, 6))
      : fileSamples.slice(0, 12);
  return frame(
    {
      name: "file-list",
      width: "fill_container",
      height: "fill_container",
      layout: "vertical",
      clipContent: true,
    },
    [
      listRow(C, ["名称", "大小", "种类", "修改时间"], true),
      ...files.map((item, index) => listRow(C, item, false, index)),
      ...(spec.mode === "pagination"
        ? [
            frame(
              {
                width: "fill_container",
                height: 38,
                layout: "horizontal",
                justifyContent: "space_between",
                alignItems: "center",
                padding: [0, 10],
              },
              [
                text("显示 1-200 / 共 1,247 项", {
                  fontSize: 11,
                  fill: solid(C.secondary),
                }),
                text("目录已分页，请使用搜索缩小范围", {
                  fontSize: 11,
                  fill: solid(C.warning),
                  fontWeight: 650,
                }),
              ],
            ),
          ]
        : []),
    ],
  );
}

function listRow(C, data, header = false, index = 0) {
  const item = header ? null : data;
  return frame(
    {
      width: "fill_container",
      height: 32,
      layout: "horizontal",
      gap: 10,
      alignItems: "center",
      padding: [0, 10],
      fill: header
        ? solid(C.surface)
        : index % 2
          ? solid("rgba(0,0,0,0.02)")
          : undefined,
      stroke: stroke(C.separator),
    },
    header
      ? [
          text(data[0], {
            width: "fill_container",
            textGrowth: "fixed-width",
            fontSize: 11,
            fontWeight: 550,
            fill: solid(C.secondary),
          }),
          text(data[1], {
            width: 90,
            fontSize: 11,
            fontWeight: 550,
            fill: solid(C.secondary),
          }),
          text(data[2], {
            width: 130,
            fontSize: 11,
            fontWeight: 550,
            fill: solid(C.secondary),
          }),
          text(data[3], {
            width: 140,
            fontSize: 11,
            fontWeight: 550,
            fill: solid(C.secondary),
          }),
        ]
      : [
          fileIcon(item.kind, C, 20),
          text(item.name, {
            width: "fill_container",
            textGrowth: "fixed-width",
            fontSize: 12,
            fill: solid(C.foreground),
          }),
          text(item.size, {
            width: 90,
            fontSize: 11,
            fill: solid(C.secondary),
          }),
          text(item.type, {
            width: 130,
            fontSize: 11,
            fill: solid(C.secondary),
          }),
          text(item.modified, {
            width: 140,
            fontSize: 11,
            fill: solid(C.secondary),
          }),
        ],
  );
}

function buildColumnView(C) {
  const rootItems = fileSamples
    .filter((item) => item.kind === "folder")
    .concat(fileSamples.slice(3, 8));
  const secondItems = [
    { name: "main.tsx", kind: "code" },
    { name: "App.tsx", kind: "code" },
    { name: "features", kind: "folder" },
    { name: "styles", kind: "folder" },
    { name: "store", kind: "folder" },
  ];
  const thirdItems = [
    { name: "browser", kind: "folder" },
    { name: "settings", kind: "folder" },
    { name: "preview", kind: "folder" },
    { name: "notifications", kind: "folder" },
  ];
  return frame(
    {
      name: "column-view",
      width: "fill_container",
      height: "fill_container",
      layout: "horizontal",
      clipContent: true,
    },
    [
      column(C, "projects", rootItems, "src"),
      column(C, "src", secondItems, "features"),
      column(C, "features", thirdItems, "browser"),
    ],
  );
}

function column(C, title, items, selectedName) {
  return frame(
    {
      name: `column ${title}`,
      width: 250,
      height: "fill_container",
      layout: "vertical",
      fill: solid(C.background),
      stroke: stroke(C.separator),
    },
    [
      frame(
        {
          width: "fill_container",
          height: 32,
          layout: "horizontal",
          alignItems: "center",
          padding: [8, 10],
          stroke: stroke(C.separator),
        },
        [
          text(title, {
            fontSize: 11,
            fill: solid(C.secondary),
            width: "fill_container",
            textGrowth: "fixed-width",
          }),
        ],
      ),
      frame(
        {
          width: "fill_container",
          height: "fill_container",
          layout: "vertical",
        },
        items.map((item) =>
          frame(
            {
              width: "fill_container",
              height: 30,
              layout: "horizontal",
              gap: 7,
              alignItems: "center",
              padding: [0, 8],
              fill:
                item.name === selectedName ? solid(C.primarySoft) : undefined,
            },
            [
              fileIcon(item.kind, C, 20),
              text(item.name, {
                width: "fill_container",
                textGrowth: "fixed-width",
                fontSize: 12,
                fill: solid(C.foreground),
              }),
              ...(item.kind === "folder"
                ? [icon("chevron-right", C.secondary, 13)]
                : []),
            ],
          ),
        ),
      ),
    ],
  );
}

function buildDocumentPreview(spec, C) {
  if (spec.mode === "too-large" || spec.mode === "unsupported") {
    return frame(
      {
        name: "document-preview state",
        width: "fill_container",
        height: "fill_container",
        layout: "vertical",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        fill: solid(C.background),
      },
      [
        icon("file", C.secondary, 42),
        text(spec.mode === "too-large" ? "文件过大" : "不支持预览", {
          fontSize: 15,
          fontWeight: 650,
          fill: solid(C.foreground),
        }),
        text(
          spec.mode === "too-large"
            ? "文件超过 2 MB 预览上限。"
            : "二进制文件无法在应用内安全渲染。",
          {
            width: 420,
            textGrowth: "fixed-width",
            textAlign: "center",
            fill: solid(C.secondary),
          },
        ),
        frame(
          {
            width: "fit_content",
            height: 30,
            layout: "horizontal",
            alignItems: "center",
            padding: [0, 12],
            cornerRadius: 6,
            fill: solid(C.surface),
            stroke: stroke(C.separator),
          },
          [
            text("使用默认应用打开", {
              fontSize: 12,
              fill: solid(C.foreground),
            }),
          ],
        ),
      ],
    );
  }

  const markdown = spec.mode === "preview-markdown";
  const imagePreview = spec.mode === "preview-image";
  return frame(
    {
      name: "document-preview",
      width: "fill_container",
      height: "fill_container",
      layout: "vertical",
      fill: solid(C.background),
    },
    [
      ...(markdown
        ? [
            frame(
              {
                name: "document-preview__toolbar",
                width: "fill_container",
                height: 36,
                layout: "horizontal",
                justifyContent: "end",
                alignItems: "center",
                gap: 2,
                padding: [0, 12],
                fill: solid(C.surface),
                stroke: stroke(C.separator),
              },
              [smallToggle("预览", C, true), smallToggle("源码", C, false)],
            ),
          ]
        : []),
      frame(
        {
          name: "document-preview__content",
          width: "fill_container",
          height: "fill_container",
          padding: imagePreview ? 20 : [14, 16, 16],
          layout: "vertical",
          alignItems: imagePreview ? "center" : "start",
          justifyContent: imagePreview ? "center" : "start",
          fill: solid(C.background),
        },
        imagePreview
          ? [image(appIcon, 220, 220)]
          : [codeBlock(markdown ? markdownContent : codeContent, C, markdown)],
      ),
    ],
  );
}

const codeContent = `import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    plugins: [react()],
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@shared': resolve('src/shared')
      }
    }
  }
})`;

const markdownContent = `# IDE Workdir Browser

每个 Agent 的工作区状态必须相互隔离：

- 当前路径
- 前进/后退历史
- 打开的标签
- 搜索关键词和范围
- Inspector 状态

设置页通过 Esc 返回浏览器视图。`;

function codeBlock(content, C, markdown = false) {
  return frame(
    {
      name: markdown ? "markdown-preview" : "code-preview",
      width: "fill_container",
      height: markdown ? 360 : "fit_content",
      layout: "vertical",
      gap: 12,
      padding: 16,
      cornerRadius: 8,
      fill: solid(markdown ? C.background : C.codeBg),
      stroke: stroke(C.separator),
    },
    markdown
      ? [
          text("IDE Workdir Browser", {
            fontSize: 28,
            fontWeight: 700,
            fill: solid(C.foreground),
          }),
          text("每个 Agent 的工作区状态必须相互隔离：", {
            fontSize: 14,
            fill: solid(C.foreground),
          }),
          text(
            "• 当前路径\n• 前进/后退历史\n• 打开的标签\n• 搜索关键词和范围\n• Inspector 状态",
            {
              width: "fill_container",
              textGrowth: "fixed-width",
              fontSize: 13,
              lineHeight: 1.65,
              fill: solid(C.foreground),
            },
          ),
          text("设置页通过 Esc 返回浏览器视图。", {
            fontSize: 13,
            fill: solid(C.secondary),
          }),
        ]
      : [
          text(content, {
            width: "fill_container",
            textGrowth: "fixed-width",
            fontFamily: fontMono,
            fontSize: 12,
            lineHeight: 1.65,
            fill: solid(C.codeFg),
          }),
        ],
  );
}

function smallToggle(label, C, active) {
  return frame(
    {
      width: 48,
      height: 24,
      layout: "horizontal",
      alignItems: "center",
      justifyContent: "center",
      cornerRadius: 4,
      fill: active ? solid(C.control) : undefined,
      effects: active
        ? [
            {
              type: "shadow",
              offsetX: 0,
              offsetY: 1,
              blur: 3,
              spread: 0,
              color: "rgba(0,0,0,0.12)",
            },
          ]
        : undefined,
    },
    [
      text(label, {
        fontSize: 11,
        fontWeight: active ? 650 : 450,
        fill: solid(active ? C.foreground : C.secondary),
      }),
    ],
  );
}

function buildSearchWorkspace(spec, C) {
  const empty = spec.mode === "search-empty";
  const truncated = spec.mode === "search-truncated";
  return frame(
    {
      name: "search-workspace",
      width: "fill_container",
      height: "fill_container",
      layout: "vertical",
      padding: 20,
      gap: 0,
      fill: solid(C.background),
    },
    [
      frame(
        {
          name: "search-summary",
          width: "fill_container",
          height: 58,
          layout: "horizontal",
          justifyContent: "space_between",
          alignItems: "center",
          stroke: stroke(C.separator),
        },
        [
          frame(
            {
              width: "fill_container",
              height: "fit_content",
              layout: "horizontal",
              gap: 10,
              alignItems: "center",
            },
            [
              icon("search", C.secondary, 20),
              frame(
                {
                  width: "fill_container",
                  height: "fit_content",
                  layout: "vertical",
                  gap: 3,
                },
                [
                  text(`“${empty ? "zz-no-match" : "config"}”的搜索结果`, {
                    fontSize: 16,
                    fontWeight: 650,
                    fill: solid(C.foreground),
                  }),
                  text(
                    empty
                      ? "找到 0 项，已扫描 5,234 项"
                      : `找到 ${truncated ? 100 : 6} 项，已扫描 5,234 项`,
                    {
                      fontSize: 11,
                      fill: solid(C.secondary),
                    },
                  ),
                ],
              ),
            ],
          ),
          frame(
            {
              width: "fit_content",
              height: 24,
              layout: "horizontal",
              alignItems: "center",
              padding: [4, 8],
              cornerRadius: 6,
              fill: solid(C.primarySoft),
            },
            [text("当前目录", { fontSize: 11, fill: solid(C.primary) })],
          ),
        ],
      ),
      ...(empty ? [searchEmptyState(C)] : [searchResultsList(C, truncated)]),
    ],
  );
}

function searchEmptyState(C) {
  return frame(
    {
      width: "fill_container",
      height: "fill_container",
      layout: "vertical",
      gap: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    [
      icon("search", C.secondary, 44),
      text("没有找到匹配项目", {
        fontSize: 15,
        fontWeight: 650,
        fill: solid(C.foreground),
      }),
      text("请检查拼写、切换搜索范围，或在设置中显示隐藏文件。", {
        fill: solid(C.secondary),
      }),
    ],
  );
}

function searchResultsList(C, truncated) {
  const results = fileSamples.slice(3, 10).map((item) => ({
    ...item,
    path: `~/.codex/projects/${item.name}`,
  }));
  return frame(
    {
      name: "search-results",
      width: "fill_container",
      height: "fill_container",
      layout: "vertical",
    },
    [
      ...results.map((item) =>
        frame(
          {
            width: "fill_container",
            height: 54,
            layout: "horizontal",
            gap: 10,
            alignItems: "center",
            padding: [7, 10],
            stroke: stroke(C.separator),
          },
          [
            fileIcon(item.kind, C, 22),
            frame(
              {
                width: "fill_container",
                height: "fit_content",
                layout: "vertical",
                gap: 3,
              },
              [
                text(item.name, {
                  fontSize: 12,
                  fontWeight: 650,
                  fill: solid(C.foreground),
                }),
                text(item.path, {
                  width: "fill_container",
                  textGrowth: "fixed-width",
                  fontFamily: fontMono,
                  fontSize: 10,
                  fill: solid(C.secondary),
                }),
              ],
            ),
            text(item.type, {
              width: 100,
              fontSize: 11,
              fill: solid(C.secondary),
            }),
            text(item.size, {
              width: 80,
              fontSize: 11,
              fill: solid(C.secondary),
            }),
            text(item.modified, {
              width: 140,
              fontSize: 11,
              fill: solid(C.secondary),
            }),
          ],
        ),
      ),
      ...(truncated
        ? [
            frame(
              {
                width: "fill_container",
                height: 44,
                layout: "horizontal",
                alignItems: "center",
                justifyContent: "center",
              },
              [
                text("结果已达到限制，请缩小范围。", {
                  fontSize: 12,
                  fill: solid(C.warning),
                  fontWeight: 650,
                }),
              ],
            ),
          ]
        : []),
    ],
  );
}

function buildEmptyState(spec, C) {
  const data = {
    unavailable: [
      "folder",
      "工作目录不可用",
      "请在“设置 > Agent”中检查路径，或确认 macOS 文件访问权限。",
    ],
    permission: [
      "folder",
      "需要文件夹访问权限",
      "请重新尝试、更改工作目录，或打开系统文件与文件夹设置。",
    ],
    "empty-dir": [
      "folder",
      "此文件夹为空",
      "当前目录中没有可显示的项目，可从 Finder 拖入文件或文件夹。",
    ],
    minimum: [
      "panel-left",
      "最小窗口布局",
      "侧边栏默认折叠，Inspector 默认关闭，主内容仍保持可恢复。",
    ],
  }[spec.mode];
  return frame(
    {
      name: "empty-state",
      width: "fill_container",
      height: "fill_container",
      layout: "vertical",
      gap: 10,
      alignItems: "center",
      justifyContent: "center",
      fill: solid(C.background),
    },
    [
      icon(data[0], C.secondary, 48),
      text(data[1], {
        fontSize: 15,
        fontWeight: 650,
        fill: solid(C.foreground),
      }),
      text(data[2], {
        width: 360,
        textGrowth: "fixed-width",
        textAlign: "center",
        fill: solid(C.secondary),
      }),
      ...(spec.mode === "permission"
        ? [
            frame(
              {
                width: "fit_content",
                height: 30,
                layout: "horizontal",
                gap: 8,
                alignItems: "center",
              },
              [
                actionButton("重新尝试", C, true),
                actionButton("更改工作目录", C),
                actionButton("打开文件与文件夹设置", C),
              ],
            ),
          ]
        : []),
    ],
  );
}

function actionButton(label, C, primary = false) {
  return frame(
    {
      width: "fit_content",
      height: 30,
      layout: "horizontal",
      alignItems: "center",
      padding: [0, 12],
      cornerRadius: 6,
      fill: solid(primary ? C.primary : C.background),
      stroke: stroke(primary ? C.primary : C.separator),
    },
    [
      text(label, {
        fontSize: 12,
        fontWeight: 600,
        fill: solid(primary ? C.onPrimary : C.foreground),
      }),
    ],
  );
}

function buildInspector(spec, C, visible) {
  if (!visible)
    return frame({
      name: "inspector collapsed",
      width: 0,
      height: "fill_container",
      opacity: 0,
    });
  const state =
    spec.inspectorState ?? (spec.selectedKind ? "selected" : "empty");
  return frame(
    {
      name: "inspector · 256px",
      width: 256,
      height: "fill_container",
      layout: "vertical",
      fill: solid(C.sidebar),
      stroke: stroke(C.separator),
    },
    [
      frame(
        {
          width: "fill_container",
          height: 32,
          layout: "horizontal",
          alignItems: "center",
          padding: [9, 12],
          stroke: stroke(C.separator),
        },
        [
          text("预览与信息", {
            fontSize: 11,
            fontWeight: 550,
            fill: solid(C.secondary),
          }),
        ],
      ),
      state === "selected" ? inspectorSelected(C) : inspectorEmpty(C),
    ],
  );
}

function inspectorEmpty(C) {
  return frame(
    {
      width: "fill_container",
      height: "fill_container",
      layout: "vertical",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      padding: 14,
    },
    [
      icon("info", C.secondary, 32),
      text("选择文件以查看预览和完整信息", {
        width: 180,
        textGrowth: "fixed-width",
        textAlign: "center",
        lineHeight: 1.5,
        fill: solid(C.secondary),
      }),
    ],
  );
}

function inspectorSelected(C) {
  const item =
    fileSamples.find((entry) => entry.kind === "database") ?? fileSamples[5];
  return frame(
    {
      width: "fill_container",
      height: "fill_container",
      layout: "vertical",
      gap: 12,
      padding: 14,
      clipContent: true,
    },
    [
      frame(
        {
          width: "fill_container",
          height: 120,
          layout: "horizontal",
          alignItems: "center",
          justifyContent: "center",
          cornerRadius: 8,
          fill: solid(C.background),
          stroke: stroke(C.separator),
        },
        [fileIcon(item.kind, C, 48)],
      ),
      frame(
        {
          width: "fill_container",
          height: "fit_content",
          layout: "vertical",
          gap: 10,
        },
        [
          text(item.name, {
            width: "fill_container",
            textGrowth: "fixed-width",
            fontSize: 14,
            fontWeight: 650,
            fill: solid(C.foreground),
          }),
          metadataRow(
            "完整路径",
            `~/.codex/projects/${item.name}`,
            C,
          ),
          metadataRow("种类", item.type, C),
          metadataRow("大小", item.size, C),
          metadataRow("修改时间", item.modified, C),
          actionButton("在 Finder 中显示", C),
        ],
      ),
    ],
  );
}

function metadataRow(label, value, C) {
  return frame(
    {
      width: "fill_container",
      height: "fit_content",
      layout: "horizontal",
      gap: 8,
    },
    [
      text(label, { width: 64, fontSize: 11, fill: solid(C.secondary) }),
      text(value, {
        width: "fill_container",
        textGrowth: "fixed-width",
        fontSize: 11,
        lineHeight: 1.4,
        fill: solid(C.foreground),
      }),
    ],
  );
}

function buildPathbar(spec, C) {
  const agent = activeAgent(spec);
  const segments =
    spec.activeAgentId === "claude"
      ? ["~", ".claude", "skills"]
      : ["~", agent.workdir.replace("~/", ""), "projects"];
  return frame(
    {
      name: "pathbar · 30px",
      width: "fill_container",
      height: 30,
      layout: "horizontal",
      gap: 2,
      alignItems: "center",
      padding: [0, 10],
      fill: solid(C.surface),
      stroke: stroke(C.separator),
      clipContent: true,
    },
    [
      frame(
        {
          width: "fit_content",
          height: 22,
          layout: "horizontal",
          gap: 5,
          alignItems: "center",
          padding: [0, 5],
        },
        [
          icon("hard-drive", C.disabled, 13),
          text("Macintosh HD", { fontSize: 11, fill: solid(C.disabled) }),
        ],
      ),
      ...segments.flatMap((segment, index) => [
        icon("chevron-right", C.disabled, 11),
        frame(
          {
            width: index === segments.length - 1 ? 160 : "fit_content",
            height: 22,
            layout: "horizontal",
            gap: 5,
            alignItems: "center",
            padding: [3, 5],
            cornerRadius: 4,
          },
          [
            icon(
              "folder",
              index === segments.length - 1 ? C.disabled : C.file.folder,
              13,
            ),
            text(segment, {
              width:
                index === segments.length - 1
                  ? "fill_container"
                  : "fit_content",
              textGrowth:
                index === segments.length - 1 ? "fixed-width" : undefined,
              fontSize: 11,
              fill: solid(
                index === segments.length - 1 ? C.disabled : C.foreground,
              ),
            }),
          ],
        ),
      ]),
    ],
  );
}

function buildStatusbar(spec, C) {
  const warning = spec.mode === "pagination";
  return frame(
    {
      name: "statusbar · 24px",
      width: "fill_container",
      height: 24,
      layout: "horizontal",
      justifyContent: "space_between",
      alignItems: "center",
      gap: 12,
      padding: [0, 10],
      fill: solid(C.surface),
      stroke: stroke(C.separator),
    },
    [
      frame(
        {
          width: "fill_container",
          height: "fit_content",
          layout: "horizontal",
          gap: 12,
          alignItems: "center",
        },
        [
          text("文件 11", { fontSize: 11, fill: solid(C.secondary) }),
          text("文件夹 4", { fontSize: 11, fill: solid(C.secondary) }),
          text("总大小 23.6 MB", { fontSize: 11, fill: solid(C.secondary) }),
          ...(warning
            ? [text("目录已分页", { fontSize: 11, fill: solid(C.warning) })]
            : []),
        ],
      ),
      frame(
        {
          width: "fit_content",
          height: "fit_content",
          layout: "horizontal",
          gap: 12,
          alignItems: "center",
        },
        [
          frame(
            {
              width: "fit_content",
              height: 22,
              layout: "horizontal",
              gap: 5,
              alignItems: "center",
              padding: [0, 5],
              cornerRadius: 4,
            },
            [
              icon("keyboard", C.secondary, 13),
              text("快捷键", { fontSize: 11, fill: solid(C.secondary) }),
            ],
          ),
          text("缩放", { fontSize: 11, fill: solid(C.secondary) }),
          text("100%", { fontSize: 11, fill: solid(C.secondary) }),
        ],
      ),
    ],
  );
}

function contextMenuOverlay(C, activeLabel = null) {
  const groups = [
    [
      ["打开", "⌘O"],
      ["在 Finder 中显示", "⌥⌘O"],
    ],
    [
      ["复制", "⌘C"],
      ["剪切", "⌘X"],
      ["粘贴到此处", "⌘V"],
      ["复制路径", "⌥⌘C"],
    ],
    [
      ["显示简介", "⌘I"],
      ["移到废纸篓", "⌘⌫"],
    ],
  ];
  const menuChildren = groups.flatMap((group, groupIndex) => [
    ...(groupIndex === 0 ? [] : [contextMenuSeparator(C)]),
    ...group.map(([label, shortcut]) => {
      const active = label === activeLabel;
      const disabled =
        label === "移到废纸篓" ||
        (label === "粘贴到此处" && activeLabel === null);
      return frame(
        {
          width: "fill_container",
          height: 28,
          layout: "horizontal",
          justifyContent: "space_between",
          alignItems: "center",
          padding: [0, 8],
          cornerRadius: 6,
          opacity: disabled ? 0.45 : 1,
          fill: active ? solid(C.primary) : undefined,
        },
        [
          text(label, {
            fontSize: 12,
            fill: solid(active ? C.onPrimary : C.foreground),
          }),
          text(shortcut, {
            fontSize: 11,
            fill: solid(active ? "rgba(255,255,255,0.82)" : C.secondary),
          }),
        ],
      );
    }),
  ]);
  return frame(
    {
      name: "file-context-menu",
      width: 224,
      height: "fit_content",
      layout: "vertical",
      gap: 0,
      padding: 6,
      cornerRadius: 8,
      fill: solid(C.surface),
      stroke: stroke(C.separator),
      effects: [
        {
          type: "shadow",
          offsetX: 0,
          offsetY: 8,
          blur: 24,
          spread: 0,
          color: "rgba(0,0,0,0.12)",
        },
      ],
    },
    menuChildren,
  );
}

function contextMenuSeparator(C) {
  return frame(
    {
      name: "file-context-menu__separator",
      width: "fill_container",
      height: 7,
      layout: "horizontal",
      alignItems: "center",
      padding: [0, 6],
    },
    [
      rectangle({
        width: "fill_container",
        height: 1,
        fill: solid(C.separator),
      }),
    ],
  );
}

function dropOverlay(C) {
  return frame(
    {
      name: "drop-overlay",
      width: "fill_container",
      height: "fill_container",
      layout: "vertical",
      gap: 12,
      alignItems: "center",
      justifyContent: "center",
      cornerRadius: 12,
      fill: solid(C.primarySoft),
      stroke: { thickness: 2, fill: solid(C.primary), dashPattern: [8, 6] },
    },
    [
      icon("copy-plus", C.primary, 52),
      text("复制到 projects", {
        fontSize: 20,
        fontWeight: 700,
        fill: solid(C.foreground),
      }),
      text("松开以准备复制 · 3 个项目", {
        fontSize: 12,
        fill: solid(C.secondary),
      }),
    ],
  );
}

function fileOperationDialog(C, conflict) {
  return frame(
    {
      name: conflict ? "file-operation-card conflicts" : "file-operation-card",
      width: 420,
      height: conflict ? 270 : 210,
      layout: "vertical",
      gap: 13,
      padding: 22,
      cornerRadius: 12,
      fill: solid(C.surface),
      stroke: stroke(C.separator),
      effects: [
        {
          type: "shadow",
          offsetX: 0,
          offsetY: 8,
          blur: 24,
          spread: 0,
          color: "rgba(0,0,0,0.12)",
        },
      ],
    },
    [
      text("确认复制", {
        fontSize: 16,
        fontWeight: 650,
        fill: solid(C.foreground),
      }),
      text("将 3 个来源中的 12 项复制到 projects，共 12.5 MB。", {
        width: "fill_container",
        textGrowth: "fixed-width",
        fontSize: 12,
        fill: solid(C.secondary),
      }),
      ...(conflict
        ? [
            text("2 个项目已存在", { fontSize: 12, fill: solid(C.secondary) }),
            frame(
              {
                width: "fit_content",
                height: 30,
                layout: "horizontal",
                gap: 8,
              },
              [
                radioPill("保留两者", C, true),
                radioPill("跳过", C),
                radioPill("替换", C),
              ],
            ),
          ]
        : []),
      frame(
        {
          width: "fill_container",
          height: 30,
          layout: "horizontal",
          justifyContent: "end",
          gap: 8,
        },
        [actionButton("取消", C), actionButton("复制", C, true)],
      ),
    ],
  );
}

function radioPill(label, C, checked = false) {
  return frame(
    {
      width: "fit_content",
      height: 30,
      layout: "horizontal",
      gap: 6,
      alignItems: "center",
      padding: [0, 10],
      cornerRadius: 6,
      fill: solid(C.background),
      stroke: stroke(C.separator),
    },
    [
      ellipse({
        width: 10,
        height: 10,
        fill: solid(checked ? C.primary : C.separator),
      }),
      text(label, { fontSize: 12, fill: solid(C.foreground) }),
    ],
  );
}

function notificationHost(C, width, height) {
  const stackWidth = Math.min(420, width - 36);
  return frame(
    {
      name: "notification-host",
      x: 0,
      y: 0,
      width,
      height,
      layout: "vertical",
      alignItems: "end",
      justifyContent: "end",
      padding: [0, 18, 18, 0],
    },
    [
      frame(
        {
          name: "notification-stack",
          width: stackWidth,
          height: "fit_content",
          layout: "vertical",
          gap: 8,
        },
        [notificationToast(C)],
      ),
    ],
  );
}

function notificationToast(C) {
  const borderColor = C.background === "#232325" ? "#6EA978" : "#9FCEA9";
  const countdownBackground =
    C.background === "#232325"
      ? "rgba(48,209,88,0.14)"
      : "rgba(36,138,61,0.14)";
  return frame(
    {
      name: "notification-toast notification-toast--success",
      width: "fill_container",
      height: 52,
      layout: "none",
      clipContent: true,
      cornerRadius: 8,
      fill: solid(C.background),
      stroke: stroke(borderColor),
      effects: [
        {
          type: "shadow",
          offsetX: 0,
          offsetY: 8,
          blur: 24,
          spread: 0,
          color: "rgba(0,0,0,0.12)",
        },
      ],
    },
    [
      frame(
        {
          x: 0,
          y: 0,
          width: "fill_container",
          height: 49,
          layout: "horizontal",
          gap: 8,
          alignItems: "start",
          padding: [10, 9, 13, 12],
        },
        [
          frame(
            {
              name: "notification-toast__icon",
              width: 20,
              height: 22,
              layout: "horizontal",
              alignItems: "center",
              justifyContent: "center",
            },
            [icon("check", C.success, 17)],
          ),
          text("已复制 12 项。", {
            name: "notification-toast__message",
            width: "fill_container",
            textGrowth: "fixed-width",
            fontSize: 13,
            lineHeight: 1.45,
            fill: solid(C.foreground),
          }),
          frame(
            {
              name: "notification-toast__action",
              width: "fit_content",
              height: 24,
              layout: "horizontal",
              alignItems: "center",
              padding: [0, 6],
              cornerRadius: 6,
            },
            [
              text("撤销", {
                fontSize: 13,
                fontWeight: 650,
                fill: solid(C.success),
              }),
            ],
          ),
          frame(
            {
              name: "notification-toast__close",
              width: 24,
              height: 24,
              layout: "horizontal",
              alignItems: "center",
              justifyContent: "center",
              cornerRadius: 6,
            },
            [icon("x", C.success, 15)],
          ),
        ],
      ),
      rectangle({
        name: "notification-toast__countdown background",
        x: 0,
        y: 49,
        width: "fill_container",
        height: 3,
        fill: solid(countdownBackground),
      }),
      rectangle({
        name: "notification-toast__countdown",
        x: 0,
        y: 49,
        width: 292,
        height: 3,
        fill: solid(C.success),
      }),
    ],
  );
}

function shortcutPopover(C) {
  const shortcuts = [
    ["搜索", "⌘F"],
    ["设置", "⌘,"],
    ["图标视图", "⌘1"],
    ["列表视图", "⌘2"],
    ["分栏视图", "⌘3"],
    ["刷新", "⌘R"],
    ["Inspector", "⌘I"],
    ["返回设置", "Esc"],
  ];
  return frame(
    {
      name: "shortcut-popover",
      width: 250,
      height: 200,
      layout: "vertical",
      gap: 8,
      padding: 12,
      cornerRadius: 8,
      fill: solid(C.background),
      stroke: stroke(C.separator),
      effects: [
        {
          type: "shadow",
          offsetX: 0,
          offsetY: 8,
          blur: 24,
          spread: 0,
          color: "rgba(0,0,0,0.12)",
        },
      ],
    },
    [
      text("键盘快捷键", {
        fontSize: 12,
        fontWeight: 650,
        fill: solid(C.foreground),
      }),
      ...shortcuts.map(([label, keys]) =>
        frame(
          {
            width: "fill_container",
            height: 18,
            layout: "horizontal",
            justifyContent: "space_between",
            alignItems: "center",
          },
          [
            text(label, { fontSize: 10, fill: solid(C.foreground) }),
            text(keys, {
              fontFamily: fontMono,
              fontSize: 10,
              fill: solid(C.secondary),
            }),
          ],
        ),
      ),
    ],
  );
}

function buildSettingsWorkspace(spec, C, width, height) {
  return frame(
    {
      name: "settings-workspace",
      width: "fill_container",
      height,
      layout: "horizontal",
      fill: solid(C.background),
    },
    [
      buildSettingsSidebar(spec, C),
      frame(
        {
          name: "settings-content",
          width: "fill_container",
          height: "fill_container",
          layout: "vertical",
          alignItems: "center",
          padding: [30, 0, 60],
          fill: solid(C.background),
          clipContent: true,
        },
        [settingsPage(spec, C)],
      ),
    ],
  );
}

function buildSettingsSidebar(spec, C) {
  const sections = [
    ["agents", "IDE 管理", "box"],
    ["appearance", "外观", "palette"],
    ["advanced", "高级", "sliders-horizontal"],
    ["about", "关于", "info"],
  ];
  return frame(
    {
      name: "settings-sidebar · 220px",
      width: 220,
      height: "fill_container",
      layout: "vertical",
      fill: solid(C.sidebar),
      stroke: stroke(C.separator),
    },
    [
      frame(
        {
          width: "fill_container",
          height: 44,
          layout: "horizontal",
          alignItems: "center",
          padding: [0, 14],
          stroke: stroke(C.separator),
        },
        [
          text("设置", {
            fontSize: 15,
            fontWeight: 650,
            fill: solid(C.foreground),
          }),
        ],
      ),
      frame(
        {
          width: "fill_container",
          height: "fill_container",
          layout: "vertical",
          gap: 2,
          padding: 8,
        },
        sections.map(([id, label, iconName]) => {
          const active = id === spec.settingsSection;
          return frame(
            {
              width: "fill_container",
              height: 36,
              layout: "horizontal",
              gap: 9,
              alignItems: "center",
              padding: [0, 10],
              cornerRadius: 6,
              fill: active ? solid(C.primary) : undefined,
            },
            [
              icon(iconName, active ? C.onPrimary : C.secondary, 16),
              text(label, {
                fontSize: 13,
                fill: solid(active ? C.onPrimary : C.secondary),
                fontWeight: active ? 650 : 450,
              }),
            ],
          );
        }),
      ),
      frame(
        {
          width: "fill_container",
          height: 54,
          layout: "horizontal",
          alignItems: "center",
          padding: [0, 8],
          stroke: stroke(C.separator),
        },
        [
          frame(
            {
              width: "fill_container",
              height: 44,
              layout: "horizontal",
              gap: 8,
              alignItems: "center",
              padding: [0, 8],
              cornerRadius: 6,
            },
            [
              icon("arrow-left", C.secondary, 16),
              text("返回浏览器", {
                width: "fill_container",
                textGrowth: "fixed-width",
                fontSize: 13,
                fill: solid(C.secondary),
              }),
              text("Esc", {
                fontFamily: fontMono,
                fontSize: 10,
                fill: solid(C.secondary),
              }),
            ],
          ),
        ],
      ),
    ],
  );
}

function settingsPage(spec, C) {
  const section = spec.settingsSection;
  if (section === "appearance") return appearancePage(spec, C);
  if (section === "advanced") return advancedPage(spec, C);
  if (section === "about") return aboutPage(C);
  return agentSettingsPage(spec, C);
}

function settingsShell(title, description, C, children) {
  return frame(
    {
      name: `settings-page ${title}`,
      width: 760,
      height: "fit_content",
      layout: "vertical",
      gap: 22,
    },
    [
      frame(
        {
          width: "fill_container",
          height: "fit_content",
          layout: "horizontal",
          justifyContent: "space_between",
          alignItems: "start",
        },
        [
          frame(
            {
              width: "fill_container",
              height: "fit_content",
              layout: "vertical",
              gap: 5,
            },
            [
              text(title, {
                fontSize: 20,
                fontWeight: 680,
                fill: solid(C.foreground),
              }),
              text(description, {
                width: "fill_container",
                textGrowth: "fixed-width",
                fill: solid(C.secondary),
              }),
            ],
          ),
          text("已保存", { fontSize: 11, fill: solid(C.success) }),
        ],
      ),
      frame(
        {
          width: "fill_container",
          height: "fit_content",
          layout: "vertical",
          gap: 10,
        },
        children,
      ),
    ],
  );
}

function agentSettingsPage(spec, C) {
  return settingsShell(
    "IDE 管理",
    "每个 Agent 的浏览路径、标签页和搜索上下文相互独立。",
    C,
    [
      ...agents.map((agent, index) =>
        agentCard(agent, C, spec.mode === "settings-agent-edit" && index === 0),
      ),
      settingsRow("默认 Agent", "应用启动时默认打开的工作区", C, [
        frame(
          {
            width: 130,
            height: 30,
            layout: "horizontal",
            alignItems: "center",
            padding: [0, 8],
            cornerRadius: 6,
            fill: solid(C.background),
            stroke: stroke(C.separator),
          },
          [
            text("Codex", {
              width: "fill_container",
              textGrowth: "fixed-width",
              fontSize: 12,
              fill: solid(C.foreground),
            }),
            icon("chevron-down", C.secondary, 14),
          ],
        ),
      ]),
    ],
  );
}

function agentCard(agent, C, editing = false) {
  return frame(
    {
      name: `${agent.name} settings card`,
      width: "fill_container",
      height: editing ? 92 : 66,
      layout: "horizontal",
      gap: 12,
      alignItems: "center",
      padding: [12, 14],
      cornerRadius: 8,
      fill: solid(C.surface),
      stroke: stroke(C.separator),
    },
    [
      frame(
        {
          width: 34,
          height: 34,
          layout: "horizontal",
          alignItems: "center",
          justifyContent: "center",
          cornerRadius: 8,
          fill: solid(C.primarySoft),
        },
        [agentIcon(agent, C.primary, 22)],
      ),
      frame(
        {
          width: "fill_container",
          height: "fit_content",
          layout: "vertical",
          gap: 6,
        },
        [
          frame(
            {
              width: "fill_container",
              height: "fit_content",
              layout: "horizontal",
              gap: 8,
              alignItems: "center",
            },
            [
              text(agent.name, {
                fontSize: 13,
                fontWeight: 650,
                fill: solid(C.foreground),
              }),
              statusText(C, agent.status),
            ],
          ),
          editing
            ? pathEditor(agent, C)
            : text(agent.workdir, {
                width: "fill_container",
                textGrowth: "fixed-width",
                fontFamily: fontMono,
                fontSize: 11,
                fill: solid(C.secondary),
              }),
        ],
      ),
      ...(editing
        ? []
        : [
            text("编辑", { fontSize: 11, fill: solid(C.primary) }),
            switchControl(C, agent.enabled),
          ]),
    ],
  );
}

function pathEditor(agent, C) {
  return frame(
    { width: "fill_container", height: 30, layout: "horizontal", gap: 6 },
    [
      frame(
        {
          width: "fill_container",
          height: 30,
          layout: "horizontal",
          alignItems: "center",
          padding: [0, 8],
          cornerRadius: 6,
          fill: solid(C.background),
          stroke: stroke(C.separator),
        },
        [
          text(agent.workdir, {
            width: "fill_container",
            textGrowth: "fixed-width",
            fontFamily: fontMono,
            fontSize: 11,
            fill: solid(C.foreground),
          }),
        ],
      ),
      actionButton("选择…", C),
      actionButton("取消", C),
      actionButton("完成", C, true),
    ],
  );
}

function switchControl(C, on = true) {
  return frame(
    {
      width: 34,
      height: 20,
      layout: "horizontal",
      alignItems: "center",
      justifyContent: on ? "end" : "start",
      padding: 2,
      cornerRadius: 10,
      fill: solid(on ? C.primary : C.separator),
    },
    [
      ellipse({
        width: 16,
        height: 16,
        fill: solid("#FFFFFF"),
        effects: [
          {
            type: "shadow",
            offsetX: 0,
            offsetY: 1,
            blur: 2,
            spread: 0,
            color: "rgba(0,0,0,0.24)",
          },
        ],
      }),
    ],
  );
}

function settingsRow(title, description, C, control) {
  return frame(
    {
      width: "fill_container",
      height: 66,
      layout: "horizontal",
      gap: 12,
      justifyContent: "space_between",
      alignItems: "center",
      padding: [12, 14],
      cornerRadius: 8,
      fill: solid(C.surface),
      stroke: stroke(C.separator),
    },
    [
      frame(
        {
          width: "fill_container",
          height: "fit_content",
          layout: "vertical",
          gap: 4,
        },
        [
          text(title, {
            fontSize: 13,
            fontWeight: 580,
            fill: solid(C.foreground),
          }),
          text(description, { fontSize: 11, fill: solid(C.secondary) }),
        ],
      ),
      ...control,
    ],
  );
}

function appearancePage(spec, C) {
  return settingsShell("外观", "调整主题、强调色、缩放和文件显示方式。", C, [
    settingsRow("主题", "自动模式跟随 macOS 外观", C, [
      segmentedText(["浅色", "深色", "自动"], "自动", C),
    ]),
    settingsRow("强调色", "仅用于交互强调，不替代状态颜色", C, [
      accentPicker(C),
    ]),
    settingsRow("界面缩放", "支持 75% 至 150%", C, [rangeField("100%", C)]),
    settingsRow("字体大小", "不改变布局缩放", C, [
      segmentedText(["小", "中", "大", "特大"], "中", C),
    ]),
    settingsRow("文件夹图标", "全局应用于图标、列表和分栏视图", C, [
      folderIconPicker(C),
    ]),
    settingsRow("显示隐藏文件", "名称以点开头的文件将半透明显示", C, [
      switchControl(C, false),
    ]),
    ...(spec.mode === "settings-folder-icons"
      ? [
          frame(
            {
              width: "fill_container",
              height: 72,
              layout: "horizontal",
              gap: 12,
              alignItems: "center",
              padding: [0, 14],
              cornerRadius: 8,
              fill: solid(C.primarySoft),
              stroke: stroke(C.primary),
            },
            [
              icon("folder", C.file.folder, 30),
              text(
                "三套文件夹图标会同步影响图标、列表、分栏、搜索结果和 Inspector。",
                {
                  width: "fill_container",
                  textGrowth: "fixed-width",
                  fontWeight: 650,
                  fill: solid(C.foreground),
                },
              ),
            ],
          ),
        ]
      : []),
  ]);
}

function segmentedText(options, active, C) {
  return frame(
    {
      width: "fit_content",
      height: 32,
      layout: "horizontal",
      gap: 2,
      padding: 2,
      cornerRadius: 6,
      fill: solid(C.background),
      stroke: stroke(C.separator),
    },
    options.map((option) =>
      frame(
        {
          width: "fit_content",
          height: 26,
          layout: "horizontal",
          alignItems: "center",
          justifyContent: "center",
          padding: [0, 10],
          cornerRadius: 4,
          fill: option === active ? solid(C.primary) : undefined,
        },
        [
          text(option, {
            fontSize: 12,
            fill: solid(option === active ? C.onPrimary : C.secondary),
            fontWeight: option === active ? 650 : 450,
          }),
        ],
      ),
    ),
  );
}

function accentPicker(C) {
  return frame(
    {
      width: "fit_content",
      height: 26,
      layout: "horizontal",
      gap: 10,
      alignItems: "center",
    },
    ["#007AFF", "#248A3D", "#C95D00", "#8944AB", "#D70015"].map(
      (color, index) =>
        ellipse({
          width: 22,
          height: 22,
          fill: solid(color),
          stroke: stroke(
            index === 0 ? C.primary : C.separator,
            index === 0 ? 3 : 1,
          ),
        }),
    ),
  );
}

function rangeField(value, C) {
  return frame(
    {
      width: 180,
      height: 26,
      layout: "horizontal",
      gap: 10,
      alignItems: "center",
    },
    [
      frame(
        { width: 120, height: 4, cornerRadius: 2, fill: solid(C.separator) },
        [
          rectangle({
            width: 72,
            height: 4,
            cornerRadius: 2,
            fill: solid(C.primary),
          }),
        ],
      ),
      text(value, { width: 42, textAlign: "right", fill: solid(C.secondary) }),
    ],
  );
}

function folderIconPicker(C) {
  return frame(
    { width: "fit_content", height: 50, layout: "horizontal", gap: 6 },
    [
      folderIconOption("线框", C, true),
      folderIconOption("实心", C),
      folderIconOption("双色", C),
    ],
  );
}

function folderIconOption(label, C, active = false) {
  return frame(
    {
      width: 58,
      height: 50,
      layout: "vertical",
      gap: 2,
      alignItems: "center",
      justifyContent: "center",
      cornerRadius: 6,
      fill: solid(active ? C.primarySoft : C.background),
      stroke: stroke(active ? C.primary : C.separator),
    },
    [
      icon("folder", C.file.folder, 26),
      text(label, {
        fontSize: 10,
        fill: solid(active ? C.foreground : C.secondary),
      }),
    ],
  );
}

function advancedPage(spec, C) {
  return settingsShell("高级", "控制搜索、文件读取和大型目录的资源限制。", C, [
    settingsRow("跟随符号链接", "关闭时可降低循环路径和越界风险", C, [
      switchControl(C, false),
    ]),
    settingsRow("最大搜索结果数", "达到上限后提示缩小范围", C, [
      numberInput("100", C),
    ]),
    settingsRow("文件读取超时", "单位：秒", C, [numberInput("10", C)]),
    settingsRow("启用分页阈值", "超出后仅加载当前页", C, [
      numberInput("200", C),
    ]),
    settingsResetRow(C),
    ...(spec.mode === "settings-reset-dialog" ? [settingsResetDialog(C)] : []),
  ]);
}

function numberInput(value, C) {
  return frame(
    {
      width: 100,
      height: 30,
      layout: "horizontal",
      alignItems: "center",
      justifyContent: "end",
      padding: [0, 8],
      cornerRadius: 6,
      fill: solid(C.background),
      stroke: stroke(C.separator),
    },
    [text(value, { fontSize: 12, fill: solid(C.foreground) })],
  );
}

function settingsResetRow(C) {
  return frame(
    {
      width: "fill_container",
      height: 66,
      layout: "horizontal",
      justifyContent: "space_between",
      alignItems: "center",
      gap: 16,
      padding: [12, 14],
      cornerRadius: 8,
      fill: solid(C.surface),
      stroke: stroke(C.separator),
    },
    [
      frame(
        {
          width: "fill_container",
          height: "fit_content",
          layout: "vertical",
          gap: 4,
        },
        [
          text("还原所有默认设置", {
            fontSize: 13,
            fontWeight: 580,
            fill: solid(C.foreground),
          }),
          text("恢复 Agent、外观和高级选项的初始配置", {
            fontSize: 11,
            fill: solid(C.secondary),
          }),
        ],
      ),
      frame(
        {
          width: "fit_content",
          height: 30,
          layout: "horizontal",
          alignItems: "center",
          padding: [0, 10],
          cornerRadius: 6,
          fill: solid(C.background),
          stroke: stroke(C.destructive),
        },
        [text("还原默认设置…", { fontSize: 12, fill: solid(C.destructive) })],
      ),
    ],
  );
}

function settingsResetDialog(C) {
  return frame(
    {
      name: "settings-reset-dialog",
      width: 430,
      height: 280,
      layout: "vertical",
      gap: 14,
      padding: 22,
      cornerRadius: 12,
      fill: solid(C.surface),
      stroke: stroke(C.separator),
      effects: [
        {
          type: "shadow",
          offsetX: 0,
          offsetY: 8,
          blur: 24,
          spread: 0,
          color: "rgba(0,0,0,0.12)",
        },
      ],
    },
    [
      text("还原所有默认设置？", {
        fontSize: 16,
        fontWeight: 650,
        fill: solid(C.foreground),
      }),
      text(
        "以下内容将恢复为初始配置：\n• Agent 路径、启用状态和默认 Agent\n• 主题、强调色、缩放、字体、文件夹图标和隐藏文件选项\n• 搜索、文件读取和分页参数",
        {
          width: "fill_container",
          textGrowth: "fixed-width",
          lineHeight: 1.5,
          fill: solid(C.secondary),
        },
      ),
      text(
        "自定义 Agent、当前标签和浏览记录将被清除，但不会删除任何磁盘文件。",
        {
          width: "fill_container",
          textGrowth: "fixed-width",
          fill: solid(C.foreground),
        },
      ),
      frame(
        {
          width: "fill_container",
          height: 30,
          layout: "horizontal",
          justifyContent: "end",
          gap: 8,
        },
        [
          actionButton("取消", C),
          actionButton("确认还原", { ...C, primary: C.destructive }, true),
        ],
      ),
    ],
  );
}

function aboutPage(C) {
  return settingsShell("关于", "版本信息、许可与快捷键参考。", C, [
    frame(
      {
        width: "fill_container",
        height: 210,
        layout: "vertical",
        gap: 7,
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        cornerRadius: 12,
        fill: solid(C.surface),
        stroke: stroke(C.separator),
      },
      [
        image(appIcon, 76, 76),
        text("IDE 工作目录浏览器", {
          fontSize: 16,
          fontWeight: 650,
          fill: solid(C.foreground),
        }),
        text("v1.0.0", { fill: solid(C.secondary) }),
        text("Electron 38.1 · Node 22.18 · Chromium 140", {
          fill: solid(C.secondary),
        }),
      ],
    ),
    frame(
      {
        width: "fill_container",
        height: 140,
        layout: "vertical",
        gap: 8,
        padding: 14,
        cornerRadius: 8,
        fill: solid(C.background),
        stroke: stroke(C.separator),
      },
      [
        text("键盘快捷键", {
          fontSize: 13,
          fontWeight: 650,
          fill: solid(C.foreground),
        }),
        text(
          "⌘1 图标视图    ⌘2 列表视图    ⌘3 分栏视图\n⌘F 搜索         ⌘R 刷新         Esc 返回浏览器",
          {
            width: "fill_container",
            textGrowth: "fixed-width",
            fontFamily: fontMono,
            lineHeight: 1.7,
            fill: solid(C.secondary),
          },
        ),
      ],
    ),
  ]);
}

function spinner(C, size) {
  return frame(
    {
      width: size,
      height: size,
      layout: "none",
      cornerRadius: size / 2,
      stroke: { thickness: 2, fill: solid(C.separator) },
    },
    [
      ellipse({
        x: size / 2 - 3,
        y: 0,
        width: 6,
        height: 6,
        fill: solid(C.primary),
      }),
    ],
  );
}

function buildDesignSystem(spec) {
  const C = light;
  if (spec.mode === "file-icons") return buildFileIconSystem(C);
  return frame(
    {
      name: spec.name,
      width: 1600,
      height: 1010,
      layout: "vertical",
      padding: [44, 52],
      gap: 28,
      fill: solid("#F3F4F7"),
      fontFamily: fontSans,
    },
    [
      designHeader(
        "App 与 Agent 图标",
        "真实应用资产来源：renderer/src/assets/app-icon.svg 与 agent-icons/*.svg",
        C,
      ),
      frame(
        {
          width: "fill_container",
          height: 170,
          layout: "horizontal",
          gap: 20,
          padding: 22,
          cornerRadius: 14,
          fill: solid("#FFFFFF"),
          stroke: stroke("#D9D9DE"),
        },
        [
          frame(
            {
              width: 260,
              height: "fill_container",
              layout: "horizontal",
              gap: 16,
              alignItems: "center",
              justifyContent: "center",
              cornerRadius: 10,
              fill: solid("#F7F7F8"),
            },
            [
              image(appIcon, 72, 72),
              frame(
                {
                  width: "fit_content",
                  height: "fit_content",
                  layout: "vertical",
                  gap: 4,
                },
                [
                  text("IDE 工作目录浏览器", {
                    fontSize: 16,
                    fontWeight: 750,
                    fill: solid(C.foreground),
                  }),
                  text("App Icon · 1024", {
                    fontSize: 10,
                    fill: solid(C.secondary),
                  }),
                ],
              ),
            ],
          ),
          ...[48, 32, 24, 16].map((size) =>
            frame(
              {
                width: "fill_container",
                height: "fill_container",
                layout: "vertical",
                gap: 7,
                alignItems: "center",
                justifyContent: "center",
                cornerRadius: 10,
                fill: solid("#F7F7F8"),
              },
              [
                image(appIcon, size, size),
                text(`${size}px`, { fontSize: 10, fill: solid(C.secondary) }),
              ],
            ),
          ),
        ],
      ),
      frame(
        {
          width: "fill_container",
          height: 560,
          layout: "vertical",
          gap: 16,
          padding: 22,
          cornerRadius: 14,
          fill: solid("#FFFFFF"),
          stroke: stroke("#D9D9DE"),
        },
        [
          text("10 个默认 Agent", {
            fontSize: 17,
            fontWeight: 700,
            fill: solid(C.foreground),
          }),
          frame(
            {
              width: "fill_container",
              height: "fill_container",
              layout: "vertical",
              gap: 12,
            },
            Array.from({ length: 2 }, (_, rowIndex) =>
              frame(
                {
                  width: "fill_container",
                  height: "fill_container",
                  layout: "horizontal",
                  gap: 12,
                },
                agents.slice(rowIndex * 5, rowIndex * 5 + 5).map((agent) =>
                  frame(
                    {
                      width: "fill_container",
                      height: "fill_container",
                      layout: "horizontal",
                      gap: 12,
                      alignItems: "center",
                      padding: [10, 12],
                      cornerRadius: 10,
                      fill: solid("#F7F7F8"),
                      stroke: stroke("#ECECEF"),
                    },
                    [
                      agentIcon(agent, C.foreground, 36),
                      frame(
                        {
                          width: "fill_container",
                          height: "fit_content",
                          layout: "vertical",
                          gap: 3,
                        },
                        [
                          text(agent.name, {
                            fontSize: 12,
                            fontWeight: 650,
                            fill: solid(C.foreground),
                          }),
                          text(agent.workdir, {
                            fontFamily: fontMono,
                            fontSize: 9,
                            fill: solid(C.secondary),
                          }),
                          statusPill(C, agent.status),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    ],
  );
}

function buildFileIconSystem(C) {
  const kinds = [
    ["folder", "文件夹 · 线框/实心/双色"],
    ["database", "SQLite / DB"],
    ["json", "JSON / JSONL / NDJSON"],
    ["markdown", "Markdown"],
    ["config", "配置"],
    ["terminal", "脚本"],
    ["key", "密钥"],
    ["table", "表格"],
    ["archive", "压缩包"],
    ["image", "图片"],
    ["code", "代码"],
    ["document", "文档"],
    ["binary", "二进制"],
    ["text", "纯文本"],
    ["file", "未知扩展"],
  ];
  return frame(
    {
      name: "G43 设计系统 · 文件类型图标",
      width: 1600,
      height: 1010,
      layout: "vertical",
      padding: [44, 52],
      gap: 28,
      fill: solid("#F3F4F7"),
      fontFamily: fontSans,
    },
    [
      designHeader(
        "文件类型图标系统",
        "与 src/shared/file-icons.ts 和 FileIcon.tsx 保持一致",
        C,
      ),
      frame(
        {
          width: "fill_container",
          height: 720,
          layout: "vertical",
          gap: 14,
          padding: 22,
          cornerRadius: 14,
          fill: solid("#FFFFFF"),
          stroke: stroke("#D9D9DE"),
        },
        [
          text("类型、颜色与使用场景", {
            fontSize: 17,
            fontWeight: 700,
            fill: solid(C.foreground),
          }),
          ...Array.from({ length: 3 }, (_, rowIndex) =>
            frame(
              {
                width: "fill_container",
                height: "fill_container",
                layout: "horizontal",
                gap: 12,
              },
              kinds.slice(rowIndex * 5, rowIndex * 5 + 5).map(([kind, label]) =>
                frame(
                  {
                    width: "fill_container",
                    height: "fill_container",
                    layout: "vertical",
                    gap: 10,
                    alignItems: "center",
                    justifyContent: "center",
                    cornerRadius: 10,
                    fill: solid("#F7F7F8"),
                    stroke: stroke("#ECECEF"),
                  },
                  [
                    fileIcon(kind, C, 38),
                    text(kind, {
                      fontFamily: fontMono,
                      fontSize: 12,
                      fontWeight: 650,
                      fill: solid(C.foreground),
                    }),
                    text(label, {
                      width: "fill_container",
                      textGrowth: "fixed-width",
                      textAlign: "center",
                      fontSize: 10,
                      fill: solid(C.secondary),
                    }),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    ],
  );
}

function designHeader(title, subtitle, C) {
  return frame(
    {
      width: "fill_container",
      height: 92,
      layout: "horizontal",
      justifyContent: "space_between",
      alignItems: "center",
    },
    [
      frame(
        {
          width: "fill_container",
          height: "fit_content",
          layout: "vertical",
          gap: 7,
        },
        [
          text(title, {
            fontSize: 30,
            fontWeight: 750,
            fill: solid(C.foreground),
          }),
          text(subtitle, { fontSize: 13, fill: solid(C.secondary) }),
        ],
      ),
      frame(
        {
          width: 210,
          height: 34,
          layout: "horizontal",
          alignItems: "center",
          justifyContent: "center",
          cornerRadius: 17,
          fill: solid("rgba(0,122,255,0.10)"),
        },
        [
          text("与最新 React 实现一致", {
            fontSize: 12,
            fontWeight: 650,
            fill: solid(C.primary),
          }),
        ],
      ),
    ],
  );
}

function writeJson(temp, index, tree) {
  const file = join(temp, `${String(index).padStart(2, "0")}.json`);
  writeFileSync(file, JSON.stringify(tree));
  return file;
}

runRaw(["open", "ide-workdir-browser.op"]);
let initial = runJson(["page", "list"]);
for (let i = initial.pages.length - 1; i > 0; i -= 1)
  runJson(["page", "remove", initial.pages[i].id]);
initial = runJson(["page", "list"]);

const temp = mkdtempSync(join(tmpdir(), "workdir-design-"));

for (let i = 0; i < pages.length; i += 1) {
  let pageId;
  if (i === 0) {
    pageId = initial.pages[0].id;
    runJson(["page", "rename", pageId, pages[i].name]);
  } else {
    runJson(["page", "add", "--name", pages[i].name]);
    const state = runJson(["page", "list"]);
    pageId = state.pages[state.activePageIndex].id;
  }

  const existing = runJson(["get", "--depth", "0", "--page", pageId]);
  for (const existingNode of existing.nodes)
    runJson(["delete", existingNode.id, "--page", pageId]);

  const source = writeJson(temp, i, buildPage(pages[i]));
  const result = runJson(["--page", pageId, "insert", `@${source}`]);
  const inserted = Boolean(
    result.nodeId ||
    Number(result.count) > 0 ||
    result.wrote === true ||
    result.wrote === "true",
  );
  if (!inserted)
    throw new Error(
      `No node inserted for ${pages[i].name}: ${JSON.stringify(result)}`,
    );
}

runRaw(["save", "ide-workdir-browser.op"]);
console.log(
  JSON.stringify({ pages: pages.length, file: "ide-workdir-browser.op" }),
);
