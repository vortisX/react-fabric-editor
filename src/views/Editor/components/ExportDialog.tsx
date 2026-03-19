import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "../../../components/ui";
import { useEditorStore } from "../../../store/useEditorStore";
import { cn } from "../../../utils/cn";

import {
  exportCurrentDesign,
  type ExportFormat,
  type ExportScale,
} from "./Header.handlers";

interface ExportDialogProps {
  open: boolean;
  defaultFilename: string;
  onClose: () => void;
}

const EXPORT_FORMATS: ExportFormat[] = ["png", "jpeg", "svg", "pdf", "json"];
const EXPORT_SCALES: ExportScale[] = [1, 2, 3];
const SCALE_SUPPORTED_FORMATS: ExportFormat[] = ["png", "jpeg", "pdf"];

/**
 * Export dialog for downloading the current design in common delivery formats.
 */
export const ExportDialog = ({
  open,
  defaultFilename,
  onClose,
}: ExportDialogProps) => {
  const { t } = useTranslation();
  const canvasWidth = useEditorStore((state) => state.document?.global.width ?? 0);
  const canvasHeight = useEditorStore((state) => state.document?.global.height ?? 0);
  const [format, setFormat] = useState<ExportFormat>("png");
  const [scale, setScale] = useState<ExportScale>(1);
  const [filename, setFilename] = useState(defaultFilename);
  const [isExporting, setIsExporting] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFilename(defaultFilename);
    setScale(1);
    setErrorKey(null);
  }, [defaultFilename, open]);

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isExporting) {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isExporting, onClose, open]);

  const formatDescription = useMemo(
    () => ({
      title: t(`exportDialog.formats.${format}.title`),
      purpose: t(`exportDialog.formats.${format}.purpose`),
      advantage: t(`exportDialog.formats.${format}.advantage`),
    }),
    [format, t],
  );
  const supportsScale = SCALE_SUPPORTED_FORMATS.includes(format);
  const estimatedWidth = canvasWidth * scale;
  const estimatedHeight = canvasHeight * scale;

  if (!open) return null;

  const handleExport = async (): Promise<void> => {
    setIsExporting(true);
    setErrorKey(null);

    try {
      await exportCurrentDesign(format, filename, scale);
      onClose();
    } catch {
      // 为什么这里统一回退成单一错误提示：
      // 浏览器对跨域图片、下载权限、Canvas taint 的报错文案不稳定，交给 i18n 统一兜底更可控。
      setErrorKey("exportDialog.error");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-dialog-title"
      onClick={() => {
        if (!isExporting) onClose();
      }}
    >
      <div
        className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div className="space-y-1">
            <h2
              id="export-dialog-title"
              className="text-base font-semibold text-slate-900"
            >
              {t("exportDialog.title")}
            </h2>
            <p className="text-xs text-slate-500">
              {t("exportDialog.subtitle")}
            </p>
          </div>
          <Button
            variant="text"
            size="small"
            onClick={onClose}
            disabled={isExporting}
          >
            {t("exportDialog.close")}
          </Button>
        </div>

        <div className="grid gap-6 px-6 py-6 md:grid-cols-[1.35fr_0.95fr]">
          <div className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="export-filename"
                className="text-xs font-medium text-slate-700"
              >
                {t("exportDialog.filenameLabel")}
              </label>
              <input
                id="export-filename"
                value={filename}
                onChange={(event) => {
                  setFilename(event.target.value);
                }}
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition-colors focus:border-blue-400 focus:bg-white"
                placeholder={t("exportDialog.filenamePlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-700">
                  {t("exportDialog.scaleLabel")}
                </span>
                <span className="text-[11px] text-slate-400">
                  {supportsScale
                    ? t("exportDialog.scaleHintEnabled")
                    : t("exportDialog.scaleHintDisabled")}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {EXPORT_SCALES.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={cn(
                      "h-10 rounded-xl border text-sm font-medium transition-colors",
                      scale === item
                        ? "border-blue-500 bg-blue-50 text-blue-600"
                        : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600",
                      !supportsScale && "cursor-not-allowed opacity-45",
                    )}
                    disabled={!supportsScale}
                    onClick={() => {
                      setScale(item);
                    }}
                  >
                    {t("exportDialog.scaleValue", { value: item })}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-slate-700">
                  {t("exportDialog.estimatedSizeLabel")}
                </span>
                <span className="text-sm font-semibold text-slate-900">
                  {supportsScale
                    ? t("exportDialog.estimatedSizeValue", {
                        width: estimatedWidth,
                        height: estimatedHeight,
                      })
                    : t("exportDialog.estimatedSizeOriginal", {
                        width: canvasWidth,
                        height: canvasHeight,
                      })}
                </span>
              </div>
              <p className="mt-2 text-[11px] leading-5 text-slate-500">
                {supportsScale
                  ? t("exportDialog.estimatedSizeHintScaled")
                  : t("exportDialog.estimatedSizeHintOriginal")}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {EXPORT_FORMATS.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={cn(
                    "rounded-2xl border p-4 text-left transition-colors",
                    format === item
                      ? "border-blue-500 bg-blue-50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50",
                  )}
                  onClick={() => {
                    setFormat(item);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-900">
                      {t(`exportDialog.formats.${item}.title`)}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {item}
                    </span>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    {t(`exportDialog.formats.${item}.summary`)}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-600">
                {t("exportDialog.detailLabel")}
              </p>
              <h3 className="text-lg font-semibold text-slate-900">
                {formatDescription.title}
              </h3>
            </div>

            <div className="mt-5 space-y-4 text-sm text-slate-700">
              <div className="rounded-xl bg-white p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {t("exportDialog.purposeLabel")}
                </p>
                <p className="mt-2 leading-6 text-slate-700">
                  {formatDescription.purpose}
                </p>
              </div>

              <div className="rounded-xl bg-white p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {t("exportDialog.advantageLabel")}
                </p>
                <p className="mt-2 leading-6 text-slate-700">
                  {formatDescription.advantage}
                </p>
              </div>
            </div>

            {errorKey ? (
              <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                {t(errorKey)}
              </p>
            ) : null}

            <div className="mt-5 flex items-center justify-end gap-2">
              <Button
                variant="text"
                onClick={onClose}
                disabled={isExporting}
              >
                {t("exportDialog.cancel")}
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  void handleExport();
                }}
                disabled={isExporting}
              >
                {isExporting
                  ? t("exportDialog.exporting")
                  : t("exportDialog.confirm")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
