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
* **高频渲染优化**：调用更新时，**永远使用 `canvas.requestRenderAll()`** 而不是同步的 `canvas.renderAll()`。
* **缩放重置策略 (Scale Normalization)**：Fabric 默认通过改变 `scaleX/scaleY` 来缩放对象。引擎在捕获到缩放事件时，**必须**将 `scale` 转换为实际的 `width/height/fontSize` 存入 Store，并强制将对象的 `scaleX/scaleY` 重置为 `1`。这保证了导出的 JSON 始终是标准尺寸。

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
  * 导出的复杂函数、接口必须有英文 JSDoc 说明。
  * 复杂的业务逻辑内部必须有中文内联注释说明“为什么这么做 (Why)”。

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
│   ├── engine.ts           # 引擎入口 (绝不允许出现任何 React/JSX 代码！)
│   └── canvasMath.ts       
├── store/                  # 🟡 状态管理 (SSOT)
│   └── useEditorStore.ts   
├── types/                  # 全局类型与 Schema
│   └── schema.ts           
└── views/                  # 🔵 业务视图组件
    └── Editor/             
        └── components/     
            ├── Workspace.tsx     
            └── RightPanel/       # 🟣 右侧属性面板 (严格的策略模式拆分)
                ├── index.tsx               # 路由器：根据 activeLayer.type 渲染
                ├── CanvasLayoutSection.tsx # 画布全局设置
                ├── TextLayerSection.tsx    # 文本图层 UI
                ├── ImageLayerSection.tsx   # 图片图层 UI
                └── ImageLayer.handlers.ts  # 💡 纯 TS 逻辑处理器
~~~

### 💡 逻辑抽离原则 (Logic Extraction Rule)
当一个 UI 组件（如 `ImageLayerSection.tsx`）过于复杂时，**严禁**使用 Custom Hook (`useXXX`) 来抽离业务逻辑。你必须创建一个同名的纯 TS 文件（例如 `ImageLayer.handlers.ts`），将复杂的事件处理、坐标计算写成普通的导出函数。在这些函数内部，利用 `useEditorStore.getState()` 获取和更新状态，彻底与 React 生命周期解耦。

---

## 7. AI 开发指令：如何新增功能 (How to add features)

当要求你新增图层或功能时，严格按照以下步骤：
1. **Schema先行**：在 `src/types/schema.ts` 中定义或扩充接口。
2. **渲染映射**：在 `src/core/engine.ts` 中处理从 Schema 到 Fabric 实例的转换。
3. **UI绑定**：在对应的 `RightPanel/xxxSection.tsx` 中编写属性面板，读取 Store 作为 value，通过 `updateLayer` 提交改动。

---

## 8. 样式与 Tailwind CSS 规范 (Styling)

* 必须使用 `src/utils/cn.ts` (基于 clsx + tailwind-merge) 处理动态类名拼接。
* **严禁滥用内联样式 (`style={{...}}`)**。
* 浮动面板必须使用 Tailwind 的 Z-Index 变量（如 `z-50`），禁止硬编码 `zIndex: 9999`。

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