import { Tabs, InputNumber, ColorPicker, Slider, Select, Radio, Button, Tooltip, Collapse } from 'antd';
import { 
  BoldOutlined, ItalicOutlined, UnderlineOutlined, 
  AlignLeftOutlined, AlignCenterOutlined, AlignRightOutlined,
  ColumnHeightOutlined, ColumnWidthOutlined, RetweetOutlined
} from '@ant-design/icons';
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

  // 构建高级折叠面板的内容
  const collapseItems = [
    {
      key: 'layout',
      label: <span className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">布局 (Layout)</span>,
      children: (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            <InputNumber prefix={<span className="text-gray-400 mr-1 text-xs">X</span>} className="w-full" value={Math.round(activeLayer.x)} onChange={(val) => handlePropChange('x', val ?? 0)} />
            <InputNumber prefix={<span className="text-gray-400 mr-1 text-xs">Y</span>} className="w-full" value={Math.round(activeLayer.y)} onChange={(val) => handlePropChange('y', val ?? 0)} />
            <InputNumber prefix={<span className="text-gray-400 mr-1 text-xs">W</span>} className="w-full" value={Math.round(activeLayer.width)} readOnly />
            <InputNumber prefix={<span className="text-gray-400 mr-1 text-xs">H</span>} className="w-full" value={Math.round(activeLayer.height)} readOnly />
          </div>
          <div className="flex items-center gap-2">
            <Tooltip title="旋转角度"><RetweetOutlined className="text-gray-400" /></Tooltip>
            <Slider className="flex-1 m-0" min={0} max={360} value={activeLayer.rotation} onChange={(val) => handlePropChange('rotation', val)} />
            <InputNumber className="w-16" size="small" min={0} max={360} value={Math.round(activeLayer.rotation)} onChange={(val) => handlePropChange('rotation', val ?? 0)} />
          </div>
        </div>
      ),
    },
    // 如果是文本图层，推入排版设置
    ...(isTextLayer ? [{
      key: 'typography',
      label: <span className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">排版 (Typography)</span>,
      children: (
        <div className="flex flex-col gap-3">
          <Select className="w-full" value={textLayer.fontFamily} onChange={(val) => handlePropChange('fontFamily', val)}
            options={[{ value: 'Arial', label: 'Arial' }, { value: 'Times New Roman', label: 'Times New Roman' }, { value: 'Courier New', label: 'Courier New' }]}
          />
          
          <div className="flex justify-between items-center">
            <Radio.Group 
              value={textLayer.textAlign} 
              onChange={(e) => handlePropChange('textAlign', e.target.value as "left" | "center" | "right")}
              optionType="button" buttonStyle="solid" size="small"
            >
              <Radio.Button value="left"><AlignLeftOutlined /></Radio.Button>
              <Radio.Button value="center"><AlignCenterOutlined /></Radio.Button>
              <Radio.Button value="right"><AlignRightOutlined /></Radio.Button>
            </Radio.Group>

            <div className="flex gap-1">
              <Button size="small" type={textLayer.fontWeight === 'bold' ? 'primary' : 'default'} onClick={() => handlePropChange('fontWeight', textLayer.fontWeight === 'bold' ? 'normal' : 'bold')} icon={<BoldOutlined />} />
              <Button size="small" type={textLayer.fontStyle === 'italic' ? 'primary' : 'default'} onClick={() => handlePropChange('fontStyle', textLayer.fontStyle === 'italic' ? 'normal' : 'italic')} icon={<ItalicOutlined />} />
              <Button size="small" type={textLayer.underline ? 'primary' : 'default'} onClick={() => handlePropChange('underline', !textLayer.underline)} icon={<UnderlineOutlined />} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Tooltip title="字号"><InputNumber prefix={<span className="text-gray-400">T</span>} className="w-full" value={textLayer.fontSize} onChange={(val) => handlePropChange('fontSize', val ?? 36)} /></Tooltip>
            <Tooltip title="行高"><InputNumber prefix={<ColumnHeightOutlined className="text-gray-400"/>} step={0.1} min={0.5} max={5} className="w-full" value={textLayer.lineHeight ?? 1.2} onChange={(val) => handlePropChange('lineHeight', val ?? 1.2)} /></Tooltip>
            <Tooltip title="字间距"><InputNumber prefix={<ColumnWidthOutlined className="text-gray-400"/>} step={10} min={-100} max={1000} className="w-full" value={textLayer.letterSpacing ?? 0} onChange={(val) => handlePropChange('letterSpacing', val ?? 0)} /></Tooltip>
          </div>
        </div>
      )
    }] : []),
    // 如果是文本图层，推入外观与描边
    ...(isTextLayer ? [{
      key: 'appearance',
      label: <span className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">外观 (Appearance)</span>,
      children: (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">字体填充</span>
            <ColorPicker value={textLayer.fill} onChange={(c: Color) => handlePropChange('fill', c.toHexString())} showText size="small" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">背景填充</span>
            <ColorPicker value={textLayer.textBackgroundColor || 'transparent'} onChange={(c: Color) => handlePropChange('textBackgroundColor', c.toHexString())} allowClear size="small" />
          </div>
          <div className="h-px bg-gray-100 w-full my-1"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">文字描边</span>
            <div className="flex items-center gap-2">
              <InputNumber size="small" min={0} max={20} className="w-14" value={textLayer.strokeWidth ?? 0} onChange={(val) => handlePropChange('strokeWidth', val ?? 0)} />
              <ColorPicker value={textLayer.stroke || 'transparent'} onChange={(c: Color) => handlePropChange('stroke', c.toHexString())} allowClear size="small" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">边框样式</span>
            <Select 
              className="w-24" size="small" 
              value={textLayer.strokeDashArray ? 'dashed' : 'solid'}
              onChange={(val) => handlePropChange('strokeDashArray', val === 'dashed' ? [5, 5] : undefined)}
              options={[{ value: 'solid', label: '实线' }, { value: 'dashed', label: '虚线' }]}
            />
          </div>
        </div>
      )
    }] : []),
    {
      key: 'effects',
      label: <span className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">效果 (Effects)</span>,
      children: (
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 w-10">透明度</span>
          <Slider className="flex-1 m-0" value={activeLayer.opacity * 100} tooltip={{ open: false }} onChange={(val) => handlePropChange('opacity', val / 100)} />
          <span className="text-xs text-gray-800 font-medium w-8 text-right">{Math.round(activeLayer.opacity * 100)}%</span>
        </div>
      )
    }
  ];

  return (
    <aside className="w-64 bg-white border-l border-gray-200 flex flex-col shrink-0 z-10 shadow-sm overflow-hidden">
      <Tabs 
        defaultActiveKey="1" 
        className="w-full h-full custom-tabs flex flex-col"
        items={[
          {
            key: '1',
            label: <span className="px-4">设计</span>,
            children: (
              <div className="overflow-y-auto h-[calc(100vh-100px)] pb-10">
                {/* 使用 Collapse 替代 Divider，采用 ghost 幽灵样式去掉外边框，打造极简风 */}
                <Collapse 
                  ghost 
                  defaultActiveKey={['layout', 'typography', 'appearance', 'effects']} 
                  expandIconPosition="end"
                  items={collapseItems}
                  className="bg-white"
                />
              </div>
            ),
          }
        ]}
      />
    </aside>
  );
}