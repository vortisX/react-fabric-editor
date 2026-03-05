import { useEditorStore } from '../../store/useEditorStore';

export default function EditorView() {
  // 从大脑袋 (Store) 中读取当前文档数据
  const document = useEditorStore((state) => state.document);

  // 防御性编程：如果没有数据，展示加载状态
  if (!document) {
    return <div className="h-screen flex items-center justify-center">加载中...</div>;
  }

  const { title, global } = document;

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-50 overflow-hidden text-gray-800">
      {/* 1. 顶部导航栏 (Header) */}
      <header className="h-14 bg-white border-b flex items-center px-6 justify-between shrink-0 select-none">
        {/* 这里动态读取 Store 里的标题 */}
        <div className="font-bold text-lg tracking-wide">{title} - DesignX</div>
        <div className="flex gap-4 items-center">
          <button className="text-sm text-gray-500 hover:text-gray-900">撤销</button>
          <button className="text-sm text-gray-500 hover:text-gray-900">重做</button>
          <div className="w-px h-4 bg-gray-300 mx-2"></div>
          <button className="px-5 py-1.5 bg-blue-600 text-white rounded shadow-sm text-sm hover:bg-blue-700 transition-colors">
            导出 / 保存
          </button>
        </div>
      </header>

      {/* 2. 主体工作区 (Workspace) */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* 左侧：物料与组件面板 */}
        <aside className="w-72 bg-white border-r flex flex-col shrink-0 z-10">
          <div className="h-12 border-b flex items-center px-4 font-medium text-gray-700 select-none">
            组件库
          </div>
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              <div className="h-24 bg-gray-50 rounded border border-gray-200 flex items-center justify-center text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 cursor-pointer transition-colors">
                + 添加文字
              </div>
              <div className="h-24 bg-gray-50 rounded border border-gray-200 flex items-center justify-center text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 cursor-pointer transition-colors">
                + 添加图片
              </div>
            </div>
          </div>
        </aside>

        {/* 中间：画布容器 (读取 Store 里的宽高) */}
        <main className="flex-1 bg-gray-100 relative flex items-center justify-center overflow-auto shadow-inner">
          <div 
            className="bg-white shadow-md relative transition-transform origin-center" 
            style={{ 
              width: `${global.width}px`, 
              height: `${global.height}px` 
            }}
          >
            {/* 这里是留给 Fabric.js 的最终坑位 */}
            <canvas id="designx-canvas" className="absolute top-0 left-0 w-full h-full" />
          </div>
        </main>

        {/* 右侧：属性面板 */}
        <aside className="w-80 bg-white border-l flex flex-col shrink-0 z-10">
          <div className="h-12 border-b flex items-center px-4 font-medium text-gray-700 select-none">
            属性配置
          </div>
          <div className="flex-1 p-6 overflow-y-auto flex flex-col items-center justify-center text-sm text-gray-400 text-center">
            <p>请在画布中选中元素<br/>以进行编辑</p>
          </div>
        </aside>

      </div>
    </div>
  );
}