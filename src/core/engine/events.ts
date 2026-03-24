import {
  FabricImage,
  Group,
  Textbox,
  type Canvas,
  type FabricObject,
} from "fabric";

import { i18n } from "../../locales";
import { useEditorStore } from "../../store/useEditorStore";
import type { BaseLayer, GroupLayer, TextLayer } from "../../types/schema";
import { CustomTextbox } from "../text/CustomTextbox";
import { THEME_PRIMARY } from "../config/constants";
import { round1 } from "./helpers";
import { readFabricGroupSnapshot } from "./groupLayer";
import { readLayer } from "./queries";
import type {
  FabricDoubleClickEvent,
  FabricGroupLayer,
  FabricHoverEvent,
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
  onDoubleClick: (event: FabricDoubleClickEvent) => void;
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
  syncGroupTransform: (target: FabricGroupLayer) => void;
}

interface SyncLiveTransformParams {
  target: FabricLayerTarget;
  syncTransformRaf: number | null;
  setSyncTransformRaf: (value: number | null) => void;
}

interface FabricAfterRenderEvent {
  ctx?: CanvasRenderingContext2D;
}

interface FabricTopLayerInternals {
  renderTopLayer: (ctx: CanvasRenderingContext2D) => void;
}

/**
 * 统一绑定 Engine 需要的 Fabric 事件。
 * 这里同时处理选中态同步、hover 控件描边、变换事件桥接等交互逻辑。
 */
export const bindEngineEvents = ({
  canvas,
  onSelectionChanged,
  onScaling,
  onResizing,
  onModified,
  onTextChanged,
  onDoubleClick,
}: EngineEventBindings): void => {
  let hoveredTarget: FabricObject | undefined;
  let isPointerDown = false;
  const mainContext = canvas.getContext();
  const topContext = canvas.getTopContext();

  /** 重绘 Fabric 顶层控制层，补充 hover 态边框与激活对象控件。 */
  const renderTopOverlay = (): void => {
    canvas.clearContext(topContext);
    (canvas as unknown as Canvas & FabricTopLayerInternals).renderTopLayer(
      topContext,
    );

    const activeObject = canvas.getActiveObject();
    if (activeObject && canvas.getObjects().includes(activeObject)) {
      activeObject._renderControls(topContext);
    }

    if (!hoveredTarget) return;
    if (isPointerDown) return;
    if (activeObject === hoveredTarget) return;
    if (!canvas.getObjects().includes(hoveredTarget)) return;

    // 为什么这里手动补画 hover 边框：
    // Fabric 默认只给 activeObject 画控件，hover 态需要我们在 top layer 上额外渲染。
    hoveredTarget._renderControls(topContext, {
      hasBorders: true,
      hasControls: false,
      borderColor: THEME_PRIMARY,
    });
  };

  /** 更新当前 hover 对象，并在变化时重绘顶层 overlay。 */
  const setHoveredTarget = (target?: FabricObject): void => {
    if (hoveredTarget === target) return;
    hoveredTarget = target;
    renderTopOverlay();
  };

  canvas.on("selection:created", (event: FabricSelectionEvent) =>
    onSelectionChanged(event.selected?.[0]),
  );
  canvas.on("selection:updated", (event: FabricSelectionEvent) =>
    onSelectionChanged(event.selected?.[0]),
  );
  canvas.on("selection:created", renderTopOverlay);
  canvas.on("selection:updated", renderTopOverlay);
  canvas.on("selection:cleared", () => {
    onSelectionChanged(undefined);
    renderTopOverlay();
  });
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
  canvas.on("mouse:dblclick", (event: FabricDoubleClickEvent) =>
    onDoubleClick(event),
  );
  canvas.on("mouse:down", () => {
    isPointerDown = true;
    setHoveredTarget(undefined);
    renderTopOverlay();
  });
  canvas.on("mouse:up", () => {
    isPointerDown = false;
    renderTopOverlay();
  });
  canvas.on("mouse:over", (event: FabricHoverEvent) => {
    if (isPointerDown) return;
    setHoveredTarget(event.target);
  });
  canvas.on("mouse:out", (event: FabricHoverEvent) => {
    if (hoveredTarget === event.target) {
      setHoveredTarget(undefined);
    }
  });
  canvas.on("after:render", (event: FabricAfterRenderEvent) => {
    if (event.ctx !== mainContext && event.ctx !== topContext) return;
    renderTopOverlay();
  });
};

