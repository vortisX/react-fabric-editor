# DesignX - 全场景在线视觉设计引擎

## 项目定位
DesignX 是一款对标“稿定设计 / Canva”的全平台商业视觉设计工具。致力于通过拖拽式极简操作与 AI 辅助，降低专业设计门槛。首期 MVP 将以“电子请柬”场景切入，跑通核心渲染与商业闭环。

## 技术栈 (MVP Web 端)
本项目采用极其现代化的前端技术栈，并大胆拥抱最新大版本以获取最佳性能与工程化体验：
- **框架**：React 18 + Vite (纯 SPA 架构，摒弃 SSR 以追求极限交互性能)
- **语言**：TypeScript (开启 `verbatimModuleSyntax` 严格类型检查)
- **图形引擎**：Fabric.js **v7** (采用 ESM 按需导入，抛弃旧版命名空间)
- **状态管理**：Zustand (构建极其轻量的单向数据流“大脑”)
- **UI 与样式**：Tailwind CSS **v4** + Ant Design **v5** (深度定制 Figma 极简主题)

## 核心架构原则
1. **绝对的数据驱动 (Single Source of Truth)**：UI 层与渲染引擎严格解耦。所有状态以底层 JSON 数据字典（Schema）为唯一事实来源，React 视图与 Fabric 画布均只作为该数据的映射。
2. **面向对象防腐层**：构建 `EditorEngine` 独立类接管 `<canvas>` 节点，彻底隔离 React 的重渲染流，防止底层图形矩阵运算被干扰。

## 当前开发进度

**阶段一：基础设施与底层架构 (已完成 ✅)**
- [x] Vite 工程化搭建与 Tailwind v4 / Antd v5 样式体系整合。
- [x] 制定严谨的 Canvas JSON 数据字典 (Schema)，规范多页与基础图层数据结构。
- [x] 构建 Zustand 状态大脑，确立跨组件的状态分发机制。
- [x] 拆分左中右三段式高内聚 UI 组件 (Header, LeftPanel, Workspace, RightPanel)，打造专业设计器视觉体验。
- [x] 攻克 Fabric.js v7 大版本破坏性更新，完成图形引擎类 (`EditorEngine`) 的封装与 React 生命周期的安全挂载。

**阶段二：核心编辑器交互 (Next 🚧)**
- [ ] 跑通“添加文字/图片”的完整单向数据流 (Store -> Engine -> Canvas)。
- [ ] 实现画布元素的拖拽、缩放与选中监听，并将坐标双向同步至 Zustand Store。
- [ ] 接入撤销/重做 (Undo/Redo) 历史记录快照栈。
- [ ] 完成右侧属性面板对选中图层属性（颜色、透明度、字号）的实时双向控制。