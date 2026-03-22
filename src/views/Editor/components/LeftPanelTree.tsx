import {
  Fragment,
  useState,
  type CSSProperties,
  type DragEvent as ReactDragEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import type { TFunction } from "i18next";
import {
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  FolderOpen,
  Lock,
  Unlock,
} from "lucide-react";

import { ImageIcon, TypeIcon } from "../../../components/ui/Icons";
import { isGroupLayer } from "../../../core/layers/layerTree";
import type { Layer } from "../../../types/schema";
import { cn } from "../../../utils/cn";
import {
  moveTreeLayerDown,
  moveTreeLayerUp,
  toggleTreeLayerLock,
  toggleTreeLayerVisibility,
} from "./LeftPanel.handlers";

type DropPlacement = "before" | "after" | "inside";

export interface LayerDropTarget {
  parentId: string | null;
  index: number;
  placement: DropPlacement;
}

interface LayerTreeProps {
  layers: Layer[];
  selectedIds: string[];
  expandedGroupIds: Set<string>;
  draggingLayerId: string | null;
  dropTarget: LayerDropTarget | null;
  t: TFunction;
  onDragOver: (target: LayerDropTarget) => void;
  onDrop: (target: LayerDropTarget) => void;
  onDragStart: (layerId: string) => void;
  onDragEnd: () => void;
  onSelect: (layer: Layer, event: ReactMouseEvent<HTMLDivElement>) => void;
  onToggleExpanded: (groupId: string) => void;
}

interface LayerTreeListProps extends LayerTreeProps {
  depth: number;
  parentId: string | null;
}

interface LayerThumbnailProps {
  layer: Layer;
  isActive: boolean;
  t: TFunction;
}

interface LayerDropZoneProps {
  depth: number;
  target: LayerDropTarget;
  isActive: boolean;
  onDragOver: (target: LayerDropTarget) => void;
  onDrop: (target: LayerDropTarget) => void;
}

/** 为树节点集中生成缩进样式，减少左侧无效留白。 */
const getLayerIndentStyle = (depth: number): CSSProperties => ({
  paddingLeft: `${depth * 10}px`,
});

/** 判断当前高亮落点是否和目标位置一致。 */
const isSameDropTarget = (
  current: LayerDropTarget | null,
  target: LayerDropTarget,
): boolean =>
  current?.parentId === target.parentId &&
  current.index === target.index &&
  current.placement === target.placement;

/**
 * 根据鼠标在节点卡片中的位置推导拖拽落点。
 * 上边缘落到当前节点上方，下边缘落到当前节点下方，组节点中间允许直接放入组内。
 */
const resolveRowDropTarget = (
  event: ReactDragEvent<HTMLDivElement>,
  layer: Layer,
  parentId: string | null,
  actualIndex: number,
): LayerDropTarget => {
  const bounds = event.currentTarget.getBoundingClientRect();
  const offsetY = event.clientY - bounds.top;
  const ratioY = bounds.height <= 0 ? 0.5 : offsetY / bounds.height;

  if (ratioY <= 0.28) {
    return { parentId, index: actualIndex + 1, placement: "before" };
  }

  if (ratioY >= 0.72) {
    return { parentId, index: actualIndex, placement: "after" };
  }

  if (isGroupLayer(layer)) {
    return {
      parentId: layer.id,
      index: layer.children.length,
      placement: "inside",
    };
  }

  return {
    parentId,
    index: ratioY < 0.5 ? actualIndex + 1 : actualIndex,
    placement: ratioY < 0.5 ? "before" : "after",
  };
};

/** 图层缩略图：图片显示真实预览，其它图层显示类型图标。 */
const LayerThumbnail = ({ layer, isActive, t }: LayerThumbnailProps) => {
  const [isBroken, setIsBroken] = useState(false);

  if (layer.type === "image" && !isBroken) {
    return (
      <img
        src={layer.url}
        alt={t("leftPanel.imageThumbnailAlt")}
        className="h-7 w-7 shrink-0 rounded-md border border-gray-200 object-cover"
        draggable={false}
        onError={() => {
          setIsBroken(true);
        }}
      />
    );
  }

  if (layer.type === "group") {
    return (
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border",
          isActive
            ? "border-blue-200 bg-blue-50 text-blue-600"
            : "border-amber-200 bg-amber-50 text-amber-600",
        )}
      >
        <FolderOpen className="h-4 w-4" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border",
        isActive
          ? "border-blue-200 bg-blue-50 text-blue-600"
          : "border-gray-200 bg-gray-50 text-gray-500",
      )}
    >
      {layer.type === "text" ? (
        <TypeIcon className="h-4 w-4" />
      ) : (
        <ImageIcon className="h-4 w-4" />
      )}
    </div>
  );
};

