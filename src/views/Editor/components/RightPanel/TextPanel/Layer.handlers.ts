import { t } from 'i18next';
import { useEditorStore } from '../../../../../store/useEditorStore';
import type { TextLayer } from '../../../../../types/schema';

function buildLayerName(text: string, fallback: string): string {
  const trimmed = text.trim() || fallback;
  return trimmed.length > 15 ? trimmed.slice(0, 15) + '...' : trimmed;
}

interface PropChangeOptions {
  commit?: boolean;
}

export type PropChangeHandler = <K extends keyof TextLayer>(
  key: K,
  value: TextLayer[K],
  options?: PropChangeOptions,
) => void;

/**
 * 封装图层属性变更逻辑：
 * 1. 更新 Zustand Store（数据源）
 * 2. 由 Store 触发引擎同步（渲染层）
 */
export const handlePropChange = <K extends keyof TextLayer>(
  layerId: string,
  key: K,
  value: TextLayer[K],
  options?: PropChangeOptions,
) => {
  if (!layerId) return;

  const storeUpdates: Partial<TextLayer> = { [key]: value };
  if (key === 'content') {
    storeUpdates.name = buildLayerName((value as string) || '', t('rightPanel.emptyText'));
  }
  useEditorStore.getState().updateLayer(layerId, storeUpdates, {
    commit: options?.commit ?? true,
    origin: 'ui',
  });
};
