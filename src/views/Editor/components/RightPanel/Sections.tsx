import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { NumberInput, Select, FontSelect, Slider, ColorPicker, Button, Tooltip } from '../../../../components/ui';
import { TextArea } from '../../../../components/ui/Input';
import {
  BoldIcon, ItalicIcon, UnderlineIcon,
  AlignLeftIcon, AlignCenterIcon, AlignRightIcon, AlignJustifyIcon,
} from '../../../../components/ui/Icons';
import { getSupportedFonts } from '../../../../constants/fonts';
import type { TextLayer, Layer } from '../../../../types/schema';
import type { PropChangeHandler } from './useLayerActions';

// ─── 共享基础组件 ──────────────────────────────────────────────

interface DesignNumberInputProps {
  label: ReactNode;
  value: number;
  onChange?: (value: number | null) => void;
  step?: number;
  readOnly?: boolean;
}

const DesignNumberInput = ({ label, value, onChange, step, readOnly = false }: DesignNumberInputProps) => (
  <div className={`flex items-center bg-[#f5f5f5] rounded px-2 py-0.5 border border-transparent hover:border-gray-300 transition-colors ${readOnly ? 'opacity-60 cursor-not-allowed' : ''}`}>
    <span className="text-[10px] text-gray-400 font-medium w-8 select-none flex items-center justify-center">{label}</span>
    <NumberInput value={value} onChange={onChange} step={step} readOnly={readOnly} />
  </div>
);

const SectionHeader = ({ title }: { title: string }) => (
  <div className="flex justify-between items-center px-4 py-2 bg-white mt-1">
    <span className="text-[11px] font-bold text-gray-800 tracking-wide">{title}</span>
  </div>
);

// ─── Section Props 类型 ───────────────────────────────────────

interface TextSectionProps {
  layer: TextLayer;
  onPropChange: PropChangeHandler;
}

interface LayoutSectionProps {
  layer: Layer;
  isTextLayer: boolean;
  textLayer: TextLayer;
  onPropChange: PropChangeHandler;
}

// ─── 文本内容区 ───────────────────────────────────────────────

export function TextContentSection({ layer, onPropChange }: TextSectionProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col border-b border-gray-100 pb-3 pt-1">
      <div className="px-4">
        <TextArea
          value={layer.content}
          onChange={(val) => onPropChange('content', val)}
          placeholder={t('rightPanel.textPlaceholder')}
          minRows={2}
          maxRows={6}
        />
      </div>
    </div>
  );
}

// ─── 布局配置区 ───────────────────────────────────────────────

