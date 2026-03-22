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

/** 缂栬緫鍣ㄥ乏渚ф爮锛岃礋璐ｅ伐鍏峰叆鍙ｃ€佸閫夊垎缁勫拰鍥惧眰鏍戠姸鎬佺紪鎺掋€?*/
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

  /** 褰撶敾甯冧晶鏀瑰彉閫変腑鍥惧眰鏃讹紝鎶婃爲閫変腑鎬佸悓姝ュ埌瀵瑰簲鍙跺瓙鑺傜偣銆?*/
  useEffect(() => {
    if (!activeLayerId) return;
    setSelectedIds([activeLayerId]);
  }, [activeLayerId]);

  /** 鏂板垱寤烘垨鏂板姞杞界殑缁勫悎鍥惧眰榛樿灞曞紑锛屽噺灏戠敤鎴烽澶栫偣寮€鎴愭湰銆?*/
  useEffect(() => {
    setExpandedGroupIds((previous) => {
      const next = new Set(previous);
      allGroupIds.forEach((groupId) => {
        next.add(groupId);
      });
      return next;
    });
  }, [allGroupIds]);

  /** 澶勭悊鍥惧眰鏍戝崟閫夋垨 Ctrl/Cmd 澶氶€夛紝骞跺悓姝ョ湡姝ｅ彲缂栬緫鐨勫彾瀛愬浘灞傘€?*/
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

    // 杩欓噷涓嶈兘鎶?Store 鏇存柊鏀捐繘 setSelectedIds 鐨勫嚱鏁板紡 updater銆?
    // React 浼氬湪娓叉煋闃舵鎵ц updater锛岃嫢姝ゆ椂鍐嶈Е鍙?Zustand/React 鏇存柊锛?
    // 灏变細鍑虹幇 鈥淐annot update a component while rendering鈥?鐨勫憡璀︺€?
    if (nextSelectedIds.length === 1) {
      const selectedLayer = findLayerById(layers, nextSelectedIds[0]) ?? null;
      if (selectedLayer) selectTreeLayer(selectedLayer);
      return;
    }

    useEditorStore.getState().setActiveLayer(null);
  };

  /** 澶勭悊缁勫悎鍥惧眰灞曞紑/鏀惰捣銆?*/
  const handleToggleExpanded = (groupId: string) => {
    setExpandedGroupIds((previous) => {
      const next = new Set(previous);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  /** 鏇存柊褰撳墠鎷栨嫿楂樹寒鐨勮惤鐐广€?*/
  const handleDragOver = (target: LayerDropTarget) => {
    setDropTarget(target);
  };

  /** 鍦ㄦ嫋鎷介噴鏀炬椂鎶婅妭鐐圭湡姝ｇЩ鍔ㄥ埌鐩爣浣嶇疆銆?*/
  const handleDrop = (target: LayerDropTarget) => {
    if (!draggingLayerId) return;
    moveTreeLayer(draggingLayerId, target.parentId, target.index);
    setDraggingLayerId(null);
    setDropTarget(null);
  };

  /** 鍚姩鍘熺敓鎷栨嫿锛屽苟纭繚鏍戜笂淇濇寔褰撳墠鑺傜偣涓洪€変腑鎬併€?*/
  const handleDragStart = (layerId: string) => {
    setDraggingLayerId(layerId);
    setSelectedIds((previous) =>
      previous.includes(layerId) ? previous : [layerId],
    );
  };

  /** 缁撴潫鎷栨嫿鍚庢竻鐞嗚瑙夋€侊紝閬垮厤娈嬬暀楂樹寒銆?*/
  const handleDragEnd = () => {
    setDraggingLayerId(null);
    setDropTarget(null);
  };

  /** 鎶婂綋鍓嶅閫夎妭鐐圭粍鍚堟垚涓€涓柊鐨?group銆?*/
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