/** 把 Fabric 当前选中对象同步回 Store 的 activeLayerId。 */
export const handleSelectionChanged = (target?: FabricObject): void => {
  const id = target ? (target as FabricLayerTarget).id : null;
  useEditorStore.getState().setActiveLayer(id ?? null, "engine");
};

/**
 * 处理缩放中的实时逻辑。
 * 文本图层需要在边缩放时把 scale 归一到 width/fontSize，图片等其它对象则只做实时同步节流。
 */
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
    // 为什么边缩放时立刻归一 scaleX：
    // 文本宽度要始终落在 width 上，不能长期把宽度变化藏在 scaleX 里，否则 Store 很难保持标准化。
    target.set({ width: newWidth, scaleX: 1 });
    target.setPositionByOrigin(center, "center", "center");
    target.initDimensions();
    target.autoFitHeight();
    canvas?.requestRenderAll();
  }

  queueLiveTransform(target as FabricLayerTarget);
};

/** 处理移动、旋转、resize 等实时变换，统一复用 live transform 节流同步。 */
export const handleResizing = (
  target: FabricObject,
  queueLiveTransform: (target: FabricLayerTarget) => void,
): void => {
  queueLiveTransform(target as FabricLayerTarget);
};

/**
 * 处理对象变换提交完成后的最终同步。
 * 这里才允许写入 commit=true 的历史步骤，避免拖动过程中持续污染历史栈。
 */
export const handleModified = ({
  event,
  finalizeImageScaling,
  syncLayerTransform,
  syncGroupTransform,
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
    // 图片需要先把 scaleX/scaleY 折叠回 width/height，再把标准化结果同步回 Store。
    void finalizeImageScaling(target as FabricImageLayer).then(() => {
      syncLayerTransform(targetWithId);
    });
    return;
  }

  if (target instanceof Group) {
    syncGroupTransform(target as FabricGroupLayer);
  }
};

/** 处理文本内容变化，并把文本内容、显示名与自动测量后的尺寸回写到 Store。 */
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

/**
 * 在高频交互中节流同步对象几何信息。
 * 这里只做实时预览同步，不进入历史栈。
 */
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

    if (target instanceof Group) {
      const groupTarget = target as FabricGroupLayer;
      const storeLayer = readLayer(groupTarget.id);
      if (!storeLayer || storeLayer.type !== "group") return;

      const bounds = groupTarget.getBoundingRect();
      state.updateLayer(
        groupTarget.id,
        {
          x: round1(bounds.left),
          y: round1(bounds.top),
          width: round1(bounds.width),
          height: round1(bounds.height),
          rotation: 0,
        } as Partial<GroupLayer>,
        {
          commit: false,
          origin: "engine",
        },
      );
      return;
    }

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

/**
 * 把对象最终几何信息一次性提交到 Store。
 * 与 syncLiveTransform 的区别在于：这里属于“操作完成”，因此 commit=true。
 */
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

/** 把整个组合图层的当前快照一次性提交回 Store。 */
export const syncGroupTransform = (target: FabricGroupLayer): void => {
  if (!target?.id) return;

  const state = useEditorStore.getState();
  if (!state.currentPageId) return;

  const nextGroupLayer = readFabricGroupSnapshot(target, readLayer);
  if (!nextGroupLayer) return;

  state.replaceLayer(target.id, nextGroupLayer, {
    commit: true,
    origin: "engine",
  });
};
