import React from 'react';
import { Tabs, InputNumber, ColorPicker, Slider, Select, Button } from 'antd';
import {
  BoldOutlined, ItalicOutlined, UnderlineOutlined,
  AlignLeftOutlined, AlignCenterOutlined, AlignRightOutlined
} from '@ant-design/icons';
import { useEditorStore } from '../../../store/useEditorStore';
import { engineInstance } from '../../../core/engine';
import type { TextLayer } from '../../../types/schema';
import type { Color } from 'antd/es/color-picker';

// 1. 极其严谨的 Props 接口定义，杜绝任何 any 和空指针异常
interface FigmaNumberInputProps {
  label: React.ReactNode;
  value: number;
  onChange?: (value: number | null) => void;
  readOnly?: boolean;
}

// 2. Figma 风格的无边框输入框组件
const FigmaNumberInput = ({ label, value, onChange, readOnly = false }: FigmaNumberInputProps) => (
  <div className={`flex items-center bg-[#f5f5f5] rounded px-2 py-0.5 border border-transparent hover:border-gray-300 transition-colors ${readOnly ? 'opacity-60 cursor-not-allowed' : ''}`}>
    <span className="text-[10px] text-gray-400 font-medium w-3 select-none flex items-center justify-center">{label}</span>
    <InputNumber
      bordered={false}
      size="small"
      className="flex-1 w-full bg-transparent shadow-none text-xs"
      value={value}
      onChange={onChange}
      readOnly={readOnly}
      controls={false}
    />
  </div>
);

