import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { NumberInput, Select, FontSelect, Slider, ColorPicker, FillPicker, Button, Tooltip, CollapsiblePanel } from '../../../../../components/ui';
import {
  BoldIcon, ItalicIcon, UnderlineIcon, StrikethroughIcon,
  AlignLeftIcon, AlignCenterIcon, AlignRightIcon, AlignJustifyIcon,
} from '../../../../../components/ui/Icons';
import { getSupportedFonts } from '../../../../../constants/fonts';
import type { TextLayer, Layer, FillStyle } from '../../../../../types/schema';
import type { PropChangeHandler } from './Layer.handlers';

// ─── 共享基础组件 ──────────────────────────────────────────────

interface DesignNumberInputProps {
  label: ReactNode;
  value: number;
  onChange?: (value: number | null) => void;
  step?: number;
  readOnly?: boolean;
}

/** 文本面板里复用的数字输入壳，统一输入框与标签的排版样式。 */
const DesignNumberInput = ({ label, value, onChange, step, readOnly = false }: DesignNumberInputProps) => (
  <div className={`flex items-center bg-[#f5f5f5] rounded px-2 py-0.5 border border-transparent hover:border-gray-300 transition-colors ${readOnly ? 'opacity-60 cursor-not-allowed' : ''}`}>
    <span className="text-[10px] text-gray-400 font-medium w-8 select-none flex items-center justify-center">{label}</span>
    <NumberInput value={value} onChange={onChange} step={step} readOnly={readOnly} />
  </div>
);

/** 文本面板分区标题。 */
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

interface TextEffectsSectionProps extends TextSectionProps {
  onStrokeChange: (color: string, width: number, options?: { commit?: boolean }) => void;
  onShadowChange: (
    color: string,
    blur: number,
    offsetX: number,
    offsetY: number,
    options?: { commit?: boolean },
  ) => void;
  onNeonGlow: (color: string, blur: number, options?: { commit?: boolean }) => void;
}

interface LayoutSectionProps {
  layer: Layer;
  isTextLayer: boolean;
  textLayer: TextLayer;
  onPropChange: PropChangeHandler;
}

// ─── 布局配置区 ───────────────────────────────────────────────

