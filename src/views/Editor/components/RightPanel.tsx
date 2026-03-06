import React from 'react';
import { Tabs, InputNumber, ColorPicker, Slider, Select, Button, Tooltip, Input } from 'antd';
import { 
  BoldOutlined, ItalicOutlined, UnderlineOutlined, 
  AlignLeftOutlined, AlignCenterOutlined, AlignRightOutlined, MenuOutlined
} from '@ant-design/icons';
import { useEditorStore } from '../../../store/useEditorStore';
import { engineInstance } from '../../../core/engine';
import { SUPPORTED_FONTS } from '../../../constants/fonts'; 
import type { TextLayer } from '../../../types/schema';
import type { Color } from 'antd/es/color-picker';

interface DesignNumberInputProps {
  label: React.ReactNode;
  value: number;
  onChange?: (value: number | null) => void;
  readOnly?: boolean;
}

const DesignNumberInput = ({ label, value, onChange, readOnly = false }: DesignNumberInputProps) => (
  <div className={`flex items-center bg-[#f5f5f5] rounded px-2 py-0.5 border border-transparent hover:border-gray-300 transition-colors ${readOnly ? 'opacity-60 cursor-not-allowed' : ''}`}>
    <span className="text-[10px] text-gray-400 font-medium w-8 select-none flex items-center justify-center">{label}</span>
    <InputNumber 
      variant="borderless" // 核心修改：替代了之前的 bordered={false}
      size="small" 
      className="flex-1 w-full bg-transparent shadow-none text-xs" 
      value={value} 
      onChange={onChange}
      readOnly={readOnly}
      controls={false}
    />
  </div>
);

const SectionHeader = ({ title }: { title: string }) => (
  <div className="flex justify-between items-center px-4 py-2 bg-white mt-1">
    <span className="text-[11px] font-bold text-gray-800 tracking-wide">{title}</span>
  </div>
);