// 3. 区块标题组件
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

  // 空状态防御
  if (!activeLayer) {
    return (
      <aside className="w-60 bg-white border-l border-gray-200 flex flex-col shrink-0 z-10 shadow-sm">
        <div className="h-10 border-b border-gray-100 flex items-center px-4 font-semibold text-[11px] text-gray-800 tracking-wide">
          设计
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-400 text-xs">
          请选择一个图层
        </div>
      </aside>
    );
  }

  const isTextLayer = activeLayer.type === 'text';
  const textLayer = activeLayer as TextLayer;

  // 严谨的状态同步与引擎调度方法
  const handlePropChange = <K extends keyof TextLayer>(key: K, value: TextLayer[K]) => {
    updateLayer('page_01', activeLayer.id, { [key]: value });

    const fabricProps: Record<string, unknown> = {};
    if (key === 'x') fabricProps.left = value;
    else if (key === 'y') fabricProps.top = value;
    else if (key === 'rotation') fabricProps.angle = value;
    else if (key === 'letterSpacing') fabricProps.charSpacing = value;
    else fabricProps[key as string] = value;

    engineInstance.updateLayerProps(activeLayer.id, fabricProps);
  };

  return (
    <aside className="w-60 bg-white border-l border-gray-200 flex flex-col shrink-0 z-10 shadow-sm text-xs selection:bg-blue-100">
      <Tabs
        defaultActiveKey="1"
        className="w-full h-full custom-tabs flex flex-col"
        items={[
          {
            key: '1',
            label: <span className="px-4 text-[11px] font-medium">设计</span>,
            children: (
              <div className="overflow-y-auto h-[calc(100vh-40px)] pb-10 flex flex-col">

                {/* === 布局 Layout === */}
                <div className="flex flex-col border-b border-gray-100 pb-3">
                  <SectionHeader title="Layout" />
                  <div className="px-4 flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-2">
                      <FigmaNumberInput label="X" value={Math.round(activeLayer.x)} onChange={(val) => handlePropChange('x', val ?? 0)} />
                      <FigmaNumberInput label="Y" value={Math.round(activeLayer.y)} onChange={(val) => handlePropChange('y', val ?? 0)} />
                      <FigmaNumberInput label="W" value={Math.round(activeLayer.width)} readOnly />
                      <FigmaNumberInput label="H" value={Math.round(activeLayer.height)} readOnly />
                    </div>
                    <div className="flex items-center gap-2">
                      <FigmaNumberInput label="∠" value={Math.round(activeLayer.rotation)} onChange={(val) => handlePropChange('rotation', val ?? 0)} />
                    </div>
                  </div>
                </div>

                {/* === 排版 Typography === */}
                {isTextLayer && (
                  <div className="flex flex-col border-b border-gray-100 pb-3">
                    <SectionHeader title="Text" />
                    <div className="px-4 flex flex-col gap-2">

                      <Select
                        className="w-full font-medium"
                        variant="filled"
                        size="small"
                        value={textLayer.fontFamily}
                        onChange={(val) => handlePropChange('fontFamily', val)}
                        options={[{ value: 'Arial', label: 'Arial' }, { value: 'Times New Roman', label: 'Times New Roman' }, { value: 'Courier New', label: 'Courier New' }]}
                      />

                      <div className="grid grid-cols-2 gap-2">
                        <Select
                          variant="filled" size="small"
                          value={String(textLayer.fontWeight)}
                          onChange={(val) => handlePropChange('fontWeight', val)}
                          options={[{ value: 'normal', label: 'Regular' }, { value: 'bold', label: 'Bold' }]}
                        />
                        <FigmaNumberInput label="T" value={textLayer.fontSize} onChange={(val) => handlePropChange('fontSize', val ?? 36)} />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <FigmaNumberInput label="↕" value={textLayer.lineHeight ?? 1.2} onChange={(val) => handlePropChange('lineHeight', val ?? 1.2)} />
                        <FigmaNumberInput label="↔" value={textLayer.letterSpacing ?? 0} onChange={(val) => handlePropChange('letterSpacing', val ?? 0)} />
                      </div>

                      <div className="flex justify-between items-center bg-[#f5f5f5] rounded p-0.5 mt-1">
                        <div className="flex gap-0.5">
                          <Button type="text" size="small" className={`px-2 min-w-0 ${textLayer.textAlign === 'left' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-800'}`} onClick={() => handlePropChange('textAlign', 'left')}><AlignLeftOutlined className="text-[10px]" /></Button>
                          <Button type="text" size="small" className={`px-2 min-w-0 ${textLayer.textAlign === 'center' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-800'}`} onClick={() => handlePropChange('textAlign', 'center')}><AlignCenterOutlined className="text-[10px]" /></Button>
                          <Button type="text" size="small" className={`px-2 min-w-0 ${textLayer.textAlign === 'right' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-800'}`} onClick={() => handlePropChange('textAlign', 'right')}><AlignRightOutlined className="text-[10px]" /></Button>
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

                {/* === 外观与填充 Fill === */}
                {isTextLayer && (
                  <div className="flex flex-col border-b border-gray-100 pb-3">
                    <SectionHeader title="Fill" />
                    <div className="px-4 flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <ColorPicker value={textLayer.fill} onChange={(c: Color) => handlePropChange('fill', c.toHexString())} size="small" />
                        <div className="flex-1 bg-[#f5f5f5] rounded px-2 py-1 text-xs text-gray-600 uppercase font-mono">
                          {textLayer.fill || '#000000'}
                        </div>
                        <span className="text-gray-400 text-[10px] w-8 text-right">100%</span>
                      </div>

                      {textLayer.textBackgroundColor && (
                        <div className="flex items-center gap-2 mt-1">
                          <ColorPicker value={textLayer.textBackgroundColor} onChange={(c: Color) => handlePropChange('textBackgroundColor', c.toHexString())} size="small" allowClear />
                          <div className="flex-1 bg-[#f5f5f5] rounded px-2 py-1 text-xs text-gray-600 uppercase font-mono">
                            {textLayer.textBackgroundColor}
                          </div>
                        </div>
                      )}
                      {!textLayer.textBackgroundColor && (
                        <div
                          className="text-[10px] text-gray-400 hover:text-gray-600 cursor-pointer mt-1 font-medium"
                          onClick={() => handlePropChange('textBackgroundColor', '#ffffff')}
                        >
                          + 背景填充
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* === 描边 Stroke === */}
                {isTextLayer && (
                  <div className="flex flex-col border-b border-gray-100 pb-3">
                    <SectionHeader title="Stroke" />
                    <div className="px-4 flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <ColorPicker value={textLayer.stroke || 'transparent'} onChange={(c: Color) => handlePropChange('stroke', c.toHexString())} size="small" allowClear />
                        <div className="flex-1 bg-[#f5f5f5] rounded px-2 py-1 text-xs text-gray-600 uppercase font-mono">
                          {textLayer.stroke || 'None'}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <FigmaNumberInput label="≡" value={textLayer.strokeWidth ?? 0} onChange={(val) => handlePropChange('strokeWidth', val ?? 0)} />
                        <Select
                          variant="filled" size="small"
                          value={textLayer.strokeDashArray ? 'dashed' : 'solid'}
                          onChange={(val) => handlePropChange('strokeDashArray', val === 'dashed' ? [5, 5] : undefined)}
                          options={[{ value: 'solid', label: 'Solid' }, { value: 'dashed', label: 'Dashes' }]}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* === 图层全局 Layer === */}
                <div className="flex flex-col pb-3">
                  <SectionHeader title="Layer" />
                  <div className="px-4 flex items-center gap-3">
                    <span className="text-[10px] text-gray-400 font-medium">Pass-through</span>
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