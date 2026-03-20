import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useEditorStore } from '../../../../store/useEditorStore';
import { applyWorkspaceZoom } from './handlers';
import { MAX_ZOOM, MIN_ZOOM, clampZoom } from './shared';

const ZOOM_STEP = 0.2;

const PRESET_ZOOMS = [2.0, 1.5, 1.0, 0.5] as const;

/** 把缩放值四舍五入到 1 位小数，保证按钮缩放步进显示更稳定。 */
function roundZoom(z: number): number {
  return Math.round(z * 10) / 10;
}

/**
 * 工作区右下角缩放控件。
 * 负责展示当前百分比、预设缩放值、Fit 操作以及 `+/-` 缩放按钮。
 */
export const ZoomControls = () => {
  const { t } = useTranslation();
  const zoom = useEditorStore((s) => s.zoom);
  const requestFit = useEditorStore((s) => s.requestFit);

  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  /** 让工作区按固定步进缩小，并交给统一缩放逻辑做平滑过渡。 */
  const handleZoomOut = () => {
    applyWorkspaceZoom({
      nextZoom: clampZoom(roundZoom(zoom - ZOOM_STEP)),
    });
  };

  /** 让工作区按固定步进放大，并交给统一缩放逻辑做平滑过渡。 */
  const handleZoomIn = () => {
    applyWorkspaceZoom({
      nextZoom: clampZoom(roundZoom(zoom + ZOOM_STEP)),
    });
  };

  /** 直接应用预设缩放值，并在选择后收起下拉面板。 */
  const handlePreset = (z: number) => {
    applyWorkspaceZoom({
      nextZoom: z,
    });
    setOpen(false);
  };

  /** 触发“适应画布”请求，并关闭当前弹出的缩放面板。 */
  const handleFit = () => {
    requestFit();
    setOpen(false);
  };

  // 为什么这里监听 document：
  // 缩放预设面板是绝对定位浮层，点击工作区任意位置都应该关闭，因此不能只依赖按钮自身状态。
  useEffect(() => {
    if (!open) return;
    /** 当用户点击浮层外部区域时，关闭缩放预设面板。 */
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
      {/* 缩放预设面板：向上弹出，跟随右下角百分比按钮。 */}
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

      {/* 缩小按钮：使用统一缩放流程，保证按钮与滚轮手感一致。 */}
      <button
        aria-label={t('zoom.zoomOut')}
        disabled={zoom <= MIN_ZOOM}
        onClick={handleZoomOut}
        className="w-6 h-6 flex items-center justify-center rounded bg-white border border-gray-200 shadow-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-base leading-none"
      >
        −
      </button>

      {/* 百分比按钮：展示当前 zoom 百分比，并负责打开/关闭预设面板。 */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="h-6 px-2 flex items-center justify-center rounded bg-white border border-gray-200 shadow-sm text-xs text-gray-700 hover:bg-gray-50 transition-colors tabular-nums min-w-[44px]"
      >
        {pct}
      </button>

      {/* 放大按钮：使用统一缩放流程，保证按钮与滚轮手感一致。 */}
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