export function LayoutSection({ layer, isTextLayer, textLayer, onPropChange }: LayoutSectionProps) {
  const { t } = useTranslation();

  const handleWidthChange = (val: number | null) => {
    const minW = isTextLayer ? textLayer.fontSize : 20;
    onPropChange('width', Math.max(val ?? minW, minW));
  };

  const handleHeightChange = (val: number | null) => {
    const minH = isTextLayer ? textLayer.fontSize * (textLayer.lineHeight ?? 1.2) : 20;
    onPropChange('height', Math.max(val ?? minH, minH));
  };

  return (
    <div className="flex flex-col border-b border-gray-100 pb-3">
      <SectionHeader title={t('rightPanel.layout')} />
      <div className="px-4 flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <DesignNumberInput label={t('rightPanel.horizontal')} value={layer.x} onChange={(val) => onPropChange('x', val ?? 0)} />
          <DesignNumberInput label={t('rightPanel.vertical')} value={layer.y} onChange={(val) => onPropChange('y', val ?? 0)} />
          <DesignNumberInput label={t('rightPanel.width')} value={layer.width} onChange={handleWidthChange} />
          <DesignNumberInput label={t('rightPanel.height')} value={layer.height} onChange={handleHeightChange} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <DesignNumberInput label={t('rightPanel.rotation')} value={layer.rotation} onChange={(val) => onPropChange('rotation', Math.round(val ?? 0))} />
          {isTextLayer && (
            <DesignNumberInput label={t('rightPanel.borderRadius')} value={textLayer.borderRadius ?? 0} onChange={(val) => onPropChange('borderRadius', val ?? 0)} />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── 文字排版区 ───────────────────────────────────────────────

export function TypographySection({ layer, onPropChange }: TextSectionProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col border-b border-gray-100 pb-3">
      <SectionHeader title={t('rightPanel.typography')} />
      <div className="px-4 flex flex-col gap-2">
        <FontSelect
          className="w-full font-medium"
          value={layer.fontFamily}
          onChange={(val) => onPropChange('fontFamily', val)}
          options={getSupportedFonts()}
        />
        <div className="grid grid-cols-2 gap-2">
          <Select
            value={String(layer.fontWeight)}
            onChange={(val) => onPropChange('fontWeight', val)}
            options={[
              { value: 'normal', label: t('rightPanel.fontWeightNormal') },
              { value: 'bold', label: t('rightPanel.fontWeightBold') },
            ]}
          />
          <DesignNumberInput label={t('rightPanel.fontSize')} value={layer.fontSize} onChange={(val) => onPropChange('fontSize', val ?? 36)} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <DesignNumberInput label={t('rightPanel.lineHeight')} value={layer.lineHeight ?? 1.2} step={0.1} onChange={(val) => onPropChange('lineHeight', val ?? 1.2)} />
          <DesignNumberInput label={t('rightPanel.letterSpacing')} value={layer.letterSpacing ?? 0} onChange={(val) => onPropChange('letterSpacing', val ?? 0)} />
        </div>
        <TextStyleToolbar layer={layer} onPropChange={onPropChange} />
      </div>
    </div>
  );
}

/** 对齐方式 + 加粗/斜体/下划线 工具条 */
function TextStyleToolbar({ layer, onPropChange }: TextSectionProps) {
  const { t } = useTranslation();

  const alignOptions = [
    { value: 'left' as const, icon: AlignLeftIcon },
    { value: 'center' as const, icon: AlignCenterIcon },
    { value: 'right' as const, icon: AlignRightIcon },
  ] as const;

  return (
    <div className="flex justify-between items-center bg-[#f5f5f5] rounded p-0.5 mt-1">
      <div className="flex gap-0.5">
        {alignOptions.map(({ value, icon: Icon }) => (
          <Button
            key={value}
            variant="text"
            size="small"
            className={layer.textAlign === value ? 'bg-white shadow-sm' : 'text-gray-500'}
            onClick={() => onPropChange('textAlign', value)}
          >
            <Icon className="w-3 h-3" />
          </Button>
        ))}
        <Tooltip title={t('rightPanel.justifyAlign')}>
          <Button
            variant="text"
            size="small"
            className={layer.textAlign === 'justify' ? 'bg-white shadow-sm' : 'text-gray-500'}
            onClick={() => onPropChange('textAlign', 'justify')}
          >
            <AlignJustifyIcon className="w-3 h-3" />
          </Button>
        </Tooltip>
      </div>
      <div className="w-px h-3 bg-gray-300 mx-1" />
      <div className="flex gap-0.5">
        <Button
          variant="text"
          size="small"
          className={layer.fontWeight === 'bold' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}
          onClick={() => onPropChange('fontWeight', layer.fontWeight === 'bold' ? 'normal' : 'bold')}
        >
          <BoldIcon className="w-3 h-3" />
        </Button>
        <Button
          variant="text"
          size="small"
          className={layer.fontStyle === 'italic' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}
          onClick={() => onPropChange('fontStyle', layer.fontStyle === 'italic' ? 'normal' : 'italic')}
        >
          <ItalicIcon className="w-3 h-3" />
        </Button>
        <Button
          variant="text"
          size="small"
          className={layer.underline ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}
          onClick={() => onPropChange('underline', !layer.underline)}
        >
          <UnderlineIcon className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

// ─── 颜色填充区 ───────────────────────────────────────────────

export function ColorFillSection({ layer, onPropChange }: TextSectionProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col border-b border-gray-100 pb-3">
      <SectionHeader title={t('rightPanel.colorFill')} />
      <div className="px-4 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <ColorPicker value={layer.fill} onChange={(c) => onPropChange('fill', c || '#000000')} size="small" />
          <span className="text-xs text-gray-500">{t('rightPanel.textColor')}</span>
        </div>
        {layer.textBackgroundColor ? (
          <div className="flex items-center gap-2 mt-1">
            <ColorPicker value={layer.textBackgroundColor} onChange={(c) => onPropChange('textBackgroundColor', c)} size="small" allowClear />
            <span className="text-xs text-gray-500">{t('rightPanel.backgroundColor')}</span>
          </div>
        ) : (
          <div
            className="text-[10px] text-gray-400 hover:text-gray-600 cursor-pointer mt-1 font-medium"
            onClick={() => onPropChange('textBackgroundColor', '#ffffff')}
          >
            {t('rightPanel.addBackground')}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 边框样式区 ───────────────────────────────────────────────

export function BorderStyleSection({ layer, onPropChange }: TextSectionProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col border-b border-gray-100 pb-3">
      <SectionHeader title={t('rightPanel.borderStyle')} />
      <div className="px-4 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <ColorPicker value={layer.stroke || 'transparent'} onChange={(c) => onPropChange('stroke', c)} size="small" allowClear />
          <span className="text-xs text-gray-500">{t('rightPanel.borderStyle')}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-1">
          <DesignNumberInput label={t('rightPanel.strokeWidth')} value={layer.strokeWidth ?? 0} onChange={(val) => onPropChange('strokeWidth', val ?? 0)} />
          <Select
            value={layer.strokeDashArray ? 'dashed' : 'solid'}
            onChange={(val) => onPropChange('strokeDashArray', val === 'dashed' ? [5, 5] : undefined)}
            options={[
              { value: 'solid', label: t('rightPanel.solid') },
              { value: 'dashed', label: t('rightPanel.dashed') },
            ]}
          />
        </div>
      </div>
    </div>
  );
}

// ─── 图层属性区 ───────────────────────────────────────────────

export function LayerPropertiesSection({ layer, onPropChange }: { layer: Layer; onPropChange: PropChangeHandler }) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col pb-3">
      <SectionHeader title={t('rightPanel.layerProperties')} />
      <div className="px-4 flex items-center gap-3">
        <span className="text-[10px] text-gray-400 font-medium">{t('rightPanel.opacity')}</span>
        <Slider className="flex-1" value={layer.opacity * 100} onChange={(val) => onPropChange('opacity', val / 100)} />
        <span className="text-[10px] text-gray-600 w-8 text-right">{Math.round(layer.opacity * 100)}%</span>
      </div>
    </div>
  );
}
