# DesignX - React + Fabric 海报编辑器

## 项目定位

DesignX 是一个基于 React 19、Zustand 与 Fabric.js 7 的数据驱动画布编辑器。当前版本聚焦海报/请柬编辑的核心链路：文档 Schema、图层编辑、画布缩放、属性面板、国际化与导出能力。

## 技术栈

| 类别 | 选型 | 说明 |
|------|------|------|
| 框架 | React 19 + Vite 7 | 纯 SPA 架构，追求极限交互性能 |
| 语言 | TypeScript 5.9 | `verbatimModuleSyntax` 严格类型检查 |
| 图形引擎 | Fabric.js v7 | 独立 EditorEngine + Workspace buffer 渲染 |
| 状态管理 | Zustand 5 | 轻量单向数据流，不可变更新 |
| 样式 | Tailwind CSS v4 | 原子化 CSS，零运行时 |
| 国际化 | i18next + react-i18next | 5 语言自动检测（zh-CN / zh-TW / en-US / ja-JP / ko-KR） |
| 图标 | Lucide React | 轻量 SVG 图标库 |
| 工具库 | clsx + tailwind-merge | 条件类名合并 |

## 核心架构

```
┌─────────────────────────────────────────────────┐
│                    React UI                     │
│  ┌──────┐  ┌──────────┐  ┌──────────────────┐  │
│  │Header│  │LeftPanel  │  │   RightPanel     │  │
│  └──────┘  │ 工具栏    │  │ 属性面板          │  │
│            │ 图层树    │  │ (文本/布局/排版/   │  │
│            └──────────┘  │  颜色/描边/图层)   │  │
│                          └──────────────────┘  │
│  ┌─────────────────────────────────────────┐   │
│  │            Workspace (Canvas)           │   │
│  └─────────────────────────────────────────┘   │
└───────────────┬─────────────────┬───────────────┘
                │ Zustand Store   │
                │ (唯一数据源)     │
                ├─────────────────┤
                │ EditorEngine    │
                │ (Fabric.js 防腐层)│
                └─────────────────┘
```

### 设计原则

1. **数据驱动 (Single Source of Truth)**：所有状态以 JSON Schema 为唯一事实来源，React 视图与 Fabric 画布均为数据映射。
2. **引擎防腐层**：`EditorEngine` 独立类接管 `<canvas>` 节点，隔离 React 重渲染流，防止图形矩阵运算被干扰。
3. **坐标系与锚点基准**：Fabric v7 默认锚点改变，项目中所有自定义图层初始化时强制使用 `originX: 'left'` 与 `originY: 'top'`，严格对齐左上角坐标系。
4. **防闪烁异步渲染**：涉及图片等异步资源的重载或层级调整时，通过 `Promise.all` 等待资源加载就绪后再执行同步的 DOM / Canvas 操作。
5. **模块化 UI**：右侧属性面板按图层类型拆分，复杂交互逻辑优先放入 `*.handlers.ts` 纯 TS 文件。
6. **工作区缩放规则**：当前交互定义为“画布始终保持在工作区中央”，滚轮、右下角按钮与百分比预设均采用中心缩放；缩放动画由 Workspace 层驱动，Engine 只负责显示缩放与 buffer 同步。

## 项目结构

```
src/
├── App.tsx
├── main.tsx
├── index.css
├── components/ui/                   # 通用 UI 组件
│   ├── FillPicker/                  #   填充/渐变面板
│   ├── Button.tsx
│   ├── ColorPicker.tsx
│   ├── Dialog.tsx
│   ├── FontSelect.tsx
│   ├── Icons.tsx
│   ├── Input.tsx
│   ├── Select.tsx
│   ├── Slider.tsx
│   ├── Tabs.tsx
│   └── Tooltip.tsx
├── constants/
│   └── fonts.ts
├── core/
│   ├── engine/                      # Engine 子模块（canvas / layers / events / viewport / workspace）
│   ├── export/                      # PDF / SVG 导出
│   ├── canvasMath.ts
│   ├── canvasPresets.ts
│   ├── constants.ts
│   ├── cursors.ts
│   ├── CustomTextbox.ts
│   ├── EditorUI.ts
│   └── layerControls.ts
├── hooks/
│   └── useCanvas.ts
├── locales/                         # 国际化资源
│   ├── index.ts
│   ├── zh-CN.json
│   ├── zh-TW.json
│   ├── en-US.json
│   ├── ja-JP.json
│   └── ko-KR.json
├── store/
│   └── useEditorStore.ts            # 文档 / 历史 / 缩放 / 命令桥接
├── types/
│   └── schema.ts
├── utils/
│   ├── cn.ts
│   └── uuid.ts
└── views/Editor/
    ├── index.tsx
    └── components/
        ├── ExportDialog.tsx
        ├── Header.tsx
        ├── Header.handlers.ts
        ├── LeftPanel.tsx
        ├── Workspace/
        │   ├── handlers.ts          # 工作区缩放 / 尺寸拖拽 / 视口同步
        │   ├── index.tsx
        │   ├── ResizeHandle.tsx
        │   ├── shared.ts
        │   └── ZoomControls.tsx
        └── RightPanel/
            ├── CanvasPanel/
            ├── ImagePanel/
            ├── TextPanel/
            └── index.tsx
```

## 当前能力

- [x] Schema 驱动的文档、页面与图层模型
- [x] Zustand Store + EditorCommand 桥接的单向数据流
- [x] 文本图层、图片图层、组合图层 (Group) 新增、选中、更新、缩放、拖拽
- [x] 图层防闪烁异步渲染管线
- [x] Workspace 画布尺寸拖拽与缓冲层预览
- [x] 画布缩放（滚轮 / `+ -` / 百分比预设 / Fit）
- [x] 撤销 / 重做历史栈
- [x] 背景色 / 渐变、字体选择、填充面板
- [x] PNG / JPEG / SVG / PDF 导出
- [x] 中英日韩繁简多语言

## 注释约定

- 整个项目要求“函数级注释全覆盖”
- 所有函数都需要注释，包括组件、工具函数、事件处理函数、Store action、Engine 方法与内部辅助函数
- 注释以中文为主，重点说明用途、参数、返回值、调用时机与边界条件
- 复杂逻辑内部必须补充中文内联注释，尤其是缩放、坐标换算、Fabric 事件同步、缓冲层、历史栈提交时机等代码
- 目标不是“有注释就行”，而是让新开发者进入文件后能快速理解实现原因与维护风险

## 快速开始

```bash
pnpm install

pnpm dev

pnpm build

pnpm lint
```

## 工作区缩放说明

- 当前产品定义是“画布始终保持在工作区中央”
- 鼠标滚轮、右下角 `+ -`、百分比预设都属于中心缩放，不做鼠标锚点跟随
- Workspace 层负责平滑缩放与视口居中，Engine 层负责同步 Fabric 的显示 zoom 与 buffer 尺寸
