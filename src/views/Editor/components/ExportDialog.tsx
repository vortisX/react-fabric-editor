import { useEffect, useMemo, useState } from "react";
import { FileJson, FileText, Image, Scaling, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button, Dialog } from "../../../components/ui";
import {
  exportCurrentDesign,
  type ExportFormat,
  type ExportScale,
} from "../../../core/export";
import { useEditorStore } from "../../../store/useEditorStore";
import { cn } from "../../../utils/cn";

interface ExportDialogProps {
  open: boolean;
  defaultFilename: string;
  onClose: () => void;
}

interface FormatTone {
  accentClassName: string;
  badgeClassName: string;
  icon: typeof Image;
}

const EXPORT_FORMATS: ExportFormat[] = ["png", "jpeg", "svg", "pdf", "json"];
const EXPORT_SCALES: ExportScale[] = [1, 2, 3];
const SCALE_SUPPORTED_FORMATS: ExportFormat[] = ["png", "jpeg", "pdf"];
const FORMAT_TONES: Record<ExportFormat, FormatTone> = {
  png: {
    accentClassName:
      "border-sky-200 bg-[linear-gradient(135deg,rgba(240,249,255,0.96),rgba(248,250,252,0.98))]",
    badgeClassName: "bg-sky-100 text-sky-700 ring-1 ring-inset ring-sky-200",
    icon: Image,
  },
  jpeg: {
    accentClassName:
      "border-amber-200 bg-[linear-gradient(135deg,rgba(255,251,235,0.96),rgba(248,250,252,0.98))]",
    badgeClassName: "bg-amber-100 text-amber-700 ring-1 ring-inset ring-amber-200",
    icon: Image,
  },
  svg: {
    accentClassName:
      "border-emerald-200 bg-[linear-gradient(135deg,rgba(236,253,245,0.96),rgba(248,250,252,0.98))]",
    badgeClassName: "bg-emerald-100 text-emerald-700 ring-1 ring-inset ring-emerald-200",
    icon: Sparkles,
  },
  pdf: {
    accentClassName:
      "border-rose-200 bg-[linear-gradient(135deg,rgba(255,241,242,0.96),rgba(248,250,252,0.98))]",
    badgeClassName: "bg-rose-100 text-rose-700 ring-1 ring-inset ring-rose-200",
    icon: FileText,
  },
  json: {
    accentClassName:
      "border-violet-200 bg-[linear-gradient(135deg,rgba(245,243,255,0.96),rgba(248,250,252,0.98))]",
    badgeClassName: "bg-violet-100 text-violet-700 ring-1 ring-inset ring-violet-200",
    icon: FileJson,
  },
};

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
    if (!open) {
      return;
    }

    setFilename(defaultFilename);
    setScale(1);
    setErrorKey(null);
  }, [defaultFilename, open]);

  const supportsScale = SCALE_SUPPORTED_FORMATS.includes(format);
  const formatDescription = useMemo(
    () => ({
      title: t(`exportDialog.formats.${format}.title`),
      purpose: t(`exportDialog.formats.${format}.purpose`),
      advantage: t(`exportDialog.formats.${format}.advantage`),
      summary: t(`exportDialog.formats.${format}.summary`),
    }),
    [format, t],
  );
  const previewWidth = supportsScale ? canvasWidth * scale : canvasWidth;
  const previewHeight = supportsScale ? canvasHeight * scale : canvasHeight;
  const formatTone = FORMAT_TONES[format];
  const FormatIcon = formatTone.icon;

  const handleExport = async (): Promise<void> => {
    setIsExporting(true);
    setErrorKey(null);

    try {
      await exportCurrentDesign(format, filename, scale);
      onClose();
    } catch {
      // 为什么统一兜底为单一错误提示：
      // 浏览器对跨域图片、下载权限和 Canvas taint 的报错文案不稳定，统一走 i18n 更可控。
      setErrorKey("exportDialog.error");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog
      open={open}
      title={t("exportDialog.title")}
      description={t("exportDialog.subtitle")}
      onClose={onClose}
      closeLabel={t("exportDialog.close")}
      closeDisabled={isExporting}
      closeOnEscape={!isExporting}
      closeOnOverlayClick={!isExporting}
      panelClassName="max-w-[52rem]"
      bodyClassName="px-0 py-0"
      footerClassName="bg-white"
      footer={
        <>
          <Button variant="text" onClick={onClose} disabled={isExporting}>
            {t("exportDialog.cancel")}
          </Button>
          <Button
            variant="primary"
            className="min-w-28"
            onClick={() => {
              void handleExport();
            }}
            disabled={isExporting}
          >
            {isExporting ? t("exportDialog.exporting") : t("exportDialog.confirm")}
          </Button>
        </>
      }
    >
      <div className="grid gap-0 lg:grid-cols-[1.02fr_0.98fr]">
        <div className="space-y-4 border-b border-slate-200/80 px-5 py-5 lg:border-r lg:border-b-0">
          <section className="space-y-2 rounded-[20px] border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <label
                htmlFor="export-filename"
                className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500"
              >
                {t("exportDialog.filenameLabel")}
              </label>
            </div>
            <input
              id="export-filename"
              value={filename}
              onChange={(event) => {
                setFilename(event.target.value);
              }}
              className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition-colors focus:border-blue-400 focus:bg-white"
              placeholder={t("exportDialog.filenamePlaceholder")}
            />
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {t("exportDialog.detailLabel")}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {t("exportDialog.subtitle")}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {EXPORT_FORMATS.map((item) => {
                const tone = FORMAT_TONES[item];
                const ItemIcon = tone.icon;
                const active = format === item;

                return (
                  <button
                    key={item}
                    type="button"
                    className={cn(
                      "group rounded-[18px] border p-3.5 text-left transition-colors",
                      active
                        ? cn(tone.accentClassName, "border-slate-300")
                        : "border-slate-200 bg-white hover:border-slate-300",
                    )}
                    onClick={() => {
                      setFormat(item);
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div
                        className={cn(
                          "inline-flex h-8 w-8 items-center justify-center rounded-2xl",
                          active ? tone.badgeClassName : "bg-slate-100 text-slate-500",
                        )}
                      >
                        <ItemIcon className="h-4 w-4" />
                      </div>
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]",
                          active
                            ? tone.badgeClassName
                            : "bg-slate-100 text-slate-500 ring-1 ring-inset ring-slate-200",
                        )}
                      >
                        {item}
                      </span>
                    </div>

                    <div className="mt-3 space-y-1.5">
                      <p className="text-sm font-semibold text-slate-950">
                        {t(`exportDialog.formats.${item}.title`)}
                      </p>
                      <p className="text-[11px] leading-5 text-slate-500">
                        {t(`exportDialog.formats.${item}.summary`)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="flex flex-col gap-4 bg-slate-50/50 px-5 py-5">
          <div className={cn("rounded-[20px] border p-4", formatTone.accentClassName)}>
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
                  formatTone.badgeClassName,
                )}
              >
                <FormatIcon className="h-4 w-4" />
              </div>
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {t("exportDialog.detailLabel")}
                </p>
                <h3 className="text-base font-semibold text-slate-950">
                  {formatDescription.title}
                </h3>
                <p className="text-sm leading-6 text-slate-600">
                  {formatDescription.summary}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-[20px] border border-slate-200 bg-white p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                    <Scaling className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {t("exportDialog.scaleLabel")}
                  </span>
                </div>
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
                      "h-10 rounded-2xl border text-sm font-semibold transition-colors",
                      scale === item
                        ? "border-blue-500 bg-blue-50 text-blue-700"
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

            <div className="border-t border-slate-200 pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                {t("exportDialog.estimatedSizeLabel")}
              </p>
              <p className="mt-2 text-base font-semibold text-slate-950">
                {supportsScale
                  ? t("exportDialog.estimatedSizeValue", {
                      width: previewWidth,
                      height: previewHeight,
                    })
                  : t("exportDialog.estimatedSizeOriginal", {
                      width: previewWidth,
                      height: previewHeight,
                    })}
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                {supportsScale
                  ? t("exportDialog.estimatedSizeHintScaled")
                  : t("exportDialog.estimatedSizeHintOriginal")}
              </p>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                {t("exportDialog.purposeLabel")}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                {formatDescription.purpose}
              </p>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                {t("exportDialog.advantageLabel")}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                {formatDescription.advantage}
              </p>
            </div>
          </div>

          {errorKey ? (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-600">
              {t(errorKey)}
            </p>
          ) : null}
        </aside>
      </div>
    </Dialog>
  );
};
