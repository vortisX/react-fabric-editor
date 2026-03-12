import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useEditorStore } from '../../../store/useEditorStore';

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 2.0;
const ZOOM_STEP = 0.2;

const PRESET_ZOOMS = [2.0, 1.5, 1.0, 0.5] as const;

function clampZoom(z: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
}

function roundZoom(z: number): number {
  return Math.round(z * 10) / 10;
}

export const ZoomControls = () => {
  const { t } = useTranslation();
  const zoom = useEditorStore((s) => s.zoom);
  const setZoom = useEditorStore((s) => s.setZoom);
  const requestFit = useEditorStore((s) => s.requestFit);

  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const handleZoomOut = () => {
    setZoom(clampZoom(roundZoom(zoom - ZOOM_STEP)));
  };

  const handleZoomIn = () => {
    setZoom(clampZoom(roundZoom(zoom + ZOOM_STEP)));
  };

  const handlePreset = (z: number) => {
    setZoom(z);
    setOpen(false);
  };

  const handleFit = () => {
    requestFit();
    setOpen(false);
  };

  // 点击 Popover 外部关闭
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const pct = `${Math.round(zoom * 100)}%`;

  return (
    <div className="absolute bottom-4 right-4 z-50 flex items-center gap-1 select-none">
      {/* Popover（向上弹出，跟随百分比按钮） */}
      {open && (
        <div
          ref={popoverRef}
          className="absolute bottom-8 right-0 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[120px] overflow-hidden"
        >
          <button
            className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 transition-colors"
            onClick={handleFit}
          >
            {t('zoom.fitCanvas')}
          </button>
          <div className="border-t border-gray-100 my-1" />
          {PRESET_ZOOMS.map((z) => (
            <button
              key={z}
              className={[
                'w-full text-left px-3 py-1.5 text-xs transition-colors',
                zoom === z ? 'text-blue-600 bg-blue-50 font-medium' : 'text-gray-700 hover:bg-gray-100',
              ].join(' ')}
              onClick={() => handlePreset(z)}
            >
              {`${Math.round(z * 100)}%`}
            </button>
          ))}
        </div>
      )}

      {/* 缩小按钮 */}
      <button
        aria-label={t('zoom.zoomOut')}
        disabled={zoom <= MIN_ZOOM}
        onClick={handleZoomOut}
        className="w-6 h-6 flex items-center justify-center rounded bg-white border border-gray-200 shadow-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-base leading-none"
      >
        −
      </button>

      {/* 百分比按钮（点击开关 Popover） */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="h-6 px-2 flex items-center justify-center rounded bg-white border border-gray-200 shadow-sm text-xs text-gray-700 hover:bg-gray-50 transition-colors tabular-nums min-w-[44px]"
      >
        {pct}
      </button>

      {/* 放大按钮 */}
      <button
        aria-label={t('zoom.zoomIn')}
        disabled={zoom >= MAX_ZOOM}
        onClick={handleZoomIn}
        className="w-6 h-6 flex items-center justify-center rounded bg-white border border-gray-200 shadow-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-base leading-none"
      >
        +
      </button>
    </div>
  );
};