export default function RightPanel() {
  const activeLayerId = useEditorStore((state) => state.activeLayerId);
  const document = useEditorStore((state) => state.document);
  const updateLayer = useEditorStore((state) => state.updateLayer);

  const activeLayer = document?.pages[0]?.layers.find(
    (layer) => layer.id === activeLayerId
  );

  if (!activeLayer) {
    return (
      <aside className="w-[240px] bg-white border-l border-gray-200 flex flex-col shrink-0 z-10 shadow-sm">
        <div className="h-10 border-b border-gray-100 flex items-center px-4 font-semibold text-[11px] text-gray-800 tracking-wide">
          属性面板
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-400 text-xs">
          请选择一个图层
        </div>
      </aside>
    );
  }

  const isTextLayer = activeLayer.type === 'text';
  const textLayer = activeLayer as TextLayer;

  const handlePropChange = <K extends keyof TextLayer>(key: K, value: TextLayer[K]) => {
    const updates: Partial<TextLayer> = { [key]: value };

    if (key === 'content') {
      const textVal = (value as string) || '';
      const newName = textVal.trim() || '空文本';
      updates.name = newName.length > 15 ? newName.slice(0, 15) + '...' : newName;
    }

    updateLayer('page_01', activeLayer.id, updates);

    const fabricProps: Record<string, unknown> = {};
    if (key === 'x') fabricProps.left = value;
    else if (key === 'y') fabricProps.top = value;
    else if (key === 'rotation') fabricProps.angle = value;
    else if (key === 'letterSpacing') fabricProps.charSpacing = value;
    else if (key === 'textBackgroundColor') fabricProps.boxBackgroundColor = value;
    else if (key === 'stroke') fabricProps.boxStroke = value;
    else if (key === 'strokeWidth') fabricProps.boxStrokeWidth = value;
    else if (key === 'strokeDashArray') fabricProps.boxStrokeDashArray = value;
    else if (key === 'borderRadius') fabricProps.boxBorderRadius = value;
    else if (key === 'content') fabricProps.text = value; 
    else if (key === 'width') fabricProps.width = value;
    else if (key === 'height') fabricProps.height = value;
    else fabricProps[key as string] = value;

    engineInstance.updateLayerProps(activeLayer.id, fabricProps);
  };

  return (
    <aside className="w-[240px] bg-white border-l border-gray-200 flex flex-col shrink-0 z-10 shadow-sm text-xs selection:bg-blue-100">
      <Tabs 
        defaultActiveKey="1" 
        className="w-full h-full custom-tabs flex flex-col"
        items={[
          {
            key: '1',
            label: <span className="px-4 text-[11px] font-medium">属性配置</span>,
            children: (
              <div className="overflow-y-auto h-[calc(100vh-40px)] pb-10 flex flex-col">
                
                {isTextLayer && (
                   <div className="flex flex-col border-b border-gray-100 pb-3 pt-1">
                     <div className="px-4">
                        <Input.TextArea 
                          variant="borderless" // 同样保持风格统一
                          value={textLayer.content}
                          onChange={(e) => handlePropChange('content', e.target.value)}
                          className="text-xs bg-[#f5f5f5] hover:border-gray-300 focus:border-blue-400 focus:bg-white transition-colors rounded-md p-2"
                          autoSize={{ minRows: 2, maxRows: 6 }}
                          placeholder="在这里输入文字..."
                        />
                     </div>
                   </div>
                )}

                <div className="flex flex-col border-b border-gray-100 pb-3">
                  <SectionHeader title="布局" />
                  <div className="px-4 flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-2">
                      <DesignNumberInput label="水平" value={Math.round(activeLayer.x)} onChange={(val) => handlePropChange('x', val ?? 0)} />
                      <DesignNumberInput label="垂直" value={Math.round(activeLayer.y)} onChange={(val) => handlePropChange('y', val ?? 0)} />
                      <DesignNumberInput label="宽度" value={Math.round(activeLayer.width)} onChange={(val) => handlePropChange('width', Math.max(val ?? 20, 20))} />
                      <DesignNumberInput label="高度" value={Math.round(activeLayer.height)} onChange={(val) => handlePropChange('height', Math.max(val ?? 20, 20))} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <DesignNumberInput label="旋转" value={Math.round(activeLayer.rotation)} onChange={(val) => handlePropChange('rotation', val ?? 0)} />
                      {isTextLayer && (
                        <DesignNumberInput label="弧度" value={textLayer.borderRadius ?? 0} onChange={(val) => handlePropChange('borderRadius', val ?? 0)} />
                      )}
                    </div>
                  </div>
                </div>

                {isTextLayer && (
                  <div className="flex flex-col border-b border-gray-100 pb-3">
                    <SectionHeader title="文字排版" />
                    <div className="px-4 flex flex-col gap-2">
                      <Select 
                        className="w-full font-medium" 
                        variant="filled" 
                        size="small"
                        value={textLayer.fontFamily} 
                        onChange={(val) => handlePropChange('fontFamily', val)}
                        options={SUPPORTED_FONTS}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Select 
                          variant="filled" size="small"
                          value={String(textLayer.fontWeight)} 
                          onChange={(val) => handlePropChange('fontWeight', val)}
                          options={[{ value: 'normal', label: '常规' }, { value: 'bold', label: '加粗' }]}
                        />
                        <DesignNumberInput label="字号" value={textLayer.fontSize} onChange={(val) => handlePropChange('fontSize', val ?? 36)} />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <DesignNumberInput label="行高" value={textLayer.lineHeight ?? 1.2} onChange={(val) => handlePropChange('lineHeight', val ?? 1.2)} />
                        <DesignNumberInput label="字距" value={textLayer.letterSpacing ?? 0} onChange={(val) => handlePropChange('letterSpacing', val ?? 0)} />
                      </div>
                      <div className="flex justify-between items-center bg-[#f5f5f5] rounded p-0.5 mt-1">
                        <div className="flex gap-0.5">
                          <Button type="text" size="small" className={`px-2 min-w-0 ${textLayer.textAlign === 'left' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-800'}`} onClick={() => handlePropChange('textAlign', 'left')}><AlignLeftOutlined className="text-[10px]" /></Button>
                          <Button type="text" size="small" className={`px-2 min-w-0 ${textLayer.textAlign === 'center' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-800'}`} onClick={() => handlePropChange('textAlign', 'center')}><AlignCenterOutlined className="text-[10px]" /></Button>
                          <Button type="text" size="small" className={`px-2 min-w-0 ${textLayer.textAlign === 'right' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-800'}`} onClick={() => handlePropChange('textAlign', 'right')}><AlignRightOutlined className="text-[10px]" /></Button>
                          <Tooltip title="两端对齐">
                            <Button type="text" size="small" className={`px-2 min-w-0 ${textLayer.textAlign === 'justify' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-800'}`} onClick={() => handlePropChange('textAlign', 'justify')}><MenuOutlined className="text-[10px]" /></Button>
                          </Tooltip>
                        </div>
                        <div className="w-px h-3 bg-gray-300 mx-1"></div>
                        <div className="flex gap-0.5">
                          <Button type="text" size="small" className={`px-2 min-w-0 ${textLayer.fontWeight === 'bold' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`} onClick={() => handlePropChange('fontWeight', textLayer.fontWeight === 'bold' ? 'normal' : 'bold')}><BoldOutlined className="text-[10px]" /></Button>
                          <Button type="text" size="small" className={`px-2 min-w-0 ${textLayer.fontStyle === 'italic' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`} onClick={() => handlePropChange('fontStyle', textLayer.fontStyle === 'italic' ? 'normal' : 'italic')}><ItalicOutlined className="text-[10px]" /></Button>
                          <Button type="text" size="small" className={`px-2 min-w-0 ${textLayer.underline ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`} onClick={() => handlePropChange('underline', !textLayer.underline)}><UnderlineOutlined className="text-[10px]" /></Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col border-b border-gray-100 pb-3">
                  <SectionHeader title="颜色填充" />
                  <div className="px-4 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <ColorPicker value={textLayer.fill} onChange={(c: Color | null) => handlePropChange('fill', c ? c.toHexString() : '#000000')} size="small" />
                      <div className="flex-1 bg-[#f5f5f5] rounded px-2 py-1 text-xs text-gray-600 uppercase font-mono">
                        {textLayer.fill || '#000000'}
                      </div>
                      <span className="text-gray-400 text-[10px] w-8 text-right">文字</span>
                    </div>
                    {textLayer.textBackgroundColor && (
                       <div className="flex items-center gap-2 mt-1">
                         <ColorPicker value={textLayer.textBackgroundColor} onChange={(c: Color | null) => handlePropChange('textBackgroundColor', c ? c.toHexString() : '')} size="small" allowClear />
                         <div className="flex-1 bg-[#f5f5f5] rounded px-2 py-1 text-xs text-gray-600 uppercase font-mono">
                           {textLayer.textBackgroundColor}
                         </div>
                         <span className="text-gray-400 text-[10px] w-8 text-right">背景</span>
                       </div>
                    )}
                    {!textLayer.textBackgroundColor && (
                      <div 
                        className="text-[10px] text-gray-400 hover:text-gray-600 cursor-pointer mt-1 font-medium"
                        onClick={() => handlePropChange('textBackgroundColor', '#ffffff')}
                      >
                        + 添加背景色
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col border-b border-gray-100 pb-3">
                  <SectionHeader title="边框样式" />
                  <div className="px-4 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <ColorPicker value={textLayer.stroke || 'transparent'} onChange={(c: Color | null) => handlePropChange('stroke', c ? c.toHexString() : '')} size="small" allowClear />
                      <div className="flex-1 bg-[#f5f5f5] rounded px-2 py-1 text-xs text-gray-600 uppercase font-mono">
                        {textLayer.stroke || '无'}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <DesignNumberInput label="粗细" value={textLayer.strokeWidth ?? 0} onChange={(val) => handlePropChange('strokeWidth', val ?? 0)} />
                      <Select 
                        variant="filled" size="small"
                        value={textLayer.strokeDashArray ? 'dashed' : 'solid'}
                        onChange={(val) => handlePropChange('strokeDashArray', val === 'dashed' ? [5, 5] : undefined)}
                        options={[{ value: 'solid', label: '实线' }, { value: 'dashed', label: '虚线' }]}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col pb-3">
                  <SectionHeader title="图层属性" />
                  <div className="px-4 flex items-center gap-3">
                    <span className="text-[10px] text-gray-400 font-medium">穿透</span>
                    <Slider className="flex-1 m-0" value={activeLayer.opacity * 100} tooltip={{ open: false }} onChange={(val) => handlePropChange('opacity', val / 100)} />
                    <span className="text-[10px] text-gray-600 w-8 text-right">{Math.round(activeLayer.opacity * 100)}%</span>
                  </div>
                </div>
              </div>
            ),
          }
        ]}
      />
    </aside>
  );
}