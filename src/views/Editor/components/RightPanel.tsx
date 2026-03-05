import { Tabs, InputNumber, ColorPicker, Slider, Divider, Select } from 'antd';
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

  const handlePropChange = (key: keyof TextLayer, value: string | number) => {
    updateLayer('page_01', activeLayer.id, { [key]: value });

    const fabricProps: Record<string, string | number> = {};
    if (key === 'x') fabricProps.left = value;
    else if (key === 'y') fabricProps.top = value;
    else if (key === 'fill') fabricProps.fill = value;
    else if (key === 'opacity') fabricProps.opacity = value;
    else fabricProps[key] = value;

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
                    <InputNumber prefix={<span className="text-gray-400 mr-1">X</span>} className="w-full" value={Math.round(activeLayer.x)} onChange={(val) => handlePropChange('x', val ?? 0)} />
                    <InputNumber prefix={<span className="text-gray-400 mr-1">Y</span>} className="w-full" value={Math.round(activeLayer.y)} onChange={(val) => handlePropChange('y', val ?? 0)} />
                    <InputNumber prefix={<span className="text-gray-400 mr-1">W</span>} className="w-full" value={Math.round(activeLayer.width)} readOnly />
                    <InputNumber prefix={<span className="text-gray-400 mr-1">H</span>} className="w-full" value={Math.round(activeLayer.height)} readOnly />
                  </div>
                </div>

                <Divider />

                {/* 文字排版控制组 (新加入的心血) */}
                {isTextLayer && (
                  <>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">排版</span>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Select
                          className="w-full"
                          value={textLayer.fontFamily}
                          onChange={(val) => handlePropChange('fontFamily', val)}
                          options={[
                            { value: 'Arial', label: 'Arial' },
                            { value: 'Times New Roman', label: 'Times New Roman' },
                            { value: 'Courier New', label: 'Courier New' },
                            { value: 'Georgia', label: 'Georgia' },
                          ]}
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <Select
                            className="w-full"
                            value={String(textLayer.fontWeight)}
                            onChange={(val) => handlePropChange('fontWeight', val)}
                            options={[
                              { value: 'normal', label: 'Regular' },
                              { value: 'bold', label: 'Bold' },
                            ]}
                          />
                          <InputNumber 
                            prefix={<span className="text-gray-400 mr-1">T</span>} 
                            className="w-full" 
                            value={textLayer.fontSize} 
                            onChange={(val) => handlePropChange('fontSize', val ?? 36)}
                          />
                        </div>
                      </div>
                    </div>
                    <Divider />
                  </>
                )}

                {/* 颜色控制组 */}
                {isTextLayer && (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">填充</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ColorPicker value={textLayer.fill} showText onChange={(color: Color) => handlePropChange('fill', color.toHexString())} />
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
                  <Slider value={activeLayer.opacity * 100} tooltip={{ open: false }} onChange={(val) => handlePropChange('opacity', val / 100)} />
                </div>

              </div>
            ),
          }
        ]}
      />
    </aside>
  );
}