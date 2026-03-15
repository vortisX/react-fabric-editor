import { useEditorStore } from '../../../../../store/useEditorStore';
import { engineInstance } from '../../../../../core/engine';
import { SCHEMA_TO_FABRIC } from '../../../../../core/constants';
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
  // borderRadius 通过 clipPath 处理，交由 engine.updateLayerProps 内部分支处理
  // 滤镜属性直接以原 key 传递，engine 内部会从 store 读取完整状态后全量应用
  const fabricKey = SCHEMA_TO_FABRIC[key as string] ?? (key as string);
  engineInstance.updateLayerProps(layerId, { [fabricKey]: value });
};
