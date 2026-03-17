import { useEditorStore } from '../../../../../store/useEditorStore';
import { engineInstance } from '../../../../../core/engine';
import type { ImageLayer } from '../../../../../types/schema';

export type ImagePropChangeHandler = <K extends keyof ImageLayer>(key: K, value: ImageLayer[K]) => void;

/** 图片图层属性变更的纯 TS 处理器（不依赖 React Hook） */
export const handleImagePropChange = <K extends keyof ImageLayer>(
  layerId: string,
  key: K,
  value: ImageLayer[K]
) => {
  if (!layerId) return;

  // 1. 更新 Store（唯一事实来源）
  useEditorStore.getState().updateLayer(layerId, { [key]: value } as Partial<ImageLayer>);

  // 2. 同步到 Fabric 画布
  // 图片图层不需要映射 stroke -> boxStroke 等（这是 Textbox 专用逻辑）
  // 仅需映射基础变换属性：x->left, y->top, rotation->angle
  const IMAGE_SCHEMA_MAP: Record<string, string> = {
    x: 'left',
    y: 'top',
    rotation: 'angle',
  };
  const fabricKey = IMAGE_SCHEMA_MAP[key as string] ?? (key as string);
  
  engineInstance.updateLayerProps(layerId, { [fabricKey]: value });
};
