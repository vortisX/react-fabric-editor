import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, FillPicker, Select } from '../../../../../components/ui';
import type { PageBackground } from '../../../../../types/schema';
import { CANVAS_MAX_PX, CANVAS_MIN_PX, type CanvasUnit } from '../../../../../core/constants';
import { CANVAS_PRESETS } from '../../../../../core/canvasPresets';
import { convertPxToUnit, matchCanvasPresetId } from '../../../../../core/canvasMath';
import { useEditorStore } from '../../../../../store/useEditorStore';
import {
  normalizeFillFromBackground,
  nextBackgroundFromFill,
  handlePresetChange,
  applyDimensionChange,
} from './CanvasLayout.handlers';

const UNIT_OPTIONS = [
  { value: 'px', label: 'px' },
  { value: 'mm', label: 'mm' },
  { value: 'cm', label: 'cm' },
  { value: 'in', label: 'in' },
];

function roundTo(n: number, digits: number) {
  const m = Math.pow(10, digits);
  return Math.round(n * m) / m;
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex justify-between items-center px-4 py-2 bg-white mt-1">
      <span className="text-[11px] font-bold text-gray-800 tracking-wide">{title}</span>
    </div>
  );
}

function RealtimeNumberInput(props: {
  value: number;
  onChange: (value: number | null) => void;
  invalid?: boolean;
}) {
  const { value, onChange, invalid = false } = props;
  const [local, setLocal] = useState(String(value));
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    setLocal(String(value));
  }, [value]);

  return (
    <input
      type="text"
      inputMode="decimal"
      value={local}
      onChange={(e) => {
        const next = e.target.value;
        setLocal(next);
        if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          const n = parseFloat(next);
          onChange(Number.isFinite(n) ? n : null);
        });
      }}
      className={[
        'w-full h-6 px-1.5 text-xs bg-transparent outline-none text-gray-700 tabular-nums',
        invalid ? 'text-red-600' : '',
      ].join(' ')}
    />
  );
}

