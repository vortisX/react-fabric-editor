import { useTranslation } from 'react-i18next';
import { NumberInput, Select, ColorPicker, Slider, Button, Tooltip } from '../../../../../components/ui';
import type { ImageLayer } from '../../../../../types/schema';
import type { ImagePropChangeHandler } from './Layer.handlers';

// ─── 共享基础组件 ──────────────────────────────────────────────

interface DesignNumberInputProps {
  label: string;
  value: number;
  onChange?: (value: number | null) => void;
  step?: number;
}

const DesignNumberInput = ({ label, value, onChange, step }: DesignNumberInputProps) => (
  <div className="flex items-center bg-[#f5f5f5] rounded px-2 py-0.5 border border-transparent hover:border-gray-300 transition-colors">
    <span className="text-[10px] text-gray-400 font-medium w-8 select-none flex items-center justify-center">{label}</span>
    <NumberInput value={value} onChange={onChange} step={step} />
  </div>
);

const SectionHeader = ({ title }: { title: string }) => (
  <div className="flex justify-between items-center px-4 py-2 bg-white mt-1">
    <span className="text-[11px] font-bold text-gray-800 tracking-wide">{title}</span>
  </div>
);

// ─── Section Props 类型 ───────────────────────────────────────

interface ImageSectionProps {
  layer: ImageLayer;
  onPropChange: ImagePropChangeHandler;
}

// ─── 图层名称区 ───────────────────────────────────────────────

export function ImageNameSection({ layer, onPropChange }: ImageSectionProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col border-b border-gray-100 pb-3">
      <SectionHeader title={t('rightPanel.layerName')} />
      <div className="px-4">
        <input
          key={`${layer.id}:${layer.name}`}
          type="text"
          defaultValue={layer.name}
          onBlur={(e) => onPropChange('name', e.target.value)}
          className="w-full text-[11px] px-2 py-1.5 bg-[#f5f5f5] border border-transparent hover:border-gray-300 focus:border-blue-500 focus:bg-white rounded outline-none transition-colors"
          placeholder={t('rightPanel.layerNamePlaceholder')}
        />
      </div>
    </div>
  );
}

// ─── 布局配置区 ───────────────────────────────────────────────

export function ImageLayoutSection({ layer, onPropChange }: ImageSectionProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col border-b border-gray-100 pb-3">
      <SectionHeader title={t('rightPanel.layout')} />
      <div className="px-4 flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <DesignNumberInput label={t('rightPanel.horizontal')} value={layer.x} onChange={(val) => onPropChange('x', val ?? 0)} />
          <DesignNumberInput label={t('rightPanel.vertical')} value={layer.y} onChange={(val) => onPropChange('y', val ?? 0)} />
          <DesignNumberInput label={t('rightPanel.width')} value={layer.width} onChange={(val) => onPropChange('width', Math.max(val ?? 10, 10))} />
          <DesignNumberInput label={t('rightPanel.height')} value={layer.height} onChange={(val) => onPropChange('height', Math.max(val ?? 10, 10))} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <DesignNumberInput label={t('rightPanel.rotation')} value={layer.rotation} onChange={(val) => onPropChange('rotation', val ?? 0)} />
        </div>
      </div>
    </div>
  );
}

// ─── 图片变换区（翻转） ──────────────────────────────────────

export function ImageTransformSection({ layer, onPropChange }: ImageSectionProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col border-b border-gray-100 pb-3">
      <SectionHeader title={t('rightPanel.imageTransform')} />
      <div className="px-4 flex gap-2">
        <Tooltip title={t('rightPanel.flipHorizontal')}>
          <Button
            variant="default"
            size="small"
            className={`flex-1 text-[10px] font-medium ${layer.flipX ? 'bg-blue-50 text-blue-600 border-blue-300' : 'text-gray-600'}`}
            onClick={() => onPropChange('flipX', !layer.flipX)}
          >
            ↔ {t('rightPanel.flipHorizontal')}
          </Button>
        </Tooltip>
        <Tooltip title={t('rightPanel.flipVertical')}>
          <Button
            variant="default"
            size="small"
            className={`flex-1 text-[10px] font-medium ${layer.flipY ? 'bg-blue-50 text-blue-600 border-blue-300' : 'text-gray-600'}`}
            onClick={() => onPropChange('flipY', !layer.flipY)}
          >
            ↕ {t('rightPanel.flipVertical')}
          </Button>
        </Tooltip>
      </div>
    </div>
  );
}

// ─── 边框样式区 ───────────────────────────────────────────────

