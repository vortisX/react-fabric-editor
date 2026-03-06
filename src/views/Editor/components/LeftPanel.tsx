import { Tooltip } from 'antd';
import { AppstoreOutlined, FontSizeOutlined, PictureOutlined } from '@ant-design/icons';
import { useEditorStore } from '../../../store/useEditorStore';
import { engineInstance } from '../../../core/Engine';
import type { TextLayer } from '../../../types/schema';

export default function LeftPanel() {
  const addLayer = useEditorStore((state) => state.addLayer);
  // 1. 引入必要的数据和方法
  const document = useEditorStore((state) => state.document);
  const activeLayerId = useEditorStore((state) => state.activeLayerId);
  const setActiveLayer = useEditorStore((state) => state.setActiveLayer);

  const handleAddText = () => {
    const newTextLayer: TextLayer = {
      id: `layer_text_${Date.now()}`,
      name: '双击修改文字', // 列表里显示的图层名称
      type: 'text',
      x: 100,
      y: 100,
      width: 200,
      height: 50,
      rotation: 0,
      opacity: 1,
      locked: false,
      lockMovement: false,
      content: '双击修改文字',
      fontFamily: 'AaKuangPaiShouShu-2',
      fontSize: 36,
      fontWeight: 'normal',
      fill: '#333333',
      textAlign: 'left'
    };

    addLayer('page_01', newTextLayer);
    engineInstance.addTextLayer(newTextLayer);
  };

  // 2. 点击图层树列表项时的联动处理
  const handleLayerClick = (id: string) => {
    setActiveLayer(id);              // 告诉大脑更新状态
    engineInstance.selectLayer(id);  // 告诉画布亮起选中框
  };

  // 提取当前页面的所有图层，若无数据则为空数组
  const layers = document?.pages[0]?.layers || [];

  return (
    <>
      {/* 极窄工具栏保持不变 */}
      <aside className="w-14 bg-white border-r border-gray-200 flex flex-col items-center py-4 gap-4 shrink-0 z-10">
        <Tooltip title="图层管理" placement="right">
          <div className="w-10 h-10 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center text-lg cursor-pointer">
            <AppstoreOutlined />
          </div>
        </Tooltip>
        <Tooltip title="添加文字" placement="right">
          <div 
            onClick={handleAddText}
            className="w-10 h-10 rounded-md text-gray-500 hover:bg-gray-100 flex items-center justify-center text-lg cursor-pointer transition-colors"
          >
            <FontSizeOutlined />
          </div>
        </Tooltip>
        <Tooltip title="添加图片" placement="right">
          <div className="w-10 h-10 rounded-md text-gray-500 hover:bg-gray-100 flex items-center justify-center text-lg cursor-pointer transition-colors">
            <PictureOutlined />
          </div>
        </Tooltip>
      </aside>

      {/* 图层树面板：全面动态化 */}
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col shrink-0 z-10 shadow-sm">
        <div className="h-10 border-b border-gray-100 flex items-center px-4 font-semibold text-gray-800">
          图层树 (Layers)
        </div>
        <div className="flex-1 p-2 overflow-y-auto flex flex-col gap-1">
          
          {/* 空状态防御 */}
          {layers.length === 0 ? (
            <div className="text-center text-gray-400 mt-6 tracking-wide">
              画布空空如也
            </div>
          ) : (
            /* 3. 动态遍历渲染真实的图层 */
            layers.map((layer) => {
              const isActive = activeLayerId === layer.id;
              return (
                <div 
                  key={layer.id}
                  onClick={() => handleLayerClick(layer.id)}
                  className={`
                    px-3 py-2 rounded cursor-pointer flex items-center gap-2 border transition-colors
                    ${isActive 
                      ? 'bg-blue-50 text-blue-700 border-blue-200 font-medium' // 选中时的蓝色高亮样式
                      : 'text-gray-600 border-transparent hover:bg-gray-50 hover:border-gray-200' // 未选中时的灰色样式
                    }
                  `}
                >
                  {/* 根据图层类型显示不同的 Icon */}
                  {layer.type === 'text' ? <FontSizeOutlined className={isActive ? 'text-blue-500' : 'text-gray-400'} /> : <PictureOutlined />}
                  <span className="truncate">{layer.name}</span>
                </div>
              );
            })
          )}
          
        </div>
      </aside>
    </>
  );
}