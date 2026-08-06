import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const run = (args) =>
  JSON.parse(
    execFileSync("op", args, {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    }),
  );

const groups = [
  {
    name: "01 设计系统",
    indices: [41, 42],
    description: "应用图标、10 个 Agent 品牌资产与文件类型图标系统",
  },
  {
    name: "02 核心浏览体验",
    indices: [0, 1, 2, 6, 7, 29, 30, 31, 37, 39],
    description:
      "图标/列表/分栏视图、Inspector、隐藏文件、长文件名、分页、宽窗与 Agent 隔离",
  },
  {
    name: "03 文件预览",
    indices: [3, 4, 5, 27, 28, 34],
    description: "代码、Markdown、图片、大文件、二进制/不支持预览与暗色预览",
  },
  {
    name: "04 搜索与文件操作",
    indices: [8, 9, 10, 11, 12, 13, 14, 15, 40],
    description:
      "搜索结果、无结果、超量、右键菜单、拖入、确认、冲突、通知与跨 Agent 粘贴",
  },
  {
    name: "05 设置",
    indices: [16, 17, 18, 19, 20, 21, 22],
    description: "IDE 管理、路径编辑、外观、文件夹图标、高级、重置确认与关于",
  },
  {
    name: "06 边缘与系统状态",
    indices: [23, 24, 25, 26],
    description: "工作目录不可用、权限、空目录与启动/读取加载态",
  },
  {
    name: "07 主题响应式与帮助",
    indices: [32, 33, 35, 36, 38],
    description: "暗色、窄窗、最小窗口与快捷键速查",
  },
];

const original = run(["page", "list"]).pages;
if (original.length !== 43)
  throw new Error(`Expected 43 source pages, got ${original.length}`);

const temp = mkdtempSync(join(tmpdir(), "workdir-consolidate-"));
const sources = original.map((page, index) => {
  const root = run(["get", "--depth", "0", "--page", page.id]).nodes[0];
  const full = run(["read-nodes", root.id, "--depth", "30", "--page", page.id])
    .nodes[0];
  if (!full) throw new Error(`Cannot read source ${page.name}`);
  const file = join(temp, `${String(index).padStart(2, "0")}.json`);
  writeFileSync(file, JSON.stringify(full));
  return { page, root, file };
});

const created = [];
const rowHeight = 1080;
const collectionWidth = 3488;
for (const group of groups) {
  run(["page", "add", "--name", group.name]);
  const state = run(["page", "list"]);
  const page = state.pages[state.activePageIndex];
  const blank = run(["get", "--depth", "0", "--page", page.id]).nodes;
  for (const node of blank) run(["delete", node.id, "--page", page.id]);

  const rows = Math.ceil(group.indices.length / 2);
  const rootHeight = 150 + rows * rowHeight + Math.max(0, rows - 1) * 32 + 56;
  const skeleton = {
    type: "frame",
    name: group.name,
    width: collectionWidth,
    height: rootHeight,
    layout: "vertical",
    gap: 32,
    padding: [44, 56],
    fill: [{ type: "solid", color: "#E7E9EE" }],
    children: [
      {
        type: "frame",
        name: "Collection Header",
        width: "fill_container",
        height: 106,
        layout: "vertical",
        gap: 8,
        children: [
          {
            type: "text",
            content: group.name,
            fontSize: 32,
            fontWeight: 750,
            fill: [{ type: "solid", color: "#1D1D1F" }],
          },
          {
            type: "text",
            content: group.description,
            fontSize: 14,
            fill: [{ type: "solid", color: "#737378" }],
          },
          {
            type: "text",
            content: `${group.indices.length} 个设计状态 · 同类资产集中管理`,
            fontSize: 11,
            fill: [{ type: "solid", color: "#007AFF" }],
          },
        ],
      },
      ...Array.from({ length: rows }, (_, i) => ({
        type: "frame",
        name: `Screen Row ${i + 1}`,
        width: "fill_container",
        height: rowHeight,
        layout: "horizontal",
        gap: 32,
        alignItems: "start",
        children: [],
      })),
    ],
  };
  const skeletonFile = join(temp, `${group.name}.json`);
  writeFileSync(skeletonFile, JSON.stringify(skeleton));
  run(["--page", page.id, "insert", `@${skeletonFile}`]);
  const tree = run(["get", "--depth", "2", "--page", page.id]).nodes[0];
  const rowIds = tree.children
    .filter((child) => child.name?.startsWith("Screen Row"))
    .map((child) => child.id);

  for (let position = 0; position < group.indices.length; position++) {
    const source = sources[group.indices[position]];
    run([
      "--page",
      page.id,
      "insert",
      `@${source.file}`,
      "--parent",
      rowIds[Math.floor(position / 2)],
    ]);
  }
  created.push(page);
}

for (const page of original) run(["page", "remove", page.id]);
execFileSync("op", ["save", "ide-workdir-browser.op"], { encoding: "utf8" });
console.log(
  JSON.stringify({ pages: created.length, names: created.map((p) => p.name) }),
);
