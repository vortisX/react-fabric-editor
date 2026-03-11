import { useTranslation } from 'react-i18next';
import { useEditorStore } from '../../../../store/useEditorStore';
import { engineInstance } from '../../../../core/engine';
import { SCHEMA_TO_FABRIC } from '../../../../core/constants';
import type { TextLayer, Layer } from '../../../../types/schema';



function buildLayerName(text: string, fallback: string): string {
  const trimmed = text.trim() || fallback;
  return trimmed.length > 15 ? trimmed.slice(0, 15) + '...' : trimmed;
}

/**
 * 封装图层属性变更逻辑：
 * 1. 更新 Zustand Store（数据源）
 * 2. 同步到 Fabric 画布（渲染层）
 */
export function useLayerActions(activeLayer: Layer | undefined) {
  const updateLayer = useEditorStore((state) => state.updateLayer);
  const { t } = useTranslation();

  const handlePropChange = <K extends keyof TextLayer>(key: K, value: TextLayer[K]) => {
    if (!activeLayer) return;

    // 构建 Store 更新
    const storeUpdates: Partial<TextLayer> = { [key]: value };
    if (key === 'content') {
      storeUpdates.name = buildLayerName((value as string) || '', t('rightPanel.emptyText'));
    }
    updateLayer(activeLayer.id, storeUpdates);

    // 映射为 Fabric 属性名并同步画布
    const fabricKey = SCHEMA_TO_FABRIC[key as string] ?? (key as string);
    const fabricValue = key === 'letterSpacing' ? (value as number) * 10 : value;
    engineInstance.updateLayerProps(activeLayer.id, { [fabricKey]: fabricValue });
  };

  return { handlePropChange };
}

export type PropChangeHandler = <K extends keyof TextLayer>(key: K, value: TextLayer[K]) => void;
