import { useEditorStore } from '../../../../../store/useEditorStore';
import { handlePropChange, type PropChangeHandler } from './Layer.handlers';
import {
  LayoutSection,
  TypographySection,
  ColorFillSection,
  BorderStyleSection,
  LayerPropertiesSection,
} from './Sections';
import type { TextLayer } from '../../../../../types/schema';

/** 文本面板：点击文本图层或新增文本时展示，包含图层位置、排版、颜色、边框等属性 */
export const TextPanel = () => {
  // 精确订阅 activeLayer，避免 canvas resize / background 变更触发面板重渲染
  const activeLayer = useEditorStore((state) => {
    if (!state.activeLayerId || !state.document) return null;
    const page =
      state.document.pages.find((p) => p.pageId === state.currentPageId) ??
      state.document.pages[0];
    return (page?.layers.find((l) => l.id === state.activeLayerId) ?? null) as TextLayer | null;
  });

  if (!activeLayer) return null;

  const onPropChange: PropChangeHandler = (key, value) => {
    handlePropChange(activeLayer.id, key, value);
  };

  const isTextLayer = activeLayer.type === 'text';
  const textLayer = activeLayer as TextLayer;

  return (
    <div className="overflow-y-auto h-[calc(100vh-40px)] pb-10 flex flex-col">
      <LayoutSection layer={activeLayer} isTextLayer={isTextLayer} textLayer={textLayer} onPropChange={onPropChange} />
      {isTextLayer && <TypographySection layer={textLayer} onPropChange={onPropChange} />}
      <ColorFillSection layer={textLayer} onPropChange={onPropChange} />
      <BorderStyleSection layer={textLayer} onPropChange={onPropChange} />
      <LayerPropertiesSection layer={activeLayer} onPropChange={onPropChange} />
    </div>
  );
};