export function CanvasLayoutSection() {
  const { t } = useTranslation();
  const hasDocument = useEditorStore((s) => s.document !== null);
  const widthPx = useEditorStore((s) => s.document?.global.width ?? 0);
  const heightPx = useEditorStore((s) => s.document?.global.height ?? 0);
  const unit = useEditorStore((s) => (s.document?.global.unit ?? 'px') as CanvasUnit);
  const background = useEditorStore((s) => {
    const doc = s.document;
    if (!doc) return null;
    const page = doc.pages.find((p) => p.pageId === s.currentPageId) ?? doc.pages[0];
    return page?.background ?? null;
  });
  const canUndo = useEditorStore((s) => s.history.past.length > 0);
  const canRedo = useEditorStore((s) => s.history.future.length > 0);

  const setCanvasUnit = useEditorStore((s) => s.setCanvasUnit);
  const setPageBackground = useEditorStore((s) => s.setPageBackground);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);

  const selectedPresetId = useMemo(() => matchCanvasPresetId(widthPx, heightPx), [widthPx, heightPx]);

  const widthDisplay = useMemo(() => {
    const raw = convertPxToUnit(widthPx, unit);
    return unit === 'px' ? Math.round(raw) : roundTo(raw, 2);
  }, [widthPx, unit]);

  const heightDisplay = useMemo(() => {
    const raw = convertPxToUnit(heightPx, unit);
    return unit === 'px' ? Math.round(raw) : roundTo(raw, 2);
  }, [heightPx, unit]);

  const [widthError, setWidthError] = useState<string | null>(null);
  const [heightError, setHeightError] = useState<string | null>(null);

  if (!hasDocument) return null;
  const safeBackground: PageBackground = background ?? { type: 'color', value: '#ffffff' };

  const handleWidthChange = (v: number | null) => {
    const errKey = applyDimensionChange('width', v, unit);
    setWidthError(errKey ? t(errKey, { min: CANVAS_MIN_PX, max: CANVAS_MAX_PX }) : null);
  };

  const handleHeightChange = (v: number | null) => {
    const errKey = applyDimensionChange('height', v, unit);
    setHeightError(errKey ? t(errKey, { min: CANVAS_MIN_PX, max: CANVAS_MAX_PX }) : null);
  };

  const handleUnitChange = (val: string) => {
    setWidthError(null);
    setHeightError(null);
    setCanvasUnit(val);
  };

  const backgroundMode = safeBackground.type === 'image' ? 'image' : 'fill';

  return (
    <div className="flex flex-col border-b border-gray-100 pb-3">
      <SectionHeader title={t('rightPanel.canvasLayout')} />
      <div className="px-4 flex flex-col gap-2">
        <Select
          value={selectedPresetId}
          onChange={(id) => handlePresetChange(id as Parameters<typeof handlePresetChange>[0])}
          options={CANVAS_PRESETS.map((p) => ({ value: p.id, label: p.label }))}
        />

        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center bg-[#f5f5f5] rounded px-2 py-0.5 border border-transparent hover:border-gray-300 transition-colors">
            <span className="text-[10px] text-gray-400 font-medium w-8 select-none flex items-center justify-center">W</span>
            <RealtimeNumberInput value={widthDisplay} onChange={handleWidthChange} invalid={!!widthError} />
          </div>
          <Select value={unit} onChange={handleUnitChange} options={UNIT_OPTIONS} />
          <div className="flex items-center bg-[#f5f5f5] rounded px-2 py-0.5 border border-transparent hover:border-gray-300 transition-colors">
            <span className="text-[10px] text-gray-400 font-medium w-8 select-none flex items-center justify-center">H</span>
            <RealtimeNumberInput value={heightDisplay} onChange={handleHeightChange} invalid={!!heightError} />
          </div>
          <Select value={unit} onChange={handleUnitChange} options={UNIT_OPTIONS} />
        </div>
        {widthError || heightError ? (
          <div className="text-[10px] text-red-600 font-medium">{widthError ?? heightError}</div>
        ) : null}

        <div className="flex flex-col gap-2 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-500 font-medium">{t('rightPanel.backgroundColor')}</span>
            <div className="flex items-center gap-1">
              <Button variant="text" size="small" className="text-gray-600" onClick={undo} disabled={!canUndo}>
                {t('rightPanel.undoAction')}
              </Button>
              <Button variant="text" size="small" className="text-gray-600" onClick={redo} disabled={!canRedo}>
                {t('rightPanel.redoAction')}
              </Button>
            </div>
          </div>

          <Select
            value={backgroundMode}
            onChange={(mode) => {
              if (mode === 'image') {
                if (safeBackground.type === 'image') return;
                setPageBackground({ type: 'image', url: '', fit: 'cover' });
                return;
              }
              if (safeBackground.type === 'image') {
                setPageBackground({ type: 'color', value: '#ffffff' });
              }
            }}
            options={[
              { value: 'image', label: t('rightPanel.bgImage') },
              { value: 'fill', label: t('rightPanel.bgColorGradient') },
            ]}
          />

          {safeBackground.type === 'image' ? (
            <div className="flex flex-col gap-2">
              <input
                type="file"
                accept="image/*"
                className="text-[11px]"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    const url = String(reader.result || '');
                    setPageBackground({ type: 'image', url, fit: safeBackground.fit ?? 'cover' });
                  };
                  reader.readAsDataURL(file);
                }}
              />
              <Select
                value={safeBackground.fit ?? 'cover'}
                onChange={(fit) => setPageBackground({ ...safeBackground, fit } as PageBackground)}
                options={[
                  { value: 'none', label: t('rightPanel.none') },
                  { value: 'tile', label: t('rightPanel.bgFitTile') },
                  { value: 'stretch', label: t('rightPanel.bgFitStretch') },
                  { value: 'cover', label: t('rightPanel.bgFitCover') },
                ]}
              />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <FillPicker
                value={normalizeFillFromBackground(safeBackground)}
                onChange={(fill) => setPageBackground(nextBackgroundFromFill(fill))}
                size="small"
              />
              <span className="text-xs text-gray-500">{t('rightPanel.fill')}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
