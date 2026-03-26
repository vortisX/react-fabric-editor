# React + Fabric.js 海报生成器核心架构与开发指南 (For AI Assistant)

> **致 AI 开发助手（Claude Code / Cursor 等）的最高指令**：
> 本项目是一个面向生产环境的开源海报生成器。在编写、重构或添加功能时，请**必须**严格遵循下述的架构规范与工程标准。本项目坚持**“数据即视图（Data-Driven）”**的黄金法则，UI 层与 Canvas 渲染层绝对物理隔离。如果你违反以下规则，你的代码将被拒绝。

---

## 1. 核心架构原则 (Core Architecture Principles)

1. **唯一事实来源 (SSOT)**：`Zustand Store` 中的 JSON Schema 是文档的唯一真实状态。
2. **严格单向数据流**：`React UI` 触发操作 -> 更新 `Zustand Store` -> 触发 `Fabric Engine` 重新渲染。**严禁 React UI 组件直接获取 Canvas 实例去调用 `.set()` 或 `.renderAll()`**。
3. **Canvas 事件反向同步**：用户在画布上的直接操作（拖拽、缩放、旋转），必须由 `Fabric Engine` 捕获（如 `object:modified`），并通过调用 Store 的 action 同步回 Schema。
4. **性能优先 (Performance First)**：高频交互（如 `object:moving`）的同步必须做**节流（Throttling）或批量更新**，避免 React 树发生灾难性的频繁 Re-render。

---

## 2. 数据模型设计 (Schema Design)

所有的设计结构都在 `src/types/schema.ts` 中以强类型定义。

* **DesignDocument**: 包含 `workId`, `global` (尺寸, dpi, 单位) 以及 `pages`。
* **Layer (图层)**:
  * 基础属性必须包含：`id`, `type`, `x`, `y`, `width`, `height`, `rotation`, `opacity`, `visible`, `locked`。
  * **Z-Index 层级**：数组的自然顺序即为渲染层级（Index 越大越靠前）。严禁在 Layer 对象中存储绝对的 `zIndex` 数字，图层上下移操作应表现为**数组元素的重排**。

---

## 3. 状态与历史管理 (State & History Management)

Zustand Store (`src/store/useEditorStore.ts`) 负责全盘状态：
* **撤销/重做 (Undo/Redo)**：在 Store 中维护完整的历史记录堆栈。**只有明确的“操作完成”（如 `object:modified`、UI 面板的 `onBlur`/`onChangeComplete`）才推入历史栈**，高频拖拽过程中的实时更新（Live Transform）**绝不能**推入历史栈。
* **Immutable Updates**：在更新深层嵌套的数据时，严格保持数据的不可变性。

---

## 4. 画布引擎与性能规范 (Fabric Engine Specifications)

