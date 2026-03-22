import { findLayerById } from '../../../../../core/layers/layerTree';
import { useEditorStore } from '../../../../../store/useEditorStore';
import { handleImagePropChange, type ImagePropChangeHandler } from './Layer.handlers';
import {
  ImageNameSection,
  ImageLayoutSection,
  ImageTransformSection,
  ImageBorderSection,
  ImageFiltersSection,
  ImageLayerPropertiesSection,
} from './Sections';

import type { ImageLayer } from '../../../../../types/schema';

/** 鍥剧墖鍥惧眰灞炴€ч潰鏉匡細鐐瑰嚮鍥剧墖鍥惧眰鏃跺睍绀?*/
export const ImagePanel = () => {
  // 绮剧‘璁㈤槄 activeLayer锛岄伩鍏嶆棤鍏崇姸鎬佸彉鏇磋Е鍙戦噸娓叉煋銆?
  const activeLayer = useEditorStore((state) => {
    if (!state.activeLayerId || !state.document) return null;
    const page =
      state.document.pages.find((p) => p.pageId === state.currentPageId) ??
      state.document.pages[0];
    return (page ? findLayerById(page.layers, state.activeLayerId) : null) as ImageLayer | null;
  });

  if (!activeLayer || activeLayer.type !== 'image') return null;

  /** 鎶婇潰鏉块噷鐨勫瓧娈垫敼鍔ㄧ粺涓€杞氦缁欑函 TS handlers锛屼繚鎸?React 缁勪欢灏介噺杞汇€?*/
  const onPropChange: ImagePropChangeHandler = (key, value) => {
    handleImagePropChange(activeLayer.id, key, value);
  };

  return (
    <div className="overflow-y-auto h-[calc(100vh-40px)] pb-10 flex flex-col">
      <ImageNameSection layer={activeLayer} onPropChange={onPropChange} />
      <ImageLayoutSection layer={activeLayer} onPropChange={onPropChange} />
      <ImageTransformSection layer={activeLayer} onPropChange={onPropChange} />
      <ImageBorderSection layer={activeLayer} onPropChange={onPropChange} />
      <ImageFiltersSection layer={activeLayer} onPropChange={onPropChange} />
      <ImageLayerPropertiesSection layer={activeLayer} onPropChange={onPropChange} />
    </div>
  );
};

