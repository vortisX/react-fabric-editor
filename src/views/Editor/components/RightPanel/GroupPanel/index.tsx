import { ArrowLeftFromLine, ChevronDown, ChevronUp, FolderOpen, Layers3, MousePointerClick, Ungroup } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { Button, Slider } from "../../../../../components/ui";
import { findLayerById } from "../../../../../core/layerTree";
import { useEditorStore } from "../../../../../store/useEditorStore";
import type { GroupLayer, Layer } from "../../../../../types/schema";
import {
  enterGroupEditing,
  exitGroupEditing,
  moveGroupChildDown,
  moveGroupChildUp,
  renameGroupLayer,
  ungroupLayer,
} from "./Group.handlers";

interface GroupSectionHeaderProps {
  title: string;
}

interface GroupChildItemProps {
  child: Layer;
}

/** 组合面板分区标题。 */
const GroupSectionHeader = ({ title }: GroupSectionHeaderProps) => (
  <div className="mt-1 flex items-center justify-between bg-white px-4 py-2">
    <span className="text-[11px] font-bold tracking-wide text-gray-800">{title}</span>
  </div>
);

/** 组内单个子节点条目，负责在面板里完成同级重排。 */
const GroupChildItem = ({ child }: GroupChildItemProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2 rounded-md border border-gray-100 bg-[#f7f7f7] px-2 py-2">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white text-gray-500 shadow-sm">
        {child.type === "group" ? <FolderOpen className="h-4 w-4" /> : <Layers3 className="h-4 w-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[11px] font-medium text-gray-700">{child.name}</div>
        <div className="truncate text-[10px] text-gray-400">
          {t(`leftPanel.layerType.${child.type}`)}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="text"
          size="small"
          className="px-1 text-gray-500"
          onClick={() => {
            moveGroupChildDown(child.id);
          }}
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="text"
          size="small"
          className="px-1 text-gray-500"
          onClick={() => {
            moveGroupChildUp(child.id);
          }}
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};

/** 组合图层属性面板，提供重命名、拆分组合和组内层级调整。 */
export const GroupPanel = () => {
  const { t } = useTranslation();
  const document = useEditorStore((state) => state.document);
  const currentPageId = useEditorStore((state) => state.currentPageId);
  const activeLayerId = useEditorStore((state) => state.activeLayerId);
  const editingGroupIds = useEditorStore((state) => state.editingGroupIds);

  const activeGroup = useMemo(() => {
    if (!activeLayerId || !document) return null;

    const page =
      document.pages.find((item) => item.pageId === currentPageId) ??
      document.pages[0];
    const match = page ? findLayerById(page.layers, activeLayerId) : null;
    return (match?.type === "group" ? match : null) as GroupLayer | null;
  }, [activeLayerId, currentPageId, document]);

  const isEditingGroup = !!activeGroup && editingGroupIds.includes(activeGroup.id);
  const groupBounds = useMemo(() => {
    if (!activeGroup) return null;

    return {
      x: Math.round(activeGroup.x),
      y: Math.round(activeGroup.y),
      width: Math.round(activeGroup.width),
      height: Math.round(activeGroup.height),
    };
  }, [activeGroup]);

  if (!activeGroup) return null;

  const displayChildren = [...activeGroup.children].reverse();

  return (
    <div className="flex h-[calc(100vh-40px)] flex-col overflow-y-auto pb-10">
      <div className="flex flex-col border-b border-gray-100 pb-3">
        <GroupSectionHeader title={t("groupPanel.groupInfo")} />
        <div className="flex flex-col gap-2 px-4">
          <div className="flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50/80 px-3 py-2">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-blue-700">
                {isEditingGroup
                  ? t("groupPanel.editing")
                  : t("groupPanel.notEditing")}
              </div>
              <div className="text-[10px] text-blue-500">
                {t("groupPanel.doubleClickHint")}
              </div>
            </div>
            <Button
              variant={isEditingGroup ? "default" : "primary"}
              size="small"
              className="shrink-0 whitespace-nowrap px-2"
              icon={
                isEditingGroup ? (
                  <ArrowLeftFromLine className="h-3.5 w-3.5" />
                ) : (
                  <MousePointerClick className="h-3.5 w-3.5" />
                )
              }
              onClick={() => {
                if (isEditingGroup) {
                  exitGroupEditing();
                  return;
                }
                enterGroupEditing(activeGroup.id);
              }}
            >
              {isEditingGroup
                ? t("groupPanel.exitEditing")
                : t("groupPanel.enterEditing")}
            </Button>
          </div>
          <input
            key={`${activeGroup.id}:${activeGroup.name}`}
            type="text"
            defaultValue={activeGroup.name}
            onBlur={(event) => {
              renameGroupLayer(activeGroup.id, event.target.value);
            }}
            className="w-full rounded border border-transparent bg-[#f5f5f5] px-2 py-1.5 text-[11px] outline-none transition-colors hover:border-gray-300 focus:border-blue-500 focus:bg-white"
            placeholder={t("rightPanel.layerNamePlaceholder")}
          />
          <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-500">
            <div className="rounded-md border border-gray-100 bg-[#f7f7f7] px-2 py-1.5">
              {t("groupPanel.boundsX")}: {groupBounds?.x ?? 0}
            </div>
            <div className="rounded-md border border-gray-100 bg-[#f7f7f7] px-2 py-1.5">
              {t("groupPanel.boundsY")}: {groupBounds?.y ?? 0}
            </div>
            <div className="rounded-md border border-gray-100 bg-[#f7f7f7] px-2 py-1.5">
              {t("groupPanel.boundsWidth")}: {groupBounds?.width ?? 0}
            </div>
            <div className="rounded-md border border-gray-100 bg-[#f7f7f7] px-2 py-1.5">
              {t("groupPanel.boundsHeight")}: {groupBounds?.height ?? 0}
            </div>
          </div>
          <Button
            variant="default"
            size="small"
            icon={<Ungroup className="h-3.5 w-3.5" />}
            onClick={() => {
              ungroupLayer(activeGroup.id);
            }}
          >
            {t("groupPanel.ungroup")}
          </Button>
        </div>
      </div>

      <div className="flex flex-col border-b border-gray-100 pb-3">
        <GroupSectionHeader title={t("groupPanel.groupChildren")} />
        <div className="flex flex-col gap-2 px-4">
          {displayChildren.map((child) => (
            <GroupChildItem key={child.id} child={child} />
          ))}
        </div>
      </div>

      <div className="flex flex-col pb-3">
        <GroupSectionHeader title={t("rightPanel.layerProperties")} />
        <div className="flex items-center gap-3 px-4">
          <span className="text-[10px] font-medium text-gray-400">
            {t("rightPanel.opacity")}
          </span>
          <Slider
            className="flex-1"
            value={activeGroup.opacity * 100}
            onChange={(value) => {
              useEditorStore.getState().updateLayer(
                activeGroup.id,
                { opacity: value / 100 },
                { commit: false },
              );
            }}
            onChangeEnd={(value) => {
              useEditorStore.getState().updateLayer(
                activeGroup.id,
                { opacity: value / 100 },
                { commit: true },
              );
            }}
          />
          <span className="w-8 text-right text-[10px] text-gray-600">
            {Math.round(activeGroup.opacity * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
};