* **Fabric v7 API**：严格使用 Fabric.js 7.x 的 ES Module 语法（如 `import { Canvas, Textbox, FabricImage } from "fabric"`）。
* **防闪烁与异步渲染 (Anti-Flicker & Async Rendering)**：当执行图层组合/解组、层级调整、或全盘 `document:load` 等操作时，由于图片等资源需要异步加载，**必须先通过 `Promise.all` 等待所有图层实例在内存中加载就绪后，再执行同步的 `canvas.remove/insertAt/clear` 和 `canvas.add` 操作**。绝不能先清空画布再等待异步加载，否则会导致明显的视觉闪烁。
* **层级调整防闪烁铁律 (Reorder No-Flicker Rule)**：执行上移/下移/拖拽换位时，**默认必须走“原地重排”路径（如 `layers:reorder`）**，直接基于当前 Fabric 对象重排顺序；严禁退化为 `document:load -> canvas.clear()` 的整画布重建流程。重排期间应批处理（如临时关闭 `renderOnAddRemove`）并仅在末尾 `requestRenderAll()` 一次。
* **组合操作防闪烁铁律 (Group No-Flicker Rule)**：执行“组合所选图层”或会触发文档重载的组合相关操作时，**必须先在内存中异步预构建完整新图层栈，再原子替换画布对象**，保证旧画面在替换前持续可见；严禁“先清空再等待资源加载”。同时必须防止并发加载回写旧结果（如使用 load token/cancel 机制）。
* **防回归强约束 (No Regression Constraint)**：后续任何功能开发、重构或性能优化，**都不得破坏上述两条防闪烁规则**。凡是涉及图层层级、组合/解组、文档加载链路的改动，必须先自检并验证“画布持续可见、无闪烁、无抖动”。
* **高频渲染优化**：调用更新时，**永远使用 `canvas.requestRenderAll()`** 而不是同步的 `canvas.renderAll()`。
* **缩放重置策略 (Scale Normalization)**：Fabric 默认通过改变 `scaleX/scaleY` 来缩放对象。引擎在捕获到缩放事件时，**必须**将 `scale` 转换为实际的 `width/height/fontSize` 存入 Store，并强制将对象的 `scaleX/scaleY` 重置为 `1`。这保证了导出的 JSON 始终是标准尺寸。
* **实时变形与排版同步 (Live Transform & Layout Sync)**：处理 `object:moving`、`object:scaling` 和 `object:resizing` 高频交互时，必须做节流更新。特别注意：**当拖拽文本框边缘改变宽度触发 `resizing` 时，必须在节流更新前调用 `target.initDimensions()` 和 `target.autoFitHeight()`，并立刻请求重绘 `canvas.requestRenderAll()`**，同时把重新计算后的真实 `width`、`height` 包含在 payload 中同步给 Store，确保 React 属性面板和画布表现完全一致。 
* **工作区缩放职责边界**：
  * `Store.zoom` 表示工作区显示缩放，而不是文档真实尺寸。
  * `Workspace` 负责滚轮、右下角百分比按钮、Fit 等缩放交互，以及视口居中与过渡动画。
  * `EditorEngine` 只负责把 `displayZoom` 同步到 Fabric viewport/buffer，**不要**在 Engine 内引入 React 视口滚动逻辑。
* **当前缩放产品规则**：无论鼠标滚轮还是右下角百分比/按钮缩放，**画布都必须保持在工作区中央**。除非用户明确要求，否则**不要实现鼠标锚点跟随缩放**。

---

## 5. 严格的代码与工程规范 (Strict Coding & Engineering Standards)

* **500行红线 (The 500-Line Hard Limit)**：任何单一文件（特别是 React 组件）绝对不允许超过 500 行。超过 300 行时必须主动重构拆分。
* **零 Any 容忍 (Zero `any` Policy)**：代码中绝对禁止出现 `any` 类型。使用 `unknown` 配合类型守卫，或者使用泛型。
* **命名规范**：
  * React 组件 / 接口 / 类型：`PascalCase`（严禁使用 `I` 或 `T` 前缀）。
  * Hooks：`camelCase`，以 `use` 开头。
  * 常量：`UPPER_SNAKE_CASE`。
* **强制具名导出 (Named Exports)**：除路由懒加载外，所有组件、工具函数强制使用 `export const xxx`，禁止 `export default`。
* **注释规范 (JSDoc + Inline)**：
  * **所有函数都必须写注释**，包括组件函数、事件处理函数、工具函数、Store action、Engine 方法、handlers 内部函数。
  * 注释语言**以中文为主**；如需补充术语，可在中文后附英文关键词。
  * 每个导出函数必须有完整的函数级注释，说明：用途、关键参数、返回值、调用时机。
  * 每个文件内的非导出函数也必须有函数级注释，禁止出现“裸函数”。
  * 复杂的业务逻辑、边界条件、性能优化、坐标/缩放/缓冲层计算，必须补充中文内联注释，重点解释“为什么这么做”，而不只是“做了什么”。
  * 如果一段代码存在隐含约束（例如和 Store 单向数据流、Fabric viewport、历史栈提交时机相关），必须在临近代码处写明约束，确保后来者能读懂并安全修改。
  * 注释要求尽量完整，目标是**让首次进入该文件的开发者也能顺着注释快速理解代码**。

---

## 6. 目录结构与模块拆分原则 (Directory Structure & Splitting)

这是一个面向全球开发者的开源项目，必须严格遵守以下目录树结构，绝不跨界：

