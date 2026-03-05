// src/views/Editor/index.tsx
import { useEditorStore } from "../../store/useEditorStore";
import {
  ConfigProvider,
  Button,
  Tooltip,
  Tabs,
  InputNumber,
  ColorPicker,
  Slider,
  Divider,
} from "antd";
import {
  UndoOutlined,
  RedoOutlined,
  PlaySquareOutlined,
  FontSizeOutlined,
  PictureOutlined,
  AppstoreOutlined,
} from "@ant-design/icons";

export default function EditorView() {
  const document = useEditorStore((state) => state.document);

  if (!document) return null;

  const { title, global } = document;

  return (
    // 核心：使用 ConfigProvider 覆写 Antd 全局主题，打造 Figma 式的极简专业感
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#0d99ff", // 类似 Figma 的标志性蓝色激活态
          borderRadius: 4, // 较小的圆角，显得更专业干练
          fontSize: 12, // 全局 12px 小字体
          colorText: "#333333",
          colorBorder: "#e5e5e5",
          controlHeight: 28, // 核心：将输入框和按钮的高度压缩，提高面板信息密度
        },
        components: {
          Tabs: {
            titleFontSize: 12,
            horizontalMargin: "0", // 去掉 Tab 底部的多余留白
          },
          Divider: {
            marginLG: 12, // 减小分割线的上下边距
          },
        },
      }}
    >
      <div className="h-screen w-screen flex flex-col bg-[#e5e5e5] overflow-hidden text-[12px]">
        {/* 1. 顶部工具栏 (更窄、更隐蔽) */}
        <header className="h-12 bg-white border-b border-gray-200 flex items-center px-4 justify-between shrink-0 z-20">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-blue-600 text-white rounded flex items-center justify-center font-bold text-sm shadow-sm cursor-pointer">
              D
            </div>
            <span className="font-semibold text-gray-700 text-sm tracking-wide">
              {title}
            </span>
          </div>

          <div className="flex gap-2 items-center">
            <Tooltip title="撤销 (Ctrl+Z)" placement="bottom">
              <Button type="text" icon={<UndoOutlined />} />
            </Tooltip>
            <Tooltip title="重做 (Ctrl+Y)" placement="bottom">
              <Button type="text" icon={<RedoOutlined />} />
            </Tooltip>

            <div className="w-px h-4 bg-gray-300 mx-3"></div>

            <Button icon={<PlaySquareOutlined />}>预览</Button>
            <Button type="primary">导出作品</Button>
          </div>
        </header>

        {/* 2. 主体工作区 */}
        <div className="flex-1 flex overflow-hidden">
          {/* 左侧：双层结构物料区 (极窄图标栏 + 面板) */}
          <aside className="w-14 bg-white border-r border-gray-200 flex flex-col items-center py-4 gap-4 shrink-0 z-10">
            <Tooltip title="图层管理" placement="right">
              <div className="w-10 h-10 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center text-lg cursor-pointer">
                <AppstoreOutlined />
              </div>
            </Tooltip>
            <Tooltip title="添加文字" placement="right">
              <div className="w-10 h-10 rounded-md text-gray-500 hover:bg-gray-100 flex items-center justify-center text-lg cursor-pointer transition-colors">
                <FontSizeOutlined />
              </div>
            </Tooltip>
            <Tooltip title="添加图片" placement="right">
              <div className="w-10 h-10 rounded-md text-gray-500 hover:bg-gray-100 flex items-center justify-center text-lg cursor-pointer transition-colors">
                <PictureOutlined />
              </div>
            </Tooltip>
          </aside>

          {/* 左侧抽屉面板 (可折叠概念，MVP 先固定显示) */}
          <aside className="w-60 bg-white border-r border-gray-200 flex flex-col shrink-0 z-10 shadow-sm">
            <div className="h-10 border-b border-gray-100 flex items-center px-4 font-semibold text-gray-800">
              图层树 (Layers)
            </div>
            <div className="flex-1 p-2 overflow-y-auto">
              {/* 模拟的图层列表项 */}
              <div className="px-3 py-2 hover:bg-blue-50 rounded text-gray-600 cursor-pointer flex items-center gap-2 border border-transparent hover:border-blue-200 transition-colors">
                <PictureOutlined className="text-gray-400" /> 新人主图
              </div>
              <div className="px-3 py-2 bg-blue-50 text-blue-700 rounded cursor-pointer flex items-center gap-2 border border-blue-200 font-medium">
                <FontSizeOutlined /> 请柬标题
              </div>
            </div>
          </aside>

          {/* 中间：无限延伸的灰色画布容器 */}
          <main className="flex-1 relative flex items-center justify-center overflow-auto">
            {/* 设计白板，带一点优雅的阴影 */}
            <div
              className="bg-white shadow-xl relative transition-transform origin-center"
              style={{
                width: `${global.width}px`,
                height: `${global.height}px`,
              }}
            >
              <canvas
                id="designx-canvas"
                className="absolute top-0 left-0 w-full h-full"
              />
            </div>
          </main>

          {/* 右侧：高密度的属性检查器 (Inspector) */}
          <aside className="w-64 bg-white border-l border-gray-200 flex flex-col shrink-0 z-10 shadow-sm">
            <Tabs
              defaultActiveKey="1"
              className="w-full"
              items={[
                {
                  key: "1",
                  label: <span className="px-4">设计 (Design)</span>,
                  children: (
                    <div className="p-4 flex flex-col gap-4">
                      {/* 坐标与尺寸控制组 (极简排版) */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                            布局
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <InputNumber
                            prefix={
                              <span className="text-gray-400 mr-1">X</span>
                            }
                            className="w-full"
                            defaultValue={100}
                          />
                          <InputNumber
                            prefix={
                              <span className="text-gray-400 mr-1">Y</span>
                            }
                            className="w-full"
                            defaultValue={200}
                          />
                          <InputNumber
                            prefix={
                              <span className="text-gray-400 mr-1">W</span>
                            }
                            className="w-full"
                            defaultValue={300}
                          />
                          <InputNumber
                            prefix={
                              <span className="text-gray-400 mr-1">H</span>
                            }
                            className="w-full"
                            defaultValue={400}
                          />
                        </div>
                      </div>

                      <Divider />

                      {/* 颜色控制组 (体现 Antd ColorPicker 的强大) */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                            填充
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <ColorPicker defaultValue="#1677ff" showText />
                          <span className="text-gray-500">100%</span>
                        </div>
                      </div>

                      <Divider />

                      {/* 透明度控制组 (Slider 的完美应用) */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                            透明度
                          </span>
                          <span className="text-gray-800 font-medium">80%</span>
                        </div>
                        <Slider defaultValue={80} tooltip={{ open: false }} />
                      </div>
                    </div>
                  ),
                },
              ]}
            />
          </aside>
        </div>
      </div>
    </ConfigProvider>
  );
}
