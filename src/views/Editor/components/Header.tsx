import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button, Select, Tooltip } from "../../../components/ui";
import { PlayIcon, RedoIcon, UndoIcon } from "../../../components/ui/Icons";
import { LANGUAGES } from "../../../locales";
import { useEditorStore } from "../../../store/useEditorStore";

import { ExportDialog } from "./ExportDialog";

/** 编辑器顶部栏，负责撤销/重做、导出入口和语言切换。 */
export const Header = () => {
  const { t, i18n } = useTranslation();
  const title = useEditorStore((state) => state.document?.title);
  const canUndo = useEditorStore((state) => state.history.past.length > 0);
  const canRedo = useEditorStore((state) => state.history.future.length > 0);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  /** 切换界面语言，并把选择持久化到本地存储。 */
  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem("designx-lang", lang);
  };

  return (
    <>
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 z-20">
        <div className="flex items-center gap-4">
          <div className="flex h-8 w-8 cursor-pointer items-center justify-center rounded bg-blue-600 text-sm font-bold text-white shadow-sm">
            D
          </div>
          <span className="text-sm font-semibold tracking-wide text-gray-700">
            {title}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Tooltip title={t("header.undo")} placement="bottom">
            <Button
              variant="text"
              icon={<UndoIcon />}
              onClick={undo}
              disabled={!canUndo}
            />
          </Tooltip>
          <Tooltip title={t("header.redo")} placement="bottom">
            <Button
              variant="text"
              icon={<RedoIcon />}
              onClick={redo}
              disabled={!canRedo}
            />
          </Tooltip>

          <div className="mx-3 h-4 w-px bg-gray-300"></div>

          <Button icon={<PlayIcon />}>{t("header.preview")}</Button>
          <Button
            variant="primary"
            onClick={() => {
              setIsExportDialogOpen(true);
            }}
          >
            {t("header.export")}
          </Button>

          <div className="mx-3 h-4 w-px bg-gray-300"></div>

          <Select
            className="w-24"
            value={i18n.language}
            onChange={handleLanguageChange}
            options={LANGUAGES.map((language) => ({
              value: language.code,
              label: language.label,
            }))}
          />
        </div>
      </header>

      <ExportDialog
        open={isExportDialogOpen}
        defaultFilename={title ?? t("exportDialog.filenameFallback")}
        onClose={() => {
          setIsExportDialogOpen(false);
        }}
      />
    </>
  );
};
