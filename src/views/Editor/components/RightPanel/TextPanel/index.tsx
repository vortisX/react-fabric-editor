import { findLayerById } from '../../../../../core/layers/layerTree';
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

/** 鏂囨湰闈㈡澘锛氱偣鍑绘枃鏈浘灞傛垨鏂板鏂囨湰鏃跺睍绀猴紝鍖呭惈鍥惧眰浣嶇疆銆佹帓鐗堛€侀鑹层€佽竟妗嗙瓑灞炴€?*/
export const TextPanel = () => {
  // 绮剧‘璁㈤槄 activeLayer锛岄伩鍏?canvas resize / background 鍙樻洿瑙﹀彂闈㈡澘閲嶆覆鏌撱€?
  const activeLayer = useEditorStore((state) => {
    if (!state.activeLayerId || !state.document) return null;
    const page =
      state.document.pages.find((p) => p.pageId === state.currentPageId) ??
      state.document.pages[0];
    return (page ? findLayerById(page.layers, state.activeLayerId) : null) as TextLayer | null;
  });

  if (!activeLayer) return null;

  /** 鎶婃枃鏈潰鏉跨殑瀛楁淇敼缁熶竴涓嬪彂缁欑函 TS handlers锛屼繚鎸佽鍥惧眰鍙叧蹇冨睍绀恒€?*/
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
