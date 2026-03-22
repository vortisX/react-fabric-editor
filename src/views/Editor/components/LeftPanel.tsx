import { useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from "react";

import { useTranslation } from "react-i18next";

import { Layers3 } from "lucide-react";

import { Tooltip } from "../../../components/ui";

import { GridIcon, ImageIcon, TypeIcon } from "../../../components/ui/Icons";

import { canGroupLayers, collectGroupIds, findLayerById } from "../../../core/layers/layerTree";

import { useEditorStore } from "../../../store/useEditorStore";

import type { Layer } from "../../../types/schema";

import { cn } from "../../../utils/cn";

import {

  addDefaultTextLayer,

  groupTreeLayers,

  moveTreeLayer,

  openImageLayerPicker,

  selectTreeLayer,

} from "./LeftPanel.handlers";

import { LayerTree, type LayerDropTarget } from "./LeftPanelTree";

/** 编辑器左侧栏，负责工具入口、多选分组和图层树状态编排。 */
export const LeftPanel = () => {

  const { t } = useTranslation();

  const document = useEditorStore((state) => state.document);

  const currentPageId = useEditorStore((state) => state.currentPageId);

  const activeLayerId = useEditorStore((state) => state.activeLayerId);

  const page =

    document?.pages.find((item) => item.pageId === currentPageId) ??

    document?.pages[0];

  const layers = page?.layers ?? [];

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(new Set());

  const [draggingLayerId, setDraggingLayerId] = useState<string | null>(null);

  const [dropTarget, setDropTarget] = useState<LayerDropTarget | null>(null);

  const allGroupIds = useMemo(() => collectGroupIds(layers), [layers]);

  const canGroupSelection = useMemo(

    () => canGroupLayers(layers, selectedIds),

    [layers, selectedIds],

  );

  /** 当画布侧改变选中图层时，把树选中态同步到对应叶子节点。 */
  useEffect(() => {

    if (!activeLayerId) return;

    setSelectedIds([activeLayerId]);

  }, [activeLayerId]);

  /** 新创建或新加载的组合图层默认展开，减少用户额外点开成本。 */
  useEffect(() => {

    setExpandedGroupIds((previous) => {

      const next = new Set(previous);

      allGroupIds.forEach((groupId) => {

        next.add(groupId);

      });

      return next;

    });

  }, [allGroupIds]);

  /** 处理图层树单选或 Ctrl/Cmd 多选，并同步真正可编辑的叶子图层。 */
  const handleSelect = (layer: Layer, event: ReactMouseEvent<HTMLDivElement>) => {

    const isMultiSelect = event.metaKey || event.ctrlKey;

    if (!isMultiSelect) {

      setSelectedIds([layer.id]);

      selectTreeLayer(layer);

      return;

    }

    const nextSelectedIds = selectedIds.includes(layer.id)

      ? selectedIds.filter((id) => id !== layer.id)

      : [...selectedIds, layer.id];

    setSelectedIds(nextSelectedIds);

    // 这里不能把 Store 更新放进 setSelectedIds 的函数式 updater。
    // React 会在渲染阶段执行 updater，若此时再触发 Zustand/React 更新，
    // 就会出现 “Cannot update a component while rendering” 的告警。
    if (nextSelectedIds.length === 1) {

      const selectedLayer = findLayerById(layers, nextSelectedIds[0]) ?? null;

      if (selectedLayer) selectTreeLayer(selectedLayer);

      return;

    }

    useEditorStore.getState().setActiveLayer(null);

  };

  /** 处理组合图层展开/收起。 */
  const handleToggleExpanded = (groupId: string) => {

    setExpandedGroupIds((previous) => {

      const next = new Set(previous);

      if (next.has(groupId)) next.delete(groupId);

      else next.add(groupId);

      return next;

    });

  };

  /** 更新当前拖拽高亮的落点。 */
  const handleDragOver = (target: LayerDropTarget) => {

    setDropTarget(target);

  };

  /** 在拖拽释放时把节点真正移动到目标位置。 */
  const handleDrop = (target: LayerDropTarget) => {

    if (!draggingLayerId) return;

    moveTreeLayer(draggingLayerId, target.parentId, target.index);

    setDraggingLayerId(null);

    setDropTarget(null);

  };

  /** 启动原生拖拽，并确保树上保持当前节点为选中态。 */
  const handleDragStart = (layerId: string) => {

    setDraggingLayerId(layerId);

    setSelectedIds((previous) =>

      previous.includes(layerId) ? previous : [layerId],

    );

  };

  /** 结束拖拽后清理视觉态，避免残留高亮。 */
  const handleDragEnd = () => {

    setDraggingLayerId(null);

    setDropTarget(null);

  };

  /** 把当前多选节点组合成一个新的 group。 */
  const handleGroupSelection = () => {

    const groupId = groupTreeLayers(

      selectedIds,

      t("leftPanel.groupNameDefault"),

    );

    if (!groupId) return;

    setSelectedIds([groupId]);

    setExpandedGroupIds((previous) => {

      const next = new Set(previous);

      next.add(groupId);

      return next;

    });

  };

  return (

    <>

      <aside className="z-10 flex w-14 shrink-0 flex-col items-center gap-4 border-r border-gray-200 bg-white py-4">

        <Tooltip title={t("leftPanel.layerManagement")} placement="right">

          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-50 text-lg text-blue-600">

            <GridIcon />

          </div>

        </Tooltip>

        <Tooltip title={t("leftPanel.addText")} placement="right">

          <button

            type="button"

            onClick={() => {

              addDefaultTextLayer(t);

            }}

            className="flex h-10 w-10 items-center justify-center rounded-md text-lg text-gray-500 transition-colors hover:bg-gray-100"

          >

            <TypeIcon />

          </button>

        </Tooltip>

        <Tooltip title={t("leftPanel.addImage")} placement="right">

          <button

            type="button"

            onClick={() => {

              openImageLayerPicker(t);

            }}

            className="flex h-10 w-10 items-center justify-center rounded-md text-lg text-gray-500 transition-colors hover:bg-gray-100"

          >

            <ImageIcon />

          </button>

        </Tooltip>

      </aside>

      <aside className="z-10 flex w-72 shrink-0 flex-col border-r border-gray-200 bg-white shadow-sm">

        <div className="flex h-12 items-center justify-between border-b border-gray-100 px-4">

          <div className="font-semibold text-gray-800">{t("leftPanel.layerTree")}</div>

          <button

            type="button"

            className={cn(

              "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",

              canGroupSelection

                ? "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"

                : "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-300",

            )}

            onClick={handleGroupSelection}

            disabled={!canGroupSelection}

          >

            <Layers3 className="h-3.5 w-3.5" />

            <span>{t("leftPanel.groupSelected")}</span>

          </button>

        </div>

        <div className="flex-1 overflow-y-auto px-1.5 py-2">

          {layers.length === 0 ? (

            <div className="mt-6 text-center tracking-wide text-gray-400">

              {t("leftPanel.emptyCanvas")}

            </div>

          ) : (

            <LayerTree

              layers={layers}

              selectedIds={selectedIds}

              expandedGroupIds={expandedGroupIds}

              draggingLayerId={draggingLayerId}

              dropTarget={dropTarget}

              t={t}

              onDragOver={handleDragOver}

              onDrop={handleDrop}

              onDragStart={handleDragStart}

              onDragEnd={handleDragEnd}

              onSelect={handleSelect}

              onToggleExpanded={handleToggleExpanded}

            />

          )}

        </div>

      </aside>

    </>

  );

};

