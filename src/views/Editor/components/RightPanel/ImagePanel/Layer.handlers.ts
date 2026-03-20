import { useEditorStore } from '../../../../../store/useEditorStore';
import type { ImageLayer } from '../../../../../types/schema';

interface ImagePropChangeOptions {
  commit?: boolean;
}

/** 图片图层属性变更函数签名，供各个 Section 组件共享。 */
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
      // 图片面板里的按钮和输入大多来自用户直接操作，因此默认按一次完整提交处理。
      commit: options?.commit ?? true,
      origin: 'ui',
    },
  );
};