export function LayoutSection({ layer, isTextLayer, textLayer, onPropChange }: LayoutSectionProps) {
  const { t } = useTranslation();

  /** 处理宽度输入，并为文本图层提供与字号相关的最小宽度保护。 */
  const handleWidthChange = (val: number | null) => {
    const minW = isTextLayer ? textLayer.fontSize : 20;
    onPropChange('width', Math.max(val ?? minW, minW));
  };

  /** 处理高度输入，并为文本图层提供与字号/行高相关的最小高度保护。 */
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
    { value: 'left' as const, icon: AlignLeftIcon, label: t('rightPanel.alignLeft') },
    { value: 'center' as const, icon: AlignCenterIcon, label: t('rightPanel.alignCenter') },
    { value: 'right' as const, icon: AlignRightIcon, label: t('rightPanel.alignRight') },
    { value: 'justify' as const, icon: AlignJustifyIcon, label: t('rightPanel.justifyAlign') },
  ] as const;

  return (
    <div className="flex flex-col gap-0.5 bg-[#f5f5f5] rounded p-0.5 mt-1">
      <div className="grid grid-cols-4 gap-0.5">
        {alignOptions.map(({ value, icon: Icon, label }) => (
          <Tooltip key={value} title={label}>
            <Button
              variant="text"
              size="small"
              className={`w-full ${layer.textAlign === value ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}
              onClick={() => onPropChange('textAlign', value)}
            >
              <Icon className="w-3 h-3" />
            </Button>
          </Tooltip>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-0.5">
        <Tooltip title={t('rightPanel.bold')}>
          <Button
            variant="text"
            size="small"
            className={`w-full ${layer.fontWeight === 'bold' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}
            onClick={() => onPropChange('fontWeight', layer.fontWeight === 'bold' ? 'normal' : 'bold')}
          >
            <BoldIcon className="w-3 h-3" />
          </Button>
        </Tooltip>
        <Tooltip title={t('rightPanel.italic')}>
          <Button
            variant="text"
            size="small"
            className={`w-full ${layer.fontStyle === 'italic' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}
            onClick={() => onPropChange('fontStyle', layer.fontStyle === 'italic' ? 'normal' : 'italic')}
          >
            <ItalicIcon className="w-3 h-3" />
          </Button>
        </Tooltip>
        <Tooltip title={t('rightPanel.underline')}>
          <Button
            variant="text"
            size="small"
            className={`w-full ${layer.underline ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}
            onClick={() => onPropChange('underline', !layer.underline)}
          >
            <UnderlineIcon className="w-3 h-3" />
          </Button>
        </Tooltip>
        <Tooltip title={t('rightPanel.strikethrough')}>
          <Button
            variant="text"
            size="small"
            className={`w-full ${layer.linethrough ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}
            onClick={() => onPropChange('linethrough', !layer.linethrough)}
          >
            <StrikethroughIcon className="w-3 h-3" />
          </Button>
        </Tooltip>
      </div>
    </div>
  );
}

// ─── 颜色填充区 ───────────────────────────────────────────────

export function ColorFillSection({ layer, onPropChange }: TextSectionProps) {
  const { t } = useTranslation();

  // 将 fill 规范化为 FillStyle 对象。
  const fillValue: FillStyle =
    typeof layer.fill === 'string'
      ? { type: 'solid', color: layer.fill || '#000000' }
      : layer.fill;

  return (
    <div className="flex flex-col border-b border-gray-100 pb-3">
      <SectionHeader title={t('rightPanel.colorFill')} />
      <div className="px-4 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <FillPicker
            value={fillValue}
            onChange={(f) => onPropChange('fill', f as TextLayer['fill'])}
            size="small"
          />
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

export function TextEffectsSection({
  layer,
  onPropChange,
  onStrokeChange,
  onShadowChange,
  onNeonGlow,
}: TextEffectsSectionProps) {
  const { t } = useTranslation();
  const shadowColor = layer.textShadow?.color ?? '#000000';
  const shadowBlur = layer.textShadow?.blur ?? 12;
  const shadowOffsetX = layer.textShadow?.offsetX ?? 0;
  const shadowOffsetY = layer.textShadow?.offsetY ?? 0;
  const shadowEnabled = layer.textShadow !== null && layer.textShadow !== undefined;
  const neonColor = layer.textShadow?.color ?? '#ff2d55';
  const neonBlur = layer.textShadow?.blur ?? 28;

  return (
    <CollapsiblePanel
      position="left"
      defaultWidth={272}
      collapsedWidth={272}
      className="!z-0 !shadow-none bg-transparent border-b border-gray-100"
    >
      <div className="flex flex-col pb-3">
        <SectionHeader title={t('rightPanel.textEffects')} />
        <div className="px-4 flex flex-col gap-3">
          <div className="flex flex-col gap-2 bg-[#f5f5f5] rounded p-2">
            <div className="text-[11px] font-semibold text-gray-700">{t('rightPanel.textStroke')}</div>
            <div className="flex items-center gap-2">
              <ColorPicker
                value={layer.textStroke || ''}
                onChange={(color) => onStrokeChange(color, layer.textStrokeWidth ?? 0)}
                size="small"
                allowClear
              />
              <span className="text-xs text-gray-500">{t('rightPanel.strokeColor')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-400 w-10">{t('rightPanel.strokeWidth')}</span>
              <Slider
                className="flex-1"
                min={0}
                max={30}
                value={layer.textStrokeWidth ?? 0}
                onChange={(value) => onStrokeChange(layer.textStroke ?? '', value, { commit: false })}
                onChangeEnd={(value) => onStrokeChange(layer.textStroke ?? '', value, { commit: true })}
              />
              <span className="text-[10px] text-gray-600 w-8 text-right">{layer.textStrokeWidth ?? 0}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 bg-[#f5f5f5] rounded p-2">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-semibold text-gray-700">{t('rightPanel.dropShadow')}</div>
              <Button
                variant="text"
                size="small"
                className={shadowEnabled ? 'text-blue-600 bg-white shadow-sm' : 'text-gray-500'}
                onClick={() => {
                  if (shadowEnabled) {
                    onPropChange('textShadow', null);
                    return;
                  }
                  onShadowChange('#000000', 12, 4, 4, { commit: true });
                }}
              >
                {shadowEnabled ? t('rightPanel.disable') : t('rightPanel.enable')}
              </Button>
            </div>
            <div className={shadowEnabled ? 'flex flex-col gap-2' : 'flex flex-col gap-2 opacity-50 pointer-events-none'}>
              <div className="flex items-center gap-2">
                <ColorPicker
                  value={shadowColor}
                  onChange={(color) => onShadowChange(color, shadowBlur, shadowOffsetX, shadowOffsetY)}
                  size="small"
                />
                <span className="text-xs text-gray-500">{t('rightPanel.shadowColor')}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400 w-10">{t('rightPanel.blur')}</span>
                <Slider
                  className="flex-1"
                  min={0}
                  max={80}
                  value={shadowBlur}
                  onChange={(value) => onShadowChange(shadowColor, value, shadowOffsetX, shadowOffsetY, { commit: false })}
                  onChangeEnd={(value) => onShadowChange(shadowColor, value, shadowOffsetX, shadowOffsetY, { commit: true })}
                />
                <span className="text-[10px] text-gray-600 w-8 text-right">{shadowBlur}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400 w-10">{t('rightPanel.offsetX')}</span>
                <Slider
                  className="flex-1"
                  min={-100}
                  max={100}
                  value={shadowOffsetX}
                  onChange={(value) => onShadowChange(shadowColor, shadowBlur, value, shadowOffsetY, { commit: false })}
                  onChangeEnd={(value) => onShadowChange(shadowColor, shadowBlur, value, shadowOffsetY, { commit: true })}
                />
                <span className="text-[10px] text-gray-600 w-8 text-right">{shadowOffsetX}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400 w-10">{t('rightPanel.offsetY')}</span>
                <Slider
                  className="flex-1"
                  min={-100}
                  max={100}
                  value={shadowOffsetY}
                  onChange={(value) => onShadowChange(shadowColor, shadowBlur, shadowOffsetX, value, { commit: false })}
                  onChangeEnd={(value) => onShadowChange(shadowColor, shadowBlur, shadowOffsetX, value, { commit: true })}
                />
                <span className="text-[10px] text-gray-600 w-8 text-right">{shadowOffsetY}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 bg-[#f5f5f5] rounded p-2">
            <div className="text-[11px] font-semibold text-gray-700">{t('rightPanel.effectPresets')}</div>
            <div className="flex items-center gap-2">
              <ColorPicker
                value={neonColor}
                onChange={(color) => onNeonGlow(color, neonBlur)}
                size="small"
              />
              <span className="text-xs text-gray-500">{t('rightPanel.glowColor')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-400 w-10">{t('rightPanel.glowBlur')}</span>
              <Slider
                className="flex-1"
                min={0}
                max={120}
                value={neonBlur}
                onChange={(value) => onNeonGlow(neonColor, value, { commit: false })}
                onChangeEnd={(value) => onNeonGlow(neonColor, value, { commit: true })}
              />
              <span className="text-[10px] text-gray-600 w-8 text-right">{neonBlur}</span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              <Button
                size="small"
                variant="text"
                className="text-[11px] bg-white text-red-500"
                onClick={() => onNeonGlow('#ff2d55', 32)}
              >
                {t('rightPanel.presetNeonRed')}
              </Button>
              <Button
                size="small"
                variant="text"
                className="text-[11px] bg-white text-blue-600"
                onClick={() => {
                  onStrokeChange('#1d4ed8', 2, { commit: true });
                  onShadowChange('#0c4a6e', 4, 2, 2, { commit: true });
                }}
              >
                {t('rightPanel.preset3DBlue')}
              </Button>
              <Button
                size="small"
                variant="text"
                className="text-[11px] bg-white text-gray-700"
                onClick={() => {
                  const strokeColor =
                    typeof layer.fill === 'string' && layer.fill
                      ? layer.fill
                      : '#111111';
                  onStrokeChange(strokeColor, 2, { commit: true });
                  onPropChange('fill', 'transparent');
                  onPropChange('textShadow', null);
                }}
              >
                {t('rightPanel.presetOutline')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </CollapsiblePanel>
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
        <Slider
          className="flex-1"
          value={layer.opacity * 100}
          onChange={(val) => onPropChange('opacity', val / 100, { commit: false })}
          onChangeEnd={(val) => onPropChange('opacity', val / 100, { commit: true })}
        />
        <span className="text-[10px] text-gray-600 w-8 text-right">{Math.round(layer.opacity * 100)}%</span>
      </div>
    </div>
  );
}