/** 单个拖拽落点，负责承接列表首位等空白区域投放。 */
const LayerDropZone = ({
  depth,
  target,
  isActive,
  onDragOver,
  onDrop,
}: LayerDropZoneProps) => (
  <div style={getLayerIndentStyle(depth)} className="py-0.5">
    <div
      className={cn(
        "h-2 rounded-full transition-colors",
        isActive
          ? "bg-blue-500/90 shadow-[0_0_0_2px_rgba(59,130,246,0.14)]"
          : "bg-transparent",
      )}
      onDragOver={(event) => {
        event.preventDefault();
        onDragOver(target);
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDrop(target);
      }}
    />
  </div>
);

/** 统一的“上移”箭头，避免额外引入更多图标依赖。 */
const ChevronUpIcon = () => (
  <ChevronRight className="h-3.5 w-3.5 rotate-[-90deg]" />
);

/** 递归渲染某一级图层列表，并在节点卡片自身上直接处理拖拽命中。 */
const LayerTreeList = ({
  depth,
  parentId,
  layers,
  selectedIds,
  expandedGroupIds,
  draggingLayerId,
  dropTarget,
  t,
  onDragOver,
  onDrop,
  onDragStart,
  onDragEnd,
  onSelect,
  onToggleExpanded,
}: LayerTreeListProps) => {
  const displayLayers = [...layers].reverse();

  return (
    <div className="flex flex-col gap-0.5">
      <LayerDropZone
        depth={depth}
        target={{ parentId, index: layers.length, placement: "before" }}
        isActive={isSameDropTarget(dropTarget, {
          parentId,
          index: layers.length,
          placement: "before",
        })}
        onDragOver={onDragOver}
        onDrop={onDrop}
      />

      {displayLayers.map((layer) => {
        const actualIndex = layers.findIndex((item) => item.id === layer.id);
        const isSelected = selectedIds.includes(layer.id);
        const isExpanded = isGroupLayer(layer) && expandedGroupIds.has(layer.id);
        const isDraggingSelf = draggingLayerId === layer.id;
        const beforeTarget: LayerDropTarget = {
          parentId,
          index: actualIndex + 1,
          placement: "before",
        };
        const afterTarget: LayerDropTarget = {
          parentId,
          index: actualIndex,
          placement: "after",
        };
        const insideTarget: LayerDropTarget | null = isGroupLayer(layer)
          ? {
              parentId: layer.id,
              index: layer.children.length,
              placement: "inside",
            }
          : null;

        return (
          <Fragment key={layer.id}>
            <div style={getLayerIndentStyle(depth)}>
              <div
                className={cn(
                  "group relative flex cursor-pointer items-center gap-1.5 rounded-lg border px-1.5 py-1.5 transition-all",
                  isSelected
                    ? "border-blue-200 bg-blue-50/90 text-blue-700 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.08)]"
                    : "border-transparent text-gray-600 hover:border-gray-200 hover:bg-gray-50",
                  layer.visible ? "" : "opacity-55",
                  isDraggingSelf ? "scale-[0.985] opacity-40" : "",
                  insideTarget && isSameDropTarget(dropTarget, insideTarget)
                    ? "border-blue-300 bg-blue-50/80"
                    : "",
                )}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", layer.id);
                  onDragStart(layer.id);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  onDragOver(
                    resolveRowDropTarget(event, layer, parentId, actualIndex),
                  );
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  onDrop(resolveRowDropTarget(event, layer, parentId, actualIndex));
                }}
                onDragEnd={onDragEnd}
                onClick={(event) => {
                  onSelect(layer, event);
                }}
              >
                <div
                  className={cn(
                    "pointer-events-none absolute left-1.5 right-1.5 top-0 h-0.5 rounded-full bg-blue-500 transition-opacity",
                    isSameDropTarget(dropTarget, beforeTarget)
                      ? "opacity-100"
                      : "opacity-0",
                  )}
                />
                <div
                  className={cn(
                    "pointer-events-none absolute bottom-0 left-1.5 right-1.5 h-0.5 rounded-full bg-blue-500 transition-opacity",
                    isSameDropTarget(dropTarget, afterTarget)
                      ? "opacity-100"
                      : "opacity-0",
                  )}
                />
                {insideTarget && isSameDropTarget(dropTarget, insideTarget) ? (
                  <div className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-blue-300 ring-inset" />
                ) : null}

                {isGroupLayer(layer) ? (
                  <button
                    type="button"
                    className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-gray-500 hover:bg-white"
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggleExpanded(layer.id);
                    }}
                    aria-label={t("leftPanel.toggleGroup")}
                    title={t("leftPanel.toggleGroup")}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5" />
                    )}
                  </button>
                ) : (
                  <div className="w-3 shrink-0" />
                )}

                <LayerThumbnail layer={layer} isActive={isSelected} t={t} />

                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium leading-5">{layer.name}</div>
                  <div className="truncate text-[10px] leading-4 text-gray-400">
                    {t(`leftPanel.layerType.${layer.type}`)}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100">
                  <button
                    type="button"
                    className="rounded p-1 text-gray-400 transition-colors hover:bg-white hover:text-gray-600"
                    onClick={(event) => {
                      event.stopPropagation();
                      moveTreeLayerDown(layer.id);
                    }}
                    aria-label={t("leftPanel.moveLayerDown")}
                    title={t("leftPanel.moveLayerDown")}
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className="rounded p-1 text-gray-400 transition-colors hover:bg-white hover:text-gray-600"
                    onClick={(event) => {
                      event.stopPropagation();
                      moveTreeLayerUp(layer.id);
                    }}
                    aria-label={t("leftPanel.moveLayerUp")}
                    title={t("leftPanel.moveLayerUp")}
                  >
                    <ChevronUpIcon />
                  </button>
                  <button
                    type="button"
                    className="rounded p-1 text-gray-400 transition-colors hover:bg-white hover:text-gray-600"
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleTreeLayerLock(layer.id, !layer.locked);
                    }}
                    aria-label={
                      layer.locked
                        ? t("leftPanel.unlockLayer")
                        : t("leftPanel.lockLayer")
                    }
                    title={
                      layer.locked
                        ? t("leftPanel.unlockLayer")
                        : t("leftPanel.lockLayer")
                    }
                  >
                    {layer.locked ? (
                      <Lock className="h-3.5 w-3.5" />
                    ) : (
                      <Unlock className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    className="rounded p-1 text-gray-400 transition-colors hover:bg-white hover:text-gray-600"
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleTreeLayerVisibility(layer.id, !layer.visible);
                    }}
                    aria-label={
                      layer.visible
                        ? t("leftPanel.hideLayer")
                        : t("leftPanel.showLayer")
                    }
                    title={
                      layer.visible
                        ? t("leftPanel.hideLayer")
                        : t("leftPanel.showLayer")
                    }
                  >
                    {layer.visible ? (
                      <Eye className="h-3.5 w-3.5" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {isGroupLayer(layer) && isExpanded ? (
              <LayerTreeList
                depth={depth + 1}
                parentId={layer.id}
                layers={layer.children}
                selectedIds={selectedIds}
                expandedGroupIds={expandedGroupIds}
                draggingLayerId={draggingLayerId}
                dropTarget={dropTarget}
                t={t}
                onDragOver={onDragOver}
                onDrop={onDrop}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onSelect={onSelect}
                onToggleExpanded={onToggleExpanded}
              />
            ) : null}
          </Fragment>
        );
      })}
    </div>
  );
};

/** 左侧图层树的递归展示组件。 */
export const LayerTree = (props: LayerTreeProps) => (
  <LayerTreeList depth={0} parentId={null} {...props} />
);