export function ImageBorderSection({ layer, onPropChange }: ImageSectionProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col border-b border-gray-100 pb-3">
      <SectionHeader title={t('rightPanel.borderStyle')} />
      <div className="px-4 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <ColorPicker
            value={layer.stroke || 'transparent'}
            onChange={(c) => onPropChange('stroke', c)}
            size="small"
            allowClear
          />
          <Select
            className="flex-1"
            value={layer.strokeDashArray ? 'dashed' : 'solid'}
            onChange={(val) => onPropChange('strokeDashArray', val === 'dashed' ? [5, 5] : undefined)}
            options={[
              { value: 'solid', label: t('rightPanel.solid') },
              { value: 'dashed', label: t('rightPanel.dashed') },
            ]}
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-gray-400 font-medium shrink-0">{t('rightPanel.strokeWidth')}</span>
          <Slider
            className="flex-1"
            value={layer.strokeWidth ?? 0}
            min={0}
            max={50}
            step={1}
            onChange={(val) => onPropChange('strokeWidth', val, { commit: false })}
            onChangeEnd={(val) => onPropChange('strokeWidth', val, { commit: true })}
          />
          <span className="text-[10px] text-gray-600 w-6 text-right">{Math.round(layer.strokeWidth ?? 0)}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-gray-400 font-medium shrink-0">{t('rightPanel.borderRadius')}</span>
          <Slider
            className="flex-1"
            value={layer.borderRadius ?? 0}
            min={0}
            max={100}
            step={1}
            onChange={(val) => onPropChange('borderRadius', val, { commit: false })}
            onChangeEnd={(val) => onPropChange('borderRadius', val, { commit: true })}
          />
          <span className="text-[10px] text-gray-600 w-6 text-right">{Math.round(layer.borderRadius ?? 0)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── 滤镜调节区 ───────────────────────────────────────────────

/** 带标签和数值的滑块行 */
function FilterSliderRow({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number, commit: boolean) => void;
}) {
  // 将 [-1,1] 或 [-2,2] 映射到 [0, 100] 供 Slider 使用
  const sliderVal = Math.round(((value - min) / (max - min)) * 100);
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-gray-400 font-medium w-10 shrink-0">{label}</span>
      <Slider
        className="flex-1"
        value={sliderVal}
        onChange={(v) => onChange(min + (v / 100) * (max - min), false)}
        onChangeEnd={(v) => onChange(min + (v / 100) * (max - min), true)}
      />
      <span className="text-[10px] text-gray-600 w-8 text-right">
        {value >= 0 ? `+${value.toFixed(1)}` : value.toFixed(1)}
      </span>
    </div>
  );
}

export function ImageFiltersSection({ layer, onPropChange }: ImageSectionProps) {
  const { t } = useTranslation();

  const brightness = layer.brightness ?? 0;
  const contrast = layer.contrast ?? 0;
  const saturation = layer.saturation ?? 0;

  // 是否有非默认滤镜值
  const hasFilter = brightness !== 0 || contrast !== 0 || saturation !== 0;

  const handleReset = () => {
    onPropChange('brightness', 0);
    onPropChange('contrast', 0);
    onPropChange('saturation', 0);
  };

  return (
    <div className="flex flex-col border-b border-gray-100 pb-3">
      <div className="flex justify-between items-center px-4 py-2 bg-white mt-1">
        <span className="text-[11px] font-bold text-gray-800 tracking-wide">{t('rightPanel.imageFilters')}</span>
        {hasFilter && (
          <button
            className="text-[10px] text-blue-500 hover:text-blue-700 transition-colors font-medium"
            onClick={handleReset}
          >
            {t('rightPanel.resetFilters')}
          </button>
        )}
      </div>
      <div className="px-4 flex flex-col gap-2">
        <FilterSliderRow
          label={t('rightPanel.brightness')}
          value={brightness}
          min={-1}
          max={1}
          onChange={(v, commit) => onPropChange('brightness', Math.round(v * 100) / 100, { commit })}
        />
        <FilterSliderRow
          label={t('rightPanel.contrast')}
          value={contrast}
          min={-1}
          max={1}
          onChange={(v, commit) => onPropChange('contrast', Math.round(v * 100) / 100, { commit })}
        />
        <FilterSliderRow
          label={t('rightPanel.saturation')}
          value={saturation}
          min={-2}
          max={2}
          onChange={(v, commit) => onPropChange('saturation', Math.round(v * 100) / 100, { commit })}
        />
      </div>
    </div>
  );
}

// ─── 图层属性区（不透明度） ────────────────────────────────────

export function ImageLayerPropertiesSection({ layer, onPropChange }: ImageSectionProps) {
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
