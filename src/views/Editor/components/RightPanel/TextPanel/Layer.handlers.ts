import { t } from 'i18next';
import { ensureFontLoaded } from '../../../../../constants/fonts';
import { useEditorStore } from '../../../../../store/useEditorStore';
import type { TextLayer, TextShadowStyle } from '../../../../../types/schema';

/** ????????????????????????? */
function buildLayerName(text: string, fallback: string): string {
  const trimmed = text.trim() || fallback;
  return trimmed.length > 15 ? trimmed.slice(0, 15) + '...' : trimmed;
}

interface PropChangeOptions {
  commit?: boolean;
}

export interface TextStrokePayload {
  color: string;
  width: number;
}

export interface TextShadowPayload {
  color: string;
  blur: number;
  offsetX: number;
  offsetY: number;
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

const normalizeShadowPayload = (payload: TextShadowPayload): TextShadowStyle => ({
  color: payload.color,
  blur: Math.max(0, payload.blur),
  offsetX: payload.offsetX,
  offsetY: payload.offsetY,
});

export const handleStrokeChange = (
  layerId: string,
  color: string,
  width: number,
  options?: PropChangeOptions,
): void => {
  if (!layerId) return;
  useEditorStore.getState().updateLayer(
    layerId,
    {
      textStroke: color,
      textStrokeWidth: Math.max(0, width),
    } as Partial<TextLayer>,
    {
      commit: options?.commit ?? true,
      origin: 'ui',
    },
  );
};

export const handleShadowChange = (
  layerId: string,
  color: string,
  blur: number,
  offsetX: number,
  offsetY: number,
  options?: PropChangeOptions,
): void => {
  if (!layerId) return;
  const shadowPayload = normalizeShadowPayload({
    color,
    blur,
    offsetX,
    offsetY,
  });
  useEditorStore.getState().updateLayer(
    layerId,
    { textShadow: shadowPayload } as Partial<TextLayer>,
    {
      commit: options?.commit ?? true,
      origin: 'ui',
    },
  );
};

export const handleNeonGlow = (
  layerId: string,
  color: string,
  blur: number,
  options?: PropChangeOptions,
): void => {
  if (!layerId) return;
  useEditorStore.getState().updateLayer(
    layerId,
    {
      textShadow: normalizeShadowPayload({
        color,
        blur,
        offsetX: 0,
        offsetY: 0,
      }),
      textStroke: color,
      textStrokeWidth: 1,
    } as Partial<TextLayer>,
    {
      commit: options?.commit ?? true,
      origin: 'ui',
    },
  );
};
