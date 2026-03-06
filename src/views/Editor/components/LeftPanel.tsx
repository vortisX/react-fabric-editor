import { Tooltip } from '../../../components/ui';
import { GridIcon, TypeIcon, ImageIcon } from '../../../components/ui/Icons';
import { useEditorStore } from '../../../store/useEditorStore';
import { engineInstance } from '../../../core/engine';
import type { TextLayer } from '../../../types/schema';

export default function LeftPanel() {
  const addLayer = useEditorStore((state) => state.addLayer);
  const document = useEditorStore((state) => state.document);
  const activeLayerId = useEditorStore((state) => state.activeLayerId);
  const setActiveLayer = useEditorStore((state) => state.setActiveLayer);

  const handleAddText = () => {
    const newTextLayer: TextLayer = {
      id: `layer_text_${Date.now()}`,
      name: '双击修改文字',
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

  const handleLayerClick = (id: string) => {
    setActiveLayer(id);
    engineInstance.selectLayer(id);
  };

  const layers = document?.pages[0]?.layers || [];

  return (
    <>
      {/* 极窄工具栏 */}
      <aside className="w-14 bg-white border-r border-gray-200 flex flex-col items-center py-4 gap-4 shrink-0 z-10">
        <Tooltip title="图层管理" placement="right">
          <div className="w-10 h-10 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center text-lg cursor-pointer">
            <GridIcon />
          </div>
        </Tooltip>
        <Tooltip title="添加文字" placement="right">
          <div 
            onClick={handleAddText}
            className="w-10 h-10 rounded-md text-gray-500 hover:bg-gray-100 flex items-center justify-center text-lg cursor-pointer transition-colors"
          >
            <TypeIcon />
          </div>
        </Tooltip>
        <Tooltip title="添加图片" placement="right">
          <div className="w-10 h-10 rounded-md text-gray-500 hover:bg-gray-100 flex items-center justify-center text-lg cursor-pointer transition-colors">
            <ImageIcon />
          </div>
        </Tooltip>
      </aside>

      {/* 图层树面板 */}
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col shrink-0 z-10 shadow-sm">
        <div className="h-10 border-b border-gray-100 flex items-center px-4 font-semibold text-gray-800">
          图层树 (Layers)
        </div>
        <div className="flex-1 p-2 overflow-y-auto flex flex-col gap-1">
          {layers.length === 0 ? (
            <div className="text-center text-gray-400 mt-6 tracking-wide">
              画布空空如也
            </div>
          ) : (
            layers.map((layer) => {
              const isActive = activeLayerId === layer.id;
              return (
                <div 
                  key={layer.id}
                  onClick={() => handleLayerClick(layer.id)}
                  className={`
                    px-3 py-2 rounded cursor-pointer flex items-center gap-2 border transition-colors
                    ${isActive 
                      ? 'bg-blue-50 text-blue-700 border-blue-200 font-medium'
                      : 'text-gray-600 border-transparent hover:bg-gray-50 hover:border-gray-200'
                    }
                  `}
                >
                  {layer.type === 'text'
                    ? <TypeIcon className={isActive ? 'text-blue-500' : 'text-gray-400'} />
                    : <ImageIcon />
                  }
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