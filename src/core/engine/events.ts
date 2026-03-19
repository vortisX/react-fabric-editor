import {
  FabricImage,
  Textbox,
  type Canvas,
  type FabricObject,
} from "fabric";

import { i18n } from "../../locales";
import { useEditorStore } from "../../store/useEditorStore";
import type { BaseLayer, TextLayer } from "../../types/schema";
import { CustomTextbox } from "../CustomTextbox";
import { round1 } from "./helpers";
import type {
  FabricImageLayer,
  FabricLayerTarget,
  FabricModifiedEvent,
  FabricObjectEvent,
  FabricScalingEvent,
  FabricSelectionEvent,
} from "./types";

interface EngineEventBindings {
  canvas: Canvas;
  onSelectionChanged: (target?: FabricObject) => void;
  onScaling: (event: FabricScalingEvent) => void;
  onResizing: (target: FabricObject) => void;
  onModified: (event: FabricModifiedEvent) => void;
  onTextChanged: (target: FabricObject) => void;
}

interface HandleScalingParams {
  canvas: Canvas | null;
  event: FabricScalingEvent;
  queueLiveTransform: (target: FabricLayerTarget) => void;
}

interface HandleModifiedParams {
  event: FabricModifiedEvent;
  finalizeImageScaling: (img: FabricImageLayer) => Promise<void>;
  syncLayerTransform: (target: FabricLayerTarget) => void;
}

interface SyncLiveTransformParams {
  target: FabricLayerTarget;
  syncTransformRaf: number | null;
  setSyncTransformRaf: (value: number | null) => void;
}

export const bindEngineEvents = ({
  canvas,
  onSelectionChanged,
  onScaling,
  onResizing,
  onModified,
  onTextChanged,
}: EngineEventBindings): void => {
  canvas.on("selection:created", (event: FabricSelectionEvent) =>
    onSelectionChanged(event.selected?.[0]),
  );
  canvas.on("selection:updated", (event: FabricSelectionEvent) =>
    onSelectionChanged(event.selected?.[0]),
  );
  canvas.on("selection:cleared", () => onSelectionChanged(undefined));
  canvas.on("object:scaling", (event: FabricScalingEvent) => onScaling(event));
  canvas.on("object:resizing", (event: FabricObjectEvent) =>
    onResizing(event.target),
  );
  canvas.on("object:moving", (event: FabricObjectEvent) =>
    onResizing(event.target),
  );
  canvas.on("object:rotating", (event: FabricObjectEvent) =>
    onResizing(event.target),
  );
  canvas.on("object:modified", (event: FabricModifiedEvent) =>
    onModified(event),
  );
  canvas.on("text:changed", (event: FabricObjectEvent) =>
    onTextChanged(event.target),
  );
};

export const handleSelectionChanged = (target?: FabricObject): void => {
  const id = target ? (target as CustomTextbox).id : null;
  useEditorStore.getState().setActiveLayer(id ?? null, "engine");
};

export const handleScaling = ({
  canvas,
  event,
  queueLiveTransform,
}: HandleScalingParams): void => {
  const target = event.target;

  if (!(target instanceof CustomTextbox)) {
    queueLiveTransform(target as FabricLayerTarget);
    return;
  }

  target.constrainScaling();

  const corner = event.transform?.corner ?? "";
  const scaleX = target.scaleX ?? 1;
  const scaleY = target.scaleY ?? 1;
  const isSideResize =
    corner === "ml" ||
    corner === "mr" ||
    event.transform?.action === "scaleX" ||
    (Math.abs(scaleX - 1) > 1e-3 && Math.abs(scaleY - 1) < 1e-3);

  if (isSideResize) {
    const center = target.getCenterPoint();
    const newWidth = Math.max((target.width ?? 0) * scaleX, 1);
    target.set({ width: newWidth, scaleX: 1 });
    target.setPositionByOrigin(center, "center", "center");
    target.initDimensions();
    target.autoFitHeight();
    canvas?.requestRenderAll();
  }

  queueLiveTransform(target as FabricLayerTarget);
};

