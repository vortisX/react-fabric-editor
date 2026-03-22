import { t } from 'i18next';
import { ensureFontLoaded } from '../../../../../constants/fonts';
import { useEditorStore } from '../../../../../store/useEditorStore';
import type { TextLayer } from '../../../../../types/schema';

/** ????????????????????????? */
function buildLayerName(text: string, fallback: string): string {
  const trimmed = text.trim() || fallback;
  return trimmed.length > 15 ? trimmed.slice(0, 15) + '...' : trimmed;
}

interface PropChangeOptions {
  commit?: boolean;
}

/** ?????????????????? Section ??? */
export type PropChangeHandler = <K extends keyof TextLayer>(
  key: K,
  value: TextLayer[K],
  options?: PropChangeOptions,
) => void;

/**
 * ???????????
 * 1. ?? Zustand Store?????
 * 2. ? Store ???????????
 */
export const handlePropChange = <K extends keyof TextLayer>(
  layerId: string,
  key: K,
  value: TextLayer[K],
  options?: PropChangeOptions,
) => {
  if (!layerId) return;

  if (key === 'fontFamily' && typeof value === 'string') {
    void ensureFontLoaded(value).finally(() => {
      useEditorStore.getState().updateLayer(
        layerId,
        { fontFamily: value } as Partial<TextLayer>,
        {
          commit: options?.commit ?? true,
          origin: 'ui',
        },
      );
    });
    return;
  }

  const storeUpdates: Partial<TextLayer> = { [key]: value };
  if (key === 'content') {
    // ?????????????????????????????
    storeUpdates.name = buildLayerName((value as string) || '', t('rightPanel.emptyText'));
  }
  useEditorStore.getState().updateLayer(layerId, storeUpdates, {
    commit: options?.commit ?? true,
    origin: 'ui',
  });
};
