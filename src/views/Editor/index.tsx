// src/views/Editor/index.tsx
import { useEditorStore } from '../../store/useEditorStore';
// 引入 Antd 组件和图标
import { Button, Tooltip, Tabs } from 'antd';
import { UndoOutlined, RedoOutlined, DownloadOutlined, PlusOutlined, PictureOutlined } from '@ant-design/icons';

export default function EditorView() {
  const document = useEditorStore((state) => state.document);

  if (!document) {
    return <div className="h-screen flex items-center justify-center">加载中...</div>;
  }

  const { title, global } = document;

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-50 overflow-hidden text-gray-800">
      {/* 1. 顶部导航栏 */}
      <header className="h-14 bg-white border-b flex items-center px-6 justify-between shrink-0 select-none">
        <div className="font-bold text-lg tracking-wide">{title} - DesignX</div>
        <div className="flex gap-4 items-center">
          {/* 使用 Antd 的 Tooltip 和 Button 替换原生按钮 */}
          <Tooltip title="撤销 (Ctrl+Z)">
            <Button type="text" icon={<UndoOutlined />} />
          </Tooltip>
          <Tooltip title="重做 (Ctrl+Y)">
            <Button type="text" icon={<RedoOutlined />} />
          </Tooltip>
          
          <div className="w-px h-4 bg-gray-300 mx-2"></div>
          
          <Button type="primary" icon={<DownloadOutlined />}>
            导出 / 保存
          </Button>
        </div>
      </header>

      {/* 2. 主体工作区 */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* 左侧：物料与组件面板 */}
        <aside className="w-72 bg-white border-r flex flex-col shrink-0 z-10">
          <div className="h-12 border-b flex items-center px-4 font-medium text-gray-700 select-none">
            组件库
          </div>
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              {/* 用 Antd 的 Button 规范化左侧添加物料的交互 */}
              <Button className="h-24 flex flex-col items-center justify-center gap-2" type="dashed">
                <PlusOutlined className="text-xl text-gray-400" />
                <span className="text-gray-500">添加文字</span>
              </Button>
              <Button className="h-24 flex flex-col items-center justify-center gap-2" type="dashed">
                <PictureOutlined className="text-xl text-gray-400" />
                <span className="text-gray-500">添加图片</span>
              </Button>
            </div>
          </div>
        </aside>

        {/* 中间：画布容器 */}
        <main className="flex-1 bg-gray-100 relative flex items-center justify-center overflow-auto shadow-inner">
          <div 
            className="bg-white shadow-md relative transition-transform origin-center" 
            style={{ width: `${global.width}px`, height: `${global.height}px` }}
          >
            <canvas id="designx-canvas" className="absolute top-0 left-0 w-full h-full" />
          </div>
        </main>

        {/* 右侧：属性面板 */}
        <aside className="w-80 bg-white border-l flex flex-col shrink-0 z-10">
          {/* 使用 Antd 的 Tabs 组件，未来可以无缝切换“页面设置”和“图层设置” */}
          <Tabs 
            defaultActiveKey="1" 
            centered 
            className="w-full h-full custom-tabs"
            items={[
              {
                key: '1',
                label: '图层属性',
                children: (
                  <div className="p-6 text-center text-gray-400 mt-10">
                    请在画布中选中元素<br/>以进行编辑
                  </div>
                ),
              },
              {
                key: '2',
                label: '页面设置',
                children: <div className="p-6 text-center text-gray-400">全局背景与尺寸</div>,
              },
            ]}
          />
        </aside>

      </div>
    </div>
  );
}