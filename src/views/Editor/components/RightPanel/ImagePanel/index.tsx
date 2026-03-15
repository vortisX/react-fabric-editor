import { useEditorStore } from '../../../../../store/useEditorStore';
import { handleImagePropChange, type ImagePropChangeHandler } from './Layer.handlers';
import {
  ImageLayoutSection,
  ImageTransformSection,
  ImageBorderSection,
  ImageFiltersSection,
  ImageLayerPropertiesSection,
} from './Sections';
import type { ImageLayer } from '../../../../../types/schema';

/** 图片图层属性面板：点击图片图层时展示 */
export const ImagePanel = () => {
  // 精确订阅 activeLayer，避免无关状态变更触发重渲染
  const activeLayer = useEditorStore((state) => {
    if (!state.activeLayerId || !state.document) return null;
    const page =
      state.document.pages.find((p) => p.pageId === state.currentPageId) ??
      state.document.pages[0];
    return (page?.layers.find((l) => l.id === state.activeLayerId) ?? null) as ImageLayer | null;
  });

  if (!activeLayer || activeLayer.type !== 'image') return null;

  const onPropChange: ImagePropChangeHandler = (key, value) => {
    handleImagePropChange(activeLayer.id, key, value);
  };

  return (
    <div className="overflow-y-auto h-[calc(100vh-40px)] pb-10 flex flex-col">
      <ImageLayoutSection layer={activeLayer} onPropChange={onPropChange} />
      <ImageTransformSection layer={activeLayer} onPropChange={onPropChange} />
      <ImageBorderSection layer={activeLayer} onPropChange={onPropChange} />
      <ImageFiltersSection layer={activeLayer} onPropChange={onPropChange} />
      <ImageLayerPropertiesSection layer={activeLayer} onPropChange={onPropChange} />
    </div>
  );
};