~~~text
src/
├── components/             
│   └── ui/                 # 🟢 Dumb Components (木偶组件/通用UI)
│       ├── Button.tsx      # 绝对纯净，通过 props 交互，严禁引入 useEditorStore
│       └── index.ts        
├── core/                   # 🔴 Fabric 引擎核心 (物理隔离区)
│   ├── engine/             # 引擎分层模块（canvas / layers / events / viewport / workspace）
│   ├── export/             # 导出模块（pdf / svg）
│   └── canvasMath.ts       
├── store/                  # 🟡 状态管理 (SSOT)
│   └── useEditorStore.ts   
├── types/                  # 全局类型与 Schema
│   └── schema.ts           
└── views/                  # 🔵 业务视图组件
    └── Editor/             
        └── components/     
            ├── Workspace/        # 工作区模块（index / handlers / shared / ResizeHandle / ZoomControls）
            └── RightPanel/       # 🟣 右侧属性面板 (严格的策略模式拆分)
                ├── index.tsx                  # 路由器：根据 activeLayer.type 渲染
                ├── CanvasPanel/               # 画布全局设置
                ├── TextPanel/                 # 文本图层 UI + handlers
                └── ImagePanel/                # 图片图层 UI + handlers
~~~

### 💡 逻辑抽离原则 (Logic Extraction Rule)
当一个 UI 组件（如 `ImageLayerSection.tsx`）过于复杂时，**严禁**使用 Custom Hook (`useXXX`) 来抽离业务逻辑。你必须创建一个同名的纯 TS 文件（例如 `ImageLayer.handlers.ts`），将复杂的事件处理、坐标计算写成普通的导出函数。在这些函数内部，利用 `useEditorStore.getState()` 获取和更新状态，彻底与 React 生命周期解耦。

---

## 7. AI 开发指令：如何新增功能 (How to add features)

当要求你新增图层或功能时，严格按照以下步骤：
1. **Schema先行**：在 `src/types/schema.ts` 中定义或扩充接口。
2. **渲染映射**：在 `src/core/engine/` 对应模块中处理从 Schema 到 Fabric 实例的转换。
3. **UI绑定**：在对应的 `RightPanel/*Panel/` 组件中编写属性面板，读取 Store 作为 value，通过 `updateLayer` 提交改动。
4. **工作区交互**：如果功能涉及缩放、拖动画布边缘、视口滚动或缓冲层预览，优先在 `src/views/Editor/components/Workspace/handlers.ts` / `shared.ts` 中实现，避免把 DOM 布局逻辑塞进 Engine。

---

## 8. 样式与 Tailwind CSS 规范 (Styling)

* 必须使用 `src/utils/cn.ts` (基于 clsx + tailwind-merge) 处理动态类名拼接。
* **严禁滥用内联样式 (`style={{...}}`)**。
* 浮动面板必须使用 Tailwind 的 Z-Index 变量（如 `z-50`），禁止硬编码 `zIndex: 9999`。
* **例外说明**：涉及 Fabric 画布尺寸、Workspace padding、滚动区尺寸、预览 overlay 定位时，可以使用必要的内联 `style`，但必须由纯函数集中生成，禁止在 JSX 中散落复杂计算。

---

## 9. 国际化与文案规范 (i18n)

* **零硬编码文本 (Zero Hardcoded Text)**：React 组件中绝对不允许硬编码中英文案。
* 必须使用 `react-i18next` 的 `useTranslation` Hook（如 `t('rightPanel.export')`）。
* 新增文案必须同步到 `src/locales/` 下的 JSON 文件中。

---

## 10. 异常处理与防御性编程 (Error Handling)

* **资源加载兜底**：外部图片或字体加载失败、跨域被拦截时，必须 `.catch()` 并处理（降级或占位图），**决不能让引擎抛错卡死**。
* **数据保护**：渲染或计算前，使用可选链 `?.` 或 `??` 保护数值，防止 `NaN` 污染 Fabric 对象坐标。

---

## 11. Git 提交规范 (Git & PR Conventions)

生成 Commit Message 时，强制使用 Conventional Commits 标准：
* `feat:` 新增功能 / `fix:` 修复缺陷 / `refactor:` 代码重构 / `style:` 样式调整 / `docs:` 文档更新。
* 格式：`前缀: 英文简短描述 (不超过50字符)`。

## 12. 使用中文与我对话
