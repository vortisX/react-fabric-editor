import { useEditorStore } from '../../../../../store/useEditorStore';
import type { ImageLayer } from '../../../../../types/schema';

interface ImagePropChangeOptions {
  commit?: boolean;
}

export type ImagePropChangeHandler = <K extends keyof ImageLayer>(
  key: K,
  value: ImageLayer[K],
  options?: ImagePropChangeOptions,
) => void;

/** 图片图层属性变更的纯 TS 处理器（不依赖 React Hook） */
export const handleImagePropChange = <K extends keyof ImageLayer>(
  layerId: string,
  key: K,
  value: ImageLayer[K],
  options?: ImagePropChangeOptions,
) => {
  if (!layerId) return;

  useEditorStore.getState().updateLayer(
    layerId,
    { [key]: value } as Partial<ImageLayer>,
    {
      commit: options?.commit ?? true,
      origin: 'ui',
    },
  );
};