export const handleResizing = (
  target: FabricObject,
  queueLiveTransform: (target: FabricLayerTarget) => void,
): void => {
  queueLiveTransform(target as FabricLayerTarget);
};

export const handleModified = ({
  event,
  finalizeImageScaling,
  syncLayerTransform,
}: HandleModifiedParams): void => {
  const target = event.target;
  const targetWithId = target as FabricLayerTarget;

  if (!targetWithId?.id) return;

  if (target instanceof CustomTextbox) {
    const corner = event.transform?.corner ?? "";
    target.finalizeScaling(corner);
    if (corner === "ml" || corner === "mr") {
      target.initDimensions();
      target.autoFitHeight();
    }
    syncLayerTransform(targetWithId);
    return;
  }

  if (target instanceof FabricImage) {
    void finalizeImageScaling(target as FabricImageLayer).then(() => {
      syncLayerTransform(targetWithId);
    });
    return;
  }
};

export const handleTextChanged = (target: FabricObject): void => {
  const textbox = target as CustomTextbox;
  if (!textbox.id || textbox.text === undefined) return;

  const state = useEditorStore.getState();
  if (!state.currentPageId) return;

  textbox.autoFitHeight();

  const text = textbox.text || "";
  const trimmed = text.trim() || i18n.t("rightPanel.emptyText");
  const name = trimmed.length > 15 ? `${trimmed.slice(0, 15)}...` : trimmed;

  state.updateLayer(textbox.id, {
    content: text,
    name,
    width: textbox.width ?? 0,
    height: textbox.height ?? 0,
  }, { commit: false, origin: "engine" });
};

export const syncLiveTransform = ({
  target,
  syncTransformRaf,
  setSyncTransformRaf,
}: SyncLiveTransformParams): void => {
  if (syncTransformRaf !== null) return;

  const rafId = requestAnimationFrame(() => {
    setSyncTransformRaf(null);
    if (!target?.id) return;

    const state = useEditorStore.getState();
    if (!state.currentPageId) return;

    const scaleX = target.scaleX ?? 1;
    const scaleY = target.scaleY ?? 1;
    const updates: Partial<BaseLayer> = {
      x: round1(target.left ?? 0),
      y: round1(target.top ?? 0),
      rotation: Math.round(target.angle ?? 0),
      width: round1((target.width ?? 0) * scaleX),
      height: round1((target.height ?? 0) * scaleY),
    };

    // 文本图层额外同步 fontSize（缩放过程中字号会随尺寸变化）
    if (target instanceof Textbox) {
      const isCornerScaling = scaleX !== 1 || scaleY !== 1;
      if (isCornerScaling) {
        const scale = (scaleX + scaleY) / 2;
        (updates as Partial<TextLayer>).fontSize = round1(
          Math.max((target.fontSize ?? 12) * scale, 1),
        );
      } else {
        (updates as Partial<TextLayer>).fontSize = round1(target.fontSize ?? 12);
      }
    }

    state.updateLayer(target.id, updates as Partial<TextLayer>, {
      commit: false,
      origin: "engine",
    });
  });

  setSyncTransformRaf(rafId);
};

export const syncLayerTransform = (target: FabricLayerTarget): void => {
  if (!target?.id) return;

  const state = useEditorStore.getState();
  if (!state.currentPageId) return;

  const scaleX = target.scaleX ?? 1;
  const scaleY = target.scaleY ?? 1;
  const updates: Partial<BaseLayer> = {
    x: round1(target.left ?? 0),
    y: round1(target.top ?? 0),
    rotation: Math.round(target.angle ?? 0),
    // 必须乘上 scaleX/scaleY，因为图片图层可能 scale != 1
    width: round1((target.width ?? 0) * scaleX),
    height: round1((target.height ?? 0) * scaleY),
  };

  if (target instanceof Textbox) {
    (updates as Partial<TextLayer>).fontSize = round1(target.fontSize ?? 12);
  }

  state.updateLayer(target.id, updates as Partial<TextLayer>, {
    commit: true,
    origin: "engine",
  });
};
