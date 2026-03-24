# CollapsiblePanel 组件重构计划

## 1. 现状分析
当前项目中的 `LeftPanel` 和 `RightPanel` 是独立实现的组件：
- `LeftPanel` 包含左侧的工具栏（56px，`w-14`）和右侧的图层树（288px，`w-72`），总宽度 344px。
- `RightPanel` 是一个宽度为 240px（`w-60`）的属性面板。
这两个面板目前都没有折叠功能，占用了固定的屏幕空间。另外，由于项目是基于 React 架构，虽然需求提到了 `v-model`（Vue 的双向绑定概念），但在 React 中我们将其转换为受控组件（`collapsed` + `onCollapseChange`）和非受控组件（通过 `forwardRef` 和 `useImperativeHandle` 暴露方法）的标准实现。

## 2. 改造目标
创建一个可复用的 `<CollapsiblePanel>` UI 组件，替换现有的侧边栏外层容器，实现以下功能：
1. **平滑折叠/展开**：使用 CSS `transition` 实现 200-300ms 宽度的平滑过渡动画。
2. **切换按钮**：在面板边缘（左侧面板在右边缘，右侧面板在左边缘）悬浮一个箭头按钮，点击触发折叠状态切换，同时箭头方向自动反转。
3. **状态控制**：支持外部通过 `ref` 调用 `toggleCollapse()` 和读取 `isCollapsed` 状态，也支持受控模式（提供 `collapsed` 和 `onCollapseChange` 属性）。
4. **插槽分离**：提供 `iconSlot`（图标插槽，折叠时保留显示）和 `children`（默认插槽，面板内容，折叠时隐藏）。

## 3. 具体实施步骤

### 步骤 1：新建 `CollapsiblePanel` 公共组件
**文件路径**：`src/components/ui/CollapsiblePanel.tsx` (并在 `src/components/ui/index.ts` 中导出)
**接口设计 (API)**：
```tsx
export interface CollapsiblePanelRef {
  isCollapsed: boolean;
  toggleCollapse: () => void;
}

export interface CollapsiblePanelProps {
  position: 'left' | 'right'; // 决定按钮在左边缘还是右边缘
  defaultWidth: number;       // 展开时的总宽度
  collapsedWidth: number;     // 折叠后的宽度（如 56px 或 48px）
  iconSlot?: React.ReactNode; // 折叠时仍显示的图标区域
  children: React.ReactNode;  // 默认面板内容，折叠时透明/隐藏
  className?: string;         // 自定义外层样式
  
  // 受控属性
  collapsed?: boolean;
  onCollapseChange?: (collapsed: boolean) => void;
}
```
**实现细节**：
- 使用 `forwardRef` 和 `useImperativeHandle` 暴露实例方法。
- 外层容器动态设置 `style={{ width: isCollapsed ? collapsedWidth : defaultWidth }}` 并配合 Tailwind 的 `transition-all duration-300 ease-in-out`。
- 内部内容区 (`children`) 在折叠时通过固定宽度 + `overflow-hidden` 隐藏，避免挤压导致内部排版错乱。
- 侧边悬浮一个带有阴影的半圆形触发按钮，内置 `lucide-react` 的 `ChevronLeft` 和 `ChevronRight` 图标。

### 步骤 2：重构 `LeftPanel` 组件
**修改文件**：`src/views/Editor/components/LeftPanel.tsx`
- 移除最外层的 React Fragment (`<>...</>`)。
- 使用 `<CollapsiblePanel>` 包裹整个内容：
  - `position="left"`
  - `defaultWidth={344}` (56px 工具栏 + 288px 图层树)
  - `collapsedWidth={56}` (只保留工具栏)
  - 将原有的工具栏 (`<aside className="... w-14 ...">`) 放入 `iconSlot`。
  - 将原有的图层树 (`<aside className="... w-72 ...">`) 作为 `children` 传入。

### 步骤 3：重构 `RightPanel` 组件
**修改文件**：`src/views/Editor/components/RightPanel/index.tsx`
- 移除最外层的 `<aside>`，使用 `<CollapsiblePanel>` 包裹。
- 传入：
  - `position="right"`
  - `defaultWidth={240}` (目前的 `w-60`)
  - `collapsedWidth={0}` (由于目前右侧面板没有单独的图标区域，折叠时完全收起，宽度变为 0，仅保留悬浮的展开按钮)。
  - 将现有的 `<Tabs>` 及内容作为 `children` 传入。

## 4. 假设与决策
- **框架差异调整**：由于项目使用 React，将用户要求的 `v-model` 转换为 React 惯用的 `collapsed` + `onCollapseChange` 受控模式，同时提供 `ref` 暴露，满足在外部灵活控制状态的需求。
- **内部排版保护**：面板在折叠动画过程中，内容区的宽度被强制锁定为 `defaultWidth - (iconSlot ? collapsedWidth : 0)`，从而避免宽度渐渐缩小时内部文字频繁换行引起的闪烁，纯靠 `overflow-hidden` 进行平滑裁剪。
- **RightPanel 折叠行为**：当前右侧只有属性面板，若折叠为 48px 将是一条空白，故右侧面板的 `collapsedWidth` 默认为 `0`，仅在边缘保留触发器按钮。

## 5. 验证方式
1. 打开编辑器，点击左右两侧面板边缘的折叠按钮。
2. 左侧面板应平滑收起至 56px 宽度，仅显示工具图标；右侧面板应平滑收缩至边缘。
3. 工作区 (`Workspace`) 应该在侧边栏折叠/展开时自动适应可用屏幕空间，并保持画布始终居中。
4. 再次点击折叠按钮上的箭头，面板应平滑恢复原状。
