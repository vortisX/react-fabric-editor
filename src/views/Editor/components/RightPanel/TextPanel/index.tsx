import { findLayerById } from '../../../../../core/layers/layerTree';

import { useEditorStore } from '../../../../../store/useEditorStore';

import {
  handleNeonGlow,
  handlePropChange,
  handleShadowChange,
  handleStrokeChange,
  type PropChangeHandler,
} from './Layer.handlers';

import {

  LayoutSection,

  TypographySection,

  ColorFillSection,

  BorderStyleSection,

  TextEffectsSection,

  LayerPropertiesSection,

} from './Sections';

import type { TextLayer } from '../../../../../types/schema';

/** 文本面板：点击文本图层或新增文本时展示，包含图层位置、排版、颜色、边框等属性 */
export const TextPanel = () => {
  // 精确订阅 activeLayer，避免 canvas resize / background 变更触发面板重渲染。
  const activeLayer = useEditorStore((state) => {

    if (!state.activeLayerId || !state.document) return null;

    const page =

      state.document.pages.find((p) => p.pageId === state.currentPageId) ??

      state.document.pages[0];

    return (page ? findLayerById(page.layers, state.activeLayerId) : null) as TextLayer | null;

  });

  if (!activeLayer) return null;

  /** 把文本面板的字段修改统一下发给纯 TS handlers，保持视图层只关心展示。 */
  const onPropChange: PropChangeHandler = (key, value, options) => {

    handlePropChange(activeLayer.id, key, value, options);

  };

  const isTextLayer = activeLayer.type === 'text';

  const textLayer = activeLayer as TextLayer;

  return (

    <div className="overflow-y-auto h-[calc(100vh-40px)] pb-10 flex flex-col">

      <LayoutSection layer={activeLayer} isTextLayer={isTextLayer} textLayer={textLayer} onPropChange={onPropChange} />

      {isTextLayer && <TypographySection layer={textLayer} onPropChange={onPropChange} />}

      <ColorFillSection layer={textLayer} onPropChange={onPropChange} />

      <BorderStyleSection layer={textLayer} onPropChange={onPropChange} />

      <TextEffectsSection
        layer={textLayer}
        onPropChange={onPropChange}
        onStrokeChange={(color, width, options) =>
          handleStrokeChange(activeLayer.id, color, width, options)
        }
        onShadowChange={(color, blur, offsetX, offsetY, options) =>
          handleShadowChange(
            activeLayer.id,
            color,
            blur,
            offsetX,
            offsetY,
            options,
          )
        }
        onNeonGlow={(color, blur, options) =>
          handleNeonGlow(activeLayer.id, color, blur, options)
        }
      />

      <LayerPropertiesSection layer={activeLayer} onPropChange={onPropChange} />

    </div>

  );

};

