import { Tabs, InputNumber, ColorPicker, Slider, Divider } from 'antd';
import { useEditorStore } from '../../../store/useEditorStore';
import { engineInstance } from '../../../core/engine';
import type { TextLayer } from '../../../types/schema';
import type { Color } from 'antd/es/color-picker';

export default function RightPanel() {
  const activeLayerId = useEditorStore((state) => state.activeLayerId);
  const document = useEditorStore((state) => state.document);
  const updateLayer = useEditorStore((state) => state.updateLayer);

  const activeLayer = document?.pages[0]?.layers.find(
    (layer) => layer.id === activeLayerId
  );

  if (!activeLayer) {
    return (
      <aside className="w-64 bg-white border-l border-gray-200 flex flex-col shrink-0 z-10 shadow-sm">
        <div className="h-10 border-b border-gray-100 flex items-center px-4 font-semibold text-gray-800 tracking-wide">
          属性 (Inspector)
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-400 text-xs text-center leading-relaxed">
          请在画布中点击选中元素<br/>以进行编辑
        </div>
      </aside>
    );
  }

  const isTextLayer = activeLayer.type === 'text';
  const textLayer = activeLayer as TextLayer;

  // 核心中枢：处理面板中所有属性的修改
  const handlePropChange = (key: keyof TextLayer, value: string | number) => {
    // 1. 同步给 Zustand 数据大脑
    updateLayer('page_01', activeLayer.id, { [key]: value });

    // 2. 翻译给 Fabric.js 引擎听 ( Schema 字典的 key 映射为 Fabric 的属性名 )
    const fabricProps: Record<string, string | number> = {};
    if (key === 'x') fabricProps.left = value;
    else if (key === 'y') fabricProps.top = value;
    else if (key === 'fill') fabricProps.fill = value;
    else if (key === 'opacity') fabricProps.opacity = value;
    else fabricProps[key] = value;

    // 3. 命令引擎立刻重绘画面
    engineInstance.updateLayerProps(activeLayer.id, fabricProps);
  };

  return (
    <aside className="w-64 bg-white border-l border-gray-200 flex flex-col shrink-0 z-10 shadow-sm">
      <Tabs 
        defaultActiveKey="1" 
        className="w-full"
        items={[
          {
            key: '1',
            label: <span className="px-4">设计 (Design)</span>,
            children: (
              <div className="p-4 flex flex-col gap-4">
                
                {/* 坐标与尺寸控制组 */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">布局</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <InputNumber 
                      prefix={<span className="text-gray-400 mr-1">X</span>} 
                      className="w-full" 
                      value={Math.round(activeLayer.x)} 
                      onChange={(val) => handlePropChange('x', val ?? 0)}
                    />
                    <InputNumber 
                      prefix={<span className="text-gray-400 mr-1">Y</span>} 
                      className="w-full" 
                      value={Math.round(activeLayer.y)} 
                      onChange={(val) => handlePropChange('y', val ?? 0)}
                    />
                    {/* W 和 H 暂不开启 onChange，因为 Fabric 的缩放逻辑(scaleX/scaleY)比单纯改宽高度复杂，我们放到进阶篇处理 */}
                    <InputNumber prefix={<span className="text-gray-400 mr-1">W</span>} className="w-full" value={Math.round(activeLayer.width)} readOnly />
                    <InputNumber prefix={<span className="text-gray-400 mr-1">H</span>} className="w-full" value={Math.round(activeLayer.height)} readOnly />
                  </div>
                </div>

                <Divider />

                {/* 颜色控制组 */}
                {isTextLayer && (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">填充</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ColorPicker 
                        value={textLayer.fill} 
                        showText 
                        onChange={(color: Color) => handlePropChange('fill', color.toHexString())}
                      />
                      <span className="text-gray-500">100%</span>
                    </div>
                  </div>
                )}

                <Divider />

                {/* 透明度控制组 */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">透明度</span>
                    <span className="text-gray-800 font-medium">{Math.round(activeLayer.opacity * 100)}%</span>
                  </div>
                  <Slider 
                    value={activeLayer.opacity * 100} 
                    tooltip={{ open: false }} 
                    onChange={(val) => handlePropChange('opacity', val / 100)}
                  />
                </div>

              </div>
            ),
          }
        ]}
      />
    </aside>
  );
}