# DesignX - 全场景在线视觉设计引擎

## 项目定位

DesignX 是一款对标"稿定设计 / Canva"的全平台商业视觉设计工具。致力于通过拖拽式极简操作与 AI 辅助，降低专业设计门槛。首期 MVP 以"电子请柬"场景切入，跑通核心渲染与商业闭环。

## 技术栈

| 类别 | 选型 | 说明 |
|------|------|------|
| 框架 | React 19 + Vite 7 | 纯 SPA 架构，追求极限交互性能 |
| 语言 | TypeScript 5.9 | `verbatimModuleSyntax` 严格类型检查 |
| 图形引擎 | Fabric.js v7 | ESM 按需导入，自定义控件样式 |
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
3. **模块化 UI**：右侧属性面板拆分为独立 Section 组件，通过 `useLayerActions` Hook 统一属性同步逻辑。

## 项目结构

```
src/
├── App.tsx                          # 根组件
├── main.tsx                         # 入口文件
├── index.css                        # 全局样式
├── components/ui/                   # 通用 UI 组件库
│   ├── Button.tsx                   #   按钮
│   ├── ColorPicker.tsx              #   颜色选择器
│   ├── FontSelect.tsx               #   字体选择器（可搜索 + 字体预览 + 授权标识）
│   ├── Icons.tsx                    #   自定义图标
│   ├── Input.tsx                    #   输入框 / 数字输入 / 文本域
│   ├── Select.tsx                   #   下拉选择
│   ├── Slider.tsx                   #   滑块
│   ├── Tabs.tsx                     #   标签页
│   └── Tooltip.tsx                  #   工具提示
├── constants/
│   └── fonts.ts                     # 字体配置（名称 / 路径 / 授权类型）
├── core/
│   ├── engine.ts                    # EditorEngine — Fabric.js 封装与事件桥接
│   ├── EditorUI.ts                  # 全局 UI 初始化（字体加载 / 控件样式）
│   └── CustomTextbox.ts            # Fabric.js Textbox 控件定制（圆角手柄）
├── hooks/
│   └── useCanvas.ts                 # Canvas 相关 Hook
├── locales/                         # 国际化资源
│   ├── index.ts                     #   i18n 初始化 + 语言检测
│   ├── zh-CN.json                   #   简体中文
│   ├── zh-TW.json                   #   繁体中文
│   ├── en-US.json                   #   英文
│   ├── ja-JP.json                   #   日语
│   └── ko-KR.json                   #   韩语
├── store/
│   └── useEditorStore.ts            # Zustand 全局状态（文档 / 图层 / 操作）
├── types/
│   └── schema.ts                    # 数据字典（DesignDocument / Page / TextLayer）
├── utils/
│   ├── cn.ts                        # 类名合并工具
│   └── uuid.ts                      # UUID 生成
└── views/Editor/
    ├── index.tsx                    # 编辑器主布局
    └── components/
        ├── Header.tsx               # 顶部栏（标题 / 撤销重做 / 预览导出 / 语言切换）
        ├── LeftPanel.tsx            # 左侧栏（工具栏 + 图层树 + 添加文字/图片）
        ├── Workspace.tsx            # 画布区域（Engine 初始化与文档加载）
        └── RightPanel/
            ├── index.tsx            # 属性面板入口
            ├── Sections.tsx         # 各属性区块组件
            └── useLayerActions.ts   # 属性变更 Hook（Store ↔ Fabric 双向同步）
```

## 开发进度

### 阶段一：基础设施与底层架构 ✅

- [x] Vite 工程化搭建与 Tailwind v4 样式体系整合
- [x] 制定 Canvas JSON 数据字典 (Schema)，规范多页与图层数据结构
- [x] 构建 Zustand Store，确立跨组件状态分发机制
- [x] 左中右三段式 UI 布局 (Header / LeftPanel / Workspace / RightPanel)
- [x] Fabric.js v7 图形引擎类 (`EditorEngine`) 封装与 React 生命周期安全挂载
- [x] 自定义 Fabric.js 控件样式（圆角手柄、蓝色边框）

### 阶段二：核心编辑器交互 ✅

- [x] 添加文字图层的完整数据流 (Store → Engine → Canvas)
- [x] 画布元素拖拽、缩放与选中监听，坐标双向同步至 Store
- [x] 右侧属性面板对选中图层的实时双向控制（布局 / 排版 / 颜色 / 描边）
- [x] 自定义字体选择器（可搜索、字体样式预览、商用授权标识）
- [x] 多语言国际化支持（5 种语言自动检测与切换）
- [x] 自定义字体加载（FontFace API 动态注册）

### 阶段三：功能完善 🚧

- [ ] 撤销 / 重做 (Undo / Redo) 历史记录快照栈
- [ ] 图片图层支持（上传 / 裁剪 / 滤镜）
- [ ] 多选与编组操作
- [ ] 图层排序（上移 / 下移 / 置顶 / 置底）
- [ ] 画布缩放与平移
- [ ] 对齐与分布辅助线
- [ ] 模板系统与预设

## 快速开始

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 代码检查
pnpm lint
```
